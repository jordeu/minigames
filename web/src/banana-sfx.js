const FILES={explosion:'explosion.mp3',woo:'woo.mp3',applause:'applause.mp3',whistle:'whistle.mp3',gasp:'gasp.mp3'};
// Recorded crowd, referee and explosion sounds. Small decoded buffers are shared
// across cues; every playing/scheduled source is stopped on mute, pause or exit.
export class BananaSfx {
  constructor(sound){this.sound=sound;this.buffers=new Map();this.sources=new Set();this.errors=[];this.loading=null;this.played=[];this.generation=0;}
  preload(){
    if(this.loading)return this.loading;
    this.sound.unlock();if(!this.sound.context)return Promise.resolve();
    const ctx=this.sound.context;
    this.bus=ctx.createDynamicsCompressor();this.bus.threshold.value=-10;this.bus.ratio.value=4;this.bus.attack.value=.004;this.bus.release.value=.18;this.bus.connect(ctx.destination);
    this.loading=Promise.all(Object.entries(FILES).map(async([name,file])=>{
      try{const response=await fetch('./sfx/'+file);if(!response.ok)throw new Error(`HTTP ${response.status}`);this.buffers.set(name,await ctx.decodeAudioData(await response.arrayBuffer()));}
      catch(error){this.errors.push(`${name}: ${error.message}`);}
    }));return this.loading;
  }
  play(name,{gain=.4,delay=0,offset=0,duration,rate=1}={}){
    if(this.sound.muted)return false;this.preload();const buffer=this.buffers.get(name);if(!buffer)return false;
    const ctx=this.sound.context,source=ctx.createBufferSource(),volume=ctx.createGain(),start=ctx.currentTime+delay,length=Math.min(duration??buffer.duration-offset,buffer.duration-offset)/rate;
    source.buffer=buffer;source.playbackRate.value=rate;source.connect(volume);volume.connect(this.bus);
    volume.gain.setValueAtTime(0,start);volume.gain.linearRampToValueAtTime(gain,start+.008);volume.gain.setValueAtTime(gain,start+Math.max(0,length-.1));volume.gain.linearRampToValueAtTime(0,start+length);
    this.sources.add(source);source.onended=()=>{this.sources.delete(source);source.disconnect();volume.disconnect();};source.start(start,offset);source.stop(start+length+.01);
    this.played.push(name);if(this.played.length>12)this.played.shift();return true;
  }
  cue(action){if(this.sound.muted)return;if(this.buffers.size===Object.keys(FILES).length){action();return;}const generation=this.generation;this.preload().then(()=>{if(generation===this.generation&&!this.sound.muted)action();});}
  roundStart(){this.cue(()=>{
    this.play('whistle',{gain:.26});
    this.play('applause',{gain:.3,delay:.4,offset:1.2,duration:2.8});
    this.play('woo',{gain:.46,delay:.65,duration:2.7});
  });}
  impact({big=false,winner=false,champion=false}={}){
    this.cue(()=>{this.play('explosion',{gain:big?.65:.3,duration:big?1.5:1,rate:big?1:1.13});
    // Let the boom land first, then bring the crowd forward on every hit.
    this.play('woo',{gain:champion?.7:winner?.6:big?.52:.38,delay:.65,duration:2.7});
    this.play('applause',{gain:champion?.45:winner?.36:big?.3:.23,delay:.9,offset:1.2,duration:champion?7:winner?3.8:2.5});});
  }
  surprise(){this.cue(()=>this.play('gasp',{gain:.34,duration:1.7}));}
  stop(){this.generation++;for(const source of this.sources){try{source.stop();}catch{}}this.sources.clear();}
}
