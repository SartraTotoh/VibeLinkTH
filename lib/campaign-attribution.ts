export type CampaignRef = {
  id: string;
  name: string;
};

export type CampaignAttribution = {
  campaignId: string | null;
  matchedName: string | null;
};

export function campaignSlugify(raw: string) {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function digitsOf(raw: string) {
  return (raw.match(/[0-9]/g) || []).join("");
}

export function findCampaignFor(
  url: string,
  campaigns: CampaignRef[],
): CampaignAttribution {
  if (campaigns.length === 0) return { campaignId: null, matchedName: null };

  let utmCampaign: string | null = null;
  try {
    const parsed = new URL(url);
    utmCampaign = parsed.searchParams.get("utm_campaign");
  } catch {
    utmCampaign = null;
  }

  if (utmCampaign) {
    const param = utmCampaign.trim();
    if (param) {
      const paramSlug = campaignSlugify(param);
      const paramDigits = digitsOf(param);
      const match = campaigns.find((c) => {
        const name = c.name.trim().toLowerCase();
        const p = param.toLowerCase();
        if (name === p) return true;
        const nameSlug = campaignSlugify(c.name);
        if (nameSlug && paramSlug && nameSlug === paramSlug) return true;
        const nameDigits = digitsOf(c.name);
        if (nameDigits && paramDigits && nameDigits === paramDigits) return true;
        return false;
      });
      if (match) return { campaignId: match.id, matchedName: match.name };
      return { campaignId: null, matchedName: utmCampaign };
    }
  }

  if (campaigns.length === 1) {
    return { campaignId: campaigns[0]!.id, matchedName: campaigns[0]!.name };
  }

  return { campaignId: null, matchedName: null };
}