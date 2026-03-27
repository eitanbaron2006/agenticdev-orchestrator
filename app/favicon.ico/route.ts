export const dynamic = 'force-static';

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="bg" x1="0%" x2="100%" y1="0%" y2="100%">
      <stop offset="0%" stop-color="#0a0a0a" />
      <stop offset="100%" stop-color="#171717" />
    </linearGradient>
    <linearGradient id="accent" x1="0%" x2="100%" y1="0%" y2="100%">
      <stop offset="0%" stop-color="#f5f5f5" />
      <stop offset="100%" stop-color="#9ae6b4" />
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="url(#bg)" />
  <path d="M20 46V18h8l16 18V18h4v28h-7L24 27v19z" fill="url(#accent)" />
</svg>
`.trim();

export function GET() {
  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
