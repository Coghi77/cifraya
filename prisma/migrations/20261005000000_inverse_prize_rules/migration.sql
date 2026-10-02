ALTER TABLE "Campaign" ADD COLUMN "prizeSources" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];
UPDATE "Campaign" SET "prizeSources" = array_fill(0, ARRAY["prizeCount"]);
ALTER TABLE "Winner" ALTER COLUMN "reservationId" DROP NOT NULL;
DROP INDEX "Winner_campaignId_numberValue_key";
CREATE INDEX "Winner_campaignId_numberValue_idx" ON "Winner"("campaignId", "numberValue");
