// A bundled orchestral performance, streamed by the media element rather than
// generating electronic notes. See public/music/CREDITS.md for recording details.
export class BananaMusic {
  constructor(sound,createAudio=source=>new Audio(source)){
    this.sound=sound;this.audio=createAudio('./music/morning-mood.ogg');
    this.audio.loop=true;this.audio.preload='auto';this.baseVolume=.08;this.audio.volume=this.baseVolume;this.duckUntil=0;
    this.wanted=false;this.pending=false;this.retryAfter=0;
  }
  get playing(){return this.wanted&&!this.audio.paused&&this.audio.readyState>=2&&!this.audio.error;}
  start(){
    if(this.sound.muted){this.stop();return;}
    this.wanted=true;
    if(this.pending||!this.audio.paused||Date.now()<this.retryAfter)return;
    this.sound.unlock();this.pending=true;
    Promise.resolve(this.audio.play()).then(()=>{
      this.pending=false;
      if(!this.wanted||this.sound.muted)this.audio.pause();
    }).catch(()=>{this.pending=false;this.retryAfter=Date.now()+1000;});
  }
  duck(seconds=2.5){this.duckUntil=Math.max(this.duckUntil,performance.now()+seconds*1000);this.audio.volume=Math.min(this.audio.volume,this.baseVolume*.22);}
  updateMix(deltaMs){const ducked=performance.now()<this.duckUntil,target=this.baseVolume*(ducked?.22:1),speed=ducked?35:2;this.audio.volume+=(target-this.audio.volume)*(1-Math.exp(-Math.max(0,deltaMs)/1000*speed));}
  stop(){this.duckUntil=0;this.wanted=false;this.audio.pause();}
}
