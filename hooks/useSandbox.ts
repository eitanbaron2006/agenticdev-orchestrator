import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { buildSandboxPreviewUrl, normalizeSandboxFiles } from '@/lib/sandbox-files';

export interface SandboxFile {
  path: string;
  content: string;
}

export interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export type SandboxRuntime = 'next' | 'node-api' | 'python-api';

type SandboxStatus =
  | 'idle'
  | 'creating'
  | 'restoring'
  | 'preparing'
  | 'syncing'
  | 'installing'
  | 'starting'
  | 'stopping'
  | 'ready'
  | 'error';

interface SandboxPoolState {
  sandboxId: string | null;
  bootstrapped: boolean;
}

export interface SandboxState {
  sandboxId: string | null;
  activeRuntime: SandboxRuntime;
  status: SandboxStatus;
  previewUrl: string | null;
  error: string | null;
  logs: string[];
  pool: Record<SandboxRuntime, SandboxPoolState>;
}

interface EnsureSandboxOptions {
  silent?: boolean;
  bootstrap?: boolean;
}

const WORK_DIR = '/home/daytona/project';
const SESSION_KEY_PREFIX = 'daytona_sandbox_id';
const PREVIEW_PROXY_READY_TIMEOUT_MS = 30000;
const PREVIEW_PROXY_RETRY_MS = 1000;
const NEXTJS_PREVIEW_PORT = 3001;
const EXPRESS_PREVIEW_PORT = 3002;
const STATIC_SITE_PREVIEW_PORT = 4173;
const FLASK_PREVIEW_PORT = 5000;
const MANAGED_PREVIEW_PORTS = [
  NEXTJS_PREVIEW_PORT,
  EXPRESS_PREVIEW_PORT,
  STATIC_SITE_PREVIEW_PORT,
  FLASK_PREVIEW_PORT,
];
const KILL_PREVIEW_PORTS = [3000, ...MANAGED_PREVIEW_PORTS];
const VERIFY_PREVIEW_PORTS = MANAGED_PREVIEW_PORTS;
const RUNTIME_PREWARM_ORDER: SandboxRuntime[] = ['next', 'node-api', 'python-api'];

type SandboxIdPool = Record<SandboxRuntime, string | null>;
type BootstrapPool = Record<SandboxRuntime, boolean>;

export function getSandboxRuntime(projectType?: string | null): SandboxRuntime | null {
  if (projectType === 'nextjs') return 'next';
  if (projectType === 'express-api') return 'node-api';
  if (projectType === 'flask-api') return 'python-api';
  return null;
}

export function getSandboxPreviewPort(projectType?: string | null): number {
  if (projectType === 'nextjs') return NEXTJS_PREVIEW_PORT;
  if (projectType === 'express-api') return EXPRESS_PREVIEW_PORT;
  if (projectType === 'flask-api') return FLASK_PREVIEW_PORT;
  return STATIC_SITE_PREVIEW_PORT;
}

const getSessionKey = (scope: string, runtime: SandboxRuntime) => `${SESSION_KEY_PREFIX}:${scope}:${runtime}`;

function createEmptySandboxPool(): SandboxIdPool {
  return { next: null, 'node-api': null, 'python-api': null };
}

function createEmptyBootstrapPool(): BootstrapPool {
  return { next: false, 'node-api': false, 'python-api': false };
}

function buildPoolState(ids: SandboxIdPool, bootstrapped: BootstrapPool): Record<SandboxRuntime, SandboxPoolState> {
  return {
    next: { sandboxId: ids.next, bootstrapped: bootstrapped.next },
    'node-api': { sandboxId: ids['node-api'], bootstrapped: bootstrapped['node-api'] },
    'python-api': { sandboxId: ids['python-api'], bootstrapped: bootstrapped['python-api'] },
  };
}

function runtimeLabel(runtime: SandboxRuntime): string {
  if (runtime === 'next') return 'Next.js';
  if (runtime === 'node-api') return 'Node API';
  return 'Python API';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withPreviewProbe(url: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}preview_probe=${Date.now()}`;
}

async function waitForPreviewProxy(proxiedUrl: string): Promise<void> {
  const startedAt = Date.now();
  let lastStatus: number | null = null;
  let lastError = '';

  while (Date.now() - startedAt < PREVIEW_PROXY_READY_TIMEOUT_MS) {
    try {
      const res = await fetch(withPreviewProbe(proxiedUrl), {
        cache: 'no-store',
        headers: { Accept: 'text/html,*/*' },
      });

      lastStatus = res.status;
      if (res.status < 500) {
        return;
      }

      lastError = (await res.text()).slice(0, 240);
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }

    await sleep(PREVIEW_PROXY_RETRY_MS);
  }

  const statusText = lastStatus === null ? '' : ` Last status: ${lastStatus}.`;
  const errorText = lastError ? ` Last error: ${lastError}` : '';
  throw new Error(`Preview proxy was not ready after 30s.${statusText}${errorText}`);
}

async function apiPost<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `API error: ${res.status}`);
  return data as T;
}

export function useSandbox(ownerKey?: string | null) {
  const [state, setState] = useState<SandboxState>({
    sandboxId: null,
    activeRuntime: 'next',
    status: 'idle',
    previewUrl: null,
    error: null,
    logs: [],
    pool: buildPoolState(createEmptySandboxPool(), createEmptyBootstrapPool()),
  });

  const sandboxScope = useMemo(() => ownerKey?.trim() || 'anonymous', [ownerKey]);

  const sandboxPoolRef = useRef<SandboxIdPool>(createEmptySandboxPool());
  const bootstrappedRuntimeRef = useRef<BootstrapPool>(createEmptyBootstrapPool());
  const activeRuntimeRef = useRef<SandboxRuntime>('next');
  const ensureSandboxPromiseRef = useRef<Partial<Record<SandboxRuntime, Promise<string>>>>({});
  const bootstrapSandboxPromiseRef = useRef<Partial<Record<SandboxRuntime, Promise<void>>>>({});
  const prewarmPromiseRef = useRef<Promise<void> | null>(null);
  const previewOperationRef = useRef(false);

  const updatePoolState = useCallback(() => {
    setState((s) => ({
      ...s,
      sandboxId: sandboxPoolRef.current[activeRuntimeRef.current],
      activeRuntime: activeRuntimeRef.current,
      pool: buildPoolState(sandboxPoolRef.current, bootstrappedRuntimeRef.current),
    }));
  }, []);

  const setRuntimeStatus = useCallback((runtime: SandboxRuntime, patch: Partial<SandboxState>) => {
    if (activeRuntimeRef.current !== runtime) {
      setState((s) => ({
        ...s,
        pool: buildPoolState(sandboxPoolRef.current, bootstrappedRuntimeRef.current),
      }));
      return;
    }

    setState((s) => ({
      ...s,
      ...patch,
      sandboxId: sandboxPoolRef.current[runtime],
      activeRuntime: runtime,
      pool: buildPoolState(sandboxPoolRef.current, bootstrappedRuntimeRef.current),
    }));
  }, []);

  const activateRuntime = useCallback((runtime: SandboxRuntime) => {
    activeRuntimeRef.current = runtime;
    setState((s) => ({
      ...s,
      sandboxId: sandboxPoolRef.current[runtime],
      activeRuntime: runtime,
      previewUrl: runtime === s.activeRuntime ? s.previewUrl : null,
      error: null,
      pool: buildPoolState(sandboxPoolRef.current, bootstrappedRuntimeRef.current),
    }));
  }, []);

  const addLog = useCallback((msg: string, silent = false) => {
    console.log(`[Sandbox] ${msg}`);
    if (silent) return;
    setState((s) => ({ ...s, logs: [...s.logs, msg].slice(-250) }));
  }, []);

  const readStoredSandboxId = useCallback((runtime: SandboxRuntime) => {
    try {
      return sessionStorage.getItem(getSessionKey(sandboxScope, runtime));
    } catch {
      return null;
    }
  }, [sandboxScope]);

  const storeSandboxId = useCallback((runtime: SandboxRuntime, sandboxId: string) => {
    try {
      sessionStorage.setItem(getSessionKey(sandboxScope, runtime), sandboxId);
    } catch {
      // sessionStorage not available
    }
  }, [sandboxScope]);

  const clearStoredSandboxId = useCallback((runtime: SandboxRuntime) => {
    try {
      sessionStorage.removeItem(getSessionKey(sandboxScope, runtime));
    } catch {
      // sessionStorage not available
    }
  }, [sandboxScope]);

  const validateSandbox = useCallback(async (sandboxId: string) => {
    try {
      const result = await apiPost<ExecResult>('/api/daytona/exec', {
        sandboxId,
        command: 'printf sandbox-ready',
        cwd: '/',
        timeout: 10,
      });
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }, []);

  const execInSandbox = useCallback(
    async (
      sandboxId: string,
      command: string,
      cwd?: string,
      timeout?: number,
      silent = false
    ): Promise<ExecResult> => {
      addLog(`$ ${command}`, silent);
      const result = await apiPost<ExecResult>('/api/daytona/exec', {
        sandboxId,
        command,
        cwd: cwd || WORK_DIR,
        timeout: timeout || 120,
      });
      if (result.stdout) addLog(result.stdout.trim(), silent);
      if (result.stderr) addLog(`stderr: ${result.stderr.trim()}`, silent);
      if (result.exitCode !== 0) addLog(`Exit code: ${result.exitCode}`, silent);
      return result;
    },
    [addLog]
  );

  const execOnRuntime = useCallback(
    async (
      runtime: SandboxRuntime,
      command: string,
      cwd?: string,
      timeout?: number,
      silent = false
    ): Promise<ExecResult> => {
      const sandboxId = sandboxPoolRef.current[runtime];
      if (!sandboxId) throw new Error(`No ${runtimeLabel(runtime)} sandbox`);
      return execInSandbox(sandboxId, command, cwd, timeout, silent);
    },
    [execInSandbox]
  );

  const bootstrapSandboxRuntime = useCallback(
    async (runtime: SandboxRuntime, sandboxId: string, silent = false) => {
      if (bootstrappedRuntimeRef.current[runtime]) return;
      if (bootstrapSandboxPromiseRef.current[runtime]) {
        return bootstrapSandboxPromiseRef.current[runtime];
      }

      const promise = (async () => {
        if (!silent) {
          setRuntimeStatus(runtime, { status: 'preparing', error: null });
          addLog(`Bootstrapping ${runtimeLabel(runtime)} sandbox...`);
        } else {
          addLog(`Prewarming ${runtimeLabel(runtime)} sandbox...`, true);
        }

        const nextCacheDir = '/home/daytona/.cache/agenticdev-next';
        const nodeApiCacheDir = '/home/daytona/.cache/agenticdev-node-api';
        const pythonApiCacheDir = '/home/daytona/.cache/agenticdev-python-api';
        let bootstrapCommand = `mkdir -p ${WORK_DIR}`;
        let timeout = 60;

        if (runtime === 'next') {
          bootstrapCommand = [
            `mkdir -p ${WORK_DIR} ${nextCacheDir}`,
            `cd ${nextCacheDir}`,
            'if [ ! -f package.json ]; then npm init -y >/dev/null 2>&1; fi',
            'npm install --prefer-offline --no-audit --no-fund next react react-dom typescript tailwindcss postcss autoprefixer',
          ].join('\n');
          timeout = 600;
        } else if (runtime === 'node-api') {
          bootstrapCommand = [
            `mkdir -p ${WORK_DIR} ${nodeApiCacheDir}`,
            `cd ${nodeApiCacheDir}`,
            'if [ ! -f package.json ]; then npm init -y >/dev/null 2>&1; fi',
            'npm install --prefer-offline --no-audit --no-fund express cors dotenv',
          ].join('\n');
          timeout = 600;
        } else {
          bootstrapCommand = [
            `mkdir -p ${WORK_DIR} ${pythonApiCacheDir}`,
            `cd ${pythonApiCacheDir}`,
            'python3 -m pip install --user flask flask-cors python-dotenv >/dev/null 2>&1 || python -m pip install --user flask flask-cors python-dotenv >/dev/null 2>&1 || true',
          ].join('\n');
          timeout = 600;
        }

        const result = await execInSandbox(sandboxId, bootstrapCommand, '/', timeout, silent);
        if (result.exitCode !== 0) {
          throw new Error(`Failed to bootstrap ${runtimeLabel(runtime)} sandbox: ${result.stderr || result.stdout}`);
        }

        bootstrappedRuntimeRef.current[runtime] = true;
        updatePoolState();
        addLog(`${runtimeLabel(runtime)} sandbox ready for previews`, silent);
      })();

      bootstrapSandboxPromiseRef.current[runtime] = promise;
      try {
        await promise;
      } finally {
        delete bootstrapSandboxPromiseRef.current[runtime];
      }
    },
    [addLog, execInSandbox, setRuntimeStatus, updatePoolState]
  );

  useEffect(() => {
    ensureSandboxPromiseRef.current = {};
    bootstrapSandboxPromiseRef.current = {};
    prewarmPromiseRef.current = null;
    sandboxPoolRef.current = createEmptySandboxPool();
    bootstrappedRuntimeRef.current = createEmptyBootstrapPool();
    activeRuntimeRef.current = 'next';

    setState({
      sandboxId: null,
      activeRuntime: 'next',
      status: 'idle',
      previewUrl: null,
      error: null,
      logs: [],
      pool: buildPoolState(sandboxPoolRef.current, bootstrappedRuntimeRef.current),
    });
  }, [readStoredSandboxId]);

  const ensureSandbox = useCallback(async (
    runtime: SandboxRuntime = activeRuntimeRef.current,
    options: EnsureSandboxOptions = {}
  ) => {
    const silent = options.silent === true;
    const shouldBootstrap = options.bootstrap !== false;

    if (!silent) {
      activateRuntime(runtime);
    }

    if (ensureSandboxPromiseRef.current[runtime]) {
      return ensureSandboxPromiseRef.current[runtime];
    }

    const promise = (async () => {
      const activeId = sandboxPoolRef.current[runtime];
      if (activeId) {
        addLog(`Reusing existing sandbox (${runtimeLabel(runtime)}): ${activeId}`, silent);
        if (!silent) {
          setRuntimeStatus(runtime, { status: 'ready', error: null });
        }
        if (shouldBootstrap) {
          await bootstrapSandboxRuntime(runtime, activeId, silent);
        }
        return activeId;
      }

      const storedId = readStoredSandboxId(runtime);
      if (storedId) {
        if (!silent) {
          setRuntimeStatus(runtime, { sandboxId: storedId, status: 'restoring', error: null });
          addLog(`Restoring reusable sandbox (${runtimeLabel(runtime)}): ${storedId}`);
        }

        const isUsable = await validateSandbox(storedId);
        if (isUsable) {
          sandboxPoolRef.current[runtime] = storedId;
          addLog(`Reusing existing sandbox (${runtimeLabel(runtime)}): ${storedId}`, silent);
          setRuntimeStatus(runtime, { status: 'ready', error: null });
          if (shouldBootstrap) {
            await bootstrapSandboxRuntime(runtime, storedId, silent);
          }
          return storedId;
        }

        addLog(`Stored ${runtimeLabel(runtime)} sandbox is no longer available; creating a new sandbox...`, silent);
        clearStoredSandboxId(runtime);
      }

      if (!silent) {
        setRuntimeStatus(runtime, {
          status: 'creating',
          error: null,
          logs: [],
          sandboxId: null,
          previewUrl: null,
        });
        addLog(`Creating ${runtimeLabel(runtime)} sandbox...`);
      } else {
        addLog(`Creating ${runtimeLabel(runtime)} sandbox...`, true);
      }

      const data = await apiPost<{ sandboxId: string; status: string }>(
        '/api/daytona/sandbox',
        {}
      );

      sandboxPoolRef.current[runtime] = data.sandboxId;
      storeSandboxId(runtime, data.sandboxId);
      addLog(`${runtimeLabel(runtime)} sandbox created: ${data.sandboxId}`, silent);
      setRuntimeStatus(runtime, { status: 'ready', error: null });

      if (shouldBootstrap) {
        await bootstrapSandboxRuntime(runtime, data.sandboxId, silent);
      }

      return data.sandboxId;
    })();

    ensureSandboxPromiseRef.current[runtime] = promise;
    try {
      return await promise;
    } catch (err) {
      const msg = err instanceof Error ? err.message : `Failed to create ${runtimeLabel(runtime)} sandbox`;
      addLog(`ERROR: ${msg}`, silent);
      if (!silent || activeRuntimeRef.current === runtime) {
        setRuntimeStatus(runtime, { status: 'error', error: msg });
      }
      throw err;
    } finally {
      delete ensureSandboxPromiseRef.current[runtime];
    }
  }, [
    activateRuntime,
    addLog,
    bootstrapSandboxRuntime,
    clearStoredSandboxId,
    readStoredSandboxId,
    setRuntimeStatus,
    storeSandboxId,
    validateSandbox,
  ]);

  const prewarmSandboxes = useCallback(async () => {
    if (prewarmPromiseRef.current) {
      return prewarmPromiseRef.current;
    }

    const promise = (async () => {
      for (const runtime of RUNTIME_PREWARM_ORDER) {
        try {
          await ensureSandbox(runtime, { silent: true });
        } catch (err) {
          console.warn(`[Sandbox] Failed to prewarm ${runtimeLabel(runtime)} sandbox:`, err);
        }
      }
    })();

    prewarmPromiseRef.current = promise;
    try {
      await promise;
    } finally {
      prewarmPromiseRef.current = null;
    }
  }, [ensureSandbox]);

  const createSandbox = useCallback(
    (runtime: SandboxRuntime = activeRuntimeRef.current) => ensureSandbox(runtime),
    [ensureSandbox]
  );

  const syncFiles = useCallback(
    async (files: SandboxFile[], runtime: SandboxRuntime = activeRuntimeRef.current) => {
      const sandboxId = sandboxPoolRef.current[runtime];
      if (!sandboxId) throw new Error(`No ${runtimeLabel(runtime)} sandbox`);

      const filesToSync = normalizeSandboxFiles(files);
      const repairedFiles = filesToSync.filter((file, index) => file.content !== files[index]?.content);

      setRuntimeStatus(runtime, { status: 'syncing', error: null });
      addLog(`Syncing ${filesToSync.length} files...`);
      if (repairedFiles.length > 0) {
        addLog(`Repaired invalid config files: ${repairedFiles.map((file) => file.path).join(', ')}`);
      }
      try {
        const res = await apiPost<{ status: string; fileCount: number; workDir: string }>(
          '/api/daytona/files',
          { sandboxId, files: filesToSync, workDir: WORK_DIR }
        );
        addLog(`Synced ${res.fileCount} files to ${res.workDir}`);
        setRuntimeStatus(runtime, { status: 'ready' });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to sync files';
        addLog(`ERROR syncing: ${msg}`);
        setRuntimeStatus(runtime, { status: 'error', error: msg });
        throw err;
      }
    },
    [addLog, setRuntimeStatus]
  );

  const exec = useCallback(
    async (command: string, cwd?: string, timeout?: number): Promise<ExecResult> => {
      return execOnRuntime(activeRuntimeRef.current, command, cwd, timeout);
    },
    [execOnRuntime]
  );

  const stopPreviewServer = useCallback(async (runtime: SandboxRuntime = activeRuntimeRef.current) => {
    if (!sandboxPoolRef.current[runtime]) return;

    setRuntimeStatus(runtime, { status: 'stopping', previewUrl: null, error: null });
    addLog('Stopping previous preview server...');

    const stopCommand = [
      'set +e',
      `for port in ${KILL_PREVIEW_PORTS.join(' ')}; do`,
      'if command -v fuser >/dev/null 2>&1; then fuser -k $port/tcp 2>/dev/null || true; fi',
      'if command -v lsof >/dev/null 2>&1; then lsof -ti:$port 2>/dev/null | xargs -r kill 2>/dev/null || true; fi',
      'if command -v lsof >/dev/null 2>&1; then lsof -ti:$port 2>/dev/null | xargs -r kill -9 2>/dev/null || true; fi',
      'if command -v ss >/dev/null 2>&1; then ss -ltnp "sport = :$port" 2>/dev/null | sed -n "s/.*pid=\\([0-9][0-9]*\\).*/\\1/p" | sort -u | xargs -r kill 2>/dev/null || true; fi',
      'if command -v ss >/dev/null 2>&1; then ss -ltnp "sport = :$port" 2>/dev/null | sed -n "s/.*pid=\\([0-9][0-9]*\\).*/\\1/p" | sort -u | xargs -r kill -9 2>/dev/null || true; fi',
      'done',
      'ps -eo pid=,args= | awk \'/[n]ext dev|[p]ython3 -m http.server|[p]ython -m http.server|[n]ode server.js|[p]ython app.py/ {print $1}\' | xargs -r kill 2>/dev/null || true',
      'sleep 1',
      'ps -eo pid=,args= | awk \'/[n]ext dev|[p]ython3 -m http.server|[p]ython -m http.server|[n]ode server.js|[p]ython app.py/ {print $1}\' | xargs -r kill -9 2>/dev/null || true',
      'pkill -f "[n]ext dev" 2>/dev/null || true',
      'pkill -f "[p]ython3 -m http.server" 2>/dev/null || true',
      'pkill -f "[p]ython -m http.server" 2>/dev/null || true',
      'pkill -f "[n]ode server.js" 2>/dev/null || true',
      'pkill -f "[p]ython app.py" 2>/dev/null || true',
      'sleep 1',
    ].join('\n');

    const stopResult = await execOnRuntime(runtime, stopCommand, '/', 30);
    if (stopResult.exitCode !== 0) {
      throw new Error(`Failed to stop preview server: ${stopResult.stderr || stopResult.stdout}`);
    }

    const verifyStopCommand = [
      'set +e',
      `for port in ${VERIFY_PREVIEW_PORTS.join(' ')}; do`,
      'for i in $(seq 1 10); do',
      'if curl -fsS --max-time 1 http://127.0.0.1:$port >/dev/null 2>&1; then sleep 1; else break; fi',
      'done',
      'if curl -fsS --max-time 1 http://127.0.0.1:$port >/dev/null 2>&1; then echo "still_responding_on_$port"; fi',
      'done',
    ].join('\n');
    const verifyStopResult = await execOnRuntime(runtime, verifyStopCommand, '/', 10);
    if (verifyStopResult.stdout.includes('still_responding_on_')) {
      throw new Error(`Previous preview server is still responding: ${verifyStopResult.stdout.trim()}`);
    }

    setRuntimeStatus(runtime, { status: 'ready', previewUrl: null });
  }, [addLog, execOnRuntime, setRuntimeStatus]);

  const getPreviewUrl = useCallback(
    async (port: number, runtime: SandboxRuntime = activeRuntimeRef.current): Promise<string> => {
      const sandboxId = sandboxPoolRef.current[runtime];
      if (!sandboxId) throw new Error(`No ${runtimeLabel(runtime)} sandbox`);

      addLog(`Getting preview URL for port ${port}...`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        const res = await fetch(
          `/api/daytona/exec?sandboxId=${encodeURIComponent(sandboxId)}&port=${port}`,
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);

        const data = await res.json() as { url?: string; token?: string | null; signed?: boolean; error?: string };
        if (!res.ok) {
          throw new Error(data.error || `Preview API error: ${res.status}`);
        }

        // Route through our same-origin proxy. The Daytona URL is signed, so
        // the iframe and popout do not need to enter the Daytona OIDC flow.
        const directUrl = data.url;
        if (!directUrl) {
          throw new Error('Preview API did not return a URL');
        }
        const proxiedUrl = buildSandboxPreviewUrl(directUrl, data.token);

        addLog(`Preview URL (direct): ${directUrl}`);
        addLog(`Preview URL (proxied): ${proxiedUrl}`);
        addLog('Waiting for preview proxy route...');
        await waitForPreviewProxy(proxiedUrl);
        setRuntimeStatus(runtime, { previewUrl: proxiedUrl });
        return proxiedUrl;
      } catch (err) {
        clearTimeout(timeoutId);
        if (err instanceof Error && err.name === 'AbortError') {
          throw new Error('Preview URL request timed out after 30s.');
        }
        throw err;
      }
    },
    [addLog, setRuntimeStatus]
  );

  const startDevServer = useCallback(
    async (projectType: string, files: SandboxFile[]) => {
      const runtime = getSandboxRuntime(projectType);
      if (!runtime) {
        throw new Error('Static/CDN projects render locally and do not require a sandbox.');
      }

      if (previewOperationRef.current) {
        throw new Error('Preview operation already in progress');
      }
      previewOperationRef.current = true;

      activateRuntime(runtime);

      try {
        await ensureSandbox(runtime);
        await stopPreviewServer(runtime);
        const previewPort = getSandboxPreviewPort(projectType);

        setRuntimeStatus(runtime, { status: 'preparing', error: null, previewUrl: null });
        addLog('Preparing sandbox workspace...');
        const cleanupCommand = `mkdir -p ${WORK_DIR} && find ${WORK_DIR} -mindepth 1 -maxdepth 1 ! -name node_modules -exec rm -rf -- {} +`;
        const cleanupRes = await execOnRuntime(runtime, cleanupCommand, '/', 60);
        if (cleanupRes.exitCode !== 0) {
          throw new Error(`Workspace cleanup failed: ${cleanupRes.stderr || cleanupRes.stdout}`);
        }

        await syncFiles(files, runtime);

        if (projectType === 'nextjs') {
          setRuntimeStatus(runtime, { status: 'installing' });
          addLog('Installing npm dependencies (this may take a few minutes)...');
          const installRes = await execOnRuntime(runtime, 'npm install --prefer-offline --no-audit --no-fund', WORK_DIR, 600);
          if (installRes.exitCode !== 0) {
            throw new Error(`npm install failed: ${installRes.stderr || installRes.stdout}`);
          }

          setRuntimeStatus(runtime, { status: 'starting' });
          addLog(`Starting Next.js dev server on 0.0.0.0:${previewPort}...`);
          await execOnRuntime(runtime, `nohup npx next dev -p ${previewPort} -H 0.0.0.0 > /tmp/nextdev.log 2>&1 &`, WORK_DIR, 5);
          addLog('Waiting for server to start (first compile may take a moment)...');
          await new Promise((r) => setTimeout(r, 15000));

          const nextReadyCheckCommand = [
            'for i in $(seq 1 24); do',
            `body=$(curl -sS http://127.0.0.1:${previewPort} 2>/tmp/next_check.err || true)`,
            'if printf "%s" "$body" | grep -q "Directory listing for /"; then echo "static_server_still_serving"; sleep 5; continue; fi',
            'if printf "%s" "$body" | grep -Eq "(_next/static|self\\.__next_f)"; then echo "next_ready"; exit 0; fi',
            `code=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:${previewPort} 2>/dev/null || echo "not_ready")`,
            'echo "$code"',
            'sleep 5',
            'done',
            'echo "next_not_ready"',
          ].join('\n');
          const checkRes = await execOnRuntime(runtime, nextReadyCheckCommand, WORK_DIR, 150);
          addLog(`Server check: ${checkRes.stdout.trim()}`);

          if (!checkRes.stdout.includes('next_ready')) {
            const logs = await execOnRuntime(runtime, 'cat /tmp/nextdev.log 2>/dev/null | tail -20', WORK_DIR, 5);
            throw new Error(`Next.js server failed to start: ${logs.stdout.trim() || 'no logs'}`);
          }

          const url = await getPreviewUrl(previewPort, runtime);
          setRuntimeStatus(runtime, { status: 'ready', previewUrl: url });
          return url;
        }

        if (projectType === 'express-api') {
          setRuntimeStatus(runtime, { status: 'installing' });
          addLog('Installing npm dependencies (this may take a few minutes)...');
          const installRes = await execOnRuntime(runtime, 'npm install --prefer-offline --no-audit --no-fund', WORK_DIR, 600);
          if (installRes.exitCode !== 0) {
            throw new Error(`npm install failed: ${installRes.stderr || installRes.stdout}`);
          }

          setRuntimeStatus(runtime, { status: 'starting' });
          addLog(`Starting Express server on 0.0.0.0:${previewPort}...`);
          await execOnRuntime(runtime, `nohup env HOST=0.0.0.0 PORT=${previewPort} node server.js > /tmp/server.log 2>&1 &`, WORK_DIR, 5);
          await new Promise((r) => setTimeout(r, 5000));

          const url = await getPreviewUrl(previewPort, runtime);
          setRuntimeStatus(runtime, { status: 'ready', previewUrl: url });
          return url;
        }

        if (projectType === 'flask-api') {
          setRuntimeStatus(runtime, { status: 'installing' });
          addLog('Installing Python dependencies...');
          await execOnRuntime(runtime, 'pip install -r requirements.txt', WORK_DIR, 300);

          setRuntimeStatus(runtime, { status: 'starting' });
          addLog(`Starting Flask server on 0.0.0.0:${previewPort}...`);
          await execOnRuntime(runtime, `nohup env FLASK_RUN_HOST=0.0.0.0 PORT=${previewPort} python app.py > /tmp/flask.log 2>&1 &`, WORK_DIR, 5);
          await new Promise((r) => setTimeout(r, 5000));

          const url = await getPreviewUrl(previewPort, runtime);
          setRuntimeStatus(runtime, { status: 'ready', previewUrl: url });
          return url;
        }

        // Static sites, React CDN, Vue CDN, Svelte CDN
        setRuntimeStatus(runtime, { status: 'starting' });
        addLog(`Starting HTTP server on 0.0.0.0:${previewPort}...`);
        await execOnRuntime(runtime, `nohup python3 -m http.server ${previewPort} --bind 0.0.0.0 > /tmp/http.log 2>&1 &`, WORK_DIR, 5);
        await new Promise((r) => setTimeout(r, 3000));

        const url = await getPreviewUrl(previewPort, runtime);
        setRuntimeStatus(runtime, { status: 'ready', previewUrl: url });
        return url;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to start server';
        addLog(`ERROR: ${msg}`);
        setRuntimeStatus(runtime, { status: 'error', error: msg });
        throw err;
      } finally {
        previewOperationRef.current = false;
      }
    },
    [
      activateRuntime,
      addLog,
      ensureSandbox,
      execOnRuntime,
      getPreviewUrl,
      setRuntimeStatus,
      stopPreviewServer,
      syncFiles,
    ]
  );

  const destroySandbox = useCallback(async (runtime: SandboxRuntime = activeRuntimeRef.current) => {
    const sandboxId = sandboxPoolRef.current[runtime];
    if (!sandboxId) return;

    sandboxPoolRef.current[runtime] = null;
    bootstrappedRuntimeRef.current[runtime] = false;
    delete ensureSandboxPromiseRef.current[runtime];
    delete bootstrapSandboxPromiseRef.current[runtime];

    addLog(`Destroying ${runtimeLabel(runtime)} sandbox...`);
    try {
      await fetch(`/api/daytona/sandbox?sandboxId=${encodeURIComponent(sandboxId)}`, { method: 'DELETE' });
      addLog(`${runtimeLabel(runtime)} sandbox destroyed.`);
    } catch {
      // Ignore errors on cleanup
    }
    clearStoredSandboxId(runtime);
    setRuntimeStatus(runtime, {
      sandboxId: null,
      status: 'idle',
      previewUrl: null,
      error: null,
      logs: [],
    });
  }, [addLog, clearStoredSandboxId, setRuntimeStatus]);

  return {
    ...state,
    createSandbox,
    ensureSandbox,
    prewarmSandboxes,
    syncFiles,
    exec,
    getPreviewUrl,
    startDevServer,
    stopPreviewServer,
    destroySandbox,
    WORK_DIR,
  };
}
