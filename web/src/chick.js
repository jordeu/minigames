export function solve(regions, givens=[], limit=2) {
  const n=regions.length, answers=[], columns=new Set(), colors=new Set(), path=[];
  const fixed=new Map(givens.map(([r,c])=>[r,c]));
  function search(r) {
    if(answers.length>=limit)return;
    if(r===n){answers.push([...path]);return;}
    for(let c=0;c<n;c++){
      const color=regions[r][c];
      if(fixed.has(r)&&fixed.get(r)!==c || columns.has(c)||colors.has(color)||r>0&&Math.abs(path[r-1]-c)<=1)continue;
      columns.add(c);colors.add(color);path.push(c);search(r+1);path.pop();colors.delete(color);columns.delete(c);
    }
  }
  search(0);return answers;
}
export class ChickPuzzle {
  constructor(board) {
    this.regions=board.regions.map(row=>[...row]);this.size=this.regions.length;
    this.givens=new Set(board.givens.map(([r,c])=>r*this.size+c));
    this.cells=Array(this.size*this.size).fill(0);
    for(const i of this.givens)this.cells[i]=1;
    this.history=[];this.failures=0;this.lastFailure=null;this.solution=solve(this.regions,board.givens,1)[0];
  }
  mark(index){
    if(this.givens.has(index)||this.won)return false;
    this.lastFailure=null;
    this.history.push([index,this.cells[index]]);this.cells[index]=this.cells[index]===2?0:2;return true;
  }
  placeChick(index){
    if(this.givens.has(index)||this.won)return false;
    this.lastFailure=null;
    if(this.cells[index]===1){this.history.push([index,1]);this.cells[index]=0;return true;}
    if(this.solution[Math.floor(index/this.size)]!==index%this.size){
      this.failures++;this.lastFailure=index;
      this.history.push([index,this.cells[index]]);this.cells[index]=2;return true;
    }
    this.history.push([index,this.cells[index]]);this.cells[index]=1;return true;
  }
  markLine(index,direction){
    const step={up:[-1,0],down:[1,0],left:[0,-1],right:[0,1]}[direction];
    if(!step||this.won)return null;
    let r=Math.floor(index/this.size),c=index%this.size,end=index;const changes=[];
    while(r>=0&&r<this.size&&c>=0&&c<this.size){
      const i=r*this.size+c;end=i;
      if(this.cells[i]===0&&!this.givens.has(i)){changes.push([i,0]);this.cells[i]=2;}
      r+=step[0];c+=step[1];
    }
    if(changes.length){this.history.push({changes});this.lastFailure=null;}
    return {cursor:end,changed:changes.length>0};
  }
  undo(){this.lastFailure=null;const move=this.history.pop();if(move){if(move.changes)for(const [index,value] of move.changes)this.cells[index]=value;else this.cells[move[0]]=move[1];}return !!move;}
  reset(){this.cells.fill(0);for(const i of this.givens)this.cells[i]=1;this.history=[];this.lastFailure=null;}
  get count(){return this.cells.filter(v=>v===1).length;}
  get conflicts(){
    const bad=new Set(),chicks=[];
    this.cells.forEach((v,i)=>{if(v===1)chicks.push(i);});
    for(let a=0;a<chicks.length;a++)for(let b=a+1;b<chicks.length;b++){
      const i=chicks[a],j=chicks[b],r=Math.floor(i/this.size),c=i%this.size,s=Math.floor(j/this.size),d=j%this.size;
      if(r===s||c===d||this.regions[r][c]===this.regions[s][d]||Math.abs(r-s)<=1&&Math.abs(c-d)<=1){bad.add(i);bad.add(j);}
    }
    return bad;
  }
  get won(){return this.count===this.size&&this.conflicts.size===0;}
}
export function transformBoard(board, turns=0, mirror=false){
  const n=board.regions.length,regions=Array.from({length:n},()=>Array(n)),givens=[];
  const transform=(r,c)=>{if(mirror)c=n-1-c;for(let t=0;t<turns;t++)[r,c]=[c,n-1-r];return [r,c];};
  for(let r=0;r<n;r++)for(let c=0;c<n;c++){const [y,x]=transform(r,c);regions[y][x]=board.regions[r][c];}
  for(const [r,c] of board.givens)givens.push(transform(r,c));
  return {regions,givens};
}
