ALTER TABLE "Campaign" ADD COLUMN "drawMode" TEXT NOT NULL DEFAULT 'ANNOUNCED';
UPDATE "Campaign" SET "drawMode" = 'DATE' WHERE "drawDate" IS NOT NULL;
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_drawMode_check" CHECK ("drawMode" IN ('DATE','SOLD_OUT','ANNOUNCED'));
