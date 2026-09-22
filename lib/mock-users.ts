export type CrmUser = {
  id: string;
  email: string;
  displayName: string | null;
  plan: "FREE" | "CREATOR" | "CREATOR_PLUS";
  emailVerified: string | null;
  createdAt: string;
  linkCount: number;
  clickCount: number;
  subscription: { plan: string; status: string } | null;
  mock?: boolean;
  views?: number;
  uniqueViews?: number;
  d7?: boolean;
  d30?: boolean;
};

// Flip to false to remove all mockups from the admin console.
// Mock rows are NEVER written to the database — they only exist here.
// OFF by default: decision numbers must be real-only (no mock badge shown).
export const MOCK_USERS_ENABLED = false;

const d = (iso: string) => iso;

export const MOCK_USERS: CrmUser[] = [
  {
    id: "mock-01",
    email: "mint.mood@example.com",
    displayName: "Mint Mood",
    plan: "CREATOR",
    emailVerified: d("2026-07-02T08:12:00.000Z"),
    createdAt: d("2026-07-02T08:12:00.000Z"),
    linkCount: 87,
    clickCount: 12480,
    views: 148203,
    uniqueViews: 92841,
    d7: true,
    d30: true,
    subscription: { plan: "CREATOR", status: "ACTIVE" },
    mock: true,
  },
  {
    id: "mock-02",
    email: "sai.shopee@example.com",
    displayName: "สายช้อป",
    plan: "CREATOR",
    emailVerified: d("2026-07-19T14:40:00.000Z"),
    createdAt: d("2026-07-19T14:40:00.000Z"),
    linkCount: 132,
    clickCount: 31205,
    views: 402117,
    uniqueViews: 251330,
    d7: true,
    d30: true,
    subscription: { plan: "CREATOR", status: "ACTIVE" },
    mock: true,
  },
  {
    id: "mock-03",
    email: "tiktok.beauty@example.com",
    displayName: "Beauty Lab",
    plan: "FREE",
    emailVerified: d("2026-08-05T11:03:00.000Z"),
    createdAt: d("2026-08-05T11:03:00.000Z"),
    linkCount: 9,
    clickCount: 412,
    views: 5930,
    uniqueViews: 3812,
    d7: true,
    d30: true,
    subscription: null,
    mock: true,
  },
  {
    id: "mock-04",
    email: "foodie.bkk@example.com",
    displayName: "Foodie BKK",
    plan: "FREE",
    emailVerified: null,
    createdAt: d("2026-08-22T18:27:00.000Z"),
    linkCount: 3,
    clickCount: 28,
    views: 402,
    uniqueViews: 261,
    d7: true,
    d30: false,
    subscription: null,
    mock: true,
  },
  {
    id: "mock-05",
    email: "gadget.men@example.com",
    displayName: "Gadget Men",
    plan: "CREATOR_PLUS",
    emailVerified: d("2026-06-11T09:51:00.000Z"),
    createdAt: d("2026-06-11T09:51:00.000Z"),
    linkCount: 640,
    clickCount: 188302,
    views: 2410955,
    uniqueViews: 1502830,
    d7: true,
    d30: true,
    subscription: { plan: "CREATOR_PLUS", status: "ACTIVE" },
    mock: true,
  },
  {
    id: "mock-06",
    email: "mommy.deal@example.com",
    displayName: "Mommy Deal",
    plan: "CREATOR",
    emailVerified: d("2026-09-02T16:08:00.000Z"),
    createdAt: d("2026-09-02T16:08:00.000Z"),
    linkCount: 45,
    clickCount: 5210,
    views: 68440,
    uniqueViews: 42115,
    d7: true,
    d30: true,
    subscription: { plan: "CREATOR", status: "ACTIVE" },
    mock: true,
  },
  {
    id: "mock-07",
    email: "sneaker.head@example.com",
    displayName: "Sneaker Head",
    plan: "FREE",
    emailVerified: d("2026-09-10T20:44:00.000Z"),
    createdAt: d("2026-09-10T20:44:00.000Z"),
    linkCount: 10,
    clickCount: 890,
    views: 11230,
    uniqueViews: 7040,
    d7: true,
    d30: false,
    subscription: null,
    mock: true,
  },
  {
    id: "mock-08",
    email: "cafe.hopping@example.com",
    displayName: "Cafe Hopping",
    plan: "FREE",
    emailVerified: null,
    createdAt: d("2026-09-18T12:15:00.000Z"),
    linkCount: 1,
    clickCount: 0,
    views: 35,
    uniqueViews: 22,
    d7: false,
    d30: false,
    subscription: null,
    mock: true,
  },
  {
    id: "mock-09",
    email: "teacher.aom@example.com",
    displayName: "ครูออม",
    plan: "CREATOR",
    emailVerified: d("2026-08-30T07:59:00.000Z"),
    createdAt: d("2026-08-14T07:59:00.000Z"),
    linkCount: 58,
    clickCount: 7304,
    views: 96540,
    uniqueViews: 60120,
    d7: false,
    d30: false,
    subscription: { plan: "CREATOR", status: "EXPIRED" },
    mock: true,
  },
  {
    id: "mock-10",
    email: "travel.trio@example.com",
    displayName: "Travel Trio",
    plan: "FREE",
    emailVerified: d("2026-09-20T21:33:00.000Z"),
    createdAt: d("2026-09-20T21:33:00.000Z"),
    linkCount: 6,
    clickCount: 154,
    views: 2210,
    uniqueViews: 1405,
    d7: true,
    d30: false,
    subscription: null,
    mock: true,
  },
];

export type CrmFilter = { query: string; plan: string };

export function filterUsers(users: CrmUser[], filter: CrmFilter): CrmUser[] {
  const q = filter.query.trim().toLowerCase();
  return users
    .filter((u) => {
      if (filter.plan !== "ALL" && u.plan !== filter.plan) return false;
      if (!q) return true;
      return (
        u.email.toLowerCase().includes(q) ||
        (u.displayName ?? "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function mergeUserLists(real: CrmUser[], filter: CrmFilter): { rows: CrmUser[]; realCount: number; mockCount: number } {
  const mocks = MOCK_USERS_ENABLED ? MOCK_USERS : [];
  const rows = filterUsers([...real, ...mocks], filter);
  return {
    rows,
    realCount: filterUsers(real, filter).length,
    mockCount: filterUsers(mocks, filter).length,
  };
}
