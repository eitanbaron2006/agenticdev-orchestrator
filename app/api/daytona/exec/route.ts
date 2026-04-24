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

    const effectiveTimeout = timeout || 120;
    let result;
    try {
      result = await sandbox.process.executeCommand(
        command,
        cwd || '/home/daytona/project',
        undefined,
        effectiveTimeout
      );
    } catch (execErr) {
      const execMsg = execErr instanceof Error ? execErr.message : String(execErr);
      if (execMsg.includes('timeout') || execMsg.includes('Timeout')) {
        console.error(`[Daytona Exec] Command timed out after ${effectiveTimeout}s: "${command}"`);
        return NextResponse.json({
          exitCode: 124,
          stdout: '',
          stderr: `Command timed out after ${effectiveTimeout}s. Try increasing the timeout or running a simpler command.`,
        });
      }
      throw execErr;
    }

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
    // Return as a non-500 response so the client can still show the error gracefully
    return NextResponse.json({
      exitCode: 1,
      stdout: '',
      stderr: message,
    });
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
    const preview = await sandbox.getSignedPreviewUrl(port, 60 * 60);

    console.log(`[Daytona Preview] URL: ${preview.url}`);
    console.log(`[Daytona Preview] Signed token: ${preview.token ? preview.token.slice(0, 8) + '...' : 'NULL/EMPTY'}`);

    return NextResponse.json({
      url: preview.url,
      token: null,
      signed: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get preview URL';
    console.error(`[Daytona Preview] ERROR: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
