import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {BananaMatch,launchVelocity,shotOrigin,pointOnShot} from '../web/src/banana.js';
const adb=process.env.ADB??'adb',wait=ms=>new Promise(r=>setTimeout(r,ms));
const pages=await(await fetch('http://127.0.0.1:9222/json')).json();
const ws=new WebSocket(pages.find(p=>p.url.includes('appassets.androidplatform.net')).webSocketDebuggerUrl);
let id=0;const pending=new Map();await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){pending.get(m.id)?.(m.result);pending.delete(m.id);}};
const run=async expression=>{const result=await new Promise(resolve=>{const n=++id;pending.set(n,resolve);ws.send(JSON.stringify({id:n,method:'Runtime.evaluate',params:{expression,returnByValue:true}}));});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description??result.exceptionDetails.text);return result.result.value;};
const input=key=>run(`window.miniGames.input(${JSON.stringify(key)})`);
const key=async code=>{execFileSync(adb,['shell','input','keyevent',code]);await wait(100);};
const inspect=async()=>JSON.parse(await run('JSON.stringify(window.miniGames.inspectBanana())'));
const text=()=>run('document.querySelector("#ui").innerText');
async function until(predicate,timeout=18000){const start=Date.now();while(Date.now()-start<timeout){const state=await inspect();if(predicate(state))return state;await wait(100);}throw new Error('Timed out waiting for duel state');}
async function aimAt(aim){const state=await inspect(),current=state.aims[state.turn],moves=[];
  for(let a=current.angle;a<aim.angle;a++)moves.push('up');for(let a=current.angle;a>aim.angle;a--)moves.push('down');
  // Power normally changes in steps of two. Pick the neighbouring reachable power
  // by finding shots at the same parity as the current setting.
  assert.equal(Math.abs(current.power-aim.power)%2,0);
  for(let p=current.power;p<aim.power;p+=2)moves.push('right');for(let p=current.power;p>aim.power;p-=2)moves.push('left');
  await run(`${JSON.stringify(moves)}.forEach(k=>window.miniGames.input(k))`);
}
function findReachableHit(state){return findHitFiltered(state,state.aims[state.turn].power%2);}
function findHitFiltered(state,parity){
  const candidates=[],target=state.players[1-state.turn],origin=shotOrigin(state.players[state.turn],state.turn);
  for(let angle=20;angle<=85;angle++)for(let power=6+parity;power<=100;power+=2){
    const v=launchVelocity(angle,power,state.turn),dx=target.x-origin.x,d=v.x*v.x+2*state.wind*dx;
    const times=Math.abs(state.wind)<.001?[dx/v.x]:d<0?[]:[(-v.x+Math.sqrt(d))/state.wind,(-v.x-Math.sqrt(d))/state.wind];
    for(const t of times)if(t>.1&&t<12){const y=pointOnShot(origin,v,state.wind,t).y;if(y>target.y+.5&&y<target.y+5.8)candidates.push({angle,power,error:Math.abs(y-target.y-3)});}
  }
  candidates.sort((a,b)=>a.error-b.error);
  for(const aim of candidates){const m=new BananaMatch({random:()=>.5});Object.assign(m,{players:state.players,blocks:state.blocks.map(b=>({...b})),turn:state.turn,wind:state.wind,worldTime:state.worldTime,birds:state.birds.map(b=>({...b}))});m.aims[state.turn]=aim;m.fire();for(let t=0;t<12&&m.phase==='flight';t+=1/60)m.advance(1/60);if(m.result?.hit===1-state.turn)return aim;}
  throw new Error('No reachable direct-hit trajectory');
}
let originalMusic;
try{
  await run('location.reload()');await wait(1400);await key('KEYCODE_DPAD_RIGHT');await key('KEYCODE_DPAD_RIGHT');await key('KEYCODE_DPAD_CENTER');
  assert.equal(await run('typeof window.AndroidAnnouncer'),'undefined');assert.match(await text(),/Choose Player 1/);await until(s=>s.assetsReady===3);
  originalMusic=await run('localStorage.getItem("banana-music")');
  for(const [pairIndex,pair] of [[0,[0,1]],[1,[0,2]],[2,[1,2]]]){
    for(const index of pair)await run(`document.querySelector('[data-pick="${index}"]').click()`);
    assert.deepEqual((await inspect()).picks,pair);await key('KEYCODE_DPAD_CENTER');assert.equal((await inspect()).phase,'aim');
    if(pairIndex===0){
      const audio=await until(s=>s.sfxReady.length===5&&s.sfxPlayed.includes('applause'));assert.deepEqual(audio.sfxErrors,[]);assert.ok(audio.sfxPlayed.includes('woo'));assert.ok(audio.musicVolume<=.08);
      assert.ok(await run('!!document.querySelector(".duel-wind")'));assert.equal((await inspect()).birds.length,3);
      const before=(await inspect()).aims[0];await key('KEYCODE_DPAD_UP');await key('KEYCODE_DPAD_RIGHT');const after=(await inspect()).aims[0];assert.equal(after.angle,before.angle+1);assert.equal(after.power,before.power+2);await key('KEYCODE_DPAD_DOWN');await key('KEYCODE_DPAD_LEFT');
      await key('KEYCODE_DPAD_CENTER');await key('KEYCODE_BACK');const paused=await inspect();assert.equal(paused.paused,true);assert.equal(paused.musicPlaying,false);await wait(400);assert.equal((await inspect()).shot.time,paused.shot.time);
      const enabled=paused.musicEnabled;await key('KEYCODE_DPAD_DOWN');await key('KEYCODE_DPAD_DOWN');await key('KEYCODE_DPAD_RIGHT');await key('KEYCODE_DPAD_CENTER');assert.equal((await inspect()).musicEnabled,!enabled);await key('KEYCODE_DPAD_CENTER');assert.equal((await inspect()).musicEnabled,enabled);await key('KEYCODE_DPAD_UP');await key('KEYCODE_DPAD_UP');await key('KEYCODE_DPAD_LEFT');
      await key('KEYCODE_HOME');execFileSync(adb,['shell','am','start','-W','-n','net.jordeu.minigames/.MainActivity']);await wait(200);assert.equal((await inspect()).paused,true);await key('KEYCODE_DPAD_CENTER');
      const initial=await until(s=>s.phase!=='flight');assert.equal(initial.result.type,'building');await wait(500);
      if((await inspect()).phase==='turn'){const previous=(await inspect()).turn;await key('KEYCODE_DPAD_CENTER');assert.equal((await inspect()).turn,1-previous);}else{await key('KEYCODE_DPAD_CENTER');}
    }
    let wonRounds=0;
    for(let attempt=0;attempt<18;attempt++){
      let state=await inspect();if(state.phase==='match')break;
      let aim;for(let window=0;window<8;window++){try{aim=findReachableHit(state);break;}catch{await wait(500);state=await inspect();}}
      assert.ok(aim,'a reachable throw should become available as birds move');await aimAt(aim);await key('KEYCODE_DPAD_CENTER');
      const end=await until(s=>s.phase!=='flight');await wait(550);
      if(end.phase==='turn'){
        assert.ok(['bird','building','miss'].includes(end.result.type));console.log(`PASS: interrupted throw (${end.result.type}) hands off without a point`);await key('KEYCODE_DPAD_CENTER');continue;
      }
      assert.equal(end.result.hit,1-state.turn);wonRounds++;console.log(`PASS: pair ${pair.join('/')}, round ${end.round}, skyline-clearing hit and score ${end.wins.join(':')}`);
      if(end.phase==='match'||pairIndex!==0)break;
      await key('KEYCODE_DPAD_CENTER');
    }
    assert.ok(wonRounds>0);
    if(pairIndex===0){assert.equal((await inspect()).phase,'match');assert.ok((await inspect()).wins.includes(3));}
    // Return to the picker through the result's Choose players button.
    await input('right');await input('select');assert.equal((await inspect()).mode,'pick');
  }
  await key('KEYCODE_BACK');assert.match(await text(),/SNAKE BEST/);
  console.log('PASS: all avatar pairs, aiming, throws, wind, collisions, match victory, pause/Home, handoff and exit');
}finally{if(originalMusic!==undefined)await run(`const k='banana-music';${originalMusic===null?'localStorage.removeItem(k)':'localStorage.setItem(k,'+JSON.stringify(originalMusic)+')'}`);ws.close();}
