CREATE TABLE "CampaignPhoto" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "data" BYTEA NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CampaignPhoto_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CampaignPhoto_campaignId_sortOrder_idx" ON "CampaignPhoto"("campaignId", "sortOrder");

ALTER TABLE "CampaignPhoto" ADD CONSTRAINT "CampaignPhoto_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
