import { NextResponse } from 'next/server';
import { getDaytonaClient } from '@/lib/daytona';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    console.log('[Daytona] Creating sandbox...');
    const daytona = getDaytonaClient();
    const sandbox = await daytona.create(
      {
        language: 'javascript',
        autoStopInterval: 60,
        autoDeleteInterval: -1,
      },
      { timeout: 120 }
    );

    console.log(`[Daytona] Sandbox created: ${sandbox.id} state=${sandbox.state}`);
    return NextResponse.json({
      sandboxId: sandbox.id,
      status: sandbox.state,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create sandbox';
    console.error(`[Daytona] Create ERROR: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sandboxId = searchParams.get('sandboxId');

    if (!sandboxId) {
      return NextResponse.json({ error: 'sandboxId is required' }, { status: 400 });
    }

    const daytona = getDaytonaClient();
    const sandbox = await daytona.get(sandboxId);
    await sandbox.delete();

    return NextResponse.json({ status: 'deleted' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete sandbox';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
