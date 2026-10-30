# VibeLinkTH product branding and navigation — 30 October 2026

## ผลลัพธ์

ใช้แบรนด์ **VibeLinkTH — Your vibe. Level up your life. Grow your business.** และชื่อหน้าบริการ **VibeLinkTH Links / VibeLinkTH QR / VibeLinkTH Booking / VibeLinkTH Live** โดยเมนูใช้ **Links / QR / Booking / Live**

Branding branch: `fix/product-branding-20261030`, based on PR #3 head `df2cb000a0e5d14e1060495115f1898e010696c2`. No existing PR, production branch, deployment configuration or service activation flag was changed. No merge, deployment, account creation, message, real payment or live stream was performed.

## Product names and verified code-level availability

| Product | Display name | Stable destination | What the code supports / public wording |
| --- | --- | --- | --- |
| Links | VibeLinkTH Links | `/dashboard/links` | Authenticated short-link management, bio link page, UTM and click statistics within account limits |
| QR | VibeLinkTH QR | `/qr` | Public basic static QR for URL, colors/logo, decode checks and PNG/SVG export; retains **สร้าง QR Code ฟรี** |
| Booking | VibeLinkTH Booking | No application route; navigation goes to `#product-booking` information | In development. No built-in calendar, deposit or Booking action is advertised or enabled. Existing external booking URLs can still be encoded as ordinary URLs. |
| Live | VibeLinkTH Live | `/live`, authenticated | Experimental two-source rehearsal and local recording. Cloud output remains the guarded admin pilot inherited from PR #3, not generally available. |

`lib/brand.json` is the shared catalog. `lib/products.ts` keeps labels separate from routes. The existing bio page is a Links feature, displayed as **หน้ารวมลิงก์ / Bio link page**. `/vibe/[slug]`, `/dashboard/vibepage`, `/go/[slug]`, API keys such as `type: "vibe"`, `shortLinks`, `vibeReady`, and `bookingPublished`, and the database's `vibeSlug`/related fields remain unchanged. User-authored profile titles, URLs and saved content are not rewritten.

The QR Studio's old `short` mode is now labelled Links; `vibe` is the bio link page. The `booking` mode identifier remains in the implementation for compatibility, but its control is disabled while the catalog says development, even if a stale destination response includes a booking entry. The existing destinations endpoint continues to omit Booking destinations and return `bookingPublished: false`.

## PR compatibility

| PR / source | Snapshot checked | Relationship and treatment |
| --- | --- | --- |
| [PR #1](https://github.com/SartraTotoh/VibeLinkTH/pull/1) | `9df72fbe185f622aa1a29f085b512d2c8984ae2a`; base `release/qr-studio-v1` | Still Draft in GitHub metadata, but its exact head is already an ancestor of main, PR #2 and PR #3. Its QR/SEO work is inherited; no duplicate cherry-pick or replacement of its older tree was needed. |
| main | `0355149a3bfb6cb372e1dde949cace07867948ed` | Contains PR #1 head in its history. No main update was performed. |
| [PR #2](https://github.com/SartraTotoh/VibeLinkTH/pull/2) | `94f7e8e123d16ac750c832a07282fb33f93d302a`; base main | Ancestor of PR #3. Preserves truthful static-landing claims, support/reporting corrections, dependency versions, release guards and the final CTA's upright animated gradient. Existing CTA regressions pass. |
| [PR #3](https://github.com/SartraTotoh/VibeLinkTH/pull/3) | `df2cb000a0e5d14e1060495115f1898e010696c2`; base `fix/pitch-support-analytics` | Chosen integration base. Keeps the actual Live route and its pilot restrictions; shared product navigation was added without changing media/provider logic, permissions, schema or flags. |

`git merge-base --is-ancestor` returned success for all four snapshots against the branding base. The existing PR #3 unit suite passed after the branding changes, including Live, support, reporting, security and the closing CTA. This is a stacked change to review against `feat/live-studio-phase1`; it is not a standalone substitute for PR #2/#3 on main. If those heads move, repeat the comparison/tests before release. The separate Billing PR #4 remains separate and must be reconciled in the eventual release integration; this branding patch does not overwrite or claim to include it.

## SEO and claims

- Keep one homepage H1 with **สร้าง QR Code ฟรี** on both static and app homepages, and retain the Thai QR title/H1, guide, FAQ, static-QR explanation, logo customization, decode checks, PNG/SVG terms, short-link and UTM search intent.
- Replace product-name drift in landing descriptions, QR Studio Thai/English copy, bio editor/onboarding/settings, the application manifest, titles, Open Graph, Twitter metadata and QR SVG accessibility text.
- Remove app-home claims of 0.04-second performance, immediate Booking deposits, scan-count analytics and accurate purchase conversion that this snapshot cannot substantiate. Technical click statistics and static QR limitations stay explicit.
- Preserve the static landing's existing `https://www.vibelinkth.com/` canonical choice, align WebSite/Organization/social URL/hreflang with it, and list only that marketing canonical in its sitemap. The app `/qr` canonical and its indexable sitemap priority remain unchanged. Authenticated Links/Live pages are not promoted as public SEO landing pages.
- Fix the QR guide's broken `#growth-cases` / `#growth-plans` targets to existing `#cases` / `#pricing`. Same-page landing fragment targets are checked.
- Organization/WebSite names use VibeLinkTH. Product `Thing` descriptions in WebSite.about reproduce the visible status descriptions. No Booking/Live purchase or reservation actions/offers were added. Only QR retains its existing SoftwareApplication/free-basic-QR offer. The four static FAQ JSON-LD answers match the visible answers.
- Create new editable `og-products.svg` and rendered 1200×630 PNG cards for both publishing targets. They carry the approved names/tagline and availability labels. Metadata no longer references the old image with obsolete claims or the app image containing mojibake. The old files are not deleted because external consumers may still reference them; old social caches need later re-scraping.

The static site has no Next.js runtime. `npm run sync:branding` renders only marked product/navigation regions and catalog metadata from the same JSON; `npm run check:branding` prevents stale static output in CI. `npm run brand:og` regenerates the SVG/PNG assets. This does not require a new runtime dependency or a data migration.

## Validation

| Check | Result |
| --- | --- |
| Unit/component regression suite | **248 passed across 39 files**: 234 inherited cases plus 14 branding/navigation cases |
| New branding cases | Product names/tagline/order; actual existing route destinations; development/pilot labels; no fake Booking action; old short-mode behavior; disabled Booking despite stale API data; static catalog drift; one Thai H1; valid fragments; canonical/sitemap/social/schema consistency; FAQ visibility; matching new image dimensions and labels |
| Local HTTP production-build checks | **19 passed**: 12 inherited public smoke cases plus 7 new branding cases |
| HTTP assertions | App/static text and schema, Thai QR title/indexability/canonical, protected Links/bio/Live redirects, anonymous destinations 401, manifest, 1200×630 share asset and identical static/app PNG |
| TypeScript | Passed after the final build completed |
| Production dependency audit | npm audit --omit=dev --audit-level=high: zero vulnerabilities |
| Prisma client generation | Passed using the unchanged PR #3 schema |
| Catalog drift / charset / tracked-source security / Git whitespace | Passed |
| Next.js production build | Passed |
| Complete OpenNext Cloudflare build | Passed, including inherited Prisma and middleware packaging patches |

All HTTP tests are read-only and local, using dummy secrets and a loopback-only database URL. The Playwright project label is chromium, but these specific tests use the HTTP request fixture and do not prove a browser-rendered UI. No authenticated real user data, camera/microphone permission, live destination, booking, Stripe transaction or production database was used.

Reproduce from this branch:

```sh
npm ci --ignore-scripts
npm run db:generate
npm run typecheck
npm run test:unit
npm run check:branding
npm run check:charset
npm run check:security
# Set build/test-only localhost values; never substitute a production database.
npm run build
npx playwright test e2e/public-smoke.spec.ts e2e/product-branding.spec.ts --workers=2
npm run cf:build
```

Run typecheck and builds sequentially: Next/OpenNext replaces `.next/types` during a build. The final standalone typecheck was run after the build completed.

## Before publication

1. Review/accept the stacked source order. Do not replay PR #1's older files over PR #2/#3. Preserve the separate Billing changes when integrating a release.
2. Perform mobile/iPad/desktop visual, keyboard and screen-reader acceptance. The local Chromium download returned an invalid/truncated archive, and the separate Cloud Browser could not reach the local server (`ERR_CONNECTION_REFUSED`). No browser screenshot or viewport acceptance is claimed. Component/HTTP tests passed; those are separate evidence.
3. Verify the public hosts' redirect/canonical behavior, actual deployed account access, static and app links, social card caching and Google Search Console/Rich Results output. Public-domain retrieval was unavailable in this environment; production availability/ranking has not been established by this patch.
4. Keep Booking unavailable until its route, schema and end-to-end service are accepted. Keep Live marked experimental; provider configuration, hardware support and authorized real test-mode output still follow PR #3's existing release gates. This task enabled none of them.
5. Existing database-backed support rules can retain old text. The seed/menu reference was corrected in source; existing user/admin content was not bulk rewritten. Review those independently before publication.
6. Next.js build still reports six inherited UI lint warnings; OpenNext reports its existing Next 15 support warning and an unrelated generated QR schema expression warning. None was silently treated as a passed visual/accessibility audit.
7. No production deployment workflow was invoked. The inherited deployment workflow runs on main; this branch does not change its triggers or secrets. Publish the marketing and app targets only in a later authorized release, then recheck metadata, assets and protected routes.

Primary SEO reference: [Google Search Central structured-data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies), particularly representing visible, current page content. This work preserves technical SEO signals; it does not guarantee ranking or rich-result display.

## Changed files

- `.github/workflows/ci.yml`
- `app/api/qr/destinations/route.ts`
- `app/dashboard/links/page.tsx`
- `app/dashboard/vibepage/page.tsx`
- `app/layout.tsx`
- `app/manifest.ts`
- `app/page.tsx`
- `app/qr/page.tsx`
- `app/settings/page.tsx`
- `app/signup/page.tsx`
- `app/vibe/[slug]/page.tsx`
- `components/dashboard/dashboard-page-view.tsx`
- `components/dashboard/social-hub-settings.tsx`
- `components/dashboard/tabs/dashboard-tabs.tsx`
- `components/dashboard/tabs/vibe-tab.tsx`
- `components/landing/landing-page.tsx`
- `components/live/live-studio.tsx`
- `components/products/product-cards.tsx`
- `components/products/product-navigation.tsx`
- `components/products/products.module.css`
- `components/qr/qr-studio.module.css`
- `components/qr/qr-studio.tsx`
- `docs/product-branding-20261030.md`
- `e2e/product-branding.spec.ts`
- `landing/index.html`
- `landing/og-products.png`
- `landing/og-products.svg`
- `landing/robots.txt`
- `landing/sitemap.xml`
- `lib/brand.json`
- `lib/i18n.ts`
- `lib/products.ts`
- `lib/qr/copy.ts`
- `lib/qr/svg.ts`
- `lib/support.ts`
- `package.json`
- `public/og-products.png`
- `public/og-products.svg`
- `scripts/generate-brand-og.mjs`
- `scripts/sync-product-branding.mjs`
- `tests/product-branding.test.ts`
- `tests/qr-product-navigation.test.ts`
