import { NextResponse } from 'next/server';
import * as http from 'node:http';
import * as https from 'node:https';
import { getSandboxProxyFetchTarget } from '@/lib/sandbox-files';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// These headers should NOT be forwarded from the upstream response
const HOP_BY_HOP_HEADERS = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailers', 'transfer-encoding', 'upgrade', 'content-encoding',
]);

interface UpstreamResponse {
  status: number;
  headers: Headers;
  body: Buffer;
}

function bufferToArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

function appendNodeHeaders(target: Headers, source: http.IncomingHttpHeaders) {
  Object.entries(source).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => target.append(key, item));
      return;
    }

    if (value !== undefined) {
      target.set(key, String(value));
    }
  });
}

async function requestUpstream(
  fetchUrl: string,
  method: string,
  headers: Record<string, string>,
  body?: Buffer
): Promise<UpstreamResponse> {
  const url = new URL(fetchUrl);
  const client = url.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const req = client.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        method,
        headers,
      },
      (res) => {
        const chunks: Buffer[] = [];

        res.on('data', (chunk: Buffer | string) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        res.on('end', () => {
          const responseHeaders = new Headers();
          appendNodeHeaders(responseHeaders, res.headers);
          resolve({
            status: res.statusCode || 502,
            headers: responseHeaders,
            body: Buffer.concat(chunks),
          });
        });
      }
    );

    req.setTimeout(30000, () => {
      req.destroy(new Error('Upstream request timed out'));
    });
    req.on('error', reject);

    if (body && body.length > 0) {
      req.write(body);
    }
    req.end();
  });
}

/**
 * Server-side reverse proxy for Daytona sandbox previews.
 * 
 * Daytona preview hosts use subdomains like 3000-token.proxy.localhost.
 * Chromium resolves those hosts, but Node fetch does not on Windows. This
 * route connects to 127.0.0.1 while preserving the original Host header.
 * 
 * The iframe loads from /api/sandbox-proxy?url=... on our origin, and the
 * signed Daytona preview URL prevents the proxy from redirecting to OIDC auth.
 */
async function handleProxy(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
      return NextResponse.json({ error: 'url parameter is required' }, { status: 400 });
    }

    const previewToken = searchParams.get('token');

    const { fetchUrl, hostHeader } = getSandboxProxyFetchTarget(targetUrl);

    console.log(`[Sandbox Proxy] ${request.method} -> ${targetUrl} via ${fetchUrl}`);

    const headers: Record<string, string> = {
      'Accept': request.headers.get('accept') || '*/*',
      'Accept-Language': request.headers.get('accept-language') || 'en',
    };

    if (previewToken) {
      headers['X-Daytona-Preview-Token'] = previewToken;
    }
    if (hostHeader) {
      headers['Host'] = hostHeader;
    }

    // Forward content-type for POST/PUT requests
    const contentType = request.headers.get('content-type');
    if (contentType) {
      headers['Content-Type'] = contentType;
    }

    let requestBody: Buffer | undefined;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      requestBody = Buffer.from(await request.arrayBuffer());
    }

    const upstream = await requestUpstream(fetchUrl, request.method, headers, requestBody);

    // If the proxy redirects to a login page, auth failed
    if (upstream.status >= 300 && upstream.status < 400) {
      const location = upstream.headers.get('location') || '';
      console.error(`[Sandbox Proxy] Auth redirect detected -> ${location}`);
      // Return a helpful HTML page instead of following the redirect
      const errorHtml = `<!DOCTYPE html><html><head><style>
        body { font-family: system-ui; background: #1a1a2e; color: #eee; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .box { text-align: center; padding: 2rem; }
        h2 { color: #e94560; }
        code { background: #16213e; padding: 2px 8px; border-radius: 4px; }
      </style></head><body><div class="box">
        <h2>Sandbox Preview Auth Required</h2>
        <p>The Daytona proxy requires authentication.</p>
        <p>Start the sandbox again to generate a fresh signed preview URL.</p>
        <p style="color:#888;font-size:12px;">Redirect: ${location}</p>
      </div></body></html>`;
      return new Response(errorHtml, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    console.log(`[Sandbox Proxy] Response: ${upstream.status} ${upstream.headers.get('content-type')?.split(';')[0]}`)

    // Build response headers (exclude hop-by-hop headers)
    const responseHeaders = new Headers();
    upstream.headers.forEach((value, key) => {
      if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    // Allow iframe embedding
    responseHeaders.delete('x-frame-options');
    responseHeaders.delete('content-security-policy');

    const contentTypeResp = upstream.headers.get('content-type') || '';

    // For HTML responses: rewrite resource URLs to go through our proxy
    if (contentTypeResp.includes('text/html')) {
      let html = upstream.body.toString('utf-8');
      
      // Extract the base URL from the target (e.g., http://3000-xxx.proxy.localhost:4000)
      const targetUrlObj = new URL(targetUrl);
      const proxyBase = `${targetUrlObj.protocol}//${targetUrlObj.host}`;
      const tokenParam = previewToken ? `&token=${encodeURIComponent(previewToken)}` : '';
      const proxyPath = (path: string) =>
        `/api/sandbox-proxy?url=${encodeURIComponent(`${proxyBase}${path}`)}${tokenParam}`;

      // Rewrite absolute paths in HTML attributes to go through our proxy
      // src="/..." href="/..." action="/..."
      html = html.replace(
        /((?:src|href|action)\s*=\s*["'])\/(?!\/)([^"']*)/g,
        (_match, prefix: string, path: string) => `${prefix}${proxyPath(`/${path}`)}`
      );

      // Also handle srcset attributes
      html = html.replace(
        /(srcset\s*=\s*["'])\/(?!\/)([^"']*)/g,
        (_match, prefix: string, path: string) => `${prefix}${proxyPath(`/${path}`)}`
      );

      // Inject a script to intercept dynamic resource loading (webpack chunks, fetch, etc.)
      const interceptScript = `
<script>
(function() {
  var PROXY_BASE = '/api/sandbox-proxy?url=${encodeURIComponent(proxyBase)}';
  var PROXY_TOKEN = '${tokenParam}';
  function proxyUrl(path) {
    return PROXY_BASE + encodeURIComponent(path) + PROXY_TOKEN;
  }

  function stringifyConsoleArg(arg) {
    if (arg instanceof Error) {
      return arg.stack || arg.message;
    }
    if (typeof arg === 'string') {
      return arg;
    }
    try {
      return JSON.stringify(arg);
    } catch (error) {
      return String(arg);
    }
  }

  function sendConsoleMessage(type, args) {
    try {
      var message = Array.prototype.slice.call(args || [])
        .map(stringifyConsoleArg)
        .join(' ');
      window.parent.postMessage({ type: 'CONSOLE_LOG', payload: { type: type, message: message } }, window.location.origin);
    } catch (error) {
      // Keep preview app execution isolated from logging failures.
    }
  }

  var originalLog = console.log;
  var originalInfo = console.info;
  var originalWarn = console.warn;
  var originalError = console.error;

  console.log = function() {
    if (originalLog) originalLog.apply(console, arguments);
    sendConsoleMessage('log', arguments);
  };
  console.info = function() {
    if (originalInfo) originalInfo.apply(console, arguments);
    sendConsoleMessage('info', arguments);
  };
  console.warn = function() {
    if (originalWarn) originalWarn.apply(console, arguments);
    sendConsoleMessage('warn', arguments);
  };
  console.error = function() {
    if (originalError) originalError.apply(console, arguments);
    sendConsoleMessage('error', arguments);
  };

  window.addEventListener('error', function(event) {
    var message = event.message || 'Unknown runtime error';
    if (event.filename) {
      message += ' at ' + event.filename + ':' + event.lineno + ':' + event.colno;
    }
    if (event.error && event.error.stack) {
      message += '\\n' + event.error.stack;
    }
    sendConsoleMessage('error', [message]);
  });

  window.addEventListener('unhandledrejection', function(event) {
    var reason = event.reason instanceof Error
      ? event.reason.stack || event.reason.message
      : stringifyConsoleArg(event.reason);
    sendConsoleMessage('error', ['Unhandled promise rejection: ' + reason]);
  });
  
  // Override fetch to proxy API calls
  var originalFetch = window.fetch;
  window.fetch = function(input, init) {
    if (typeof input === 'string' && input.startsWith('/') && !input.startsWith('/api/sandbox-proxy')) {
      input = proxyUrl(input);
    }
    return originalFetch.call(this, input, init);
  };
  
  // Override XMLHttpRequest
  var originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    if (typeof url === 'string' && url.startsWith('/') && !url.startsWith('/api/sandbox-proxy')) {
      url = proxyUrl(url);
    }
    return originalOpen.apply(this, [method, url, ...Array.prototype.slice.call(arguments, 2)]);
  };

  // For Next.js: override the asset prefix for dynamic chunk loading
  if (typeof __webpack_public_path__ !== 'undefined') {
    __webpack_public_path__ = proxyUrl('/_next/');
  }
  
  // Create a MutationObserver to rewrite dynamically added elements
  var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      mutation.addedNodes.forEach(function(node) {
        if (node.nodeType === 1) {
          ['src', 'href'].forEach(function(attr) {
            var val = node.getAttribute && node.getAttribute(attr);
            if (val && val.startsWith('/') && !val.startsWith('/api/sandbox-proxy')) {
              node.setAttribute(attr, proxyUrl(val));
            }
          });
        }
      });
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
</script>`;

      // Inject the script right after <head> or at the start of the document
      if (html.includes('<head>')) {
        html = html.replace('<head>', '<head>' + interceptScript);
      } else if (html.includes('<head ')) {
        html = html.replace(/<head\s[^>]*>/, '$&' + interceptScript);
      } else {
        html = interceptScript + html;
      }

      responseHeaders.set('content-type', 'text/html; charset=utf-8');
      responseHeaders.delete('content-length'); // Length changed after rewrite

      return new Response(html, {
        status: upstream.status,
        headers: responseHeaders,
      });
    }

    // For JS responses: rewrite absolute URL references
    if (contentTypeResp.includes('javascript') || contentTypeResp.includes('ecmascript')) {
      let js = upstream.body.toString('utf-8');
      const targetUrlObj = new URL(targetUrl);
      const proxyBase = `${targetUrlObj.protocol}//${targetUrlObj.host}`;

      // Rewrite common patterns like fetch("/api/...") in JavaScript
      // This is a best-effort approach — handles the most common cases
      js = js.replace(
        /fetch\(["']\/(?!api\/sandbox-proxy)/g,
        `fetch("/api/sandbox-proxy?url=${encodeURIComponent(proxyBase)}/`
      );

      responseHeaders.delete('content-length');

      return new Response(js, {
        status: upstream.status,
        headers: responseHeaders,
      });
    }

    // For all other content types: stream through as-is
    return new Response(bufferToArrayBuffer(upstream.body), {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Proxy error';
    console.error(`[Sandbox Proxy] ERROR: ${message}`);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function GET(request: Request) {
  return handleProxy(request);
}

export async function POST(request: Request) {
  return handleProxy(request);
}

export async function PUT(request: Request) {
  return handleProxy(request);
}

export async function DELETE(request: Request) {
  return handleProxy(request);
}

export async function PATCH(request: Request) {
  return handleProxy(request);
}
