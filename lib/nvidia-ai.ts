import {
  buildNvidiaModelId,
  isNvidiaModelSelection,
  type AiModelOption,
} from '@/lib/ai-models';

const NVIDIA_API_BASE_URL = 'https://integrate.api.nvidia.com/v1';
const NVIDIA_DEFAULT_MODEL = 'qwen/qwen3-coder-480b-a35b-instruct';

interface NvidiaChatAttachment {
  url?: string;
  type?: string;
}

interface GenerateNvidiaChatCompletionArgs {
  model?: string;
  prompt: string;
  systemInstruction?: string;
  attachments?: NvidiaChatAttachment[];
}

interface NvidiaChatResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ text?: string }>;
    };
    text?: string;
  }>;
  error?: {
    message?: string;
  };
}

const NVIDIA_TEXT_MODELS: Array<{
  model: string;
  displayName: string;
  description?: string;
}> = [
  {
    model: 'qwen/qwen3-coder-480b-a35b-instruct',
    displayName: 'NVIDIA · Qwen3 Coder 480B',
    description: 'Large coding-focused model from the NVIDIA NIM catalog.',
  },
  {
    model: 'moonshotai/kimi-k2-instruct',
    displayName: 'NVIDIA · Kimi K2 Instruct',
  },
  {
    model: 'moonshotai/kimi-k2-thinking',
    displayName: 'NVIDIA · Kimi K2 Thinking',
  },
  {
    model: 'z-ai/glm5.1',
    displayName: 'NVIDIA · GLM 5.1',
  },
  {
    model: 'z-ai/glm4.7',
    displayName: 'NVIDIA · GLM 4.7',
  },
  {
    model: 'nvidia/nemotron-3-super-120b-a12b',
    displayName: 'NVIDIA · Nemotron 3 Super 120B',
  },
  {
    model: 'nvidia/nemotron-3-nano-30b-a3b',
    displayName: 'NVIDIA · Nemotron 3 Nano 30B',
  },
  {
    model: 'nvidia/llama-3.3-nemotron-super-49b-v1.5',
    displayName: 'NVIDIA · Llama 3.3 Nemotron Super 49B v1.5',
  },
  {
    model: 'nvidia/llama-3.1-nemotron-ultra-253b-v1',
    displayName: 'NVIDIA · Llama 3.1 Nemotron Ultra 253B',
  },
  {
    model: 'deepseek-ai/deepseek-v3.2',
    displayName: 'NVIDIA · DeepSeek V3.2',
  },
  {
    model: 'deepseek-ai/deepseek-v3.1-terminus',
    displayName: 'NVIDIA · DeepSeek V3.1 Terminus',
  },
  {
    model: 'mistralai/devstral-2-123b-instruct-2512',
    displayName: 'NVIDIA · Devstral 2 123B',
  },
  {
    model: 'mistralai/codestral-22b-instruct-v0.1',
    displayName: 'NVIDIA · Codestral 22B',
  },
  {
    model: 'mistralai/mistral-large',
    displayName: 'NVIDIA · Mistral Large',
  },
  {
    model: 'mistralai/mistral-small-24b-instruct',
    displayName: 'NVIDIA · Mistral Small 24B',
  },
  {
    model: 'meta/llama-3.3-70b-instruct',
    displayName: 'NVIDIA · Llama 3.3 70B Instruct',
  },
  {
    model: 'meta/llama-3.1-405b-instruct',
    displayName: 'NVIDIA · Llama 3.1 405B Instruct',
  },
  {
    model: 'meta/llama-3.1-70b-instruct',
    displayName: 'NVIDIA · Llama 3.1 70B Instruct',
  },
  {
    model: 'openai/gpt-oss-120b',
    displayName: 'NVIDIA · GPT-OSS 120B',
  },
  {
    model: 'openai/gpt-oss-20b',
    displayName: 'NVIDIA · GPT-OSS 20B',
  },
  {
    model: 'minimaxai/minimax-m2.7',
    displayName: 'NVIDIA · MiniMax M2.7',
  },
  {
    model: 'google/codegemma-7b',
    displayName: 'NVIDIA · CodeGemma 7B',
  },
  {
    model: 'qwen/qwen2.5-coder-32b-instruct',
    displayName: 'NVIDIA · Qwen2.5 Coder 32B',
  },
  {
    model: 'qwen/qwen3-next-80b-a3b-instruct',
    displayName: 'NVIDIA · Qwen3 Next 80B',
  },
  {
    model: 'stepfun-ai/step-3-5-flash',
    displayName: 'NVIDIA · Step 3.5 Flash',
  },
];

export function listNvidiaTextModels(): AiModelOption[] {
  return NVIDIA_TEXT_MODELS.map((model) => ({
    id: buildNvidiaModelId(model.model),
    provider: 'nvidia',
    providerModelId: model.model,
    displayName: model.displayName,
    description: model.description || 'Served through NVIDIA NIM API Catalog.',
    supportedActions: ['chat.completions'],
  }));
}

export function pickPreferredNvidiaModel(models: AiModelOption[]): string {
  return models.find((model) => model.providerModelId === NVIDIA_DEFAULT_MODEL)?.id || models[0]?.id || buildNvidiaModelId(NVIDIA_DEFAULT_MODEL);
}

export function sanitizeNvidiaModelId(model?: string): string {
  const trimmed = model?.trim() || '';
  if (!trimmed) return NVIDIA_DEFAULT_MODEL;
  return isNvidiaModelSelection(trimmed)
    ? trimmed.slice('nvidia:'.length)
    : trimmed;
}

function extractNvidiaText(response: NvidiaChatResponse): string {
  const content = response.choices?.[0]?.message?.content;
  if (typeof content === 'string') {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content.map((part) => part.text || '').join('').trim();
  }

  return response.choices?.[0]?.text?.trim() || '';
}

export async function generateNvidiaChatCompletion({
  model,
  prompt,
  systemInstruction,
  attachments = [],
}: GenerateNvidiaChatCompletionArgs): Promise<{ text: string; model: string }> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error('NVIDIA_API_KEY is not set.');
  }

  const selectedModel = sanitizeNvidiaModelId(model);
  const userContent: Array<
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } }
  > = [{ type: 'text', text: prompt }];

  for (const attachment of attachments) {
    if (attachment.url && attachment.type?.startsWith('image/')) {
      userContent.push({ type: 'image_url', image_url: { url: attachment.url } });
    }
  }

  const res = await fetch(`${NVIDIA_API_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: selectedModel,
      messages: [
        ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
        { role: 'user', content: userContent },
      ],
      temperature: 0.2,
      top_p: 0.95,
      max_tokens: 8192,
      stream: false,
    }),
  });

  const payload = (await res.json()) as NvidiaChatResponse;
  if (!res.ok) {
    throw new Error(payload.error?.message || `NVIDIA API error: ${res.status}`);
  }

  const text = extractNvidiaText(payload);
  if (!text) {
    throw new Error('NVIDIA returned an empty response.');
  }

  return { text, model: buildNvidiaModelId(selectedModel) };
}
