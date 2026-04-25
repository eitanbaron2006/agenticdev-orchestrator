import { isNvidiaModelSelection } from '@/lib/ai-models';
import { sanitizeNvidiaModelId } from '@/lib/nvidia-ai';
import { getVertexAIClient, sanitizeVertexModelId } from '@/lib/vertex-ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface StreamRequestBody {
  prompt?: string;
  systemInstruction?: string;
  model?: string;
}

function sseEvent(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

async function streamVertexAI(body: StreamRequestBody, controller: ReadableStreamDefaultController<Uint8Array>) {
  const encoder = new TextEncoder();
  const parts: Array<{ text: string }> = [{ text: body.prompt! }];

  const stream = await getVertexAIClient().models.generateContentStream({
    model: sanitizeVertexModelId(body.model),
    contents: [{ role: 'user', parts }],
    config: body.systemInstruction
      ? { systemInstruction: body.systemInstruction }
      : undefined,
  });

  let fullText = '';

  for await (const chunk of stream) {
    const text = chunk.text ?? '';
    if (text) {
      fullText += text;
      controller.enqueue(encoder.encode(sseEvent({ text })));
    }
  }

  controller.enqueue(encoder.encode(sseEvent({ done: true, fullText })));
  controller.close();
}

async function streamNvidia(body: StreamRequestBody, controller: ReadableStreamDefaultController<Uint8Array>) {
  const encoder = new TextEncoder();
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    controller.enqueue(encoder.encode(sseEvent({ error: 'NVIDIA_API_KEY is not set.' })));
    controller.close();
    return;
  }

  const selectedModel = sanitizeNvidiaModelId(body.model);

  const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: selectedModel,
      messages: [
        ...(body.systemInstruction ? [{ role: 'system', content: body.systemInstruction }] : []),
        { role: 'user', content: body.prompt },
      ],
      temperature: 0.2,
      top_p: 0.95,
      max_tokens: 8192,
      stream: true,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    controller.enqueue(encoder.encode(sseEvent({ error: `NVIDIA API error ${res.status}: ${errText}` })));
    controller.close();
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    controller.enqueue(encoder.encode(sseEvent({ error: 'NVIDIA returned no stream body' })));
    controller.close();
    return;
  }

  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const payload = trimmed.slice(6);
      if (payload === '[DONE]') continue;

      try {
        const parsed = JSON.parse(payload);
        const text = parsed.choices?.[0]?.delta?.content || '';
        if (text) {
          fullText += text;
          controller.enqueue(encoder.encode(sseEvent({ text })));
        }
      } catch {
        // skip malformed chunk
      }
    }
  }

  controller.enqueue(encoder.encode(sseEvent({ done: true, fullText })));
  controller.close();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as StreamRequestBody;
    const prompt = body.prompt?.trim();

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const isNvidia = isNvidiaModelSelection(body.model);

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          if (isNvidia) {
            await streamNvidia(body, controller);
          } else {
            await streamVertexAI(body, controller);
          }
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Stream error';
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode(sseEvent({ error: msg })));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Stream request failed.';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
