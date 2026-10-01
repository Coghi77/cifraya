ALTER TYPE "ReservationStatus" ADD VALUE 'CONFIRMED';

ALTER TABLE "Reservation"
  ADD COLUMN "totalCrc" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "confirmedAt" TIMESTAMP(3);
UPDATE "Reservation" AS reservation
SET "totalCrc" = cardinality(reservation."selectedValues") * campaign."priceCrc"
FROM "Campaign" AS campaign
WHERE reservation."campaignId" = campaign."id";

CREATE TABLE "PricePackage" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "priceCrc" INTEGER NOT NULL,
  CONSTRAINT "PricePackage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PricePackage_campaignId_quantity_key" ON "PricePackage"("campaignId", "quantity");
ALTER TABLE "PricePackage" ADD CONSTRAINT "PricePackage_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Winner" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "reservationId" TEXT NOT NULL,
  "numberValue" INTEGER NOT NULL,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Winner_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Winner_campaignId_key" ON "Winner"("campaignId");
ALTER TABLE "Winner" ADD CONSTRAINT "Winner_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Winner" ADD CONSTRAINT "Winner_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
