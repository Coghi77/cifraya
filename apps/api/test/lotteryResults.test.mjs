import test from 'node:test';
import assert from 'node:assert/strict';
import {composeLotteryNumber} from '../dist/lotteryResults.js';
import {validPrizeSources, inversePrizeNumber} from '../dist/prizes.js';

test('lottery compositions use prize positions and final digits, preserving width', () => {
  const results=['12','34','56','78'];
  assert.equal(composeLotteryNumber(3,1,results),124);
  assert.equal(composeLotteryNumber(4,1,results),1234);
  assert.equal(composeLotteryNumber(5,1,results),12346);
  assert.equal(composeLotteryNumber(3,2,results),346);
  assert.equal(composeLotteryNumber(4,2,results),3456);
  assert.equal(composeLotteryNumber(5,2,results),34568);
  assert.equal(String(composeLotteryNumber(5,1,['00','01','02'])).padStart(5,'0'),'00012');
  assert.throws(()=>composeLotteryNumber(5,2,['12','34','56']));
  assert.throws(()=>composeLotteryNumber(3,1,['1','23']));
  assert.throws(()=>composeLotteryNumber(6,1,results));
});

test('JPS-derived prizes can be reversed without rotation', () => {
  assert.ok(validPrizeSources(['Principal','Inverso','Tercero'],[-1,1,-2]));
  assert.equal(inversePrizeNumber([-1,1,-2],2,3,[{position:1,numberValue:123}]),321);
  assert.equal(inversePrizeNumber([-1,1,-2],3,3,[]),null);
  assert.equal(validPrizeSources(['Principal'],[-3]),false);
});
