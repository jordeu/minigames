export class PuzzleClock {
  constructor(now=()=>performance.now()){this.now=now;this.elapsed=0;this.runningSince=now();}
  pause(){if(this.runningSince!==null){this.elapsed+=Math.max(0,this.now()-this.runningSince);this.runningSince=null;}}
  resume(){if(this.runningSince===null)this.runningSince=this.now();}
  total(failures=0){return this.elapsed+(this.runningSince===null?0:Math.max(0,this.now()-this.runningSince))+failures*60000;}
}
export function formatTime(milliseconds){
  if(!Number.isFinite(milliseconds)||milliseconds<0)return '—';
  const seconds=Math.floor(milliseconds/1000),s=String(seconds%60).padStart(2,'0'),m=Math.floor(seconds/60)%60,h=Math.floor(seconds/3600);
  return h?`${h}:${String(m).padStart(2,'0')}:${s}`:`${String(m).padStart(2,'0')}:${s}`;
}
export function readBestTimes(storage){
  try{
    const saved=JSON.parse(storage.getItem('chick-best-times')||'{}'),best={};
    for(let level=1;level<=10;level++)if(Number.isFinite(saved?.[level])&&saved[level]>=0)best[level]=saved[level];
    return best;
  }catch{return {};}
}
export function recordBestTime(best,level,time){
  if(!Number.isInteger(level)||level<1||level>10||!Number.isFinite(time)||time<0)return false;
  if(best[level]!==undefined&&best[level]<=time)return false;
  best[level]=time;return true;
}
