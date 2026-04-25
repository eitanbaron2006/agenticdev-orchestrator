export interface SandboxTextFile {
  path: string;
  content: string;
}

const DEFAULT_NEXT_TSCONFIG = {
  compilerOptions: {
    target: 'es5',
    lib: ['dom', 'dom.iterable', 'esnext'],
    allowJs: true,
    skipLibCheck: true,
    strict: true,
    noEmit: true,
    esModuleInterop: true,
    module: 'esnext',
    moduleResolution: 'bundler',
    resolveJsonModule: true,
    isolatedModules: true,
    jsx: 'preserve',
    incremental: true,
    plugins: [{ name: 'next' }],
    paths: { '@/*': ['./*'] },
  },
  include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
  exclude: ['node_modules'],
};

const NEXT_DEV_ALLOWED_ORIGINS = "['*.proxy.localhost', 'proxy.localhost', 'localhost', '127.0.0.1']";
const LEADING_PROMPT_PLACEHOLDER_LINE = /^\s*(?:FULL_CONTENT|FULL_FILE_CONTENT)\s*;?\s*(?:\r?\n|$)/;

function isValidJson(content: string): boolean {
  try {
    JSON.parse(content);
    return true;
  } catch {
    return false;
  }
}

export function stripFileContentPlaceholders(content: string): string {
  let cleaned = content;
  while (LEADING_PROMPT_PLACEHOLDER_LINE.test(cleaned)) {
    cleaned = cleaned.replace(LEADING_PROMPT_PLACEHOLDER_LINE, '');
  }
  return cleaned;
}

function isNextConfigPath(path: string): boolean {
  return /^next\.config\.(?:js|mjs|cjs|ts)$/i.test(path.replace(/\\/g, '/').toLowerCase());
}

function normalizeNextConfig(content: string): string {
  if (content.includes('allowedDevOrigins')) {
    return content;
  }

  const nextConfigDeclaration = /const\s+nextConfig(?:\s*:\s*[^=]+)?\s*=\s*\{/;
  if (nextConfigDeclaration.test(content)) {
    return content.replace(
      nextConfigDeclaration,
      (match) => `${match}\n  allowedDevOrigins: ${NEXT_DEV_ALLOWED_ORIGINS},`
    );
  }

  const moduleExportsObject = /module\.exports\s*=\s*\{/;
  if (moduleExportsObject.test(content)) {
    return content.replace(
      moduleExportsObject,
      (match) => `${match}\n  allowedDevOrigins: ${NEXT_DEV_ALLOWED_ORIGINS},`
    );
  }

  const exportDefaultObject = /export\s+default\s+\{/;
  if (exportDefaultObject.test(content)) {
    return content.replace(
      exportDefaultObject,
      (match) => `${match}\n  allowedDevOrigins: ${NEXT_DEV_ALLOWED_ORIGINS},`
    );
  }

  return content;
}

export function normalizeSandboxFiles<T extends SandboxTextFile>(files: T[]): T[] {
  return files.map((file) => {
    const content = stripFileContentPlaceholders(file.content);
    const cleanedFile = content === file.content ? file : { ...file, content };

    if (isNextConfigPath(cleanedFile.path)) {
      const nextConfigContent = normalizeNextConfig(cleanedFile.content);
      return nextConfigContent === cleanedFile.content ? cleanedFile : { ...cleanedFile, content: nextConfigContent };
    }

    if (cleanedFile.path.replace(/\\/g, '/').toLowerCase() !== 'tsconfig.json') {
      return cleanedFile;
    }

    if (isValidJson(cleanedFile.content)) {
      return cleanedFile;
    }

    return {
      ...cleanedFile,
      content: JSON.stringify(DEFAULT_NEXT_TSCONFIG, null, 2),
    };
  });
}

export function buildSandboxPreviewUrl(directUrl: string, token?: string | null): string {
  const params = new URLSearchParams({ url: directUrl });
  if (token) {
    params.set('token', token);
  }

  return `/api/sandbox-proxy?${params.toString()}`;
}

export function getSandboxPopoutUrl(previewUrl: string, origin: string): string {
  return new URL(previewUrl, origin).toString();
}

export interface SandboxProxyFetchTarget {
  fetchUrl: string;
  hostHeader?: string;
}

export function getSandboxProxyFetchTarget(targetUrl: string): SandboxProxyFetchTarget {
  const url = new URL(targetUrl);

  if (url.hostname.endsWith('.proxy.localhost')) {
    const port = url.port || (url.protocol === 'https:' ? '443' : '80');
    return {
      fetchUrl: `${url.protocol}//127.0.0.1:${port}${url.pathname}${url.search}`,
      hostHeader: url.host,
    };
  }

  return { fetchUrl: targetUrl };
}

export function getSandboxHttpStatus(output: string): string | null {
  const statusLines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^\d{3}$/.test(line));

  return statusLines.at(-1) || null;
}

export function isSandboxServerReady(output: string): boolean {
  return getSandboxHttpStatus(output) !== null;
}

export function shouldKeepSandboxOpenAfterStartError(sandboxCreated: boolean): boolean {
  return sandboxCreated;
}
