import { writeAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Best-effort SECURITY event record. Rate-limited per IP so a flood of
 * probes does not blow up the audit table. Never throws.
 */
export async function recordSecurityAttempt(args: {
  path: string;
  ip: string;
  reason: string;
  actorEmail?: string | null;
}) {
  const rl = rateLimit(`security:${args.ip}`, 4, 60_000);
  if (!rl.ok) return;

  await writeAudit({
    actorEmail: args.actorEmail ?? "anonymous",
    action: "security.blocked",
    subjectType: "SECURITY",
    subjectRef: args.path.slice(0, 500),
    detail: `${args.reason} · ip ${args.ip}`.slice(0, 500),
    result: "blocked",
  });
}