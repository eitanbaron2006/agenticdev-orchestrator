import assert from 'node:assert/strict';
import fs from 'node:fs';

const pageSource = fs.readFileSync('app/page.tsx', 'utf8');
const prewarmEffectIndex = pageSource.indexOf('prewarmedSandboxUserRef.current = user.uid');

assert.notEqual(
  prewarmEffectIndex,
  -1,
  'the app should prewarm Daytona sandboxes after an authenticated user is available'
);

const prewarmEffectStart = pageSource.lastIndexOf('useEffect(() => {', prewarmEffectIndex);
const prewarmEffectEnd = pageSource.indexOf('}, [', prewarmEffectIndex);
const prewarmEffectSource = pageSource.slice(prewarmEffectStart, prewarmEffectEnd);

assert.match(
  prewarmEffectSource,
  /if \(!user\?\.uid\) return;/,
  'sandbox prewarm should be gated by authenticated user only'
);

assert.doesNotMatch(
  prewarmEffectSource,
  /view\s*!==\s*['"]app['"]/,
  'sandbox prewarm should not depend on the current view state'
);

console.log('Sandbox login prewarm test passed');
