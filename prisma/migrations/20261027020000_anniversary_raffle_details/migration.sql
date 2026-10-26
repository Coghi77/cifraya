-- User-authorized final title and single-winner prize for the existing public raffle.
UPDATE "Campaign"
SET "title" = 'Rifa 30 Aniversario',
    "slug" = 'rifa-30-aniversario',
    "description" = 'Un solo ganador se lleva las tres Elite Trainer Box (ETB) del 30 aniversario de Pokémon. Elegí tus boletos y números para participar.',
    "prize" = '3 Elite Trainer Box (ETB) del 30 aniversario de Pokémon para un solo ganador',
    "prizes" = ARRAY['3 Elite Trainer Box (ETB) del 30 aniversario de Pokémon para un solo ganador'],
    "prizeCount" = 1, "prizeSources" = ARRAY[0],
    "secondPrize" = NULL, "thirdPrize" = NULL,
    "invertedPrizeEnabled" = false,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'cmvpk1cig0000ig3920liw38e' AND "status" = 'LIVE'
AND NOT EXISTS (SELECT 1 FROM "Winner" WHERE "campaignId" = 'cmvpk1cig0000ig3920liw38e');
