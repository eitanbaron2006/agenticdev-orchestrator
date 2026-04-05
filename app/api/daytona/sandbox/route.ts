import { NextResponse } from 'next/server';
import { getDaytonaClient } from '@/lib/daytona';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // Check if this is a sendBeacon-based DELETE (used during page unload)
    const { searchParams } = new URL(request.url);
    if (searchParams.get('_method') === 'DELETE') {
      const sandboxId = searchParams.get('sandboxId');
      if (sandboxId) {
        console.log(`[Daytona] Beacon DELETE sandbox: ${sandboxId}`);
        const daytona = getDaytonaClient();
        try {
          const sandbox = await daytona.get(sandboxId);
          await sandbox.delete();
        } catch {
          // Best-effort cleanup
        }
        return NextResponse.json({ status: 'deleted' });
      }
    }

    console.log('[Daytona] Creating sandbox...');
    const daytona = getDaytonaClient();
    const sandbox = await daytona.create(
      {
        language: 'javascript',
        autoStopInterval: 60,
        autoDeleteInterval: 60,
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

    console.log(`[Daytona] Deleting sandbox: ${sandboxId}`);
    const daytona = getDaytonaClient();
    const sandbox = await daytona.get(sandboxId);
    await sandbox.delete();
    console.log(`[Daytona] Sandbox deleted: ${sandboxId}`);

    return NextResponse.json({ status: 'deleted' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete sandbox';
    console.error(`[Daytona] Delete ERROR: ${message}`);
    // Return 200 even on error to prevent retries — sandbox may already be gone
    return NextResponse.json({ status: 'delete_attempted', error: message });
  }
}
