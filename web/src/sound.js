// Original synthesized effects: no recordings, downloads, or audio assets.
export class GameSound {
  constructor() { this.context = null; this.voices = new Set(); this.muted = false; this.bite = 0; }
  unlock() {
    if (this.muted) return;
    try { this.context ??= new AudioContext(); this.context.resume().catch(() => {}); } catch {}
  }
  note(frequency, offset, duration, {type='triangle', gain=.075, end=frequency}={}) {
    if (this.muted || !this.context) return;
    const ctx=this.context, start=ctx.currentTime+offset;
    const oscillator=ctx.createOscillator(), envelope=ctx.createGain();
    oscillator.type=type;
    oscillator.frequency.setValueAtTime(frequency,start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20,end),start+duration);
    envelope.gain.setValueAtTime(0,start);
    envelope.gain.linearRampToValueAtTime(gain,start+.008);
    envelope.gain.exponentialRampToValueAtTime(.0001,start+duration);
    oscillator.connect(envelope);envelope.connect(ctx.destination);
    this.voices.add(oscillator);
    oscillator.onended=()=>{this.voices.delete(oscillator);oscillator.disconnect();envelope.disconnect();};
    oscillator.start(start);oscillator.stop(start+duration+.02);
  }
  select() { this.unlock();this.note(480,0,.07,{type:'sine',gain:.04,end:660}); }
  eat() {
    this.unlock();
    // A rubbery gulp followed by two bright, increasingly cheeky chirps.
    const pitch=[1,1.125,1.25,1.5][this.bite++%4];
    this.note(180*pitch,0,.13,{gain:.11,end:620*pitch});
    this.note(880*pitch,.075,.09,{type:'sine',gain:.065,end:440*pitch});
    this.note(1047*pitch,.15,.12,{type:'sine',gain:.045,end:1320*pitch});
  }
  finish(won=false) {
    this.stop();this.unlock();
    if (!won) {
      // Cartoon slide-whistle crash, then a tiny comic jazz sign-off.
      this.note(720,0,.32,{gain:.1,end:85});
      this.note(110,.09,.18,{type:'sine',gain:.09,end:55});
    }
    const melody=won?[523,659,784,1047,988,1047]:[392,370,330,261.63,293.66,329.63,261.63];
    melody.forEach((frequency,i)=>this.note(frequency,.3+i*.145,.18,{gain:.065}));
    [130.81,164.81,196,233.08].forEach(frequency=>this.note(frequency,1.35,.42,{gain:.026}));
  }
  setMuted(value) { this.muted=value;if(value)this.stop(); }
  stop() {
    for(const voice of this.voices) { try { voice.stop(); } catch {} }
    this.voices.clear();
  }
  suspend() { this.stop();this.context?.suspend().catch(()=>{}); }
}
