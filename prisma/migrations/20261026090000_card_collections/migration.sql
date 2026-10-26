CREATE TABLE "CardCollection" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "edition" TEXT NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "published" BOOLEAN NOT NULL DEFAULT false,
  "cards" JSONB NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CardCollection_pkey" PRIMARY KEY ("id")
);
