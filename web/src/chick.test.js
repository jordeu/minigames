import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ChickPuzzle,solve,transformBoard} from './chick.js';
const bank=JSON.parse(readFileSync(new URL('./chick-boards.json',import.meta.url)));
test('all 50 puzzles have connected regions and exactly one solution in every orientation',()=>{
  assert.equal(bank.length,10);
  for(const boards of bank){assert.equal(boards.length,5);for(const board of boards){
    const n=board.regions.length;
    for(let color=0;color<n;color++){
      const cells=[];for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(board.regions[r][c]===color)cells.push(r*n+c);
      assert.ok(cells.length);const visited=new Set([cells[0]]),queue=[cells[0]];
      while(queue.length){const i=queue.pop(),r=Math.floor(i/n),c=i%n;for(const [y,x] of [[r-1,c],[r+1,c],[r,c-1],[r,c+1]])if(y>=0&&x>=0&&y<n&&x<n&&board.regions[y][x]===color&&!visited.has(y*n+x)){visited.add(y*n+x);queue.push(y*n+x);}}
      assert.equal(visited.size,cells.length);
    }
    for(let turns=0;turns<4;turns++)for(const mirror of [false,true]){const b=transformBoard(board,turns,mirror);assert.equal(solve(b.regions,b.givens).length,1);}
  }}
});
test('starter chicks cannot be removed and undo restores a mark',()=>{
  const p=new ChickPuzzle(bank[0][0]);const fixed=[...p.givens][0];assert.equal(p.placeChick(fixed),false);const i=p.cells.findIndex(v=>!v);p.mark(i);assert.equal(p.cells[i],2);p.mark(i);assert.equal(p.cells[i],0);p.undo();assert.equal(p.cells[i],2);p.reset();assert.equal(p.count,p.givens.size);assert.equal(p.history.length,0);
});
test('rule conflicts include same row, column, region and diagonal neighbours',()=>{
  const p=new ChickPuzzle({regions:[[0,1,2,3],[0,1,2,3],[0,1,2,3],[0,1,2,3]],givens:[]});
  for(const pair of [[0,2],[0,8],[0,5]]){p.cells.fill(0);pair.forEach(i=>p.cells[i]=1);assert.equal(p.conflicts.size,2);}
  const q=new ChickPuzzle({regions:[[0,0,1,1],[0,0,1,1],[2,2,3,3],[2,2,3,3]],givens:[]});q.cells[0]=1;q.cells[5]=1;assert.equal(q.conflicts.size,2);
});
test('only a valid full flock wins; crosses do not count as chicks',()=>{
  const board=bank[9][0],p=new ChickPuzzle(board),answer=solve(board.regions,board.givens)[0];
  p.cells.fill(2);assert.equal(p.won,false);answer.forEach((c,r)=>p.cells[r*p.size+c]=1);assert.equal(p.won,true);assert.equal(p.placeChick(0),false);
  p.cells[answer[0]]=0;assert.equal(p.won,false);
});

test('wrong chicks count failures; undo and clearing cannot erase penalties',()=>{
  const p=new ChickPuzzle(bank[0][0]),wrong=p.cells.findIndex((v,i)=>v===0&&p.solution[Math.floor(i/p.size)]!==i%p.size);
  assert.equal(p.placeChick(wrong),true);assert.equal(p.failures,1);assert.equal(p.cells[wrong],2);assert.equal(p.lastFailure,wrong);
  p.undo();assert.equal(p.failures,1);p.reset();assert.equal(p.failures,1);
  const correct=p.solution.map((c,r)=>r*p.size+c).find(i=>!p.givens.has(i));p.placeChick(correct);assert.equal(p.failures,1);
});
