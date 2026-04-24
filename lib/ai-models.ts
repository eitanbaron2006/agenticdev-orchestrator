export type AiModelProvider = 'vertex' | 'nvidia';

export interface AiModelOption {
  id: string;
  provider: AiModelProvider;
  providerModelId: string;
  displayName: string;
  description?: string;
  supportedActions: string[];
  inputTokenLimit?: number;
  outputTokenLimit?: number;
}

export const NVIDIA_MODEL_PREFIX = 'nvidia:';

export function buildNvidiaModelId(modelId: string): string {
  return `${NVIDIA_MODEL_PREFIX}${modelId}`;
}

export function isNvidiaModelSelection(model?: string | null): boolean {
  return Boolean(model?.trim().startsWith(NVIDIA_MODEL_PREFIX));
}

export function getAiModelProvider(model?: string | null): AiModelProvider {
  return isNvidiaModelSelection(model) ? 'nvidia' : 'vertex';
}

export function getAiModelProviderLabel(provider: AiModelProvider): string {
  return provider === 'nvidia' ? 'NVIDIA NIM' : 'Google Gemini / Vertex AI';
}
