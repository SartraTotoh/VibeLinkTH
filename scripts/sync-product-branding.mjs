// The static landing has no Next.js runtime. Render only its catalog-backed
// regions/SEO from the same JSON used by the app; --check refuses stale output.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const root = new URL("../", import.meta.url);
const brand = JSON.parse(readFileSync(new URL("lib/brand.json", root), "utf8"));
const path = new URL("landing/index.html", root);
const source = readFileSync(path, "utf8");
const ids = ["links", "qr", "booking", "live"];
const escape = value => String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const href = product => product.route ? brand.appUrl + product.route : "#" + product.anchor;
const discoveryHref = product => product.discoveryRoute ? brand.appUrl + product.discoveryRoute : href(product);
function region(html, name, content) {
  const start = `<!-- ${name}:start -->`; const end = `<!-- ${name}:end -->`;
  const first = html.indexOf(start); const last = html.indexOf(end);
  if (first < 0 || last <= first || html.indexOf(start, first + start.length) >= 0) throw new Error(`Missing/duplicate region: ${name}`);
  return html.slice(0, first) + start + "\n" + content + "\n" + html.slice(last);
}
function navigation(className, label) {
  return `<nav class="${className}" aria-label="${label}">\n` + ids.map(id => {
    const p = brand.products[id];
    const status = ["development", "alpha"].includes(p.status) ? `<small>${escape(p.statusLabel.th)}</small>` : "";
    return `  <a href="${escape(discoveryHref(p))}" data-product="${id}" data-product-status="${p.status}">${escape(p.label)}${status}</a>`;
  }).join("\n") + "\n</nav>";
}
let output = region(source, "product-nav-desktop", navigation("nav-links", "บริการ VibeLinkTH"));
output = region(output, "product-nav-mobile", navigation("mobile-nav", "บริการ VibeLinkTH บนมือถือ"));
const cards = '<div class="ecosystem">\n' + ids.map((id, i) => {
  const p = brand.products[id];
  const discovery = p.discoveryRoute ? `<a href="${escape(discoveryHref(p))}">รู้จัก ${escape(p.label)} →</a>\n    ` : "";
  const cta = discovery + (p.route ? `<a href="${escape(href(p))}">${escape(p.cta.th)} ↗</a>` : `<span class="product-unavailable">${escape(p.cta.th)}</span>`);
  return `  <article class="eco-card" id="${p.anchor}" data-product-status="${p.status}">\n    <div class="eco-badge">0${i + 1}</div>\n    <div class="eco-icon"><span class="ms" aria-hidden="true">${p.icon}</span></div>\n    <h3>${escape(p.name)}</h3>\n    <small class="product-status">${escape(p.statusLabel.th)}</small>\n    <p>${escape(p.description.th)}</p>\n    ${cta}\n  </article>`;
}).join("\n") + "\n</div>";
output = region(output, "product-cards", cards);
output = output.replace(/<title>[^<]*<\/title>/, `<title>${escape(brand.seo.title)}</title>`);
for (const [attribute, key, value] of [
  ["name", "description", brand.seo.description], ["name", "keywords", brand.seo.keywords.join(", ")], ["property", "og:title", brand.seo.title],
  ["property", "og:description", brand.seo.description], ["property", "og:site_name", brand.name],
  ["property", "og:url", brand.marketingUrl],
  ["property", "og:image", `${brand.marketingUrl}og-products.png?v=20261030`],
  ["name", "twitter:image", `${brand.marketingUrl}og-products.png?v=20261030`], ["property", "og:image:alt", `${brand.products.qr.name} — สร้าง QR Code ฟรี`],
  ["name", "twitter:title", brand.seo.title], ["name", "twitter:description", brand.seo.description],
]) {
  const pattern = new RegExp(`<meta ${attribute}="${key}" content="[^"]*"\\s*/>`);
  if (!pattern.test(output)) throw new Error(`Missing metadata: ${key}`);
  output = output.replace(pattern, `<meta ${attribute}="${key}" content="${escape(value)}" />`);
}
output = output.replace(/<link rel="canonical" href="[^"]*"\s*\/>/, `<link rel="canonical" href="${brand.marketingUrl}" />`);
output = output.replace(/<a class="brand" href="[^"]*"/, `<a class="brand" href="${brand.marketingUrl}"`);
output = output.replace(/<link rel="alternate" href="[^"]*" hreflang="th-TH"\s*\/>/, `<link rel="alternate" href="${brand.marketingUrl}" hreflang="th-TH" />`);
output = output.replace(/<p class="brandline">[^<]*<\/p>/, `<p class="brandline">${escape(brand.name)} — ${escape(brand.tagline)}</p>`);
output = output.replace(/<span>© 2026 VibeLinkTH[^<]*<\/span>/, `<span>© 2026 ${escape(brand.name)} — ${escape(brand.tagline)}</span>`);
const schemaPattern = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/;
const schemaMatch = output.match(schemaPattern);
if (!schemaMatch) throw new Error("Missing JSON-LD");
const schema = JSON.parse(schemaMatch[1]);
const organization = schema["@graph"].find(item => item["@type"] === "Organization");
organization.name = brand.name; organization.slogan = brand.tagline; organization.url = brand.marketingUrl;
const website = schema["@graph"].find(item => item["@type"] === "WebSite");
website.name = brand.name; website.url = brand.marketingUrl; website.description = brand.seo.description;
website.about = ids.map(id => {
  const p = brand.products[id];
  return { "@type": "Thing", name: p.name, url: brand.marketingUrl + "#" + p.anchor,
    description: `${p.description.th} (${p.statusLabel.th})` };
});
output = output.replace(schemaPattern, `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2).replaceAll("<", "\\u003c")}\n  </script>`);
if (process.argv.includes("--check")) {
  if (source !== output) { console.error("Static landing branding is stale; run npm run sync:branding"); process.exitCode = 1; }
  else console.log("Product catalog, static navigation and SEO are in sync.");
} else if (source !== output) {
  writeFileSync(path, output, "utf8"); console.log(`Updated ${fileURLToPath(path)}`);
}
