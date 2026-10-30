import { BRAND, websiteStructuredData } from "@/lib/products";
import { publicPageMetadata } from "@/lib/seo";
import { LandingPage } from "@/components/landing/landing-page";

// This app entry mirrors the marketing homepage; consolidate its search signals.
export const metadata = publicPageMetadata(BRAND.seo.title, BRAND.seo.description, BRAND.marketingUrl);

export default function HomePage() {
  const url = BRAND.marketingUrl;
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteStructuredData(url)).replace(/</g, "\\u003c") }} /><LandingPage /></>;
}
