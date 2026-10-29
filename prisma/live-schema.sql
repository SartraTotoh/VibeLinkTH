-- Additive migration for existing databases using db push. Apply once before LIVE_SCHEMA_READY.
-- Foreign key RESTRICT prevents deleting accounts while external rooms need cleanup.
CREATE TABLE IF NOT EXISTS "LiveShow" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
  "title" TEXT NOT NULL, "aspect" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "connectedAt" TIMESTAMP(3), "lastSeenAt" TIMESTAMP(3), "closingAt" TIMESTAMP(3), "closedAt" TIMESTAMP(3)
);
CREATE INDEX IF NOT EXISTS "LiveShow_userId_createdAt_idx" ON "LiveShow"("userId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "LiveShow_one_open_per_user" ON "LiveShow"("userId") WHERE "closedAt" IS NULL;
CREATE TABLE IF NOT EXISTS "LiveOutput" (
  "showId" TEXT PRIMARY KEY REFERENCES "LiveShow"("id") ON DELETE CASCADE,
  "requestId" TEXT NOT NULL UNIQUE, "state" TEXT NOT NULL DEFAULT 'STARTING',
  "destinationHost" TEXT NOT NULL, "videoTrackId" TEXT NOT NULL, "audioTrackId" TEXT NOT NULL,
  "egressId" TEXT UNIQUE, "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "stopRequestedAt" TIMESTAMP(3), "startedAt" TIMESTAMP(3), "endedAt" TIMESTAMP(3),
  "streamStartedAt" TIMESTAMP(3), "streamEndedAt" TIMESTAMP(3),
  "providerVersion" BIGINT NOT NULL DEFAULT 0, "transport" TEXT NOT NULL DEFAULT 'starting'
);
CREATE TABLE IF NOT EXISTS "LiveOutputEvent" (
  "id" TEXT PRIMARY KEY, "showId" TEXT NOT NULL REFERENCES "LiveOutput"("showId") ON DELETE CASCADE,
  "state" TEXT NOT NULL, "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
