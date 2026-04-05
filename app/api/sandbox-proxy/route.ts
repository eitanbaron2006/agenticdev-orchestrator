import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// These headers should NOT be forwarded from the upstream response
const HOP_BY_HOP_HEADERS = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailers', 'transfer-encoding', 'upgrade', 'content-encoding',
]);

/**
 * Server-side reverse proxy for Daytona sandbox previews.
 * 
 * The Daytona proxy uses OIDC auth (Dex) which requires cookies.
 * Browsers block third-party cookies in iframes (cross-origin).
 * This route solves it by proxying requests through our own origin.
 * 
 * The iframe loads from /api/sandbox-proxy?url=... (same origin as our app),
 * and this route fetches the actual content from the Daytona proxy server-side.
 */
async function handleProxy(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
      return NextResponse.json({ error: 'url parameter is required' }, { status: 400 });
    }

    // Get optional preview token from query params
    const previewToken = searchParams.get('token');
    // The proxy has its own API key (PROXY_API_KEY in the proxy container)
    // This is different from the Daytona API key — it bypasses OIDC auth
    const proxyApiKey = process.env.DAYTONA_PROXY_API_KEY || '';

    console.log(`[Sandbox Proxy] ${request.method} -> ${targetUrl} (proxyKey: ${proxyApiKey ? 'yes' : 'NO'})`);

    const headers: Record<string, string> = {
      'Accept': request.headers.get('accept') || '*/*',
      'Accept-Language': request.headers.get('accept-language') || 'en',
    };

    // Authenticate with the Daytona proxy using its PROXY_API_KEY
    // Priority: proxy API key > preview token > Daytona API key
    const authToken = proxyApiKey || previewToken || process.env.DAYTONA_API_KEY || '';
    if (authToken) {
      headers['x-daytona-preview-token'] = authToken;
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    // Forward content-type for POST/PUT requests
    const contentType = request.headers.get('content-type');
    if (contentType) {
      headers['Content-Type'] = contentType;
    }

    const fetchOptions: RequestInit = {
      method: request.method,
      headers,
      redirect: 'manual', // Don't follow auth redirects — detect them instead
    };

    // Forward body for non-GET requests
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      fetchOptions.body = await request.text();
    }

    const upstream = await fetch(targetUrl, fetchOptions);

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
        <p>Please check your <code>DAYTONA_API_KEY</code> in <code>.env.local</code></p>
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
      let html = await upstream.text();
      
      // Extract the base URL from the target (e.g., http://3000-xxx.proxy.localhost:4000)
      const targetUrlObj = new URL(targetUrl);
      const proxyBase = `${targetUrlObj.protocol}//${targetUrlObj.host}`;

      // Rewrite absolute paths in HTML attributes to go through our proxy
      // src="/..." href="/..." action="/..."
      html = html.replace(
        /((?:src|href|action)\s*=\s*["'])\/(?!\/)/g,
        `$1/api/sandbox-proxy?url=${encodeURIComponent(proxyBase)}/`
      );

      // Also handle srcset attributes
      html = html.replace(
        /(srcset\s*=\s*["'])\/(?!\/)/g,
        `$1/api/sandbox-proxy?url=${encodeURIComponent(proxyBase)}/`
      );

      // Inject a script to intercept dynamic resource loading (webpack chunks, fetch, etc.)
      const interceptScript = `
<script>
(function() {
  var PROXY_BASE = '/api/sandbox-proxy?url=${encodeURIComponent(proxyBase)}';
  
  // Override fetch to proxy API calls
  var originalFetch = window.fetch;
  window.fetch = function(input, init) {
    if (typeof input === 'string' && input.startsWith('/') && !input.startsWith('/api/sandbox-proxy')) {
      input = PROXY_BASE + input;
    }
    return originalFetch.call(this, input, init);
  };
  
  // Override XMLHttpRequest
  var originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    if (typeof url === 'string' && url.startsWith('/') && !url.startsWith('/api/sandbox-proxy')) {
      url = PROXY_BASE + url;
    }
    return originalOpen.apply(this, [method, url, ...Array.prototype.slice.call(arguments, 2)]);
  };

  // For Next.js: override the asset prefix for dynamic chunk loading
  if (typeof __webpack_public_path__ !== 'undefined') {
    __webpack_public_path__ = PROXY_BASE + '/_next/';
  }
  
  // Create a MutationObserver to rewrite dynamically added elements
  var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      mutation.addedNodes.forEach(function(node) {
        if (node.nodeType === 1) {
          ['src', 'href'].forEach(function(attr) {
            var val = node.getAttribute && node.getAttribute(attr);
            if (val && val.startsWith('/') && !val.startsWith('/api/sandbox-proxy')) {
              node.setAttribute(attr, PROXY_BASE + val);
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
      let js = await upstream.text();
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
    return new Response(upstream.body, {
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
