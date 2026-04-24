import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const sourcePath = path.resolve('lib/sandbox-files.ts');
const source = fs.readFileSync(sourcePath, 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
});

const sandbox = {
  exports: {},
  module: { exports: {} },
  require,
  URL,
  URLSearchParams,
};
sandbox.exports = sandbox.module.exports;
vm.runInNewContext(outputText, sandbox, { filename: sourcePath });

const {
  normalizeSandboxFiles,
  buildSandboxPreviewUrl,
  getSandboxPopoutUrl,
  getSandboxProxyFetchTarget,
  getSandboxHttpStatus,
  isSandboxServerReady,
  shouldKeepSandboxOpenAfterStartError,
} = sandbox.module.exports;

const corruptTsconfig = `{
  "compilerOptions": {
    "noEmit":\u0000\u0001 true
  }
`;

const normalized = normalizeSandboxFiles([
  { path: 'tsconfig.json', content: corruptTsconfig },
  { path: 'app/page.tsx', content: 'export default function Page() { return null; }' },
]);

const tsconfig = normalized.find((file) => file.path === 'tsconfig.json');
assert.ok(tsconfig, 'tsconfig should still exist after normalization');
assert.doesNotThrow(() => JSON.parse(tsconfig.content), 'repaired tsconfig should be valid JSON');
assert.match(tsconfig.content, /"noEmit": true/);

const validTsconfig = '{ "compilerOptions": { "strict": false } }';
const preserved = normalizeSandboxFiles([{ path: 'tsconfig.json', content: validTsconfig }]);
assert.equal(preserved[0].content, validTsconfig, 'valid tsconfig should be preserved');

const previewUrl = buildSandboxPreviewUrl(
  'http://3000-sandbox.proxy.localhost:4000',
  'preview-token'
);
assert.equal(
  previewUrl,
  '/api/sandbox-proxy?url=http%3A%2F%2F3000-sandbox.proxy.localhost%3A4000&token=preview-token'
);

assert.equal(
  getSandboxPopoutUrl(previewUrl, 'http://127.0.0.1:3002'),
  'http://127.0.0.1:3002/api/sandbox-proxy?url=http%3A%2F%2F3000-sandbox.proxy.localhost%3A4000&token=preview-token'
);

assert.equal(
  JSON.stringify(getSandboxProxyFetchTarget('http://3000-sandbox.proxy.localhost:4000/_next/static/app.js?v=1')),
  JSON.stringify({
    fetchUrl: 'http://127.0.0.1:4000/_next/static/app.js?v=1',
    hostHeader: '3000-sandbox.proxy.localhost:4000',
  })
);

const readyOutput = `/usr/bin/bash: warning: setlocale: LC_ALL: cannot change locale (en_US.UTF-8): No such file or directory
200
`;
assert.equal(getSandboxHttpStatus(readyOutput), '200');
assert.equal(isSandboxServerReady(readyOutput), true);
assert.equal(getSandboxHttpStatus('stderr noise\n500\n'), '500');
assert.equal(isSandboxServerReady('stderr noise\n500\n'), true);
assert.equal(getSandboxHttpStatus('000not_ready\n'), null);
assert.equal(isSandboxServerReady('000not_ready\n'), false);
assert.equal(shouldKeepSandboxOpenAfterStartError(true), true);
assert.equal(shouldKeepSandboxOpenAfterStartError(false), false);
