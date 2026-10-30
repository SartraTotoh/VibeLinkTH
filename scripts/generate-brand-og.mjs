// A new code-native brand card, independent from the old bitmap screenshots.
// Keep the editable SVG and render the PNG used by Open Graph/Twitter.
import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
const root = new URL("../", import.meta.url);
const brand = JSON.parse(readFileSync(new URL("lib/brand.json", root), "utf8"));
const ids = ["links", "qr", "booking", "live"];
const escape = text => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
const sentences = brand.tagline.match(/[^.]+\./g).map(value => value.trim());
const cards = ids.map((id, index) => {
  const p = brand.products[id]; const x = 68 + index * 270;
  return `<g transform="translate(${x} 386)"><rect width="254" height="142" rx="22" fill="#121827" stroke="#394158"/><text x="20" y="47" font-size="32" font-weight="700" fill="#f4f4f5">${p.label}</text><text x="20" y="85" font-size="15" fill="#c5ff6a">${escape(p.statusLabel.en)}</text><text x="20" y="115" font-size="13" fill="#b8c3d4">${escape(p.name)}</text></g>`;
}).join("\n");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${escape(brand.name)} — ${escape(brand.tagline)}">
<title>${escape(brand.name)} — Links / QR / Booking / Live</title>
<defs><linearGradient id="glow"><stop stop-color="#b9ff2c"/><stop offset=".5" stop-color="#ff4fd8"/><stop offset="1" stop-color="#9270ff"/></linearGradient><radialGradient id="back"><stop stop-color="#29203f"/><stop offset="1" stop-color="#090b10"/></radialGradient></defs>
<rect width="1200" height="630" fill="#090b10"/><ellipse cx="1040" cy="30" rx="600" ry="480" fill="url(#back)"/>
<g font-family="DejaVu Sans, sans-serif"><text x="68" y="130" fill="#f4f4f5" font-size="76" font-weight="700">${brand.name}</text>
<rect x="68" y="154" width="1064" height="5" rx="2" fill="url(#glow)"/>
<text x="68" y="229" fill="#f4f4f5" font-size="38" font-weight="600">${escape(sentences.slice(0, 2).join(" "))}</text>
<text x="68" y="283" fill="#c5ff6a" font-size="38" font-weight="600">${escape(sentences.slice(2).join(" "))}</text>
<text x="68" y="337" fill="#b8c3d4" font-size="23">Create free QR codes. Manage and share your links.</text>
${cards}
<text x="68" y="584" fill="#b8c3d4" font-size="20">vibelinkth.com</text></g></svg>`;
const png = await sharp(Buffer.from(svg)).png().toBuffer();
for (const directory of ["public", "landing"]) {
  writeFileSync(new URL(`${directory}/og-products.svg`, root), svg + "\n");
  writeFileSync(new URL(`${directory}/og-products.png`, root), png);
}
console.log("Generated new 1200x630 brand cards for the app and static landing.");
