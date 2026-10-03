ALTER TABLE "Reservation" ADD COLUMN "orderNumber" SERIAL NOT NULL;
CREATE UNIQUE INDEX "Reservation_orderNumber_key" ON "Reservation"("orderNumber");
