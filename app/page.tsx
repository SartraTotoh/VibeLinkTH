import { websiteStructuredData } from "@/lib/products";
import { LandingPage } from "@/components/landing/landing-page";

export default function HomePage() {
  const url = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.vibelinkth.com").replace(/\/$/, "") + "/";
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteStructuredData(url)).replace(/</g, "\\u003c") }} /><LandingPage /></>;
}
