type Project = { name: string; production_branch: string; domains?: string[] };
export function selectLandingProject(projects: Project[]): { name: string; branch: string };
export function discoverLandingProject(accountId: string | undefined, token: string | undefined, fetcher?: typeof fetch): Promise<{ name: string; branch: string }>;
