import * as THREE from 'three';
import {AVATARS,BananaMatch,shotOrigin} from './banana.js';
import {moveGridFocus} from './chick-input.js';
import {BananaMusic} from './banana-music.js';
import {BananaSfx} from './banana-sfx.js';

const BUILDING_COLORS=[0x38667c,0x675887,0x487878,0x955e70,0x697f8c];
export class BananaGame {
  constructor({ui,sound,onExit,onMute,isMuted,target=3}) {
    Object.assign(this,{ui,sound,onExit,onMute,isMuted,target});
    this.music=new BananaMusic(sound);this.sfx=new BananaSfx(sound);this.musicEnabled=true;try{this.musicEnabled=localStorage.getItem('banana-music')!=='false';}catch{}
    this.active=false;this.mode='pick';this.focus=0;this.picks=[];this.match=null;this.notice='';this.paused=false;this.resultAge=0;this.lastShooter=null;this.effects=[];this.assetErrors=new Set();this.assetsReady=0;
    this.scene=new THREE.Scene();this.camera=new THREE.OrthographicCamera(-56,56,32,-32,.1,350);
    this.camera.position.set(89,59,155);this.camera.lookAt(50,27,0);
    const sky=document.createElement('canvas');sky.width=4;sky.height=256;const ctx=sky.getContext('2d'),gradient=ctx.createLinearGradient(0,0,0,256);
    gradient.addColorStop(0,'#15254c');gradient.addColorStop(.55,'#53678e');gradient.addColorStop(1,'#ffc2a1');ctx.fillStyle=gradient;ctx.fillRect(0,0,4,256);this.scene.background=new THREE.CanvasTexture(sky);
    this.scene.add(new THREE.HemisphereLight(0xc3e9ff,0x5b3559,2.3));const sunLight=new THREE.DirectionalLight(0xffd3ad,3);sunLight.position.set(-35,80,60);this.scene.add(sunLight);
    this.static=new THREE.Group();this.scene.add(this.static);
    const sun=new THREE.Mesh(new THREE.SphereGeometry(7,32,24),new THREE.MeshBasicMaterial({color:0xffd797}));sun.position.set(78,45,-55);this.static.add(sun);
    const farMaterial=new THREE.MeshStandardMaterial({color:0x4b5878,roughness:1});
    for(let i=0;i<18;i++){const h=7+(i*13%17);const mesh=new THREE.Mesh(new THREE.BoxGeometry(7,h,8),farMaterial);mesh.position.set(i*7-10,h/2-1,-32);this.static.add(mesh);}
    const ground=new THREE.Mesh(new THREE.BoxGeometry(140,2,65),new THREE.MeshStandardMaterial({color:0x233d55,roughness:1}));ground.position.set(50,-1.2,-15);this.static.add(ground);
    this.buildings=new THREE.Group();this.scene.add(this.buildings);this.actors=new THREE.Group();this.scene.add(this.actors);
    this.loader=new THREE.TextureLoader();this.textures=AVATARS.map(avatar=>{const texture=this.loader.load(avatar.image,()=>{this.assetsReady++;if(this.active&&this.mode==='pick')this.draw();},undefined,()=>{this.assetErrors.add(avatar.id);if(this.active)this.draw();});texture.colorSpace=THREE.SRGBColorSpace;return texture;});
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-.8,.35,0),new THREE.Vector3(-.35,-.1,0),new THREE.Vector3(.3,-.2,0),new THREE.Vector3(.85,.12,0)]);
    this.banana=new THREE.Mesh(new THREE.TubeGeometry(curve,20,.18,7,false),new THREE.MeshStandardMaterial({color:0xffdb45,roughness:.4,emissive:0x503200}));this.banana.visible=false;this.scene.add(this.banana);
    this.dotGeometry=new THREE.SphereGeometry(.16,8,6);this.dotMaterial=new THREE.MeshBasicMaterial({color:0xffdf88});this.guide=new THREE.Group();this.scene.add(this.guide);
    for(let i=0;i<14;i++){const dot=new THREE.Mesh(this.dotGeometry,this.dotMaterial);this.guide.add(dot);}
    this.turnMarker=new THREE.Mesh(new THREE.ConeGeometry(.6,1,3),new THREE.MeshBasicMaterial({color:0xffdc76}));this.turnMarker.rotation.z=Math.PI;this.scene.add(this.turnMarker);
    this.splatGeometry=new THREE.SphereGeometry(.25,8,6);this.splatMaterial=new THREE.MeshBasicMaterial({color:0xffde57});
    this.lastTrail=new THREE.Group();this.scene.add(this.lastTrail);
    this.tileGeometry=new THREE.BoxGeometry(1.94,1.94,6);this.windowGeometry=new THREE.BoxGeometry(.57,.83,.08);
    this.blockMaterial=new THREE.MeshStandardMaterial({roughness:.72,metalness:.08});this.windowMaterial=new THREE.MeshStandardMaterial({roughness:.3,emissive:0x4a3014,emissiveIntensity:.4});
    this.dummy=new THREE.Object3D();this.actorMeshes=[];this.shake=0;this.birdMeshes=[];
    this.birdGroup=new THREE.Group();this.scene.add(this.birdGroup);
    this.birdBodyGeo=new THREE.SphereGeometry(.48,10,8);this.birdWingGeo=new THREE.BoxGeometry(1.35,.12,.65);this.birdWhite=new THREE.MeshStandardMaterial({color:0xeaf0f3});this.birdDark=new THREE.MeshStandardMaterial({color:0x33445e});this.birdBeakGeo=new THREE.ConeGeometry(.18,.5,4);this.birdOrange=new THREE.MeshStandardMaterial({color:0xffb84f});
    this.windStreaks=new THREE.Group();this.scene.add(this.windStreaks);
    const streakGeo=new THREE.BoxGeometry(2,.07,.04),streakMat=new THREE.MeshBasicMaterial({color:0xe2f7ff,transparent:true,opacity:.4});
    for(let i=0;i<14;i++){const streak=new THREE.Mesh(streakGeo,streakMat);streak.userData={start:i*8.7,height:39+i%5*5.6};this.windStreaks.add(streak);}
    this.ringGeometry=new THREE.RingGeometry(.75,1,40);this.debrisGeometry=new THREE.BoxGeometry(.5,.5,.7);
    this.smokeMaterial=new THREE.MeshBasicMaterial({color:0x434c68,transparent:true,opacity:.65});
    this.windClock=0;
  }
  syncMusic(){if(this.isMuted()){this.sfx.stop();}if(this.active&&!this.paused&&!this.isMuted()&&this.musicEnabled)this.music.start();else this.music.stop();}
  makeBird(){
    const bird=new THREE.Group(),body=new THREE.Mesh(this.birdBodyGeo,this.birdWhite);body.scale.set(1.2,.7,.65);bird.add(body);
    for(const side of [-1,1]){const pivot=new THREE.Group();pivot.position.x=side*.3;const wing=new THREE.Mesh(this.birdWingGeo,this.birdDark);wing.position.x=side*.65;pivot.add(wing);bird.add(pivot);bird.userData[side<0?'leftWing':'rightWing']=pivot;}
    const beak=new THREE.Mesh(this.birdBeakGeo,this.birdOrange);beak.rotation.z=-Math.PI/2;beak.position.set(.8,0,0);bird.add(beak);
    const snack=new THREE.Mesh(this.splatGeometry,this.splatMaterial);snack.scale.set(1.2,.4,.4);snack.position.set(.85,-.2,.1);snack.visible=false;bird.add(snack);bird.userData.snack=snack;return bird;
  }
  windUI(){const wind=this.match.wind,force=Math.abs(wind),direction=wind<0?'←':'→',label=force<1.5?'Breeze':force<2.5?'Gusty':'Strong';return `<div class="duel-wind" data-wind="${wind}" style="--wind-time:${(3.5/force).toFixed(2)}s;--wind-sign:${wind<0?-1:1}"><span class="wind-arrow">${direction}${direction}${direction}</span><div><strong>${label} ${direction} ${force.toFixed(1)}</strong><span>WIND · CHANGES EACH TURN</span></div><div class="wind-strength"><i style="width:${force/3.2*100}%"></i></div></div>`;

  }
  open(){this.active=true;this.mode='pick';this.focus=0;this.picks=[];this.paused=false;this.notice='';this.sound.stop();this.sfx.stop();this.sfx.preload();this.clearEffects();this.draw();}
  exit(){this.sfx.stop();this.music.stop();this.active=false;this.sound.stop();this.onExit();}
  button(label,index){return `<button data-action="${index}" class="${this.focus===index?'selected':''}">${label}</button>`;}
  portrait(avatar){return `<span class="duel-face"><img src="${avatar.image}" alt="${avatar.name}" /></span>`;}
  draw(){
    if(!this.active)return;this.syncMusic();
    if(this.mode==='pick'){
      const ready=this.picks.length===2;
      this.ui.innerHTML=`<section class="duel-picker"><div class="eyebrow">03 / LOCAL TWO-PLAYER</div><h1>Banana <span>Rooftops.</span></h1><p>Choose two familiar faces. Settle it with a banana.</p><div class="duel-pick-status">${ready?`${AVATARS[this.picks[0]].name} vs ${AVATARS[this.picks[1]].name} · Ready for the rooftops!`:this.picks.length?`${AVATARS[this.picks[0]].name} is Player 1. Choose Player 2.`:'Choose Player 1.'}</div><div class="duel-character-cards">${AVATARS.map((avatar,i)=>{const side=this.picks.indexOf(i);return `<button data-pick="${i}" class="duel-character ${this.focus===i?'selected':''} ${side>=0?'chosen':''}" style="--avatar-color:${avatar.color}"><span class="duel-pick-tag">${side>=0?'PLAYER '+(side+1):'PICK ME'}</span><img src="${avatar.image}" alt="Cartoon ${avatar.name}" /><strong>${avatar.name}</strong><span>${avatar.description}</span></button>`;}).join('')}</div><div class="duel-picker-actions">${this.button(ready?(this.assetsReady===3?'Start duel →':'Loading portraits…'):'Choose two players',3)}${this.button('Game menu',4)}</div>${this.assetErrors.size?'<p class="warning">A portrait could not load. Reopen the game to retry.</p>':''}</section><div class="footer"><span>← → Choose &nbsp; • &nbsp; Select: pick / unpick &nbsp; • &nbsp; ↓ Start</span><span>PASS THE REMOTE · FIRST TO ${this.target}</span></div>`;
      this.ui.querySelectorAll('[data-pick]').forEach(button=>button.onclick=()=>{this.focus=Number(button.dataset.pick);this.choose(this.focus);});
    }else{
      const m=this.match,aim=m.aims[m.turn],left=AVATARS[this.picks[0]],right=AVATARS[this.picks[1]],current=AVATARS[this.picks[m.turn]],wind=m.wind;
      this.ui.innerHTML=`<header class="duel-hud"><div class="duel-player ${m.turn===0?'active':''}">${this.portrait(left)}<div><strong>${left.name}</strong><span>PLAYER 1</span></div><b>${m.wins[0]}</b></div><div class="duel-round"><span>BANANA ROOFTOPS</span><strong>ROUND ${m.round}</strong><small>First to ${this.target} · Mind the birds!</small></div><div class="duel-player right ${m.turn===1?'active':''}"><b>${m.wins[1]}</b><div><strong>${right.name}</strong><span>PLAYER 2</span></div>${this.portrait(right)}</div></header>`;
      this.ui.innerHTML+=`<section class="duel-aim"><div class="duel-aim-heading"><div class="duel-turn-name" style="color:${current.color}">${m.phase==='aim'?current.name+', your throw!':m.phase==='flight'?current.name+' sends it!':'Ready for the next banana?'}</div>${this.windUI()}</div><div class="duel-dials"><div><small>↑ ↓ ANGLE</small><strong data-stat="angle">${aim.angle}°</strong></div><div><small>← → POWER</small><strong data-stat="power">${aim.power}<span>%</span></strong><div class="duel-power"><i style="width:${aim.power}%"></i></div></div><button data-throw="true" ${m.phase!=='aim'?'disabled':''}>${m.phase==='flight'?'Banana airborne…':m.phase==='aim'?'Select to throw 🍌':'Waiting for next turn'}</button></div><p class="duel-hint">Clear the towers. Read the wind. Watch the banana thieves.</p></section>`;
      if(m.phase==='turn')this.ui.innerHTML+=`<section class="duel-handoff"><div class="eyebrow">${m.result.type==='bird'?'BANANA THIEF!':m.result.type==='building'?'BANANA MEETS BUILDING':'A LITTLE TOO AMBITIOUS'}</div><h2>${this.notice}</h2><p>Pass the remote to <strong>${AVATARS[this.picks[1-m.turn]].name}</strong>.</p>${this.button('Next turn →',0)}</section>`;
      else if(m.phase==='round'||m.phase==='match'){
        const winner=AVATARS[this.picks[m.result.winner]],matchOver=m.phase==='match';
        this.ui.innerHTML+=`<section class="duel-round-result"><div class="eyebrow">${matchOver?'ROOFTOP CHAMPION':'BANANA SPLAT!'}</div><h2>${winner.name} ${matchOver?'wins the match!':'wins the round!'}</h2><p>${matchOver?'A well-earned victory dance. One more duel?':'A clean hit. A fresh skyline. Another banana.'}</p><div class="actions">${this.button(matchOver?'Rematch':'Next round →',0)}${this.button('Choose players',1)}${this.button('Game menu',2)}</div></section>`;
      }
      this.ui.innerHTML+=`<div class="footer duel-footer"><span>↑ ↓ Angle &nbsp; • &nbsp; ← → Power &nbsp; • &nbsp; Select: throw</span><span>Back: pause</span></div>`;
      if(this.paused){const labels=['Resume','Restart match','Choose players','Game menu',this.isMuted()?'Sound: Off':'Sound: On',this.musicEnabled?'Music: On':'Music: Off'];this.ui.innerHTML+=`<div class="veil"><section class="dialog"><div class="eyebrow">PASS-THE-REMOTE PLAY</div><h2>Banana break.</h2><p>The skyline can wait.<br><small>Music: Grieg · Morning Mood · Musopen Symphony Orchestra</small></p><div class="chick-action-list">${labels.map((label,i)=>this.button(label,i)).join('')}</div></section></div>`;}
      this.ui.querySelector('[data-throw]')?.addEventListener('click',()=>this.throw());
    }
    this.ui.querySelectorAll('[data-action]').forEach(button=>button.onclick=()=>{this.focus=Number(button.dataset.action);this.activate();});
  }
  choose(index){
    this.sound.select();const existing=this.picks.indexOf(index);
    if(existing>=0)this.picks.splice(existing,1);else if(this.picks.length<2)this.picks.push(index);else this.picks[1]=index;
    if(this.picks.length===2)this.focus=3;
    this.draw();
  }
  start(){
    if(this.picks.length!==2||this.assetErrors.size||this.assetsReady!==3)return;
    this.match=new BananaMatch({target:this.target});this.mode='game';this.paused=false;this.focus=0;this.lastShooter=null;this.clearEffects();this.buildRound();this.draw();
  }
  clearEffects(){this.shake=0;this.effects.forEach(e=>{this.scene.remove(e.mesh);if(e.ownMaterial)e.mesh.material.dispose();});this.effects=[];this.lastTrail.clear();}
  buildRound(){
    this.clearEffects();this.banana.visible=false;this.bricks?.dispose();this.windows?.dispose();this.buildings.clear();this.actorMeshes.forEach(actor=>{actor.geometry.dispose();actor.material.dispose();});this.actors.clear();this.actorMeshes=[];this.birdGroup.clear();this.birdMeshes=[];
    const m=this.match,count=m.blocks.length;
    this.bricks=new THREE.InstancedMesh(this.tileGeometry,this.blockMaterial,count);this.windows=new THREE.InstancedMesh(this.windowGeometry,this.windowMaterial,count);
    const color=new THREE.Color();
    m.blocks.forEach((block,i)=>{
      this.dummy.position.set(block.x,block.y,-3);this.dummy.scale.set(1,1,1);this.dummy.updateMatrix();this.bricks.setMatrixAt(i,this.dummy.matrix);this.bricks.setColorAt(i,color.setHex(BUILDING_COLORS[block.building%5]));
      this.dummy.position.z=.08;this.dummy.updateMatrix();this.windows.setMatrixAt(i,this.dummy.matrix);this.windows.setColorAt(i,color.setHex(i*17%7<3?0xffd08a:0x182b45));
    });
    this.buildings.add(this.bricks,this.windows);
    this.picks.forEach((index,side)=>{
      const avatar=AVATARS[index],height=avatar.id==='guim'?6.9:7.7;
      const material=new THREE.MeshBasicMaterial({map:this.textures[index],transparent:true,alphaTest:.015,depthWrite:false});
      const actor=new THREE.Mesh(new THREE.PlaneGeometry(height*2/3,height),material);actor.position.set(m.players[side].x,m.players[side].y+height/2,1.2);actor.userData={side,height,baseY:actor.position.y};actor.renderOrder=3;this.actors.add(actor);this.actorMeshes.push(actor);
    });
    m.birds.forEach(()=>{const bird=this.makeBird();this.birdGroup.add(bird);this.birdMeshes.push(bird);});
    this.sfx.roundStart();this.music.duck(3.8);
    this.updateGuide();
  }
  updateGuide(){if(!this.match)return;const m=this.match;this.guide.visible=m.phase==='aim';this.turnMarker.visible=m.phase==='aim';
    m.preview().forEach((point,i)=>this.guide.children[i].position.set(point.x,point.y,1.7));const player=m.players[m.turn];this.turnMarker.position.set(player.x,player.y+9.8,1.5);
  }
  throw(){
    if(this.paused||!this.match?.fire())return;
    this.focus=0;this.lastShooter=this.match.turn;this.lastTrail.clear();this.banana.visible=true;this.updateGuide();this.sound.bananaLaunch();this.music.duck(.65);this.draw();
  }
  explode(result){
    for(const index of result.destroyed){this.dummy.position.set(0,0,0);this.dummy.scale.set(0,0,0);this.dummy.updateMatrix();this.bricks.setMatrixAt(index,this.dummy.matrix);this.windows.setMatrixAt(index,this.dummy.matrix);}
    this.bricks.instanceMatrix.needsUpdate=true;this.windows.instanceMatrix.needsUpdate=true;this.resultAge=0;
    const big=result.winner!==null||result.destroyed.length>=10;this.shake=result.type==='bird'?.12:big?1:.4;
    for(let i=0;i<38;i++){
      const debris=i%3===0&&result.type==='building',smoke=i%4===0&&result.type!=='bird';
      const mesh=new THREE.Mesh(debris?this.debrisGeometry:this.splatGeometry,smoke?this.smokeMaterial:this.splatMaterial);mesh.position.set(result.point.x,result.point.y,1.7);mesh.scale.setScalar(smoke?2.5:.6+Math.random());this.scene.add(mesh);
      const angle=i*Math.PI*2/38;this.effects.push({mesh,vx:Math.cos(angle)*(4+Math.random()*12),vy:Math.sin(angle)*12+5,age:0,kind:smoke?'smoke':'debris'});
    }
    if(result.type!=='bird'){
      const material=new THREE.MeshBasicMaterial({color:0xffe6a1,transparent:true,opacity:1,side:THREE.DoubleSide,depthWrite:false});
      const mesh=new THREE.Mesh(this.ringGeometry,material);mesh.position.set(result.point.x,result.point.y,3);this.scene.add(mesh);this.effects.push({mesh,age:0,kind:'ring',ownMaterial:true});
    }
    this.banana.visible=false;
    if(result.type==='bird'){
      this.sound.birdSteal();this.sfx.surprise();this.music.duck(2.5);this.notice='A gull stole your lunch!';
    }else if(result.winner!==null){
      const champion=this.match.phase==='match';this.sfx.impact({big:true,winner:true,champion});this.music.duck(champion?9:5.5);
      this.notice='Direct banana delivery!';
    }else if(result.type==='building'){
      this.sfx.impact({big});this.music.duck(big?4:3);this.notice='BOOM! Renovation complete.';
    }else{
      this.sfx.surprise();this.music.duck(2);this.notice='Banana successfully sent to space.';
    }

    this.draw();
  }
  activate(){
    this.sound.select();
    if(this.mode==='pick'){if(this.focus<3)this.choose(this.focus);else if(this.focus===3)this.start();else this.exit();return;}
    if(this.paused){if(this.focus===0){this.paused=false;this.focus=0;}else if(this.focus===1){this.start();return;}else if(this.focus===2){this.open();return;}else if(this.focus===3){this.exit();return;}else if(this.focus===4)this.onMute();else if(this.focus===5){this.musicEnabled=!this.musicEnabled;try{localStorage.setItem('banana-music',String(this.musicEnabled));}catch{}}this.draw();return;}
    const phase=this.match.phase;
    if(phase==='aim'){this.throw();return;}
    if(phase==='flight')return;
    if(this.resultAge<.45)return;
    if(phase==='turn'){this.match.nextTurn();this.focus=0;this.updateGuide();this.draw();return;}
    if(this.focus===0){this.sound.stop();this.sfx.stop();if(phase==='match')this.start();else{this.match.nextRound();this.buildRound();this.draw();}}
    else if(this.focus===1)this.open();else this.exit();
  }
  input(key){
    this.sound.unlock();
    if(key==='back'){if(this.mode==='pick'){this.exit();return;}this.paused=!this.paused;this.focus=0;this.sound.stop();this.sfx.stop();this.draw();return;}
    if(key==='select'){this.activate();return;}
    if(this.mode==='pick'){
      if(this.focus<3){if(key==='left')this.focus=Math.max(0,this.focus-1);if(key==='right')this.focus=Math.min(2,this.focus+1);if(key==='down')this.focus=this.focus===0?3:4;}
      else{if(key==='up')this.focus=this.focus===3?0:1;if(key==='left')this.focus=3;if(key==='right')this.focus=4;}
      this.draw();return;
    }
    if(this.paused){this.focus=moveGridFocus(this.focus,key,6);this.draw();return;}
    if(this.match.phase==='aim'){this.match.adjust(key);this.updateGuide();this.draw();}
    else if(this.match.phase==='round'||this.match.phase==='match'){if(key==='left')this.focus=Math.max(0,this.focus-1);if(key==='right')this.focus=Math.min(2,this.focus+1);this.draw();}
  }
  inspect(){
    const m=this.match;
    return {mode:this.mode,paused:this.paused,picks:[...this.picks],assetsReady:this.assetsReady,assetErrors:[...this.assetErrors],phase:m?.phase,turn:m?.turn,wins:m?[...m.wins]:null,round:m?.round,wind:m?.wind,worldTime:m?.worldTime,birds:m?.birds.map(b=>({...b})),sfxReady:[...this.sfx.buffers.keys()],sfxErrors:[...this.sfx.errors],sfxActive:this.sfx.sources.size,sfxPlayed:[...this.sfx.played],musicVolume:this.music.audio.volume,musicEnabled:this.musicEnabled,musicPlaying:this.music.playing,musicTime:this.music.audio.currentTime,musicReady:this.music.audio.readyState,musicError:this.music.audio.error?.message??null,aims:m?.aims.map(a=>({...a})),players:m?.players.map(p=>({...p})),blocks:m?.blocks.filter(b=>b.alive).map(b=>({x:b.x,y:b.y,alive:true})),shot:m?.shot?{time:m.shot.time,position:{...m.shot.position}}:null,result:m?.result?{winner:m.result.winner,hit:m.result.hit,type:m.result.type}:null};
  }
  repeatInput(key){if(this.mode==='game'&&!this.paused&&this.match?.phase==='aim'&&performance.now()-(this.lastRepeat??0)>75){this.lastRepeat=performance.now();this.input(key);}}
  suspend(){this.sfx.stop();this.music.stop();if(this.mode==='game'){this.paused=true;this.focus=0;this.draw();}this.sound.suspend();}
  render(renderer,time,deltaMs){
    this.music.updateMix(deltaMs);
    if(!this.isMuted())this.sfx.preload();
    const aspect=innerWidth/innerHeight,seconds=Math.min(deltaMs/1000,.1),m=this.match;
    const targetZoom=this.mode==='game'&&m?.phase==='flight'?Math.max(1,(m.shot.position.y-24+7)/(56/aspect)):1;
    this.viewZoom=THREE.MathUtils.lerp(this.viewZoom??1,targetZoom,1-Math.exp(-seconds*5));
    this.camera.left=-56*this.viewZoom;this.camera.right=56*this.viewZoom;this.camera.top=56/aspect*this.viewZoom;this.camera.bottom=-56/aspect*this.viewZoom;this.camera.updateProjectionMatrix();
    this.syncMusic();this.birdGroup.visible=this.mode==='game';this.windStreaks.visible=this.mode==='game';
    this.buildings.visible=this.mode==='game';this.actors.visible=this.mode==='game';this.guide.visible=this.mode==='game'&&m.phase==='aim';this.turnMarker.visible=this.guide.visible;
    if(this.mode==='game'&&!this.paused){
      this.windClock+=seconds;const wasFlight=m.phase==='flight',result=m.advance(seconds);
      if(wasFlight){
        const p=m.shot.position;this.banana.position.set(p.x,p.y,1.6);this.banana.rotation.z=time*.012;
        if(this.lastTrail.children.length<55&&Math.floor(m.shot.time*15)>this.lastTrail.children.length){const dot=new THREE.Mesh(this.dotGeometry,this.dotMaterial);dot.scale.setScalar(.48);dot.position.set(p.x,p.y,1.3);this.lastTrail.add(dot);}
        if(result)this.explode(result);
      }else if(m.phase!=='aim')this.resultAge+=seconds;
      this.effects=this.effects.filter(effect=>{
        effect.age+=seconds;
        if(effect.age>1.4){this.scene.remove(effect.mesh);if(effect.ownMaterial)effect.mesh.material.dispose();return false;}
        if(effect.kind==='ring'){effect.mesh.scale.setScalar(1+effect.age*15);effect.mesh.material.opacity=Math.max(0,1-effect.age*2);}
        else{effect.mesh.position.x+=effect.vx*seconds;effect.mesh.position.y+=effect.vy*seconds;effect.vy-=(effect.kind==='smoke'?-2:18)*seconds;effect.mesh.rotation.z+=seconds*4;effect.mesh.scale.multiplyScalar(effect.kind==='smoke'?1.008:.99);}
        return true;
      });
      this.birdMeshes.forEach((mesh,i)=>{const bird=m.birds[i],p=m.birdPosition(bird),stolen=bird.stolenUntil>m.worldTime;mesh.position.set(p.x,p.y,2);mesh.rotation.y=bird.speed<0?Math.PI:0;const flap=Math.sin(m.worldTime*13+i)*.65;mesh.userData.leftWing.rotation.z=flap;mesh.userData.rightWing.rotation.z=-flap;mesh.userData.snack.visible=stolen;});
      this.windStreaks.children.forEach(streak=>{streak.position.set(-5+((streak.userData.start+this.windClock*m.wind*12)%110+110)%110,streak.userData.height,2);streak.scale.x=.6+Math.abs(m.wind)*.5;});
      this.shake*=Math.exp(-seconds*6);

      this.actorMeshes.forEach((actor,side)=>{
        actor.position.y=actor.userData.baseY;actor.rotation.z=0;
        if(m.phase==='round'||m.phase==='match'){const winner=m.result.winner;if(side===winner){actor.position.y+=Math.abs(Math.sin(this.resultAge*8))*.7;actor.rotation.z=Math.sin(this.resultAge*8)*.08;}else actor.rotation.z=Math.sin(this.resultAge*13)*Math.exp(-this.resultAge*2)*.25;}
        else if(m.phase==='flight'&&side===this.lastShooter)actor.rotation.z=Math.sin(Math.min(1,m.shot.time/.3)*Math.PI)*(side===0?-.15:.15);
      });
    }
    if(this.mode==='pick'){this.banana.visible=false;this.guide.visible=false;this.turnMarker.visible=false;}
    const shake=this.mode==='game'&&!this.paused?this.shake:0;
    this.camera.position.set(89+Math.sin(time*.071)*shake*.4,59+Math.cos(time*.089)*shake*.3,155);
    renderer.render(this.scene,this.camera);
  }
}
