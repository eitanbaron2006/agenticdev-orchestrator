import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SkillMeta {
  id: string;
  name: string;
  description: string;
  category: string;
  content: string;
}

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };

  const metaBlock = match[1];
  const body = match[2];
  const meta: Record<string, string> = {};

  for (const line of metaBlock.split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    meta[key] = val;
  }

  return { meta, body };
}

export async function GET() {
  try {
    const homeDir = os.homedir();
    const skillsDir = path.join(homeDir, '.gemini', 'antigravity', 'skills');

    if (!fs.existsSync(skillsDir)) {
      return NextResponse.json(
        { error: `Skills directory not found at ${skillsDir}. Run: npx antigravity-awesome-skills` },
        { status: 404 }
      );
    }

    const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
    const skills: SkillMeta[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const skillMdPath = path.join(skillsDir, entry.name, 'SKILL.md');
      if (!fs.existsSync(skillMdPath)) continue;

      try {
        const raw = fs.readFileSync(skillMdPath, 'utf-8');
        const { meta, body } = parseFrontmatter(raw);

        const name = meta.name || entry.name.replace(/-/g, ' ');
        const description = meta.description || '';
        const category = meta.category || inferCategory(entry.name, body);
        const content = body.trim();

        if (!content) continue;

        skills.push({
          id: entry.name,
          name: name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          description: description.slice(0, 200),
          category: category.charAt(0).toUpperCase() + category.slice(1),
          content: content.slice(0, 4000),
        });
      } catch {
        // skip malformed skill files
      }
    }

    return NextResponse.json({ skills, count: skills.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to import skills.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function inferCategory(dirName: string, content: string): string {
  const lower = content.toLowerCase();
  if (dirName.includes('react') || dirName.includes('vue') || dirName.includes('angular') || dirName.includes('svelte') || dirName.includes('frontend') || dirName.includes('nextjs') || dirName.includes('next')) return 'Frontend';
  if (dirName.includes('python') || dirName.includes('django') || dirName.includes('fastapi') || dirName.includes('flask')) return 'Python';
  if (dirName.includes('node') || dirName.includes('express') || dirName.includes('hono') || dirName.includes('nestjs')) return 'Backend';
  if (dirName.includes('docker') || dirName.includes('k8s') || dirName.includes('kubernetes') || dirName.includes('terraform') || dirName.includes('aws') || dirName.includes('azure') || dirName.includes('gcp') || dirName.includes('devops') || dirName.includes('ci') || dirName.includes('deploy')) return 'DevOps';
  if (dirName.includes('security') || dirName.includes('pentest') || dirName.includes('audit') || dirName.includes('vulnerability')) return 'Security';
  if (dirName.includes('test') || dirName.includes('tdd') || dirName.includes('playwright') || dirName.includes('jest') || dirName.includes('vitest')) return 'Testing';
  if (dirName.includes('sql') || dirName.includes('postgres') || dirName.includes('mongo') || dirName.includes('database') || dirName.includes('prisma') || dirName.includes('drizzle')) return 'Database';
  if (dirName.includes('seo') || dirName.includes('marketing') || dirName.includes('content') || dirName.includes('copywriting')) return 'Marketing';
  if (dirName.includes('api') || dirName.includes('graphql') || dirName.includes('grpc') || dirName.includes('rest')) return 'API';
  if (dirName.includes('design') || dirName.includes('ui') || dirName.includes('ux') || dirName.includes('tailwind') || dirName.includes('css')) return 'Design';
  if (dirName.includes('git') || dirName.includes('github') || dirName.includes('pr') || dirName.includes('branch')) return 'Workflow';
  if (dirName.includes('ai') || dirName.includes('llm') || dirName.includes('ml') || dirName.includes('rag') || dirName.includes('agent') || dirName.includes('prompt')) return 'AI/ML';
  if (dirName.includes('mobile') || dirName.includes('ios') || dirName.includes('android') || dirName.includes('flutter') || dirName.includes('react-native') || dirName.includes('expo')) return 'Mobile';
  if (dirName.includes('rust') || lower.includes('rust')) return 'Rust';
  if (dirName.includes('go') || dirName.includes('golang') || lower.includes('golang')) return 'Go';
  if (dirName.includes('java') || dirName.includes('spring') || dirName.includes('kotlin')) return 'Java';
  if (dirName.includes('csharp') || dirName.includes('dotnet') || dirName.includes('c#')) return '.NET';
  if (dirName.includes('typescript') || dirName.includes('javascript') || dirName.includes('ts') || dirName.includes('js')) return 'Language';
  if (lower.includes('debug') || lower.includes('troubleshoot')) return 'Debugging';
  if (lower.includes('architecture') || lower.includes('system design') || lower.includes('microservice')) return 'Architecture';
  if (dirName.includes('obsidian') || dirName.includes('notion') || dirName.includes('wiki') || dirName.includes('doc')) return 'Documentation';
  return 'General';
}
