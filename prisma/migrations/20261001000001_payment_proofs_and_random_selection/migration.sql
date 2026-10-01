ALTER TYPE "ReservationStatus" ADD VALUE 'PENDING_REVIEW';

ALTER TABLE "Reservation" ADD COLUMN "proofSubmittedAt" TIMESTAMP(3), ADD COLUMN "reviewNote" TEXT;

CREATE TABLE "NumberProposal" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "sessionKey" TEXT NOT NULL,
  "values" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  "changesUsed" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NumberProposal_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NumberProposal_campaignId_sessionKey_key" ON "NumberProposal"("campaignId", "sessionKey");
CREATE INDEX "NumberProposal_expiresAt_idx" ON "NumberProposal"("expiresAt");
ALTER TABLE "NumberProposal" ADD CONSTRAINT "NumberProposal_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PaymentProof" (
  "id" TEXT NOT NULL,
  "reservationId" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "data" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentProof_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PaymentProof_reservationId_idx" ON "PaymentProof"("reservationId");
ALTER TABLE "PaymentProof" ADD CONSTRAINT "PaymentProof_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
