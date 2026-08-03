/** @type {import('next').NextConfig} */

// ─────────────────────────────────────────────────────────────────────────────
// Multi-zone routing for fruitbeanink.com
//
// fruitbeanweb owns the domain root. Sibling apps are separate Vercel
// projects, each built with a matching `basePath`, and are exposed under
// the same domain by proxying requests to their own deployment origin:
//
//   /        → this app (main company website)
//   /fiix    → Fiix maintenance app   (basePath: "/fiix",    env FIIX_ORIGIN)
//   /billing → future billing system  (basePath: "/billing", env BILLING_ORIGIN)
//
// Each *_ORIGIN env var must be the sibling app's own stable deployment URL,
// e.g. https://fiix-xxxx.vercel.app or a dedicated subdomain once one exists
// — not a preview-deployment URL that changes on every push. Leaving an
// *_ORIGIN var unset simply skips that app's rules (this is how /billing
// stays a no-op until a real deployment exists for it).
//
// To add a future app: deploy it with its own basePath, set its *_ORIGIN
// env var here, and add one entry to SIBLING_APPS.
// ─────────────────────────────────────────────────────────────────────────────

const SIBLING_APPS = [
  { path: '/fiix', origin: process.env.FIIX_ORIGIN },
  { path: '/billing', origin: process.env.BILLING_ORIGIN },
];

const nextConfig = {
  turbopack: {
    root: __dirname,
  },

  async rewrites() {
    const rules = [];
    for (const app of SIBLING_APPS) {
      if (!app.origin) continue; // not deployed yet (e.g. /billing) — skip
      rules.push(
        // The bare path itself (e.g. /fiix, no trailing segment)...
        { source: app.path, destination: `${app.origin}${app.path}` },
        // ...and everything under it.
        { source: `${app.path}/:path*`, destination: `${app.origin}${app.path}/:path*` },
      );
    }
    return rules;
  },
};

module.exports = nextConfig;
