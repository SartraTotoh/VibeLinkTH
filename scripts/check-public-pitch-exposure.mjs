#!/usr/bin/env node
// Read-only public exposure release gate. Never prints response bodies or recipient data.
const hosts = ['https://vibelinkth.com', 'https://www.vibelinkth.com', 'https://app.vibelinkth.com'];
const csvPaths = ['/vibelink-pitch-leads.csv', '/docs/vibelink-pitch-leads.csv', '/landing/vibelink-pitch-leads.csv'];
const pitchPaths = ['/pitch', '/pitch.html'];
let failures = 0;
for (const host of hosts) {
  for (const path of [...csvPaths, ...pitchPaths]) {
    const url = host + path;
    try {
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'manual',
        headers: { 'Cache-Control': 'no-cache', 'Accept': 'text/html, */*' },
        signal: AbortSignal.timeout(12000),
      });
      const location = response.headers.get('location');
      const redirect = location ? new URL(location, url) : null;
      const exposed = csvPaths.includes(path) && (
        response.status === 200 ||
        (redirect && /(?:vibelink-pitch-leads\.csv)(?:$|[?#])/i.test(redirect.pathname))
      );
      const inconclusive = response.status >= 500 || response.status === 429 || (csvPaths.includes(path) && response.status >= 300 && response.status < 400 && !redirect);
      console.log(JSON.stringify({
        host, path, status: response.status,
        redirectOrigin: redirect?.origin ?? null,
        redirectPath: redirect?.pathname ?? null,
        verdict: exposed ? 'FAIL_EXPOSED' : inconclusive ? 'INCONCLUSIVE' : 'CHECKED',
      }));
      if (exposed || inconclusive) failures++;
    } catch (error) {
      failures++;
      console.log(JSON.stringify({ host, path, verdict: 'INCONCLUSIVE', error: error.name }));
    }
  }
}
if (failures) {
  console.error('Release gate failed or inconclusive. Do not claim public data removal.');
  process.exitCode = 1;
}
