CREATE TABLE "EmailNotification" (
 "id" TEXT NOT NULL PRIMARY KEY, "reservationId" TEXT NOT NULL, "kind" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'PENDING', "recipient" TEXT NOT NULL, "subject" TEXT NOT NULL,
 "html" TEXT NOT NULL, "text" TEXT NOT NULL, "sender" TEXT,
 "attempts" INTEGER NOT NULL DEFAULT 0, "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "firstAttemptAt" TIMESTAMP(3), "sentAt" TIMESTAMP(3), "providerId" TEXT, "lastError" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "EmailNotification_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "EmailNotification_reservationId_kind_key" ON "EmailNotification"("reservationId", "kind");
CREATE INDEX "EmailNotification_status_availableAt_idx" ON "EmailNotification"("status", "availableAt");
