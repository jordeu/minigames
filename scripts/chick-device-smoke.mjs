import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {solve} from '../web/src/chick.js';
const adb=process.env.ADB??'adb',wait=ms=>new Promise(r=>setTimeout(r,ms));
const pages=await(await fetch('http://127.0.0.1:9222/json')).json();
const ws=new WebSocket(pages.find(p=>p.url.includes('appassets.androidplatform.net')).webSocketDebuggerUrl);
let id=0;const pending=new Map();await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){pending.get(m.id)?.(m.result);pending.delete(m.id);}};
const run=async expression=>{
  const result=await new Promise(resolve=>{const n=++id;pending.set(n,resolve);ws.send(JSON.stringify({id:n,method:'Runtime.evaluate',params:{expression,returnByValue:true}}));});
  if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description??result.exceptionDetails.text);
  return result;
};
const value=async expression=>(await run(expression)).result.value;
const text=()=>value('document.querySelector("#ui").innerText');
const input=key=>run(`window.miniGames.input(${JSON.stringify(key)})`);
const key=async code=>{execFileSync(adb,['shell','input','keyevent',code]);await wait(100);};
let original;
try{
  await run('location.reload()');await wait(1200);
  original=await value('JSON.stringify({level:localStorage.getItem("chick-level"),completed:localStorage.getItem("chick-completed"),best:localStorage.getItem("chick-best-times")})');
  await key('KEYCODE_DPAD_RIGHT');await key('KEYCODE_DPAD_CENTER');assert.match(await text(),/Choose your difficulty/);
  await run(`document.querySelector('[data-level="1"]').click()`);
  for(let level=1;level<=10;level++){
    assert.match(await text(),new RegExp(`DIFFICULTY ${level} / 10`));
    await key('KEYCODE_DPAD_CENTER');
    const cells=JSON.parse(await value('JSON.stringify([...document.querySelectorAll("[data-cell]")].map(b=>({index:Number(b.dataset.cell),region:Number(b.dataset.region),given:b.classList.contains("given")})))'));
    const n=Math.sqrt(cells.length),regions=Array.from({length:n},(_,r)=>cells.slice(r*n,r*n+n).map(c=>c.region));
    const givens=cells.filter(c=>c.given).map(c=>[Math.floor(c.index/n),c.index%n]);
    const answers=solve(regions,givens);assert.equal(answers.length,1);
    await key('KEYCODE_DPAD_RIGHT');assert.equal(await value('Number(document.querySelector(".chick-cell.cursor").dataset.cell)'),1);
    if(level===1){
      const origin=cells.find(c=>!c.given&&c.index%n<n-2).index;
      const moves=[];let row=0,col=1;const targetRow=Math.floor(origin/n),targetCol=origin%n;
      while(row<targetRow){moves.push('down');row++;}while(col>targetCol){moves.push('left');col--;}while(col<targetCol){moves.push('right');col++;}
      await run(`${JSON.stringify(moves)}.forEach(key=>window.miniGames.input(key))`);
      await key('KEYCODE_DPAD_CENTER');await key('KEYCODE_DPAD_RIGHT');await key('KEYCODE_DPAD_RIGHT');
      assert.equal(await value('Number(document.querySelector(".chick-cell.cursor").dataset.cell)'),targetRow*n+n-1);
      for(let c=targetCol;c<n;c++){const i=targetRow*n+c;if(!cells[i].given)assert.match(await value(`document.querySelector('[data-cell="${i}"]').getAttribute('aria-label')`),/crossed out/);}
      await key('KEYCODE_BACK');await key('KEYCODE_DPAD_RIGHT');await key('KEYCODE_DPAD_CENTER');
      for(let c=targetCol;c<n;c++){const i=targetRow*n+c;if(!cells[i].given)assert.doesNotMatch(await value(`document.querySelector('[data-cell="${i}"]').getAttribute('aria-label')`),/crossed out/);}
      console.log('PASS: real remote Select + double arrow fills to edge; one Undo restores line');
      const free=cells.find(c=>!c.given).index;
      await run(`document.querySelector('[data-cell="${free}"]').click()`);
      await key('KEYCODE_BACK');assert.match(await text(),/Puzzle break/);
      await key('KEYCODE_DPAD_DOWN');assert.equal(await value('Number(document.querySelector("[data-action].selected").dataset.action)'),2);
      await key('KEYCODE_DPAD_UP');assert.equal(await value('Number(document.querySelector("[data-action].selected").dataset.action)'),0);
      await key('KEYCODE_DPAD_RIGHT');await key('KEYCODE_DPAD_CENTER');assert.doesNotMatch(await text(),/Puzzle break/);
      await key('KEYCODE_HOME');execFileSync(adb,['shell','am','start','-W','-n','net.jordeu.minigames/.MainActivity']);await wait(300);assert.match(await text(),/Puzzle break/);await key('KEYCODE_BACK');
      const beforePenalty=await value('Number(document.querySelector("[data-stat=time]").dataset.ms)');
      const wrong=cells.find(c=>!c.given&&answers[0][Math.floor(c.index/n)]!==c.index%n).index;
      await run(`document.querySelector('[data-cell="${wrong}"]').click();document.querySelector('[data-cell="${wrong}"]').click()`);
      assert.equal(await value('Number(document.querySelector("[data-stat=failures]").innerText)'),1);
      const penalized=await value('Number(document.querySelector("[data-stat=time]").dataset.ms)');assert.ok(penalized>=beforePenalty+60000&&penalized<beforePenalty+62000);
      await key('KEYCODE_BACK');
      const paused=await value('Number(document.querySelector("[data-stat=time]").dataset.ms)');await wait(1100);assert.equal(await value('Number(document.querySelector("[data-stat=time]").dataset.ms)'),paused);await key('KEYCODE_DPAD_RIGHT');await key('KEYCODE_DPAD_CENTER');
      assert.equal(await value('Number(document.querySelector("[data-stat=failures]").innerText)'),1);
    }
    const indices=answers[0].map((c,r)=>r*n+c).filter(i=>!cells[i].given);
    // Drive the same input handler as the TV remote, without frame delays between grid moves.
    let cursor=await value('Number(document.querySelector(".chick-cell.cursor").dataset.cell)');
    for(const target of indices){
      const actions=[];let r=Math.floor(cursor/n),c=cursor%n;const y=Math.floor(target/n),x=target%n;
      while(r<y){actions.push('down');r++;}while(r>y){actions.push('up');r--;}while(c<x){actions.push('right');c++;}while(c>x){actions.push('left');c--;}actions.push('select','select');
      await run(`${JSON.stringify(actions)}.forEach(key=>window.miniGames.input(key))`);cursor=target;
    }
    assert.match(await text(),/Egg-cellent/);
    assert.equal(await value('!!document.querySelector("[data-stat=score]")'),false);
    const finalTime=await value('Number(document.querySelector("[data-stat=time]").dataset.ms)');
    assert.ok(finalTime>=(level===1?60000:0));
    assert.ok(await value('Number(document.querySelector("[data-stat=best]").dataset.ms)')<=finalTime);
    await wait(150);assert.equal(await value('Number(document.querySelector("[data-stat=time]").dataset.ms)'),finalTime);
    assert.equal(await value('Number(document.querySelector("[data-stat=failures]").innerText)'),level===1?1:0);
    console.log(`PASS: difficulty ${level}, ${n}×${n}, unique solution, remote navigation and completion`);
    await input('right');await input('select');
    if(level<10)await key('KEYCODE_DPAD_RIGHT');
  }
  await key('KEYCODE_BACK');assert.match(await text(),/SNAKE BEST/);
  const savedBest=await value('localStorage.getItem("chick-best-times")');
  await run('location.reload()');await wait(1200);
  await key('KEYCODE_DPAD_RIGHT');await key('KEYCODE_DPAD_CENTER');
  await run(`document.querySelector('[data-level="1"]').click()`);await key('KEYCODE_DPAD_CENTER');
  assert.equal(await value('Number(document.querySelector("[data-stat=best]").dataset.ms)'),JSON.parse(savedBest)[1]);
  console.log('PASS: +1 minute penalty, paused timer, frozen completion time and saved best after reload');
}finally{
  if(original)await run(`Object.entries(${original}).forEach(([key,v])=>{const k=key==='level'?'chick-level':key==='best'?'chick-best-times':'chick-completed';if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v)})`);
  await run('location.reload()');ws.close();
}
