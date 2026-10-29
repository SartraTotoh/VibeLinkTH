import { prisma } from "@/lib/prisma";
import { clientIp } from "@/lib/rate-limit";

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfter: number;
};

export const RL_TIMEOUT_MS = 3_000;

export const FAIL_OPEN_RESULT: RateLimitResult = { ok: true, remaining: 1, retryAfter: 0 };
export const FAIL_CLOSED_RESULT: RateLimitResult = { ok: false, remaining: 0, retryAfter: 10 };

function withTimeout<T>(p: Promise<T>): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error("rl-timeout")), RL_TIMEOUT_MS)),
  ]);
}

/**
 * Atomic rate limiter ใช้ Neon DB
 * INSERT ... ON CONFLICT DO UPDATE SET count = count + 1 RETURNING count (คำสั่งเดียว)
 * ไม่ใช้ $transaction (Prisma HTTP adapter ไม่รองรับ)
 * key: userKey ถ้าล็อกอินแล้ว, CF-Connecting-IP ถ้าไม่ส่ง
 * mode: "open" (default) = DB ล้ม/ช้าเกิน 3s → ผ่าน; "closed" = บล็อก (เส้น login/สมัคร/ลืมรหัส)
 */
export async function rateLimitDb(
  req: Request,
  namespace: string,
  limit: number,
  windowMs: number,
  userKey?: string | null,
  mode: "open" | "closed" = "open",
): Promise<RateLimitResult> {
  const key = userKey ?? "ip:" + clientIp(req);
  const fullKey = `${namespace}:${key}`;
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const failClosed = FAIL_CLOSED_RESULT;

  try {
    const sql = `INSERT INTO _rate_limit (key, window_start, count) VALUES ($1, $2, 1) ON CONFLICT (key, window_start) DO UPDATE SET count = _rate_limit.count + 1 RETURNING count`;
    const rows = await withTimeout(
      prisma.$queryRawUnsafe<{ count: number }[]>(sql, fullKey, windowStart),
    );
    const count = rows[0]?.count ?? 1;
    if (count > limit) {
      const retryAfter = Math.max(1, Math.ceil((windowStart + windowMs - now) / 1000));
      return { ok: false, remaining: 0, retryAfter };
    }
    return { ok: true, remaining: limit - count, retryAfter: 0 };
  } catch {
    return mode === "closed" ? failClosed : FAIL_OPEN_RESULT;
  }
}

/** Keep at least two days so cleanup cannot reset daily delivery quotas. */
export async function cleanupRateLimitTable(): Promise<number> {
  try {
    const cutoff = Date.now() - 2 * 24 * 3_600_000;
    return await prisma.$executeRawUnsafe(
      "DELETE FROM _rate_limit WHERE window_start < $1",
      cutoff,
    );
  } catch {
    return 0;
  }
}
