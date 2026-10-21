import assert from 'node:assert/strict';
import test from 'node:test';
import ExcelJS from 'exceljs';
import {salesWorkbook} from '../dist/salesExport.js';
const createdAt=new Date('2026-10-20T03:30:00Z');
const sample=[{orderNumber:123,buyerName:'=HYPERLINK("unsafe")',createdAt,totalCrc:2000,paymentMethod:'CASH'},{orderNumber:124,buyerName:'José Pérez',createdAt,totalCrc:4000,paymentMethod:'SINPE'}];
for(const rows of [sample,[]]) test('Excel details and summary roundtrip '+rows.length,async()=>{
 const bytes=await salesWorkbook('=TITLE',rows);
 const book=new ExcelJS.Workbook();await book.xlsx.load(bytes);
 assert.deepEqual(book.worksheets.map(s=>s.name),['Resumen de ventas','Efectivo','SINPE']);
 const summary=book.getWorksheet('Resumen de ventas');
 assert.equal(summary.getCell('A2').value,'=TITLE');assert.equal(summary.getCell('A2').type,ExcelJS.ValueType.String);
 assert.equal(summary.getCell('C8').value,rows.length?6000:0);
 for(const [name,method,summaryRow] of [['Efectivo','CASH',6],['SINPE','SINPE',7]]) {
  const sheet=book.getWorksheet(name);const entries=rows.filter(r=>r.paymentMethod===method);
  assert.equal(sheet.lastRow.getCell(4).value,summary.getCell('C'+summaryRow).value);
  assert.equal(summary.getCell('B'+summaryRow).value,entries.length);
  if(entries.length){
   assert.equal(sheet.getCell('A5').value,entries[0].orderNumber);
   assert.equal(sheet.getCell('B5').value,entries[0].buyerName);assert.equal(sheet.getCell('B5').type,ExcelJS.ValueType.String);
   assert.equal(sheet.getCell('C5').value.toISOString(),'2026-10-19T21:30:00.000Z');
   assert.equal(sheet.getCell('D5').value,entries[0].totalCrc);assert.equal(sheet.getCell('D5').type,ExcelJS.ValueType.Number);
   assert.equal(sheet.getCell('E5').value,name);
  } else assert.match(sheet.getCell('A5').value,/Sin ventas/);
 }
});
