// Run after adb forward tcp:9222 localabstract:webview_devtools_remote_APP_PID
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const adb=process.env.ADB??'adb';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const pages=await(await fetch('http://127.0.0.1:9222/json')).json();
const page=pages.find(p=>p.url.includes('appassets.androidplatform.net'));
assert.ok(page,'Mini Games WebView must be running');
const ws=new WebSocket(page.webSocketDebuggerUrl);let id=0;const pending=new Map();
await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){pending.get(m.id)?.(m.result);pending.delete(m.id);}};
const evaluate=expression=>new Promise(resolve=>{const n=++id;pending.set(n,resolve);ws.send(JSON.stringify({id:n,method:'Runtime.evaluate',params:{expression,returnByValue:true}}));});
const text=async()=>(await evaluate('document.querySelector("#ui").innerText')).result.value;
const key=async(code)=>{execFileSync(adb,['shell','input','keyevent',code]);await delay(180);};
try {
  await evaluate('location.reload()');
  await delay(1200);
  const originalMute=(await evaluate('localStorage.getItem("muted")')).result.value === 'true';
  assert.match(await text(),/SNAKE BEST/);
  await key('KEYCODE_DPAD_CENTER');assert.match(await text(),/Ready to grow/);
  await key('KEYCODE_DPAD_CENTER');assert.doesNotMatch(await text(),/Ready to grow|Take a breather/);
  await key('KEYCODE_BACK');assert.match(await text(),/Take a breather/);
  await key('KEYCODE_DPAD_CENTER');
  await key('KEYCODE_HOME');
  execFileSync(adb,['shell','am','start','-n','net.jordeu.minigames/.MainActivity']);await delay(600);
  assert.match(await text(),/Take a breather/);
  await key('KEYCODE_DPAD_CENTER');await delay(4400);assert.match(await text(),/Good run/);
  await key('KEYCODE_DPAD_CENTER');await key('KEYCODE_BACK');assert.match(await text(),/Take a breather/);
  await key('KEYCODE_DPAD_RIGHT');await key('KEYCODE_DPAD_CENTER');assert.match(await text(),/SNAKE BEST/);
  await key('KEYCODE_DPAD_DOWN');await key('KEYCODE_DPAD_CENTER');
  const mute=(await evaluate('localStorage.getItem("muted")')).result.value;assert.ok(['true','false'].includes(mute));
  await evaluate('location.reload()');await delay(1200);
  assert.match(await text(),mute==='true'?/Sound: Off/:/Sound: On/);
  if ((mute==='true')!==originalMute) {await key('KEYCODE_DPAD_DOWN');await key('KEYCODE_DPAD_CENTER');await key('KEYCODE_DPAD_UP');}
  console.log('PASS: menu, start, Back pause, Home/return pause, wall collision, restart, menu return, mute persistence after reload');
} finally {ws.close();}
