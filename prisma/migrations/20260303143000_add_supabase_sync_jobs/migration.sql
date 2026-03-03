CREATE TYPE "SyncJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');

CREATE TABLE "SyncJob" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" "Provider",
  "from" TIMESTAMP(3),
  "to" TIMESTAMP(3),
  "backfillYear" INTEGER,
  "status" "SyncJobStatus" NOT NULL DEFAULT 'QUEUED',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SyncJob_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SyncJob"
  ADD CONSTRAINT "SyncJob_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "SyncJob_status_availableAt_idx" ON "SyncJob"("status", "availableAt");
CREATE INDEX "SyncJob_userId_createdAt_idx" ON "SyncJob"("userId", "createdAt");
CREATE INDEX "SyncJob_userId_backfillYear_idx" ON "SyncJob"("userId", "backfillYear");
