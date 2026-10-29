import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export function selectLandingProject(projects) {
  const candidates = projects.filter((p) => p.domains?.includes("vibelinkth.com"));
  if (candidates.length !== 1) throw new Error("Expected exactly one existing Pages project serving vibelinkth.com; no deployment performed.");
  const project = candidates[0];
  if (!/^[a-z0-9-]+$/.test(project.name ?? "") || typeof project.production_branch !== "string" || !project.production_branch.trim() || /[\r\n]/.test(project.production_branch)) {
    throw new Error("Pages project metadata is incomplete; no deployment performed.");
  }
  return { name: project.name, branch: project.production_branch };
}

export async function discoverLandingProject(accountId, token, fetcher = fetch) {
  if (!/^[a-f0-9]{32}$/i.test(accountId ?? "") || !token) throw new Error("Configure CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in repository Secrets.");
  const projects = [];
  for (let page = 1; page <= 100; page++) {
    const res = await fetcher(`https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects?page=${page}&per_page=100`, {
      headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000),
    });
    const payload = await res.json();
    if (!res.ok || !payload.success || !Array.isArray(payload.result)) throw new Error(`Cloudflare Pages discovery failed (HTTP ${res.status}); check account and token permissions.`);
    projects.push(...payload.result);
    if (payload.result.length < 100 || page >= payload.result_info?.total_pages) return selectLandingProject(projects);
  }
  throw new Error("Project listing exceeded the safe discovery limit.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const project = await discoverLandingProject(process.env.CLOUDFLARE_ACCOUNT_ID, process.env.CLOUDFLARE_API_TOKEN);
    if (!process.env.GITHUB_OUTPUT) throw new Error("Run this command in GitHub Actions.");
    appendFileSync(process.env.GITHUB_OUTPUT, `pages_project=${project.name}\npages_branch=${project.branch}\n`);
    console.log("Verified the existing landing project and its production branch.");
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
