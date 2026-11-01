import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PuzzleClock,formatTime,readBestTimes,recordBestTime} from './chick-time.js';
test('timer excludes pauses and adds exactly one minute per failure',()=>{
  let now=100;const c=new PuzzleClock(()=>now);now=2100;assert.equal(c.total(),2000);assert.equal(c.total(2),122000);
  c.pause();now=15100;assert.equal(c.total(1),62000);c.pause();c.resume();now=16100;assert.equal(c.total(1),63000);c.pause();now=999999;assert.equal(c.total(1),63000);
});
test('best times are independent by difficulty and only improve with faster totals',()=>{
  const best={};assert.equal(recordBestTime(best,1,50000),true);assert.equal(recordBestTime(best,2,80000),true);
  assert.equal(recordBestTime(best,1,60000),false);assert.equal(recordBestTime(best,1,50000),false);assert.equal(recordBestTime(best,1,40000),true);
  assert.deepEqual(best,{1:40000,2:80000});assert.equal(recordBestTime(best,11,0),false);assert.equal(recordBestTime(best,1,NaN),false);
  const c=new PuzzleClock(()=>0);assert.equal(recordBestTime(best,1,c.total(1)),false);
});
test('stored records round-trip and malformed records are ignored',()=>{
  const best={1:45678,10:1234567};assert.deepEqual(readBestTimes({getItem:()=>JSON.stringify(best)}),best);
  assert.deepEqual(readBestTimes({getItem:()=>'{broken'}),{});assert.deepEqual(readBestTimes({getItem:()=>'{"1":-1,"2":"100","3":12,"11":1}'}),{3:12});
});
test('chrono labels handle no record, minutes and hours',()=>{
  assert.equal(formatTime(undefined),'—');assert.equal(formatTime(0),'00:00');assert.equal(formatTime(65000),'01:05');assert.equal(formatTime(3661000),'1:01:01');
});
