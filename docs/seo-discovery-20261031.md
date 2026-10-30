# Links / QR organic discovery — review build, 31 October 2026

## Review scope

This branch adds a public Thai Links introduction at `https://app.vibelinkth.com/links`, separate from the existing authenticated `/dashboard/links` tool. It continues from branding PR #5 at `98a6dbdb1671b7746615a98691f38b7627640e8f`; it is not a replacement for the stacked PR #2/#3/#5 changes. Billing PR #4 remains outside this branch.

No production deployment, merge, Cloudflare setting change, Search Console submission, database migration, account creation or real payment is part of this review build.

## What to review

| Surface | Expected behavior |
| --- | --- |
| `/links` | Public HTML without login; Thai title, description and one H1; feature descriptions, clearly labelled illustrative link panel, getting-started guide, QR comparison and FAQs. No account data or measured traffic is displayed. |
| Links CTA | Opens the existing `/dashboard/links`; anonymous visitors still redirect to login. |
| Marketing navigation | Links goes to the public introduction; the separate tool CTA still goes to the dashboard. Booking and Live availability labels remain unchanged. |
| QR | Keeps its public tool and canonical route; adds a contextual link to the Links guide. |
| App homepage | Remains accessible for navigation; canonical, Open Graph URL and WebSite URL consolidate to the existing `https://www.vibelinkth.com/` marketing choice. Omitted from the app sitemap. Google may still choose a different canonical. |
| Sitemap / robots | App sitemap includes `/links` and `/qr`; uses the same configured public origin as their metadata. Marketing sitemap remains marketing-only. |
| Canonical inheritance | The root layout no longer applies the app-home canonical to every child. Sitemap-listed legal pages have explicit self-canonicals; legal body text is unchanged. |
| Branding | The remaining static brand-logo link uses the `www` canonical host. The catalog generator preserves the fix and public discovery links. |

## Content boundaries

- Links supports short links, editable destinations/status, a bio link page, UTM and click statistics within account limits. Public copy does not claim unique visitors, exact scan counts, sales attribution, commission guarantees or a measured speed advantage.
- Basic static URL QR export remains separate from account-based link management. QR images do not collect analytics by themselves. The Links page explains how a QR containing an editable short link differs from a QR containing the final URL directly.
- The new page uses WebPage and BreadcrumbList structured data. It adds no rating, review, price or FAQ rich-result claim. Existing truthful FAQ content is retained for readers.
- Search Console's email confirms impressions started on 28 October 2026. It provides no counts, query/page list, CTR or position. Those metrics remain unavailable; no proxy metrics or ranking claims were added.

## Local verification

The review uses only dummy build/auth settings and a loopback database URL.

| Completed check | Observed result |
| --- | --- |
| Unit/component suite | 251 passed across 40 files, including the 248 inherited cases |
| Local production-build HTTP suite | 26 passed, including seven new discovery/canonical checks |
| Next.js production build | Passed; `/links` is prerendered HTML |
| TypeScript | Passed after the final OpenNext build |
| Full OpenNext Cloudflare build | Passed, including the existing Prisma/middleware packaging patches |
| Catalog drift / charset / tracked-source security / Git whitespace | Passed |
| Browser layout | Production HTML and hashed CSS/JS inspected at desktop, plus 390/768/1280-pixel iframe viewports; content did not overflow horizontally. Native FAQ expansion displayed its answer. |

Browser limitation: the managed preview launcher appends Vite-only flags to Next.js (`--host` / `--strictPort`). The source app was not altered to work around that launcher. Browser inspection instead used a separate temporary static copy of the actual production HTML and built assets. It establishes rendered layout/FAQ behavior, not authenticated navigation, real-device acceptance or a running Next.js browser session. HTTP checks above used the actual local Next.js production server. Existing build warnings (legacy UI lint, unsupported Next version notice and generated QR expression warnings) remain; no new build failure was suppressed.

```sh
npm ci --ignore-scripts
npm run db:generate
npm run test:unit
npm run check:branding
npm run check:charset
npm run check:security
npm run build
npm run typecheck
npm run test:e2e
npm run cf:build
```

Run Next/OpenNext builds and typecheck sequentially because they replace `.next/types`. The HTTP suite verifies anonymous SSR, exact canonical and schema URLs, every sitemap entry's HTTP status and self-canonical, marketing discovery links and preserved login protection. HTTP tests do not establish browser/viewport, authenticated-user, production or Google acceptance.

## Production checks still needed

1. Record the deployed app and marketing SHAs. Inspect real responses for `https://www.vibelinkth.com/`, `https://vibelinkth.com/`, `https://app.vibelinkth.com/`, `/links`, `/qr`, both sitemaps and both robots files. A branch or local build is not production evidence.
2. The prior audit received HTTP 403 / Cloudflare error 1010 from the QR endpoint. Use Cloudflare Security Events and Search Console's live URL test to determine whether verified Googlebot is affected. Do not disable WAF/bot controls or infer a Googlebot block solely from the audit client's response.
3. Prepare an exact apex-homepage redirect for review in the existing Cloudflare zone: host equals `vibelinkth.com` AND path equals `/`; destination `https://www.vibelinkth.com/`; permanent HTTP 301; preserve the query string. Confirm existing rules do not loop. This is a proposed configuration, not an applied rule. Do not redirect app-host traffic or `/go/*` with a broad catch-all.
4. After the approved release, verify apex root reaches the `www` root once, preserves parameters and ends in 200 with one matching canonical. Test existing `/go/*` routes separately. The marketing `www` host must actually serve the canonical page without bouncing back to the apex.
5. In the domain property for `vibelinkth.com`, inspect both home variants, the app home, QR and Links. Record user-declared vs Google-selected canonical, indexing status/reason, last crawl, fetch status and sitemap discovery/last-read status. `/qr` in this build belongs to `app.vibelinkth.com`; no marketing-host `/qr` alias is assumed.
6. Submit/check the marketing and app sitemaps only after their intended versions are live. Inspect for blocked robots, noindex, redirect errors, soft 404, discovered/crawled-but-not-indexed and alternate-canonical classifications; none is confirmed by the current audit.

## Search Console baseline to collect

Use Search type Web and 28 October 2026 through the latest available complete day; retain the actual cutoff and separate preliminary data. Standard date reports use Pacific Time; do not silently compare with Bangkok calendar days.

Capture date-level and overall Clicks, Impressions, CTR and Average Position, then Query and Page dimensions with country/device cuts where useful. Compare branded terms with observed non-branded Links/QR queries. Recompute aggregate CTR from clicks/impressions; do not average row CTRs or manufacture a benchmark from this short opening period. Keep the email's visibility confirmation separate from traffic measurements and post-release results.

## References

- [Branding PR #5](https://github.com/SartraTotoh/VibeLinkTH/pull/5)
- [Google canonicalization guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Google Search documentation updates](https://developers.google.com/search/updates): FAQ rich results ceased appearing on 7 May 2026. Visible FAQs remain useful content, without a promised rich-result benefit.
- [Search Console dates and grouping](https://support.google.com/webmasters/answer/17011259?hl=en)
