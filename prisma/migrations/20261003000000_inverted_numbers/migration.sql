ALTER TABLE "Campaign"
  ADD COLUMN "invertedEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "invertedPrizeEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Reservation"
  ADD COLUMN "baseValues" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  ADD COLUMN "includesInverted" BOOLEAN NOT NULL DEFAULT false;
