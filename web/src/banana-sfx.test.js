import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BananaSfx} from './banana-sfx.js';
function fixture(){
  const nodes=[];const sound={muted:false,unlock(){},context:{currentTime:0,createBufferSource(){const s={playbackRate:{value:1},connect(){},disconnect(){},start(){},stop(time){if(time===undefined)this.cancelled=true;}};nodes.push(s);return s;},createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){}},connect(){},disconnect(){}};}}};
  const sfx=new BananaSfx(sound);sfx.loading=Promise.resolve();sfx.bus={};for(const name of ['explosion','woo','applause','gasp','whistle'])sfx.buffers.set(name,{duration:15});return {sfx,sound,nodes};
}
test('winning hits schedule a recorded explosion, human woo and applause',()=>{
  const {sfx,nodes}=fixture();sfx.impact({big:true,winner:true,champion:true});assert.deepEqual(sfx.played,['explosion','woo','applause']);assert.equal(sfx.sources.size,3);sfx.stop();assert.ok(nodes.every(n=>n.cancelled));assert.equal(sfx.sources.size,0);
});
test('global mute prevents recorded effects and pause cancels delayed cheers',()=>{
  const {sfx,sound}=fixture();sound.muted=true;assert.equal(sfx.play('woo'),false);assert.equal(sfx.sources.size,0);sound.muted=false;sfx.roundStart();sfx.surprise();assert.deepEqual(sfx.played,['whistle','applause','woo','gasp']);sfx.stop();assert.equal(sfx.sources.size,0);
});
test('a cue waiting for decode cannot start after pause or exit',async()=>{
  const {sfx}=fixture();sfx.buffers.clear();let finish;sfx.loading=new Promise(resolve=>{finish=resolve;});let played=false;sfx.cue(()=>played=true);sfx.stop();finish();await Promise.resolve();assert.equal(played,false);
});

test('building hits also get audible human cheers and clapping without a point',()=>{
  const {sfx}=fixture();sfx.impact({big:true});assert.deepEqual(sfx.played,['explosion','woo','applause']);
});
