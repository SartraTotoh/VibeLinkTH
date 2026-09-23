import { describe, expect, it } from "vitest";
import { findCampaignFor, campaignSlugify } from "../lib/campaign-attribution";

const camps = [
  { id: "c1", name: "โปรโมชัน 9.9" },
  { id: "c2", name: "Flash Sale TikTok" },
];

describe("campaignSlugify", () => {
  it("normalizes latin to url slug", () => {
    expect(campaignSlugify("  Flash Sale TikTok ")).toBe("flash-sale-tiktok");
  });

  it("keeps numeric promo codes from thai names", () => {
    expect(campaignSlugify("โปรโมชัน 9.9")).toBe("9-9");
  });
});

describe("findCampaignFor", () => {
  it("matches utm_campaign by exact name", () => {
    const url = "https://shopee.co.th/x?utm_campaign=Flash%20Sale%20TikTok";
    expect(findCampaignFor(url, camps)).toEqual({ campaignId: "c2", matchedName: "Flash Sale TikTok" });
  });

  it("falls back to numeric code matching (thai promo + latin utm)", () => {
    const url = "https://lazada.co.th/x?utm_campaign=Promo-9-9";
    expect(findCampaignFor(url, camps)).toEqual({ campaignId: "c1", matchedName: "โปรโมชัน 9.9" });
  });

  it("matches slugified latin names", () => {
    expect(findCampaignFor("https://x.co/x?utm_campaign=flash-sale-tiktok", camps)).toEqual({
      campaignId: "c2",
      matchedName: "Flash Sale TikTok",
    });
  });

  it("attributes to the only bound campaign when no utm param", () => {
    const url = "https://shopee.co.th/x";
    expect(findCampaignFor(url, [{ id: "only", name: "bio" }])).toEqual({
      campaignId: "only",
      matchedName: "bio",
    });
  });

  it("returns null when ambiguous (many campaigns, no utm)", () => {
    expect(findCampaignFor("https://shopee.co.th/x", camps)).toEqual({
      campaignId: null,
      matchedName: null,
    });
  });

  it("reports the unmatched utm name but attributes nothing", () => {
    expect(findCampaignFor("https://shopee.co.th/x?utm_campaign=NoSuchCamp", camps)).toEqual({
      campaignId: null,
      matchedName: "NoSuchCamp",
    });
  });

  it("returns null on empty campaign list", () => {
    expect(findCampaignFor("https://shopee.co.th/x", [])).toEqual({
      campaignId: null,
      matchedName: null,
    });
  });
});