-- The pre-change User/Subscription billing columns, isolated from unrelated models.
CREATE TYPE "Plan" AS ENUM ('FREE', 'CREATOR', 'CREATOR_PLUS');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELED', 'EXPIRED');
CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY, "email" TEXT NOT NULL UNIQUE, "passwordHash" TEXT NOT NULL,
  "plan" "Plan" NOT NULL DEFAULT 'FREE', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "Subscription" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE CASCADE,
  "plan" "Plan" NOT NULL, "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "expiresAt" TIMESTAMP(3),
  "providerRef" TEXT, "customerRef" TEXT
);
