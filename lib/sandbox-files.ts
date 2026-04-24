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

function isValidJson(content: string): boolean {
  try {
    JSON.parse(content);
    return true;
  } catch {
    return false;
  }
}

export function normalizeSandboxFiles<T extends SandboxTextFile>(files: T[]): T[] {
  return files.map((file) => {
    if (file.path.replace(/\\/g, '/').toLowerCase() !== 'tsconfig.json') {
      return file;
    }

    if (isValidJson(file.content)) {
      return file;
    }

    return {
      ...file,
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
