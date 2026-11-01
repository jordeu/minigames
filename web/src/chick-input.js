// Immediate single-press mark, promoted to a chick by a second press on the same cell.
export class ChickSelect {
  constructor(windowMs=380){this.windowMs=windowMs;this.pending=null;this.arrowPending=null;}
  clear(){this.pending=null;this.arrowPending=null;}
  press(puzzle,index,time){
    this.arrowPending=null;
    const previous=this.pending;
    if(previous&&previous.index===index&&time-previous.time<=this.windowMs){
      this.pending=null;
      // Remove the temporary first-press mark and its undo entry.
      puzzle.cells[index]=previous.value;puzzle.history.length=previous.historyLength;
      return puzzle.placeChick(index);
    }
    this.pending={index,time,value:puzzle.cells[index],historyLength:puzzle.history.length};
    return puzzle.mark(index);
  }
  arrow(puzzle,index,direction,time){
    const arrow=this.arrowPending;
    this.arrowPending=null;
    if(arrow&&arrow.direction===direction&&time-arrow.time<=this.windowMs){
      const start=arrow.start;
      puzzle.cells[start.index]=start.value;puzzle.history.length=start.historyLength;
      this.pending=null;
      return puzzle.markLine(start.index,direction);
    }
    const start=this.pending;this.pending=null;
    if(start&&start.index===index&&time-start.time<=650)this.arrowPending={start,direction,time};
    return null;
  }

}
export function moveGridFocus(index,key,count,columns=2){
  const row=Math.floor(index/columns),col=index%columns;
  if(key==='left')return col>0?index-1:index;
  if(key==='right')return col<columns-1&&index+1<count?index+1:index;
  if(key==='up')return row>0?index-columns:index;
  if(key==='down')return row<Math.ceil(count/columns)-1?Math.min(index+columns,count-1):index;
  return index;
}
