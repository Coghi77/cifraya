ALTER TABLE "Reservation" ADD COLUMN "paymentMethod" TEXT NOT NULL DEFAULT 'SINPE';
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_paymentMethod_check" CHECK ("paymentMethod" IN ('SINPE', 'CASH'));
