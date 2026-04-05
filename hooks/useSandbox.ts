import { useState, useCallback, useRef, useEffect } from 'react';

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
  status: 'idle' | 'creating' | 'syncing' | 'installing' | 'starting' | 'ready' | 'error';
  previewUrl: string | null;
  error: string | null;
  logs: string[];
}

const WORK_DIR = '/home/daytona/project';
const SESSION_KEY = 'daytona_sandbox_id';

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

/** Fire-and-forget sandbox deletion — works even during page unload */
function deleteSandboxFireAndForget(sandboxId: string) {
  const url = `/api/daytona/sandbox?sandboxId=${encodeURIComponent(sandboxId)}`;
  fetch(url, { method: 'DELETE', keepalive: true }).catch(() => {});
}

export function useSandbox() {
  const [state, setState] = useState<SandboxState>({
    sandboxId: null,
    status: 'idle',
    previewUrl: null,
    error: null,
    logs: [],
  });

  // Direct mutable ref for sandboxId — updated immediately, no React batching
  const sandboxIdRef = useRef<string | null>(null);
  const busyRef = useRef(false); // Prevent double-invocation

  const addLog = useCallback((msg: string) => {
    console.log(`[Sandbox] ${msg}`);
    setState((s) => ({ ...s, logs: [...s.logs, msg] }));
  }, []);

  // Clean up any orphaned sandbox from a previous session on mount
  useEffect(() => {
    try {
      const orphanedId = sessionStorage.getItem(SESSION_KEY);
      if (orphanedId) {
        console.log(`[Sandbox] Cleaning up orphaned sandbox: ${orphanedId}`);
        deleteSandboxFireAndForget(orphanedId);
        sessionStorage.removeItem(SESSION_KEY);
      }
    } catch {
      // sessionStorage not available
    }
  }, []);

  const createSandbox = useCallback(async () => {
    // Guard against double-invocation
    if (busyRef.current) {
      addLog('Sandbox operation already in progress, skipping...');
      throw new Error('Sandbox operation already in progress');
    }
    busyRef.current = true;

    try {
      // Destroy any existing sandbox first
      const existingId = sandboxIdRef.current;
      if (existingId) {
        addLog('Destroying previous sandbox...');
        sandboxIdRef.current = null;
        try {
          await fetch(`/api/daytona/sandbox?sandboxId=${encodeURIComponent(existingId)}`, { method: 'DELETE' });
        } catch {
          // Ignore cleanup errors
        }
        try { sessionStorage.removeItem(SESSION_KEY); } catch {}
      }

      setState((s) => ({ ...s, status: 'creating', error: null, logs: [], sandboxId: null, previewUrl: null }));
      addLog('Creating sandbox...');

      const data = await apiPost<{ sandboxId: string; status: string }>(
        '/api/daytona/sandbox',
        {}
      );

      // Store sandboxId in ref IMMEDIATELY — no React batching delay
      sandboxIdRef.current = data.sandboxId;
      addLog(`Sandbox created: ${data.sandboxId}`);
      setState((s) => ({ ...s, sandboxId: data.sandboxId, status: 'ready' }));

      // Persist for orphan cleanup on refresh
      try { sessionStorage.setItem(SESSION_KEY, data.sandboxId); } catch {}

      return data.sandboxId;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create sandbox';
      if (msg !== 'Sandbox operation already in progress') {
        addLog(`ERROR: ${msg}`);
      }
      setState((s) => ({ ...s, status: 'error', error: msg }));
      throw err;
    } finally {
      busyRef.current = false;
    }
  }, [addLog]);

  const syncFiles = useCallback(
    async (files: SandboxFile[]) => {
      const sandboxId = sandboxIdRef.current;
      if (!sandboxId) throw new Error('No sandbox');

      setState((s) => ({ ...s, status: 'syncing', error: null }));
      addLog(`Syncing ${files.length} files...`);
      try {
        const res = await apiPost<{ status: string; fileCount: number; workDir: string }>(
          '/api/daytona/files',
          { sandboxId, files, workDir: WORK_DIR }
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

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || `Preview API error: ${res.status}`);
        }

        // Append token to URL so the iframe can bypass proxy authentication
        // Without this, the proxy redirects to a login page which fails in cross-origin iframes
        let fullUrl = data.url;
        if (data.token) {
          const separator = fullUrl.includes('?') ? '&' : '?';
          fullUrl = `${fullUrl}${separator}token=${encodeURIComponent(data.token)}`;
        }

        addLog(`Preview URL: ${fullUrl}`);
        setState((s) => ({ ...s, previewUrl: fullUrl }));
        return fullUrl;
      } catch (err) {
        clearTimeout(timeoutId);
        if (err instanceof Error && err.name === 'AbortError') {
          throw new Error('Preview URL request timed out after 30s. Check that the Daytona proxy service is running on port 4000.');
        }
        throw err;
      }
    },
    [addLog]
  );

  const startDevServer = useCallback(
    async (projectType: string, files: SandboxFile[]) => {
      const sandboxId = sandboxIdRef.current;
      if (!sandboxId) throw new Error('No sandbox');

      try {
        // Step 1: Sync files
        await syncFiles(files);

        // Step 2: Install dependencies + start server based on project type
        if (projectType === 'nextjs') {
          setState((s) => ({ ...s, status: 'installing' }));
          addLog('Installing npm dependencies (this may take a few minutes)...');
          const installRes = await exec('npm install --prefer-offline --no-audit --no-fund', WORK_DIR, 600);
          if (installRes.exitCode !== 0) {
            throw new Error(`npm install failed: ${installRes.stderr || installRes.stdout}`);
          }

          setState((s) => ({ ...s, status: 'starting' }));
          addLog('Starting Next.js dev server on 0.0.0.0:3000...');
          await exec('nohup npx next dev -p 3000 -H 0.0.0.0 > /tmp/nextdev.log 2>&1 &', WORK_DIR, 5);
          addLog('Waiting for server to start (first compile may take a moment)...');
          await new Promise((r) => setTimeout(r, 15000));

          // Non-blocking health check — server may still be compiling first page
          const checkRes = await exec('curl -s -o /dev/null -w "%{http_code}" http://0.0.0.0:3000 2>/dev/null || echo "not_ready"', WORK_DIR, 30);
          addLog(`Server check: ${checkRes.stdout.trim()}`);

          if (checkRes.stdout.trim() !== '200') {
            const logs = await exec('cat /tmp/nextdev.log 2>/dev/null | tail -20', WORK_DIR, 5);
            addLog(`Server logs (may still be compiling): ${logs.stdout.trim() || 'empty'}`);
          }

          const url = await getPreviewUrl(3000);
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
          addLog('Starting Express server on 0.0.0.0:3000...');
          await exec('nohup env HOST=0.0.0.0 node server.js > /tmp/server.log 2>&1 &', WORK_DIR, 5);
          await new Promise((r) => setTimeout(r, 5000));

          const url = await getPreviewUrl(3000);
          setState((s) => ({ ...s, status: 'ready', previewUrl: url }));
          return url;
        }

        if (projectType === 'flask-api') {
          setState((s) => ({ ...s, status: 'installing' }));
          addLog('Installing Python dependencies...');
          await exec('pip install -r requirements.txt', WORK_DIR, 300);

          setState((s) => ({ ...s, status: 'starting' }));
          addLog('Starting Flask server on 0.0.0.0:5000...');
          await exec('nohup env FLASK_RUN_HOST=0.0.0.0 python app.py > /tmp/flask.log 2>&1 &', WORK_DIR, 5);
          await new Promise((r) => setTimeout(r, 5000));

          const url = await getPreviewUrl(5000);
          setState((s) => ({ ...s, status: 'ready', previewUrl: url }));
          return url;
        }

        // Static sites, React CDN, Vue CDN, Svelte CDN
        setState((s) => ({ ...s, status: 'starting' }));
        addLog('Starting HTTP server on 0.0.0.0:3000...');
        await exec('nohup python3 -m http.server 3000 --bind 0.0.0.0 > /tmp/http.log 2>&1 &', WORK_DIR, 5);
        await new Promise((r) => setTimeout(r, 3000));

        const url = await getPreviewUrl(3000);
        setState((s) => ({ ...s, status: 'ready', previewUrl: url }));
        return url;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to start server';
        addLog(`ERROR: ${msg}`);
        setState((s) => ({ ...s, status: 'error', error: msg }));
        throw err;
      }
    },
    [syncFiles, exec, getPreviewUrl, addLog]
  );

  const destroySandbox = useCallback(async () => {
    const sandboxId = sandboxIdRef.current;
    if (!sandboxId) return;

    // Clear ref immediately to prevent any further operations
    sandboxIdRef.current = null;
    busyRef.current = false;

    addLog('Destroying sandbox...');
    try {
      await fetch(`/api/daytona/sandbox?sandboxId=${encodeURIComponent(sandboxId)}`, { method: 'DELETE' });
      addLog('Sandbox destroyed.');
    } catch {
      // Ignore errors on cleanup
    }
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
    setState({ sandboxId: null, status: 'idle', previewUrl: null, error: null, logs: [] });
  }, [addLog]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const sid = sandboxIdRef.current;
      if (sid) {
        deleteSandboxFireAndForget(sid);
        try { sessionStorage.removeItem(SESSION_KEY); } catch {}
      }
    };
  }, []);

  // Cleanup on tab/window close
  useEffect(() => {
    const handleBeforeUnload = () => {
      const sid = sandboxIdRef.current;
      if (sid) {
        deleteSandboxFireAndForget(sid);
        try { sessionStorage.removeItem(SESSION_KEY); } catch {}
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return {
    ...state,
    createSandbox,
    syncFiles,
    exec,
    getPreviewUrl,
    startDevServer,
    destroySandbox,
    WORK_DIR,
  };
}
