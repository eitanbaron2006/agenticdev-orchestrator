import { NextResponse } from 'next/server';
import { listVertexTextModels, pickPreferredVertexModel } from '@/lib/vertex-ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const models = await listVertexTextModels();

    return NextResponse.json({
      models,
      recommendedModel: pickPreferredVertexModel(models),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load Vertex AI models.';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
