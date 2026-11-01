// Offline seeded generation; only uniquely solvable connected-region boards are shipped.
import {solve} from '../web/src/chick.js';
import {writeFileSync} from 'node:fs';
let seed=187315;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const pick=a=>a[Math.floor(random()*a.length)];
const sizes=[4,4,5,5,6,6,7,7,8,9],clues=[2,1,1,0,1,0,1,0,0,0],bank=[];
for(let level=0;level<10;level++){
  const n=sizes[level],boards=[];let attempts=0;
  while(boards.length<5&&attempts++<250000){
    const permutation=[];
    function place(){if(permutation.length===n)return true;const available=Array.from({length:n},(_,i)=>i).filter(c=>!permutation.includes(c)&&(permutation.length===0||Math.abs(permutation.at(-1)-c)>1));while(available.length){const c=pick(available);available.splice(available.indexOf(c),1);permutation.push(c);if(place())return true;permutation.pop();}return false;}
    place();
    const regions=Array.from({length:n},()=>Array(n).fill(-1));
    permutation.forEach((c,r)=>regions[r][c]=r);
    let remaining=n*n-n;
    while(remaining){
      const frontier=[];
      for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(regions[r][c]===-1){const neighbors=[[r-1,c],[r+1,c],[r,c-1],[r,c+1]].filter(([y,x])=>y>=0&&x>=0&&y<n&&x<n&&regions[y][x]>=0);if(neighbors.length)frontier.push([r,c,neighbors]);}
      const [r,c,neighbors]=pick(frontier),[y,x]=pick(neighbors);regions[r][c]=regions[y][x];remaining--;
    }
    const rows=Array.from({length:n},(_,r)=>r),givens=[];
    for(let i=0;i<clues[level];i++){const r=pick(rows);rows.splice(rows.indexOf(r),1);givens.push([r,permutation[r]]);}
    if(solve(regions,givens).length===1&&!boards.some(b=>JSON.stringify(b.regions)===JSON.stringify(regions)))boards.push({regions,givens});
  }
  if(boards.length<5)throw new Error(`Could not generate level ${level+1}`);
  bank.push(boards);console.log(`Level ${level+1}: ${n}×${n}, ${clues[level]} starters, ${attempts} attempts`);
}
writeFileSync(new URL('../web/src/chick-boards.json',import.meta.url),JSON.stringify(bank));
