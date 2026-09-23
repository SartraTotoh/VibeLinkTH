// Edge-safe list of paths that should never be served, ever.
// Used by middleware (return 404 at the edge) and by server routes
// (record an audit SECURITY event before their own 404).

const BLOCKED_PATH = [
  /^\/(\.env|\.env\.[a-zA-Z0-9._-]+)(\/.*)?$/i,
  /^\/(\.git|\.github)(\/.*)?$/i,
  /^\/(\.ssh|\.wrangler|\.open-next|\.next)(\/.*)?$/i,
  /^\/(wp-admin|wp-login\.php|\.aws|server-status)(\/.*)?$/i,
  /^\/(composer\.json|package-lock\.json|yarn\.lock|pnpm-lock\.yaml|\.npmrc|\.gitconfig)(\/.*)?$/i,
  /^\/(\.pgpass|\.netrc|\.htaccess|\.htpasswd|web\.config)(\/.*)?$/i,
];

/** Fast pass-through for real assets so the middleware matcher can stay wide. */
const PUBLIC_STATIC = /^\/(_next\/|favicon\.|logo\.png|og-cover\.png|manifest\.webmanifest|robots\.txt|sitemap\.xml|\.well-known\/)/;

export function matchesSuspiciousPath(pathname: string): boolean {
  return BLOCKED_PATH.some((re) => re.test(pathname));
}

export function isPublicStaticPath(pathname: string): boolean {
  return PUBLIC_STATIC.test(pathname);
}