import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ChickPuzzle} from './chick.js';
import {ChickSelect,moveGridFocus} from './chick-input.js';
const bank=JSON.parse(readFileSync(new URL('./chick-boards.json',import.meta.url)));
test('single Select marks a cross; double Select places chick as one undoable move',()=>{
  const p=new ChickPuzzle(bank[3][0]),gesture=new ChickSelect(),i=p.solution[0];
  gesture.press(p,i,0);assert.equal(p.cells[i],2);assert.equal(p.failures,0);
  gesture.press(p,i,200);assert.equal(p.cells[i],1);assert.equal(p.history.length,1);p.undo();assert.equal(p.cells[i],0);
});
test('slow presses toggle crosses; moving to another cell is not a double press',()=>{
  const p=new ChickPuzzle(bank[3][0]),g=new ChickSelect();g.press(p,0,0);g.press(p,0,500);assert.equal(p.cells[0],0);g.press(p,1,550);assert.equal(p.cells[1],2);assert.equal(p.failures,0);
});
test('wrong double press counts exactly one failure and leaves a cross',()=>{
  const p=new ChickPuzzle(bank[3][0]),g=new ChickSelect(),i=(p.solution[0]+1)%p.size;g.press(p,i,0);g.press(p,i,250);assert.equal(p.failures,1);assert.equal(p.cells[i],2);assert.equal(p.history.length,1);
});
test('menu arrows follow two-column visual positions and stay at edges',()=>{
  assert.equal(moveGridFocus(0,'right',6),1);assert.equal(moveGridFocus(0,'down',6),2);assert.equal(moveGridFocus(3,'up',6),1);assert.equal(moveGridFocus(3,'left',6),2);assert.equal(moveGridFocus(1,'right',6),1);assert.equal(moveGridFocus(5,'down',6),5);assert.equal(moveGridFocus(2,'right',3),2);
});
test('Select then double arrow fills from origin to edge as one undo operation',()=>{
  const p=new ChickPuzzle(bank[3][0]),g=new ChickSelect(),origin=1;
  p.cells[3]=2;const before=[...p.cells];g.press(p,origin,0);
  assert.equal(g.arrow(p,origin,'right',100),null);
  const result=g.arrow(p,origin+1,'right',250);assert.equal(result.cursor,p.size-1);
  for(let i=origin;i<p.size;i++)assert.equal(p.cells[i],2);
  assert.equal(p.history.length,1);p.undo();assert.deepEqual(p.cells,before);assert.equal(p.failures,0);
});
test('line marking preserves chicks and fills in all four directions',()=>{
  for(const [direction,end] of [['up',2],['down',22],['left',10],['right',14]]){
    const p=new ChickPuzzle(bank[3][0]);p.cells[7]=1;
    const result=p.markLine(12,direction);assert.equal(result.cursor,end);assert.equal(p.cells[7],1);assert.equal(p.cells[12],2);
  }
});
test('ordinary, slow, changed-direction and cancelled arrows do not fill a line',()=>{
  for(const scenario of ['unarmed','late-first','late-second','changed','cancelled']){
    const p=new ChickPuzzle(bank[3][0]),g=new ChickSelect();
    if(scenario!=='unarmed')g.press(p,0,0);
    if(scenario==='cancelled')g.clear();
    assert.equal(g.arrow(p,0,'right',scenario==='late-first'?700:100),null);
    assert.equal(g.arrow(p,1,scenario==='changed'?'down':'right',scenario==='late-second'?700:200),null);
    assert.equal(p.cells[2],0);
  }
});
test('shortcut from an existing chick restores it instead of replacing it with a cross',()=>{
  const p=new ChickPuzzle(bank[3][0]),g=new ChickSelect(),i=p.solution[0];p.placeChick(i);const before=[...p.cells];
  g.press(p,i,0);g.arrow(p,i,'down',100);g.arrow(p,i+p.size,'down',200);
  assert.equal(p.cells[i],1);p.undo();assert.deepEqual(p.cells,before);
});
