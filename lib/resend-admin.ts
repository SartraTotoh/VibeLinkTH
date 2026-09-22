export type ResendRecordStatus = {
  record: string;
  type: string;
  name: string;
  value: string;
  ttl: string;
  priority?: number | null;
  status: string;
};

export type ResendDomainStatus = {
  configured: boolean;
  sendOnly?: boolean;
  id?: string;
  name?: string;
  status?: string;
  region?: string;
  records?: ResendRecordStatus[];
  error?: string;
};

const DOMAIN = "vibelinkth.com";

export async function getResendDomainStatus(): Promise<ResendDomainStatus> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { configured: false };

  try {
    const listRes = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!listRes.ok) {
      const body = await listRes.text().catch(() => "");
      if (listRes.status === 401 && body.includes("restricted_api_key")) {
        return { configured: true, sendOnly: true };
      }
      return { configured: true, error: `domains list failed (${listRes.status})` };
    }
    const list = (await listRes.json()) as {
      data?: Array<{ id: string; name: string; status: string; region: string }>;
    };
    const domain = list.data?.find((d) => d.name === DOMAIN);
    if (!domain) {
      return { configured: true, error: `domain ${DOMAIN} not found` };
    }

    const oneRes = await fetch(`https://api.resend.com/domains/${domain.id}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!oneRes.ok) {
      return {
        configured: true,
        id: domain.id,
        name: domain.name,
        status: domain.status,
        region: domain.region,
        error: `domain detail failed (${oneRes.status})`,
      };
    }
    const detail = (await oneRes.json()) as { records?: ResendRecordStatus[] };
    return {
      configured: true,
      id: domain.id,
      name: domain.name,
      status: domain.status,
      region: domain.region,
      records: detail.records ?? [],
    };
  } catch (err) {
    return { configured: true, error: String(err) };
  }
}
