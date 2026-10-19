ALTER TABLE "EntryNumber" ADD COLUMN "holdKey" TEXT, ADD COLUMN "holdExpiresAt" TIMESTAMP(3);
ALTER TABLE "NumberProposal" ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "EntryNumber_holdExpiresAt_idx" ON "EntryNumber"("holdExpiresAt");
