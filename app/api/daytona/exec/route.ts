import { NextResponse } from 'next/server';
import { getDaytonaClient } from '@/lib/daytona';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sandboxId, command, cwd, timeout } = body as {
      sandboxId: string;
      command: string;
      cwd?: string;
      timeout?: number;
    };

    if (!sandboxId || !command) {
      return NextResponse.json({ error: 'sandboxId and command are required' }, { status: 400 });
    }

    console.log(`[Daytona Exec] sandbox=${sandboxId.slice(0, 8)} cmd="${command}" timeout=${timeout || 30}s`);

    const daytona = getDaytonaClient();
    const sandbox = await daytona.get(sandboxId);

    const result = await sandbox.process.executeCommand(
      command,
      cwd || '/home/daytona/project',
      undefined,
      timeout || 30
    );

    const stdout = result.artifacts?.stdout || result.result || '';
    console.log(`[Daytona Exec] exit=${result.exitCode} stdout="${stdout.slice(0, 200)}"`);

    return NextResponse.json({
      exitCode: result.exitCode,
      stdout,
      stderr: result.exitCode !== 0 ? result.result || '' : '',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to execute command';
    console.error(`[Daytona Exec] ERROR: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sandboxId = searchParams.get('sandboxId');
    const portStr = searchParams.get('port');

    if (!sandboxId || !portStr) {
      return NextResponse.json({ error: 'sandboxId and port are required' }, { status: 400 });
    }

    const port = parseInt(portStr, 10);
    if (isNaN(port)) {
      return NextResponse.json({ error: 'port must be a number' }, { status: 400 });
    }

    console.log(`[Daytona Preview] Getting preview URL for sandbox=${sandboxId.slice(0, 8)} port=${port}`);

    const daytona = getDaytonaClient();
    const sandbox = await daytona.get(sandboxId);
    const preview = await sandbox.getPreviewLink(port);

    console.log(`[Daytona Preview] URL: ${preview.url}`);

    return NextResponse.json({
      url: preview.url,
      token: preview.token,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get preview URL';
    console.error(`[Daytona Preview] ERROR: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
