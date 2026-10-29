export type CampaignRef = { id: string; name: string };
export type CampaignAttribution = { campaignId: string | null; matchedName: string | null };

export function campaignSlugify(raw: string) {
  return raw.normalize("NFC").toLowerCase().trim().replace(/[^\p{L}\p{M}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");
}

export function findCampaignFor(url: string, campaigns: CampaignRef[]): CampaignAttribution {
  let value: string | null;
  try {
    const values = new URL(url).searchParams.getAll("utm_campaign");
    if (values.length !== 1 || !values[0]?.trim()) return { campaignId: null, matchedName: null };
    value = values[0].trim();
  } catch {
    return { campaignId: null, matchedName: null };
  }
  // Prefer stable IDs, then exact normalized names, then unambiguous slugs.
  // Never infer attribution from digits or the existence of a single campaign.
  const byId = campaigns.filter((c) => c.id === value);
  const normalized = value.normalize("NFC").toLowerCase();
  const exact = campaigns.filter((c) => c.name.trim().normalize("NFC").toLowerCase() === normalized);
  const matches = byId.length ? byId : exact.length ? exact : campaigns.filter((c) => campaignSlugify(c.name) === campaignSlugify(value!));
  return matches.length === 1
    ? { campaignId: matches[0]!.id, matchedName: matches[0]!.name }
    : { campaignId: null, matchedName: value };
}
