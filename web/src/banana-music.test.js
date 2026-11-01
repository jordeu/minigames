import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BananaMusic} from './banana-music.js';
function fixture(play){
  const sound={muted:false,unlock(){}},audio={paused:true,readyState:4,currentTime:42,error:null,pause(){this.paused=true;},play:play??function(){this.paused=false;return Promise.resolve();}};
  const music=new BananaMusic(sound,source=>{assert.equal(source,'./music/morning-mood.ogg');return audio;});return {sound,audio,music};
}
test('recorded orchestra loops quietly and resumes at the same position after pause',async()=>{
  const {music,audio}=fixture();assert.equal(audio.loop,true);assert.ok(audio.volume<.3);music.start();await Promise.resolve();assert.equal(music.playing,true);music.stop();assert.equal(music.playing,false);assert.equal(audio.paused,true);assert.equal(audio.currentTime,42);music.start();await Promise.resolve();assert.equal(music.playing,true);
});
test('global mute immediately pauses orchestral playback',async()=>{
  const {music,sound,audio}=fixture();music.start();await Promise.resolve();sound.muted=true;music.start();assert.equal(music.playing,false);assert.equal(audio.paused,true);
});
test('a delayed play request cannot restart music after exit',async()=>{
  let finish;const {music,audio}=fixture(function(){return new Promise(resolve=>{finish=()=>{this.paused=false;resolve();};});});music.start();music.stop();finish();await Promise.resolve();assert.equal(audio.paused,true);assert.equal(music.playing,false);
});
test('playback rejection is handled without an unhandled promise or retry storm',async()=>{
  const {music}=fixture(()=>Promise.reject(new Error('not ready')));music.start();await new Promise(resolve=>setImmediate(resolve));assert.equal(music.pending,false);assert.ok(music.retryAfter>Date.now());assert.equal(music.playing,false);
});
test('orchestra is quieter and ducks further for sound effects',()=>{
  const {music,audio}=fixture();assert.equal(audio.volume,.08);music.duck(2);assert.ok(audio.volume<.02);music.updateMix(100);assert.ok(audio.volume<.02);music.stop();music.updateMix(10000);assert.ok(Math.abs(audio.volume-.08)<.001);
});
