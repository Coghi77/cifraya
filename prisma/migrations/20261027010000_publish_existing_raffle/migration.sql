-- Explicitly authorized conversion of this single raffle to real public sales.
-- Do not publish other diagnostic campaigns or carry diagnostic sales into production.
UPDATE "Campaign" SET "isTest" = false, "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'cmvpk1cig0000ig3920liw38e' AND "isTest" = true AND "status" = 'LIVE'
AND NOT EXISTS (SELECT 1 FROM "Reservation" WHERE "campaignId" = 'cmvpk1cig0000ig3920liw38e')
AND NOT EXISTS (SELECT 1 FROM "Winner" WHERE "campaignId" = 'cmvpk1cig0000ig3920liw38e');
