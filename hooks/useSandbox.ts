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

export interface SandboxState {
  sandboxId: string | null;
  status: 'idle' | 'creating' | 'restoring' | 'preparing' | 'syncing' | 'installing' | 'starting' | 'stopping' | 'ready' | 'error';
  previewUrl: string | null;
  error: string | null;
  logs: string[];
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

export function getSandboxPreviewPort(projectType?: string | null): number {
  if (projectType === 'nextjs') return NEXTJS_PREVIEW_PORT;
  if (projectType === 'express-api') return EXPRESS_PREVIEW_PORT;
  if (projectType === 'flask-api') return FLASK_PREVIEW_PORT;
  return STATIC_SITE_PREVIEW_PORT;
}

const getSessionKey = (scope: string) => `${SESSION_KEY_PREFIX}:${scope}`;

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
    status: 'idle',
    previewUrl: null,
    error: null,
    logs: [],
  });

  const sandboxScope = useMemo(() => ownerKey?.trim() || 'anonymous', [ownerKey]);
  const sessionKey = useMemo(() => getSessionKey(sandboxScope), [sandboxScope]);

  // Direct mutable ref for sandboxId - updated immediately, no React batching.
  const sandboxIdRef = useRef<string | null>(null);
  const ensureSandboxPromiseRef = useRef<Promise<string> | null>(null);
  const previewOperationRef = useRef(false);

  const addLog = useCallback((msg: string) => {
    console.log(`[Sandbox] ${msg}`);
    setState((s) => ({ ...s, logs: [...s.logs, msg].slice(-250) }));
  }, []);

  const readStoredSandboxId = useCallback(() => {
    try {
      return sessionStorage.getItem(sessionKey);
    } catch {
      return null;
    }
  }, [sessionKey]);

  const storeSandboxId = useCallback((sandboxId: string) => {
    try {
      sessionStorage.setItem(sessionKey, sandboxId);
    } catch {
      // sessionStorage not available
    }
  }, [sessionKey]);

  const clearStoredSandboxId = useCallback(() => {
    try {
      sessionStorage.removeItem(sessionKey);
    } catch {
      // sessionStorage not available
    }
  }, [sessionKey]);

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

  useEffect(() => {
    ensureSandboxPromiseRef.current = null;
    sandboxIdRef.current = null;

    const storedSandboxId = readStoredSandboxId();
    if (storedSandboxId) {
      sandboxIdRef.current = storedSandboxId;
      setState({
        sandboxId: storedSandboxId,
        status: 'ready',
        previewUrl: null,
        error: null,
        logs: [`Restored reusable sandbox: ${storedSandboxId}`],
      });
      return;
    }

    setState({
      sandboxId: null,
      status: 'idle',
      previewUrl: null,
      error: null,
      logs: [],
    });
  }, [readStoredSandboxId]);

  const ensureSandbox = useCallback(async () => {
    if (ensureSandboxPromiseRef.current) {
      return ensureSandboxPromiseRef.current;
    }

    const promise = (async () => {
      const activeId = sandboxIdRef.current;
      if (activeId) {
        addLog(`Reusing existing sandbox: ${activeId}`);
        setState((s) => ({ ...s, sandboxId: activeId, status: 'ready', error: null }));
        return activeId;
      }

      const storedId = readStoredSandboxId();
      if (storedId) {
        setState((s) => ({ ...s, sandboxId: storedId, status: 'restoring', error: null }));
        addLog(`Restoring reusable sandbox: ${storedId}`);

        const isUsable = await validateSandbox(storedId);
        if (isUsable) {
          sandboxIdRef.current = storedId;
          addLog(`Reusing existing sandbox: ${storedId}`);
          setState((s) => ({ ...s, sandboxId: storedId, status: 'ready', error: null }));
          return storedId;
        }

        addLog('Stored sandbox is no longer available; creating a new sandbox...');
        clearStoredSandboxId();
      }

      setState((s) => ({
        ...s,
        status: 'creating',
        error: null,
        logs: [],
        sandboxId: null,
        previewUrl: null,
      }));
      addLog('Creating sandbox...');

      const data = await apiPost<{ sandboxId: string; status: string }>(
        '/api/daytona/sandbox',
        {}
      );

      sandboxIdRef.current = data.sandboxId;
      storeSandboxId(data.sandboxId);
      addLog(`Sandbox created: ${data.sandboxId}`);
      setState((s) => ({ ...s, sandboxId: data.sandboxId, status: 'ready', error: null }));

      return data.sandboxId;
    })();

    ensureSandboxPromiseRef.current = promise;
    try {
      return await promise;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create sandbox';
      addLog(`ERROR: ${msg}`);
      setState((s) => ({ ...s, status: 'error', error: msg }));
      throw err;
    } finally {
      ensureSandboxPromiseRef.current = null;
    }
  }, [addLog, clearStoredSandboxId, readStoredSandboxId, storeSandboxId, validateSandbox]);

  const createSandbox = useCallback(() => ensureSandbox(), [ensureSandbox]);

  const syncFiles = useCallback(
    async (files: SandboxFile[]) => {
      const sandboxId = sandboxIdRef.current;
      if (!sandboxId) throw new Error('No sandbox');

      const filesToSync = normalizeSandboxFiles(files);
      const repairedFiles = filesToSync.filter((file, index) => file.content !== files[index]?.content);

      setState((s) => ({ ...s, status: 'syncing', error: null }));
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
        setState((s) => ({ ...s, status: 'ready' }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to sync files';
        addLog(`ERROR syncing: ${msg}`);
        setState((s) => ({ ...s, status: 'error', error: msg }));
        throw err;
      }
    },
    [addLog]
  );

  const exec = useCallback(
    async (command: string, cwd?: string, timeout?: number): Promise<ExecResult> => {
      const sandboxId = sandboxIdRef.current;
      if (!sandboxId) throw new Error('No sandbox');

      addLog(`$ ${command}`);
      const result = await apiPost<ExecResult>('/api/daytona/exec', {
        sandboxId,
        command,
        cwd: cwd || WORK_DIR,
        timeout: timeout || 120,
      });
      if (result.stdout) addLog(result.stdout.trim());
      if (result.stderr) addLog(`stderr: ${result.stderr.trim()}`);
      if (result.exitCode !== 0) addLog(`Exit code: ${result.exitCode}`);
      return result;
    },
    [addLog]
  );

  const stopPreviewServer = useCallback(async () => {
    if (!sandboxIdRef.current) return;

    setState((s) => ({ ...s, status: 'stopping', previewUrl: null, error: null }));
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

    const stopResult = await exec(stopCommand, '/', 30);
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
    const verifyStopResult = await exec(verifyStopCommand, '/', 10);
    if (verifyStopResult.stdout.includes('still_responding_on_')) {
      throw new Error(`Previous preview server is still responding: ${verifyStopResult.stdout.trim()}`);
    }

    setState((s) => ({ ...s, status: 'ready', previewUrl: null }));
  }, [addLog, exec]);

  const getPreviewUrl = useCallback(
    async (port: number): Promise<string> => {
      const sandboxId = sandboxIdRef.current;
      if (!sandboxId) throw new Error('No sandbox');

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
        setState((s) => ({ ...s, previewUrl: proxiedUrl }));
        return proxiedUrl;
      } catch (err) {
        clearTimeout(timeoutId);
        if (err instanceof Error && err.name === 'AbortError') {
          throw new Error('Preview URL request timed out after 30s.');
        }
        throw err;
      }
    },
    [addLog]
  );

  const startDevServer = useCallback(
    async (projectType: string, files: SandboxFile[]) => {
      if (previewOperationRef.current) {
        throw new Error('Preview operation already in progress');
      }
      previewOperationRef.current = true;

      try {
        await ensureSandbox();
        await stopPreviewServer();
        const previewPort = getSandboxPreviewPort(projectType);

        setState((s) => ({ ...s, status: 'preparing', error: null, previewUrl: null }));
        addLog('Preparing sandbox workspace...');
        const cleanupCommand = `mkdir -p ${WORK_DIR} && find ${WORK_DIR} -mindepth 1 -maxdepth 1 ! -name node_modules -exec rm -rf -- {} +`;
        const cleanupRes = await exec(cleanupCommand, '/', 60);
        if (cleanupRes.exitCode !== 0) {
          throw new Error(`Workspace cleanup failed: ${cleanupRes.stderr || cleanupRes.stdout}`);
        }

        await syncFiles(files);

        if (projectType === 'nextjs') {
          setState((s) => ({ ...s, status: 'installing' }));
          addLog('Installing npm dependencies (this may take a few minutes)...');
          const installRes = await exec('npm install --prefer-offline --no-audit --no-fund', WORK_DIR, 600);
          if (installRes.exitCode !== 0) {
            throw new Error(`npm install failed: ${installRes.stderr || installRes.stdout}`);
          }

          setState((s) => ({ ...s, status: 'starting' }));
          addLog(`Starting Next.js dev server on 0.0.0.0:${previewPort}...`);
          await exec(`nohup npx next dev -p ${previewPort} -H 0.0.0.0 > /tmp/nextdev.log 2>&1 &`, WORK_DIR, 5);
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
          const checkRes = await exec(nextReadyCheckCommand, WORK_DIR, 150);
          addLog(`Server check: ${checkRes.stdout.trim()}`);

          if (!checkRes.stdout.includes('next_ready')) {
            const logs = await exec('cat /tmp/nextdev.log 2>/dev/null | tail -20', WORK_DIR, 5);
            throw new Error(`Next.js server failed to start: ${logs.stdout.trim() || 'no logs'}`);
          }

          const url = await getPreviewUrl(previewPort);
          setState((s) => ({ ...s, status: 'ready', previewUrl: url }));
          return url;
        }

        if (projectType === 'express-api') {
          setState((s) => ({ ...s, status: 'installing' }));
          addLog('Installing npm dependencies (this may take a few minutes)...');
          const installRes = await exec('npm install --prefer-offline --no-audit --no-fund', WORK_DIR, 600);
          if (installRes.exitCode !== 0) {
            throw new Error(`npm install failed: ${installRes.stderr || installRes.stdout}`);
          }

          setState((s) => ({ ...s, status: 'starting' }));
          addLog(`Starting Express server on 0.0.0.0:${previewPort}...`);
          await exec(`nohup env HOST=0.0.0.0 PORT=${previewPort} node server.js > /tmp/server.log 2>&1 &`, WORK_DIR, 5);
          await new Promise((r) => setTimeout(r, 5000));

          const url = await getPreviewUrl(previewPort);
          setState((s) => ({ ...s, status: 'ready', previewUrl: url }));
          return url;
        }

        if (projectType === 'flask-api') {
          setState((s) => ({ ...s, status: 'installing' }));
          addLog('Installing Python dependencies...');
          await exec('pip install -r requirements.txt', WORK_DIR, 300);

          setState((s) => ({ ...s, status: 'starting' }));
          addLog(`Starting Flask server on 0.0.0.0:${previewPort}...`);
          await exec(`nohup env FLASK_RUN_HOST=0.0.0.0 PORT=${previewPort} python app.py > /tmp/flask.log 2>&1 &`, WORK_DIR, 5);
          await new Promise((r) => setTimeout(r, 5000));

          const url = await getPreviewUrl(previewPort);
          setState((s) => ({ ...s, status: 'ready', previewUrl: url }));
          return url;
        }

        // Static sites, React CDN, Vue CDN, Svelte CDN
        setState((s) => ({ ...s, status: 'starting' }));
        addLog(`Starting HTTP server on 0.0.0.0:${previewPort}...`);
        await exec(`nohup python3 -m http.server ${previewPort} --bind 0.0.0.0 > /tmp/http.log 2>&1 &`, WORK_DIR, 5);
        await new Promise((r) => setTimeout(r, 3000));

        const url = await getPreviewUrl(previewPort);
        setState((s) => ({ ...s, status: 'ready', previewUrl: url }));
        return url;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to start server';
        addLog(`ERROR: ${msg}`);
        setState((s) => ({ ...s, status: 'error', error: msg }));
        throw err;
      } finally {
        previewOperationRef.current = false;
      }
    },
    [addLog, ensureSandbox, exec, getPreviewUrl, stopPreviewServer, syncFiles]
  );

  const destroySandbox = useCallback(async () => {
    const sandboxId = sandboxIdRef.current;
    if (!sandboxId) return;

    sandboxIdRef.current = null;
    ensureSandboxPromiseRef.current = null;

    addLog('Destroying sandbox...');
    try {
      await fetch(`/api/daytona/sandbox?sandboxId=${encodeURIComponent(sandboxId)}`, { method: 'DELETE' });
      addLog('Sandbox destroyed.');
    } catch {
      // Ignore errors on cleanup
    }
    clearStoredSandboxId();
    setState({ sandboxId: null, status: 'idle', previewUrl: null, error: null, logs: [] });
  }, [addLog, clearStoredSandboxId]);

  return {
    ...state,
    createSandbox,
    ensureSandbox,
    syncFiles,
    exec,
    getPreviewUrl,
    startDevServer,
    stopPreviewServer,
    destroySandbox,
    WORK_DIR,
  };
}
