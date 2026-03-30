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

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `API error: ${res.status}`);
  return data as T;
}

export function useSandbox() {
  const [state, setState] = useState<SandboxState>({
    sandboxId: null,
    status: 'idle',
    previewUrl: null,
    error: null,
    logs: [],
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const addLog = useCallback((msg: string) => {
    console.log(`[Sandbox] ${msg}`);
    setState((s) => ({ ...s, logs: [...s.logs, msg] }));
  }, []);

  const createSandbox = useCallback(async () => {
    setState((s) => ({ ...s, status: 'creating', error: null, logs: [] }));
    addLog('Creating sandbox...');
    try {
      const data = await apiPost<{ sandboxId: string; status: string }>(
        '/api/daytona/sandbox',
        {}
      );
      addLog(`Sandbox created: ${data.sandboxId}`);
      setState((s) => ({ ...s, sandboxId: data.sandboxId, status: 'ready' }));
      return data.sandboxId;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create sandbox';
      addLog(`ERROR: ${msg}`);
      setState((s) => ({ ...s, status: 'error', error: msg }));
      throw err;
    }
  }, [addLog]);

  const syncFiles = useCallback(
    async (files: SandboxFile[]) => {
      const sandboxId = stateRef.current.sandboxId;
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
      const sandboxId = stateRef.current.sandboxId;
      if (!sandboxId) throw new Error('No sandbox');

      addLog(`$ ${command}`);
      const result = await apiPost<ExecResult>('/api/daytona/exec', {
        sandboxId,
        command,
        cwd: cwd || WORK_DIR,
        timeout: timeout || 60,
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
      const sandboxId = stateRef.current.sandboxId;
      if (!sandboxId) throw new Error('No sandbox');

      addLog(`Getting preview URL for port ${port}...`);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      try {
        const res = await fetch(
          `/api/daytona/exec?sandboxId=${encodeURIComponent(sandboxId)}&port=${port}`,
          { signal: controller.signal }
        );
        clearTimeout(timeout);

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || `Preview API error: ${res.status}`);
        }

        addLog(`Preview URL: ${data.url}`);
        setState((s) => ({ ...s, previewUrl: data.url }));
        return data.url;
      } catch (err) {
        clearTimeout(timeout);
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
      const sandboxId = stateRef.current.sandboxId;
      if (!sandboxId) throw new Error('No sandbox');

      try {
        // Step 1: Sync files
        await syncFiles(files);

        // Step 2: Install dependencies + start server based on project type
        if (projectType === 'nextjs') {
          setState((s) => ({ ...s, status: 'installing' }));
          addLog('Installing npm dependencies (this may take a minute)...');
          const installRes = await exec('npm install --prefer-offline', WORK_DIR, 300);
          if (installRes.exitCode !== 0) {
            throw new Error(`npm install failed: ${installRes.stderr || installRes.stdout}`);
          }

          setState((s) => ({ ...s, status: 'starting' }));
          addLog('Starting Next.js dev server on 0.0.0.0:3000...');
          await exec('nohup npx next dev -p 3000 -H 0.0.0.0 > /tmp/nextdev.log 2>&1 &', WORK_DIR, 5);
          addLog('Waiting for server to start...');
          await new Promise((r) => setTimeout(r, 10000));

          // Verify server is running
          const checkRes = await exec('curl -s -o /dev/null -w "%{http_code}" http://0.0.0.0:3000 2>/dev/null || echo "not_ready"', WORK_DIR, 10);
          addLog(`Server check: ${checkRes.stdout.trim()}`);

          // Check server logs if curl fails
          if (checkRes.stdout.trim() !== '200') {
            const logs = await exec('cat /tmp/nextdev.log 2>/dev/null | tail -20', WORK_DIR, 5);
            addLog(`Server logs: ${logs.stdout.trim() || 'empty'}`);
          }

          const url = await getPreviewUrl(3000);
          setState((s) => ({ ...s, status: 'ready', previewUrl: url }));
          return url;
        }

        if (projectType === 'express-api') {
          setState((s) => ({ ...s, status: 'installing' }));
          addLog('Installing npm dependencies...');
          const installRes = await exec('npm install --prefer-offline', WORK_DIR, 300);
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
    const sandboxId = stateRef.current.sandboxId;
    if (!sandboxId) return;

    addLog('Destroying sandbox...');
    try {
      await fetch(`/api/daytona/sandbox?sandboxId=${sandboxId}`, { method: 'DELETE' });
      addLog('Sandbox destroyed.');
    } catch {
      // Ignore errors on cleanup
    }
    setState({ sandboxId: null, status: 'idle', previewUrl: null, error: null, logs: [] });
  }, [addLog]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const sid = stateRef.current.sandboxId;
      if (sid) {
        fetch(`/api/daytona/sandbox?sandboxId=${sid}`, { method: 'DELETE' }).catch(() => {});
      }
    };
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
