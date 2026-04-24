import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const pagePath = path.resolve('app/page.tsx');
const proxyPath = path.resolve('app/api/sandbox-proxy/route.ts');
const terminalPath = path.resolve('components/Terminal.tsx');

const pageSource = fs.readFileSync(pagePath, 'utf8');
const proxySource = fs.readFileSync(proxyPath, 'utf8');
const terminalSource = fs.readFileSync(terminalPath, 'utf8');

assert.match(
  proxySource,
  /window\.parent\.postMessage\(\{\s*type:\s*'CONSOLE_LOG'/s,
  'Sandbox proxy should forward iframe console messages to the parent window'
);
assert.match(
  proxySource,
  /console\.error\s*=\s*function/,
  'Sandbox proxy should patch console.error before app scripts run'
);
assert.match(
  proxySource,
  /addEventListener\('error'/,
  'Sandbox proxy should forward uncaught runtime errors'
);
assert.match(
  proxySource,
  /addEventListener\('unhandledrejection'/,
  'Sandbox proxy should forward unhandled promise rejections'
);

const sandboxPreviewIndex = pageSource.indexOf('isSandboxPreview && sandbox.previewUrl');
assert.notEqual(sandboxPreviewIndex, -1, 'Sandbox preview branch should exist');

const sandboxPreviewSource = pageSource.slice(sandboxPreviewIndex, pageSource.indexOf(') : isSandboxPreview && !sandbox.previewUrl', sandboxPreviewIndex));

assert.match(
  sandboxPreviewSource,
  /sandboxPreviewGridColumns/,
  'Sandbox preview bottom panel should use the computed Terminal/Console column layout'
);
assert.match(
  sandboxPreviewSource,
  /<Terminal[\s\S]*<ConsolePanel/,
  'Sandbox preview should render the Terminal next to the Console panel'
);

assert.match(
  pageSource,
  /isSandboxTerminalExpanded/,
  'Sandbox preview should track Terminal visibility separately'
);
assert.match(
  pageSource,
  /isSandboxConsoleExpanded/,
  'Sandbox preview should track Console visibility separately'
);
assert.match(
  pageSource,
  /sandboxPreviewPanelCount === 1 \? 'grid-cols-1' : 'grid-cols-2'/,
  'Sandbox preview should let one visible panel use the full tools width'
);
assert.match(
  pageSource,
  /Show Terminal/,
  'Sandbox preview should provide a restore control for a hidden Terminal'
);
assert.match(
  pageSource,
  /Show Console/,
  'Sandbox preview should provide a restore control for a hidden Console'
);
assert.match(
  terminalSource,
  /collapsible\?: boolean/,
  'Terminal should expose the same curtain-style collapse behavior as Console'
);
assert.match(
  terminalSource,
  /onToggleExpanded\?: \(\) => void/,
  'Terminal should allow the preview layout to hide it from its header'
);
