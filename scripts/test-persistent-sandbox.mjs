import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const hookPath = path.resolve('hooks/useSandbox.ts');
const pagePath = path.resolve('app/page.tsx');

const hookSource = fs.readFileSync(hookPath, 'utf8');
const pageSource = fs.readFileSync(pagePath, 'utf8');

assert.match(
  hookSource,
  /export function useSandbox\(ownerKey\?: string \| null\)/,
  'useSandbox should scope the reusable sandbox to the current user'
);
assert.match(
  hookSource,
  /export type SandboxRuntime = 'next' \| 'node-api' \| 'python-api'/,
  'useSandbox should group reusable sandboxes by a small non-static runtime pool'
);
assert.match(
  hookSource,
  /const RUNTIME_PREWARM_ORDER: SandboxRuntime\[\] = \['next', 'node-api', 'python-api'\]/,
  'useSandbox should prewarm at most three non-static runtime sandboxes per user'
);
assert.match(
  hookSource,
  /export function getSandboxRuntime\(projectType\?: string \| null\): SandboxRuntime \| null/,
  'project types should map to a reusable runtime sandbox only when a sandbox is required'
);
assert.match(
  hookSource,
  /return null;/,
  'static and CDN-only projects should not require a sandbox runtime'
);
assert.match(
  hookSource,
  /const getSessionKey = \(scope: string, runtime: SandboxRuntime\)/,
  'useSandbox should store sandbox ids under user and runtime scoped keys'
);
assert.match(
  hookSource,
  /sandboxPoolRef/,
  'useSandbox should keep a per-runtime sandbox pool instead of one global sandbox id'
);
assert.match(
  hookSource,
  /bootstrapSandboxRuntime/,
  'runtime sandboxes should be bootstrapped so common dependencies are warmed'
);
assert.match(
  hookSource,
  /const NEXTJS_PREVIEW_PORT = 3001/,
  'Next.js previews should use a dedicated port instead of colliding with legacy static previews on 3000'
);
assert.match(
  hookSource,
  /const STATIC_SITE_PREVIEW_PORT = 4173/,
  'Static previews should use a dedicated static-server port'
);
assert.match(
  hookSource,
  /export function getSandboxPreviewPort/,
  'preview port selection should be centralized for start and refresh flows'
);
assert.match(
  hookSource,
  /const ensureSandbox = useCallback[\s\S]*runtime: SandboxRuntime = activeRuntimeRef\.current/,
  'useSandbox should expose an ensureSandbox lifecycle method'
);
assert.match(
  hookSource,
  /const prewarmSandboxes = useCallback/,
  'useSandbox should expose a prewarmSandboxes lifecycle method'
);
assert.match(
  hookSource,
  /Reusing existing sandbox/,
  'ensureSandbox should reuse an existing sandbox instead of always creating a new one'
);
assert.doesNotMatch(
  hookSource,
  /Destroy any existing sandbox first/,
  'create/ensure sandbox should not delete an existing sandbox before starting preview'
);
assert.match(
  hookSource,
  /const stopPreviewServer = useCallback/,
  'useSandbox should expose a way to stop the active preview server without deleting the sandbox'
);
assert.match(
  hookSource,
  /\[p\]ython -m http\.server/,
  'stopPreviewServer should kill both python and python3 static http servers'
);
assert.match(
  hookSource,
  /lsof -ti:\$port/,
  'stopPreviewServer should fall back to killing processes by port'
);
assert.match(
  hookSource,
  /ps -eo pid=,args=/,
  'stopPreviewServer should fall back to matching process command lines when port tools are unavailable'
);
assert.match(
  hookSource,
  /previewOperationRef/,
  'startDevServer should prevent overlapping preview restarts during fast project switches'
);
assert.match(
  hookSource,
  /Preview operation already in progress/,
  'overlapping preview restarts should fail fast instead of interleaving servers'
);
assert.match(
  hookSource,
  /const KILL_PREVIEW_PORTS = \[3000,/,
  'stopPreviewServer should still best-effort kill legacy port 3000'
);
assert.match(
  hookSource,
  /const VERIFY_PREVIEW_PORTS = MANAGED_PREVIEW_PORTS/,
  'stopPreviewServer should only block on managed ports that can collide with future previews'
);
assert.match(
  hookSource,
  /for port in \$\{VERIFY_PREVIEW_PORTS\.join\(' '\)\}; do/,
  'stopPreviewServer should verify managed preview ports stopped responding'
);
assert.match(
  hookSource,
  /const stopCommand = \[/,
  'stopPreviewServer should build the stop script from readable lines'
);
assert.match(
  hookSource,
  /stopCommand = \[[\s\S]*\]\.join\('\\n'\)/,
  'stopPreviewServer should join shell control-flow lines with newlines, not semicolons'
);
assert.match(
  hookSource,
  /verifyStopCommand = \[[\s\S]*\]\.join\('\\n'\)/,
  'stopPreviewServer should join verification shell control-flow lines with newlines, not semicolons'
);
assert.match(
  hookSource,
  /find \$\{WORK_DIR\} -mindepth 1 -maxdepth 1 ! -name node_modules -exec rm -rf -- \{\} \+/,
  'startDevServer should clean project files while preserving node_modules for faster reinstalls'
);
assert.match(
  hookSource,
  /Directory listing for \//,
  'Next.js readiness checks should reject stale static directory listings'
);
assert.match(
  hookSource,
  /_next\/static|self\\\.__next_f/,
  'Next.js readiness checks should verify that the response is served by Next'
);
assert.match(
  hookSource,
  /npx next dev -p \$\{previewPort\}/,
  'Next.js should start on the centralized preview port'
);
assert.match(
  hookSource,
  /await stopPreviewServer\(runtime\)/,
  'startDevServer should stop any previous preview server before syncing a new project'
);
assert.match(
  hookSource,
  /const runtime = getSandboxRuntime\(projectType\)/,
  'startDevServer should select the reusable sandbox pool from the project type'
);

assert.match(
  pageSource,
  /useSandbox\(user\?\.uid\)/,
  'the app should scope sandbox reuse to the authenticated user'
);
assert.match(
  pageSource,
  /const sandboxRuntime = getSandboxRuntime\(projectType\)/,
  'the preview start flow should ensure/reuse the runtime sandbox instead of creating a fresh one'
);
assert.match(
  pageSource,
  /if \(!sandboxRuntime\)[\s\S]*setIsSandboxPreview\(false\)[\s\S]*setPreviewKey\(\(prev\) => prev \+ 1\)/,
  'static previews should refresh locally instead of creating or using a sandbox'
);
assert.match(
  pageSource,
  /getSandboxPreviewPort\(currentProject\?\.projectType/,
  'manual refresh should request the preview URL for the project type-specific port'
);
assert.match(
  pageSource,
  /stopSandboxPreviewServer\(\)/,
  'the Stop button should stop preview processes without destroying the sandbox'
);
assert.match(
  pageSource,
  /prewarmedSandboxUserRef/,
  'the app should track runtime sandbox prewarm after login'
);
assert.match(
  pageSource,
  /prewarmSandboxes\(\)/,
  'the app should prewarm the non-static runtime sandbox pool after login'
);
assert.match(
  pageSource,
  /currentSandboxRuntime/,
  'the preview UI should distinguish sandbox-backed projects from local static previews'
);
assert.match(
  pageSource,
  /currentSandboxRuntime && \(/,
  'the preview UI should only show sandbox start/stop controls for sandbox-backed projects'
);
assert.match(
  pageSource,
  /const startSandboxPreview = useCallback/,
  'the app should share one start/restart preview flow between manual and automatic starts'
);
assert.match(
  pageSource,
  /autoPreviewRunKeyRef/,
  'the app should avoid repeatedly auto-starting the same preview input'
);
assert.match(
  pageSource,
  /await startSandboxDevServer\(projectType, sandboxFiles\);\s*autoPreviewRunKeyRef\.current = currentPreviewSourceKey;/,
  'a successful sandbox start should remember the exact project/files already running'
);
assert.match(
  pageSource,
  /sandbox\.previewUrl &&\s*currentPreviewSourceKey &&\s*autoPreviewRunKeyRef\.current === currentPreviewSourceKey[\s\S]*setIsSandboxPreview\(true\)[\s\S]*setSandboxServerStarted\(true\)/,
  'returning to the same sandbox-backed project should restore the existing preview instead of restarting it'
);
assert.match(
  pageSource,
  /filesLoadedProjectId === currentProject\.id/,
  'automatic preview should wait for the selected project files to finish loading'
);
assert.match(
  pageSource,
  /activeTab !== 'preview'/,
  'automatic preview should only run when the user enters the Preview tab'
);
assert.match(
  pageSource,
  /startSandboxPreview\('auto'\)/,
  'entering Preview should automatically start or refresh the sandbox app'
);

const projectSwitchEffectIndex = pageSource.indexOf('useEffect(() => {\n    if (currentProject?.id) {');
assert.notEqual(projectSwitchEffectIndex, -1, 'project switch reset effect should exist');
const projectSwitchEffectSource = pageSource.slice(
  projectSwitchEffectIndex,
  pageSource.indexOf('  useEffect(() => {\n    if (currentSandboxRuntime)', projectSwitchEffectIndex)
);
assert.doesNotMatch(
  projectSwitchEffectSource,
  /autoPreviewRunKeyRef\.current = null/,
  'switching through a static project should not forget an unchanged running sandbox preview'
);
assert.doesNotMatch(
  pageSource,
  /if \(mode === 'auto'\) \{\s*autoPreviewRunKeyRef\.current = null;\s*\}/,
  'automatic preview failures should not immediately retry the same broken input in a loop'
);
assert.doesNotMatch(
  pageSource,
  /No files to deploy'[\s\S]{0,160}sandbox\.destroySandbox/,
  'empty previews should not destroy the reusable sandbox'
);
