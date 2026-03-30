import { NextResponse } from 'next/server';
import { getDaytonaClient } from '@/lib/daytona';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface FileEntry {
  path: string;
  content: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sandboxId, files, workDir } = body as {
      sandboxId: string;
      files: FileEntry[];
      workDir?: string;
    };

    if (!sandboxId || !files || !Array.isArray(files)) {
      return NextResponse.json({ error: 'sandboxId and files[] are required' }, { status: 400 });
    }

    console.log(`[Daytona Files] Syncing ${files.length} files to sandbox=${sandboxId.slice(0, 8)}`);
    const daytona = getDaytonaClient();
    const sandbox = await daytona.get(sandboxId);

    const baseDir = workDir || '/home/daytona/project';

    await sandbox.fs.createFolder(baseDir, '755');
    console.log(`[Daytona Files] Created base dir: ${baseDir}`);

    for (const file of files) {
      const filePath = `${baseDir}/${file.path}`;
      const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));

      if (dirPath && dirPath !== baseDir) {
        try {
          await sandbox.fs.createFolder(dirPath, '755');
        } catch {
          // Directory might already exist
        }
      }

      await sandbox.fs.uploadFile(Buffer.from(file.content, 'utf-8'), filePath);
      console.log(`[Daytona Files] Uploaded: ${file.path} (${file.content.length} bytes)`);
    }

    console.log(`[Daytona Files] Sync complete: ${files.length} files`);
    return NextResponse.json({ status: 'synced', fileCount: files.length, workDir: baseDir });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to sync files';
    console.error(`[Daytona Files] ERROR: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
