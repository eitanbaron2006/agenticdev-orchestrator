import { GoogleGenAI, type GoogleGenAIOptions, type Model } from '@google/genai';
import { createVertexAIGoogleAuthOptions, getVertexLocation, getVertexProjectId } from '@/lib/vertex-ai-auth';
import type { AiModelOption } from '@/lib/ai-models';

export const DEFAULT_VERTEX_MODEL = 'gemini-2.5-flash';

const PREFERRED_MODEL_ORDER = [
  DEFAULT_VERTEX_MODEL,
  'gemini-2.5-pro',
  'gemini-3-flash-preview',
  'gemini-3-pro-preview',
  'gemini-3.1-pro-preview',
];

const NON_TEXT_MODEL_MARKERS = ['image', 'audio', 'live', 'tts'];

const globalForVertexAI = globalThis as unknown as {
  __vertexAIClient?: GoogleGenAI;
};

const normalizeModelId = (modelName?: string): string => {
  if (!modelName) {
    return '';
  }

  const match = modelName.match(/models\/([^/]+)$/);
  return match?.[1] || modelName;
};

const compareModelPriority = (left: string, right: string): number => {
  const leftIndex = PREFERRED_MODEL_ORDER.indexOf(left);
  const rightIndex = PREFERRED_MODEL_ORDER.indexOf(right);

  if (leftIndex !== -1 || rightIndex !== -1) {
    if (leftIndex === -1) return 1;
    if (rightIndex === -1) return -1;
    return leftIndex - rightIndex;
  }

  return left.localeCompare(right);
};

const supportsTextGeneration = (model: Model): boolean => {
  const modelId = normalizeModelId(model.name);
  const actions = model.supportedActions || [];

  if (!modelId.startsWith('gemini')) {
    return false;
  }

  if (NON_TEXT_MODEL_MARKERS.some((marker) => modelId.includes(marker))) {
    return false;
  }

  return actions.length === 0 || actions.includes('generateContent');
};

export const getVertexAIClient = (): GoogleGenAI => {
  if (!globalForVertexAI.__vertexAIClient) {
    const googleAuthOptions = createVertexAIGoogleAuthOptions();
    const clientOptions: GoogleGenAIOptions = {
      vertexai: true,
      project: getVertexProjectId(),
      location: getVertexLocation(),
    };

    if (googleAuthOptions) {
      clientOptions.googleAuthOptions =
        googleAuthOptions as unknown as GoogleGenAIOptions['googleAuthOptions'];
    }

    globalForVertexAI.__vertexAIClient = new GoogleGenAI(clientOptions);
  }

  return globalForVertexAI.__vertexAIClient;
};

export const listVertexTextModels = async (): Promise<AiModelOption[]> => {
  const pager = await getVertexAIClient().models.list({
    config: {
      pageSize: 100,
      queryBase: true,
    },
  });

  const options = new Map<string, AiModelOption>();

  for await (const model of pager) {
    if (!supportsTextGeneration(model)) {
      continue;
    }

    const id = normalizeModelId(model.name);

    if (!id || options.has(id)) {
      continue;
    }

    options.set(id, {
      id,
      provider: 'vertex',
      providerModelId: id,
      displayName: model.displayName || id,
      description: model.description,
      supportedActions: model.supportedActions || [],
      inputTokenLimit: model.inputTokenLimit,
      outputTokenLimit: model.outputTokenLimit,
    });
  }

  return [...options.values()].sort((left, right) => compareModelPriority(left.id, right.id));
};

export const pickPreferredVertexModel = (models: AiModelOption[]): string =>
  models.find((model) => PREFERRED_MODEL_ORDER.includes(model.id))?.id || models[0]?.id || DEFAULT_VERTEX_MODEL;

export const sanitizeVertexModelId = (model?: string): string => {
  const sanitized = normalizeModelId(model?.trim());
  return sanitized || DEFAULT_VERTEX_MODEL;
};
