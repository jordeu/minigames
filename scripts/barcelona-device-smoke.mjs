import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createLevel} from '../web/src/barcelona.js';
const adb=process.env.ADB??'adb',wait=ms=>new Promise(r=>setTimeout(r,ms));
const pages=await(await fetch('http://127.0.0.1:9222/json')).json();
const ws=new WebSocket(pages.find(p=>p.url.includes('appassets.androidplatform.net')).webSocketDebuggerUrl);let id=0;const pending=new Map();
await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){pending.get(m.id)?.(m.result);pending.delete(m.id);}};
const run=async expression=>{const result=await new Promise(resolve=>{const n=++id;pending.set(n,resolve);ws.send(JSON.stringify({id:n,method:'Runtime.evaluate',params:{expression,returnByValue:true}}));});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description??result.exceptionDetails.text);return result.result.value;};
const input=key=>run(`window.miniGames.input(${JSON.stringify(key)})`),inspect=()=>run('window.miniGames.inspectBarcelona()');
const key=async code=>{execFileSync(adb,['shell','input','keyevent',code]);await wait(100);};
try{
  await run('location.reload()');await wait(2200);await run(`document.querySelector('[data-index="3"]').click()`);
  for(const [i,name] of ['jordi','anna','guim'].entries()){
    await run(`document.querySelector('[data-hero="${i}"]').click()`);await wait(250);assert.equal((await inspect()).hero,name);
    await input('back');await input('right');await input('select');assert.equal((await inspect()).hero,name,'restart preserves character');
    await input('back');await input('down');await input('select');assert.equal((await inspect()).mode,'pick');
  }
  await run(`document.querySelector('[data-hero="0"]').click()`);
  const before=(await inspect()).player.x;await key('KEYCODE_DPAD_RIGHT');await wait(200);const running=await inspect();assert.ok(running.player.x>before);assert.equal(running.direction,1);await wait(250);assert.ok((await inspect()).player.x>running.player.x,'running continues after release');
  await key('KEYCODE_DPAD_RIGHT');assert.equal((await inspect()).direction,1,'same arrow keeps running');
  await key('KEYCODE_DPAD_LEFT');const stopped=await inspect();assert.equal(stopped.direction,0);await wait(250);assert.equal((await inspect()).player.x,stopped.player.x,'opposite arrow stops');
  await key('KEYCODE_DPAD_LEFT');assert.equal((await inspect()).direction,-1);await key('KEYCODE_DPAD_RIGHT');assert.equal((await inspect()).direction,0);
  await key('KEYCODE_DPAD_CENTER');assert.ok((await inspect()).player.y>0,'native Select jumps');
  await input('right');await key('KEYCODE_BACK');const paused=await inspect();assert.equal(paused.paused,true);assert.equal(paused.direction,0);await wait(300);assert.equal((await inspect()).time,paused.time);
  await key('KEYCODE_HOME');execFileSync(adb,['shell','am','start','-W','-n','net.jordeu.minigames/.MainActivity']);await wait(200);assert.equal((await inspect()).paused,true);
  await input('right');await input('select');await input('right');
  const ground=createLevel().platforms.filter(p=>p.y===0),deadline=Date.now()+65000;
  while(Date.now()<deadline){const state=await inspect();if(state.status!=='playing')break;const p=state.player,edge=ground.find(b=>b.x<=p.x&&b.x+b.w>=p.x);
    if(p.grounded&&((edge&&edge.x+edge.w-p.x<1.9)||state.enemies.some(e=>e.alive&&e.x>p.x&&e.x-p.x<3.3)))await input('select');await wait(40);
  }
  const end=await inspect();assert.equal(end.status,'won');assert.ok(end.coins>0);assert.ok(end.checkpoint>3);assert.ok(end.fps>=20,`frame rate ${end.fps}`);console.log(`PASS: all heroes, native tap-to-run/opposite-to-stop and jump, restart, pause/Home, complete level; ${end.lives} lives, ${end.coins} coins, ${end.fps} FPS, ${end.drawCalls} draw calls`);
  await input('back');await input('back');assert.equal(await run('window.miniGames.isMenu()'),true);
}finally{await run('window.miniGames.suspend()');ws.close();}
