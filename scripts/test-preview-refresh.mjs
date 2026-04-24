import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const pagePath = path.resolve('app/page.tsx');
const hookPath = path.resolve('hooks/useSandbox.ts');
const source = fs.readFileSync(pagePath, 'utf8');
const hookSource = fs.readFileSync(hookPath, 'utf8');

const titleIndex = source.indexOf('title="Refresh Preview"');
assert.notEqual(titleIndex, -1, 'Refresh Preview button should be present');

const handlerStart = source.lastIndexOf('onClick={async () => {', titleIndex);
assert.notEqual(handlerStart, -1, 'Refresh Preview click handler should be present');

const handlerSource = source.slice(handlerStart, titleIndex);
const handlerEnd = handlerSource.indexOf('\n                    }}');
assert.notEqual(handlerEnd, -1, 'Refresh Preview click handler should close before the button title');

const refreshHandler = handlerSource.slice(0, handlerEnd);
const syncIndex = refreshHandler.indexOf('await sandbox.syncFiles(sandboxFiles)');
const previewIndex = refreshHandler.indexOf('await sandbox.getPreviewUrl(');
const portHelperIndex = refreshHandler.indexOf('getSandboxPreviewPort(currentProject?.projectType');
const keyIndex = refreshHandler.indexOf('setPreviewKey((prev) => prev + 1)');

assert.notEqual(syncIndex, -1, 'Sandbox refresh should sync files before reloading preview');
assert.notEqual(previewIndex, -1, 'Sandbox refresh should request a fresh preview URL');
assert.notEqual(portHelperIndex, -1, 'Sandbox refresh should use the project type-specific preview port');
assert.notEqual(keyIndex, -1, 'Sandbox refresh should reload the iframe after refreshing');
assert.ok(
  syncIndex < previewIndex && previewIndex < keyIndex,
  'Sandbox refresh should sync files, refresh preview URL, then reload the iframe'
);

const waitFunctionIndex = hookSource.indexOf('async function waitForPreviewProxy');
const waitCallIndex = hookSource.indexOf('await waitForPreviewProxy(proxiedUrl)');
const setPreviewIndex = hookSource.indexOf('previewUrl: proxiedUrl');

assert.notEqual(waitFunctionIndex, -1, 'useSandbox should define preview proxy readiness polling');
assert.notEqual(waitCallIndex, -1, 'getPreviewUrl should wait until the proxy URL is fetchable');
assert.notEqual(setPreviewIndex, -1, 'getPreviewUrl should store the proxied preview URL');
assert.ok(
  waitCallIndex < setPreviewIndex,
  'getPreviewUrl should wait for the proxy before exposing the URL to the iframe'
);
