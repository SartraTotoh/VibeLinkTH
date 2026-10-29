export type CloudOutput = {
  state: string; transport: string; destinationHost: string;
  startedAt: string | null; endedAt: string | null;
  streamStartedAt: string | null; streamEndedAt: string | null;
  stopRequested: boolean; usageSeconds: number | null;
};
export type CloudShow = {
  id: string; title: string; aspect: string; createdAt: string;
  closedAt: string | null; connectedAt: string | null; closing: boolean; output: CloudOutput | null;
};
export type LiveReadiness = { enabled: boolean; reason: string; allowedHosts: string[]; maxSources: 2 };
