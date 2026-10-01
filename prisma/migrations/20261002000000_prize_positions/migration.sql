ALTER TABLE "Campaign"
  ADD COLUMN "prizeCount" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "secondPrize" TEXT,
  ADD COLUMN "thirdPrize" TEXT;

ALTER TABLE "Winner" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 1;
DROP INDEX "Winner_campaignId_key";
CREATE UNIQUE INDEX "Winner_campaignId_position_key" ON "Winner"("campaignId", "position");
CREATE UNIQUE INDEX "Winner_campaignId_numberValue_key" ON "Winner"("campaignId", "numberValue");
