import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const aiModelsPath = path.resolve('lib/ai-models.ts');
const nvidiaPath = path.resolve('lib/nvidia-ai.ts');
const vertexPath = path.resolve('lib/vertex-ai.ts');
const modelsRoutePath = path.resolve('app/api/ai/models/route.ts');
const generateRoutePath = path.resolve('app/api/ai/generate/route.ts');
const pagePath = path.resolve('app/page.tsx');
const readmePath = path.resolve('README.md');

assert.ok(fs.existsSync(aiModelsPath), 'shared AI model metadata helpers should exist');
assert.ok(fs.existsSync(nvidiaPath), 'NVIDIA provider module should exist');

const aiModelsSource = fs.readFileSync(aiModelsPath, 'utf8');
const nvidiaSource = fs.readFileSync(nvidiaPath, 'utf8');
const vertexSource = fs.readFileSync(vertexPath, 'utf8');
const modelsRouteSource = fs.readFileSync(modelsRoutePath, 'utf8');
const generateRouteSource = fs.readFileSync(generateRoutePath, 'utf8');
const pageSource = fs.readFileSync(pagePath, 'utf8');
const readmeSource = fs.readFileSync(readmePath, 'utf8');

assert.match(
  aiModelsSource,
  /export type AiModelProvider = 'vertex' \| 'nvidia'/,
  'model options should carry an explicit provider'
);
assert.match(
  aiModelsSource,
  /export const NVIDIA_MODEL_PREFIX = 'nvidia:'/,
  'NVIDIA model selections should be namespaced to avoid colliding with Gemini ids'
);
assert.match(
  nvidiaSource,
  /https:\/\/integrate\.api\.nvidia\.com\/v1/,
  'NVIDIA generation should target NVIDIA NIM OpenAI-compatible API base URL'
);
assert.match(
  nvidiaSource,
  /process\.env\.NVIDIA_API_KEY/,
  'NVIDIA generation should use a server-side NVIDIA_API_KEY'
);
assert.match(
  nvidiaSource,
  /Authorization: `Bearer \$\{apiKey\}`/,
  'NVIDIA requests should authenticate with a bearer token'
);
assert.match(
  nvidiaSource,
  /qwen\/qwen3-coder-480b-a35b-instruct/,
  'NVIDIA model list should include a strong code model from the NVIDIA catalog'
);
assert.match(
  nvidiaSource,
  /nvidia\/nemotron-3-super-120b-a12b/,
  'NVIDIA model list should include Nemotron Super'
);
assert.match(
  nvidiaSource,
  /moonshotai\/kimi-k2-instruct/,
  'NVIDIA model list should include Kimi K2'
);
assert.match(
  vertexSource,
  /provider: 'vertex'/,
  'Vertex models should be tagged as Vertex provider models'
);
assert.match(
  modelsRouteSource,
  /listNvidiaTextModels/,
  'models route should include NVIDIA model options'
);
assert.match(
  generateRouteSource,
  /isNvidiaModelSelection\(body\.model\)/,
  'generate route should branch to NVIDIA when a namespaced NVIDIA model is selected'
);
assert.match(
  generateRouteSource,
  /generateNvidiaChatCompletion/,
  'generate route should call the NVIDIA provider for NVIDIA models'
);
assert.match(
  pageSource,
  /optgroup key=\{provider\} label=\{getAiModelProviderLabel\(provider\)\}/,
  'settings should group model options by provider'
);
assert.match(
  pageSource,
  /Failed to load AI models/,
  'settings errors should no longer mention only Vertex AI'
);
assert.match(
  readmeSource,
  /NVIDIA_API_KEY/,
  'README should document the optional NVIDIA API key'
);
