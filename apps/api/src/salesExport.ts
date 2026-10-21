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

type SaleRow = { orderNumber: number; buyerName: string; createdAt: Date; totalCrc: number; paymentMethod: string };

export async function salesWorkbook(title: string, rows: SaleRow[], generatedAt = new Date()) {
  // Both summary and detail use the same snapshot, even if another payment is approved during export.
  const sales = { cashCrc: 0, sinpeCrc: 0, cashOrders: 0, sinpeOrders: 0, totalCrc: 0 };
  for (const row of rows) {
    if (row.paymentMethod === 'CASH') { sales.cashCrc += row.totalCrc; sales.cashOrders++; }
    else { sales.sinpeCrc += row.totalCrc; sales.sinpeOrders++; }
    sales.totalCrc += row.totalCrc;
  }
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
  for (const method of ['CASH', 'SINPE']) {
    const label = method === 'CASH' ? 'Efectivo' : 'SINPE';
    const detail = workbook.addWorksheet(label, { views: [{ state: 'frozen', ySplit: 4, showGridLines: false }] });
    detail.columns = [{ width: 20 }, { width: 42 }, { width: 28 }, { width: 22 }, { width: 20 }];
    detail.mergeCells('A1:E1'); detail.getCell('A1').value = title;
    detail.mergeCells('A2:E2'); detail.getCell('A2').value = 'Ventas aprobadas · ' + label + ' · Fecha del pedido en Costa Rica (UTC-6)';
    detail.getRow(1).height = 36; detail.getCell('A1').alignment = { wrapText: true, vertical: 'middle' };
    detail.getRow(4).values = ['Número de pedido', 'Nombre del comprador', 'Fecha del pedido (CR)', 'Monto (CRC)', 'Método de pago'];
    const entries = rows.filter(row => row.paymentMethod === method);
    for (const entry of entries) {
      const row = detail.addRow([entry.orderNumber, entry.buyerName, new Date(entry.createdAt.getTime() - 6 * 60 * 60 * 1000), entry.totalCrc, label]);
      row.getCell(1).numFmt = '0';
      row.getCell(3).numFmt = 'dd/mm/yyyy hh:mm';
      row.getCell(4).numFmt = '"₡"#,##0';
      row.getCell(2).alignment = { wrapText: true, vertical: 'middle' };
    }
    if (entries.length) detail.autoFilter = { from: 'A4', to: 'E' + (4 + entries.length) };
    else { detail.mergeCells('A5:E5'); detail.getCell('A5').value = 'Sin ventas aprobadas por este método.'; }
    const total = detail.addRow(['TOTAL ' + label.toUpperCase(), entries.length + ' pedidos', null, entries.reduce((sum, row) => sum + row.totalCrc, 0), label]);
    total.getCell(4).numFmt = '"₡"#,##0';
    for (const rowNumber of [1, 4, total.number]) {
      detail.getRow(rowNumber).eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowNumber === 1 ? 'FFFF4200' : 'FF191919' } };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      });
    }
    detail.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '1:4' };
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
