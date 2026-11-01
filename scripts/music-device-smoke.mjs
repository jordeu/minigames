import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const adb=process.env.ADB??'adb',wait=ms=>new Promise(r=>setTimeout(r,ms));
const pages=await(await fetch('http://127.0.0.1:9222/json')).json(),ws=new WebSocket(pages.find(p=>p.url.includes('appassets.androidplatform.net')).webSocketDebuggerUrl);
let id=0;const pending=new Map();await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){pending.get(m.id)?.(m.result);pending.delete(m.id);}};
const run=async expression=>{const result=await new Promise(resolve=>{const n=++id;pending.set(n,resolve);ws.send(JSON.stringify({id:n,method:'Runtime.evaluate',params:{expression,returnByValue:true}}));});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description??result.exceptionDetails.text);return result.result.value;};
const state=async()=>JSON.parse(await run('JSON.stringify(window.miniGames.inspectBanana())'));
const key=async code=>{execFileSync(adb,['shell','input','keyevent',code]);await wait(120);};
async function playing(){for(let i=0;i<50;i++){const s=await state();if(s.musicError)throw new Error(s.musicError);if(s.musicPlaying&&s.musicTime>.2)return s;await wait(100);}throw new Error('Orchestral recording did not start');}
let muted=false,enabled=true;
try{
  await run('location.reload()');await wait(1400);muted=await run('localStorage.getItem("muted")==="true"');
  if(muted){await run(`document.querySelector('[data-index="3"]').click()`);await key('KEYCODE_DPAD_UP');}
  await key('KEYCODE_DPAD_RIGHT');await key('KEYCODE_DPAD_RIGHT');await key('KEYCODE_DPAD_CENTER');
  for(let i=0;i<40&&(await state()).assetsReady<3;i++)await wait(100);
  enabled=(await state()).musicEnabled;
  await run(`document.querySelector('[data-pick="0"]').click();document.querySelector('[data-pick="1"]').click()`);await key('KEYCODE_DPAD_CENTER');
  if(!enabled){await key('KEYCODE_BACK');await run(`document.querySelector('[data-action="5"]').click()`);await key('KEYCODE_BACK');}
  const first=await playing();await wait(1200);const second=await state();assert.ok(second.musicTime>first.musicTime+.8);assert.ok(second.musicReady>=2);assert.equal(second.musicError,null);
  await key('KEYCODE_BACK');const paused=await state();await wait(600);assert.equal((await state()).musicPlaying,false);assert.ok(Math.abs((await state()).musicTime-paused.musicTime)<.05);
  execFileSync(adb,['shell','input','keyevent','KEYCODE_HOME']);execFileSync(adb,['shell','am','start','-W','-n','net.jordeu.minigames/.MainActivity']);await wait(300);assert.equal((await state()).musicPlaying,false);
  await key('KEYCODE_BACK');await playing();assert.ok((await state()).musicTime>=paused.musicTime);
  await key('KEYCODE_BACK');await run(`document.querySelector('[data-action="4"]').click()`);await key('KEYCODE_BACK');await wait(250);assert.equal((await state()).musicPlaying,false);
  await key('KEYCODE_BACK');await run(`document.querySelector('[data-action="4"]').click()`);await key('KEYCODE_BACK');await playing();
  await key('KEYCODE_BACK');if(!enabled)await run(`document.querySelector('[data-action="5"]').click()`);
  await run(`document.querySelector('[data-action="3"]').click()`);assert.equal(await run('window.miniGames.isMenu()'),true);
  if(muted)await run(`document.querySelector('[data-index="3"]').click()`);
  console.log('PASS: real orchestral file decodes, playback advances, pause/Home freezes it, resume retains position, mute silences it, preferences restored');
}finally{ws.close();}
