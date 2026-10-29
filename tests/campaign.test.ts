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

  it("preserves Thai letters and numeric codes", () => {
    expect(campaignSlugify("โปรโมชัน 9.9")).toBe("โปรโมชัน-9-9");
  });
});

describe("findCampaignFor", () => {
  it("matches utm_campaign by exact name", () => {
    const url = "https://shopee.co.th/x?utm_campaign=Flash%20Sale%20TikTok";
    expect(findCampaignFor(url, camps)).toEqual({ campaignId: "c2", matchedName: "Flash Sale TikTok" });
  });

  it("does not infer attribution from shared numeric codes", () => {
    const url = "https://lazada.co.th/x?utm_campaign=Promo-9-9";
    expect(findCampaignFor(url, camps)).toEqual({ campaignId: null, matchedName: "Promo-9-9" });
  });

  it("matches slugified latin names", () => {
    expect(findCampaignFor("https://x.co/x?utm_campaign=flash-sale-tiktok", camps)).toEqual({
      campaignId: "c2",
      matchedName: "Flash Sale TikTok",
    });
  });

  it("does not invent attribution without a UTM even for a single campaign", () => {
    const url = "https://shopee.co.th/x";
    expect(findCampaignFor(url, [{ id: "only", name: "bio" }])).toEqual({
      campaignId: null,
      matchedName: null,
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

describe("attribution ambiguity", () => {
  it("matches stable IDs", () => {
    expect(findCampaignFor("https://example.com/?utm_campaign=c1", camps).campaignId).toBe("c1");
  });
  it("rejects duplicate parameters", () => {
    expect(findCampaignFor("https://example.com/?utm_campaign=c1&utm_campaign=c2", camps).campaignId).toBeNull();
  });
  it("rejects colliding names and slugs", () => {
    expect(findCampaignFor("https://example.com/?utm_campaign=sale-now", [{id:"a",name:"Sale Now"},{id:"b",name:"sale-now"},{id:"c",name:"sale-now"}]).campaignId).toBeNull();
  });
});
