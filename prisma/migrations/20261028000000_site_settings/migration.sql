CREATE TABLE "SiteSettings" (
  "id" TEXT NOT NULL DEFAULT 'main',
  "comingSoon" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);
