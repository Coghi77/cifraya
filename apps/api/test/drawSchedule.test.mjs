import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveDrawSchedule} from '../dist/drawSchedule.js';
test('draw modes require a valid date only for DATE',()=>{
 assert.deepEqual(resolveDrawSchedule({}).data,{drawMode:'ANNOUNCED',drawDate:null});
 for(const drawDate of [undefined,null,'bad']) assert.equal(resolveDrawSchedule({drawMode:'DATE',drawDate}).success,false);
 for(const drawMode of ['SOLD_OUT','ANNOUNCED']) assert.equal(resolveDrawSchedule({drawMode,drawDate:'2026-11-01T00:00:00.000Z'}).data.drawDate,null);
 assert.equal(resolveDrawSchedule({drawMode:'INVALID'}).success,false);
});
test('editing unrelated fields preserves date; past dates remain informational',()=>{
 const current={drawMode:'DATE',drawDate:new Date('2020-01-01T00:00:00.000Z')};
 assert.deepEqual(resolveDrawSchedule({},current).data,current);
 assert.equal(resolveDrawSchedule({drawMode:'DATE',drawDate:current.drawDate.toISOString()}).success,true);
 assert.equal(resolveDrawSchedule({drawMode:'ANNOUNCED'},current).data.drawDate,null);
});
