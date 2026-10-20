import assert from 'node:assert/strict';
import test from 'node:test';
import ExcelJS from 'exceljs';
import {salesWorkbook} from '../dist/salesExport.js';
for (const sales of [{cashCrc:2000,sinpeCrc:4000,cashOrders:1,sinpeOrders:2,totalCrc:6000},{cashCrc:0,sinpeCrc:0,cashOrders:0,sinpeOrders:0,totalCrc:0}]) {
  test('Excel roundtrip with totals '+sales.totalCrc,async()=>{
    const bytes=await salesWorkbook('=HYPERLINK("unsafe")',sales,new Date('2026-10-20T18:00:00Z'));
    const book=new ExcelJS.Workbook();await book.xlsx.load(bytes);
    const sheet=book.getWorksheet('Resumen de ventas');
    assert.equal(sheet.getCell('A2').value,'=HYPERLINK("unsafe")');assert.equal(sheet.getCell('A2').type,ExcelJS.ValueType.String);
    assert.equal(sheet.getCell('C6').value,sales.cashCrc);assert.equal(sheet.getCell('C7').value,sales.sinpeCrc);assert.equal(sheet.getCell('C8').value,sales.totalCrc);
    assert.equal(sheet.getCell('B8').value,sales.cashOrders+sales.sinpeOrders);assert.equal(sheet.getCell('C8').type,ExcelJS.ValueType.Number);
    assert.match(sheet.getCell('A3').value,/Costa Rica/);
  });
}
