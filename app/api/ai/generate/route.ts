import { NextResponse } from 'next/server';
import { isNvidiaModelSelection } from '@/lib/ai-models';
import { generateNvidiaChatCompletion } from '@/lib/nvidia-ai';
import { getVertexAIClient, sanitizeVertexModelId } from '@/lib/vertex-ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface GenerateRequestAttachment {
  url?: string;
  type?: string;
}

interface GenerateRequestBody {
  prompt?: string;
  systemInstruction?: string;
  model?: string;
  attachments?: GenerateRequestAttachment[];
}

const getAttachmentBase64 = (attachment: GenerateRequestAttachment): string | null => {
  if (!attachment.url) {
    return null;
  }

  const [, data] = attachment.url.split(',', 2);
  return data || null;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateRequestBody;
    const prompt = body.prompt?.trim();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
    }

    if (isNvidiaModelSelection(body.model)) {
      const result = await generateNvidiaChatCompletion({
        model: body.model,
        prompt,
        systemInstruction: body.systemInstruction,
        attachments: body.attachments,
      });

      return NextResponse.json(result);
    }

    const parts: Array<
      | { text: string }
      | { inlineData: { data: string; mimeType: string } }
    > = [{ text: prompt }];

    for (const attachment of body.attachments || []) {
      const data = getAttachmentBase64(attachment);

      if (!data || !attachment.type) {
        continue;
      }

      parts.push({
        inlineData: {
          data,
          mimeType: attachment.type,
        },
      });
    }

    const response = await getVertexAIClient().models.generateContent({
      model: sanitizeVertexModelId(body.model),
      contents: [{ role: 'user', parts }],
      config: body.systemInstruction
        ? {
            systemInstruction: body.systemInstruction,
          }
        : undefined,
    });

    const text = response.text?.trim();

    if (!text) {
      return NextResponse.json(
        { error: 'Vertex AI returned an empty response.' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      text,
      model: sanitizeVertexModelId(body.model),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI request failed.';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
