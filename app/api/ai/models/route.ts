import { NextResponse } from 'next/server';
import type { AiModelOption } from '@/lib/ai-models';
import { listNvidiaTextModels } from '@/lib/nvidia-ai';
import { listVertexTextModels, pickPreferredVertexModel } from '@/lib/vertex-ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const errors: string[] = [];
  const models: AiModelOption[] = [];

  try {
    models.push(...await listVertexTextModels());
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Failed to load Vertex AI models.');
  }

  const nvidiaModels = listNvidiaTextModels();
  models.push(...nvidiaModels);

  if (models.length === 0) {
    return NextResponse.json(
      { error: errors.join(' ') || 'Failed to load AI models.' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    models,
    recommendedModel: pickPreferredVertexModel(models),
    errors,
  });
}
