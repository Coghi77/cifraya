ALTER TABLE "Reservation" ADD COLUMN "selectedValues" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];
UPDATE "Reservation" AS reservation
SET "selectedValues" = COALESCE((
  SELECT array_agg(number."value" ORDER BY number."value")
  FROM "EntryNumber" AS number
  WHERE number."reservationId" = reservation."id"
), ARRAY[]::INTEGER[]);
