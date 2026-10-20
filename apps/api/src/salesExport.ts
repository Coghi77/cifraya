import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';

export async function raffleSales(db: PrismaClient, campaignId: string) {
  const payments = await db.reservation.groupBy({ by: ['paymentMethod'], where: { campaignId, status: 'CONFIRMED' }, _sum: { totalCrc: true }, _count: { _all: true } });
  const sales = { cashCrc: 0, sinpeCrc: 0, cashOrders: 0, sinpeOrders: 0, totalCrc: 0 };
  for (const payment of payments) {
    const amount = payment._sum.totalCrc ?? 0;
    if (payment.paymentMethod === 'CASH') { sales.cashCrc += amount; sales.cashOrders += payment._count._all; }
    else { sales.sinpeCrc += amount; sales.sinpeOrders += payment._count._all; }
    sales.totalCrc += amount;
  }
  return sales;
}

export async function salesWorkbook(title: string, sales: Awaited<ReturnType<typeof raffleSales>>, generatedAt = new Date()) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Vnova TCG';
  workbook.created = generatedAt;
  const sheet = workbook.addWorksheet('Resumen de ventas', { views: [{ showGridLines: false }] });
  sheet.columns = [{ width: 35 }, { width: 22 }, { width: 25 }];
  sheet.mergeCells('A1:C1'); sheet.getCell('A1').value = 'VNOVA TCG · VENTAS CONFIRMADAS';
  sheet.mergeCells('A2:C2'); sheet.getCell('A2').value = title;
  sheet.mergeCells('A3:C3'); sheet.getCell('A3').value = 'Generado: ' + generatedAt.toLocaleString('es-CR', { timeZone: 'America/Costa_Rica' }) + ' (Costa Rica, UTC-6)';
  sheet.addRow([]);
  sheet.addRow(['Método de pago', 'Pedidos aprobados', 'Monto (CRC)']);
  sheet.addRow(['Efectivo', sales.cashOrders, sales.cashCrc]);
  sheet.addRow(['SINPE', sales.sinpeOrders, sales.sinpeCrc]);
  sheet.addRow(['TOTAL COBRADO', sales.cashOrders + sales.sinpeOrders, sales.totalCrc]);
  sheet.mergeCells('A10:C11'); sheet.getCell('A10').value = 'Solo pagos aprobados al descargar. Excluye apartados, pagos en revisión, cancelados y vencidos. Conserva el precio original de cada compra.';
  sheet.getCell('A10').alignment = { wrapText: true, vertical: 'middle' };
  sheet.getRow(2).height = 36; sheet.getCell('A2').alignment = { wrapText: true, vertical: 'middle' };
  for (const row of [1, 5, 8]) {
    sheet.getRow(row).height = 28;
    sheet.getRow(row).eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: row === 1 ? 'FFFF4200' : 'FF191919' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
      cell.alignment = { vertical: 'middle' };
    });
  }
  for (const row of [6, 7, 8]) {
    sheet.getCell('C' + row).numFmt = '"₡"#,##0';
    sheet.getCell('B' + row).numFmt = '0';
  }
  sheet.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1 };
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
