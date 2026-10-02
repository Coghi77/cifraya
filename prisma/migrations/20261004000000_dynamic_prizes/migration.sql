ALTER TABLE "Campaign" ADD COLUMN "prizes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
UPDATE "Campaign" SET "prizes" = CASE
  WHEN "prizeCount" >= 3 THEN ARRAY["prize", "secondPrize", "thirdPrize"]
  WHEN "prizeCount" = 2 THEN ARRAY["prize", "secondPrize"]
  ELSE ARRAY["prize"] END;
