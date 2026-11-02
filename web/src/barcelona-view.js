import * as THREE from 'three';
import {BarcelonaRun,HEROES} from './barcelona.js';
import {detailedCity,texturedBox,batchStatic} from './barcelona-art.js';
import {moveGridFocus} from './chick-input.js';
export class BarcelonaGame {
  constructor({ui,sound,onExit,onMute,isMuted}){
    Object.assign(this,{ui,sound,onExit,onMute,isMuted});this.active=false;this.focus=0;this.hero=0;this.mode='pick';this.direction=0;
    this.scene=new THREE.Scene();
    const sky=document.createElement('canvas');sky.width=4;sky.height=512;const ctx=sky.getContext('2d'),gradient=ctx.createLinearGradient(0,0,0,512);gradient.addColorStop(0,'#6e9cb7');gradient.addColorStop(.58,'#c0d1d3');gradient.addColorStop(1,'#ece0c9');ctx.fillStyle=gradient;ctx.fillRect(0,0,4,512);this.scene.background=new THREE.CanvasTexture(sky);this.scene.fog=new THREE.Fog(0xc9d3ce,38,150);
    this.camera=new THREE.OrthographicCamera(-17,17,10,-10,.1,230);
    this.scene.add(new THREE.HemisphereLight(0xd8e7f1,0x74644f,1.25));const sun=this.sun=new THREE.DirectionalLight(0xffe3bb,3.2);sun.position.set(-20,35,30);sun.castShadow=true;sun.shadow.mapSize.set(512,512);Object.assign(sun.shadow.camera,{left:-23,right:23,top:18,bottom:-18,near:1,far:95});sun.shadow.normalBias=.04;sun.shadow.bias=-.0003;this.scene.add(sun,sun.target);
    this.world=new THREE.Group();this.scene.add(this.world);this.materials=new Map();this.boxGeometry=new THREE.BoxGeometry(1,1,1);this.ballGeometry=new THREE.SphereGeometry(1,24,16);
    this.city=new THREE.Group();this.scene.add(this.city);detailedCity(this);this.run=new BarcelonaRun();this.buildLevel();this.buildHero();this.hudKey='';
  }
  material(color){if(!this.materials.has(color))this.materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.8}));return this.materials.get(color);}
  box(parent,x,y,z,w,h,d,color){const m=new THREE.Mesh(this.boxGeometry,this.material(color));m.position.set(x,y,z);m.scale.set(w,h,d);parent.add(m);return m;}
  ball(parent,x,y,z,w,h,d,color){const m=new THREE.Mesh(this.ballGeometry,this.material(color));m.position.set(x,y,z);m.scale.set(w,h,d);parent.add(m);return m;}
  buildLevel(){
    this.world.traverse(m=>{if(m.isMesh&&m.geometry!==this.boxGeometry&&m.geometry!==this.ballGeometry&&m.geometry!==this.coinGeometry)m.geometry.dispose();});this.world.clear();this.coinMeshes=[];this.enemyMeshes=[];
    for(const p of this.run.platforms){const ground=p.y===0;texturedBox(this.world,p.x+p.w/2,p.y-(ground?1:.28),0,p.w,ground?2:.56,3.2,this.groundMaterial);texturedBox(this.world,p.x+p.w/2,p.y+.025,0,p.w,.09,3.4,this.pavementMaterial);
      // Colourful trencadis tiles, inspired by Park Guell.
      if(!ground)for(let i=0;i<p.w*2;i++)this.box(this.world,p.x+.25+i*.5,p.y-.28,1.64,.42,.35,.05,[0x1c8dba,0xffcb4d,0xf08166,0xf4f1dd][i%4]);
      else for(const side of [-1,1])texturedBox(this.world,p.x+p.w/2,p.y+.07,side*1.57,p.w,.14,.18,this.groundMaterial);
    }
    batchStatic(this.world,true);
    if(!this.coinGeometry){this.coinGeometry=new THREE.CylinderGeometry(.3,.3,.1,24);this.coinGeometry.rotateX(Math.PI/2);this.coinMaterial=new THREE.MeshStandardMaterial({color:0xe5be59,metalness:.82,roughness:.25});}const coinGeo=this.coinGeometry;
    for(const c of this.run.coins){const m=new THREE.Mesh(coinGeo,this.coinMaterial);m.position.set(c.x,c.y,.2);this.world.add(m);this.coinMeshes.push(m);}
    for(const e of this.run.enemies){const bird=new THREE.Group();this.ball(bird,0,.38,0,.5,.4,.35,0x6d839d);this.ball(bird,.26,.7,0,.27,.26,.24,0x43556c);this.box(bird,.52,.68,.04,.22,.11,.14,0xf2b457);this.ball(bird,.32,.76,.23,.055,.055,.04,0x101e2c);this.box(bird,0,.13,0,.55,.08,.65,0xd98b64);this.world.add(bird);this.enemyMeshes.push(bird);}
    this.checkFlag=this.box(this.world,113,2.2,-1.2,.12,4.4,.12,0xf1f1d4);this.flag=this.box(this.world,113.7,3.7,-1.2,1.3,.7,.08,0xf8bd4b);
    for(const x of [211,214])this.box(this.world,x,2.6,0,.12,5.2,.12,0xfff4d8);this.box(this.world,212.5,4.8,0,3,.55,.1,0xef705e);
  }
  buildHero(){
    if(this.actor){this.actor.traverse(m=>{if(m.isMesh&&m.geometry!==this.boxGeometry&&m.geometry!==this.ballGeometry)m.geometry.dispose();});this.scene.remove(this.actor);}const h=HEROES[this.hero];this.actor=new THREE.Group();this.scene.add(this.actor);const a=this.actor,skin=0xf0c49e;
    this.ball(a,0,1.48,0,.38,.4,.32,skin);this.ball(a,0,1.72,-.05,.4,.24,.32,h.hair);this.ball(a,0,.88,0,.31,.42,.23,h.color);
    this.legs=[-1,1].map(s=>this.ball(a,s*.16,.28,0,.125,.3,.14,0x334357));this.arms=[-1,1].map(s=>this.ball(a,s*.36,.92,0,.105,.3,.12,skin));
    for(const s of [-1,1]){this.ball(a,s*.15,1.5,.3,.045,.055,.04,0x233747);this.ball(a,s*.16,.07,.09,.15,.09,.24,0xe0ded5);}
    this.box(a,0,1.32,.315,.18,.035,.025,0x9e6551);
    if(h.id==='jordi'){this.ball(a,0,1.28,.12,.32,.23,.28,0x87715c);this.box(a,0,1.31,.365,.2,.065,.03,0xfff6df);for(const s of [-1,1]){const rim=new THREE.Mesh(new THREE.TorusGeometry(.12,.02,5,14),this.material(0x222b37));rim.position.set(s*.16,1.51,.335);a.add(rim);}this.box(a,0,1.51,.34,.12,.035,.03,0x222b37);this.ball(a,0,1.85,-.04,.44,.14,.36,0x283347);this.box(a,0,1.79,.3,.55,.07,.46,0x283347);}
    if(h.id==='anna')for(const s of [-1,1]){this.ball(a,s*.35,1.4,-.12,.17,.48,.24,h.hair);this.ball(a,s*.38,1.1,-.17,.15,.24,.2,h.hair);}
    a.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;}});
    if(h.id==='guim'){a.scale.setScalar(.88);for(let i=0;i<5;i++)this.ball(a,-.25+i*.12,1.78,.18,.13,.18,.18,h.hair);this.box(a,0,.9,-.3,.5,.6,.25,0xa949b6);}
  }
  button(text,i){return `<button data-run="${i}" class="${this.focus===i?'selected':''}">${text}</button>`;}
  open(){this.active=true;this.mode='pick';this.focus=this.hero;this.paused=false;this.releaseAll();this.sound.stop();this.draw();}
  start(){if(this.mode==='pick'&&this.focus<3)this.hero=this.focus;this.run.reset();this.buildLevel();this.buildHero();this.mode='game';this.paused=false;this.focus=0;this.releaseAll();this.cameraX=3;this.hudKey='';this.draw();}
  releaseAll(){this.direction=0;}
  exit(){if(this.rendererSettings){const {renderer,toneMapping,exposure,shadows,pixelRatio}=this.rendererSettings;renderer.toneMapping=toneMapping;renderer.toneMappingExposure=exposure;renderer.shadowMap.enabled=shadows;renderer.setPixelRatio(pixelRatio);renderer.setSize(innerWidth,innerHeight,false);this.rendererSettings=null;}this.active=false;this.releaseAll();this.sound.stop();this.onExit();}
  draw(){
    if(!this.active)return;
    if(this.mode==='pick')this.ui.innerHTML=`<section class="duel-picker run-picker"><div class="eyebrow">04 / BARCELONA ADVENTURE</div><h1>Barcelona <span>Jump!</span></h1><p>Balconies, mosaics and a little mischief. Choose your adventurer.</p><div class="duel-character-cards">${HEROES.map((h,i)=>`<button data-hero="${i}" class="duel-character ${this.focus===i?'selected':''}" style="--avatar-color:#${h.color.toString(16).padStart(6,'0')}"><img src="${h.image}" alt="${h.name}"/><strong>${h.name}</strong><span>Same abilities. Your favourite adventurer.</span></button>`).join('')}</div><div class="duel-picker-actions">${this.button('Game menu',3)}</div></section><div class="footer"><span>← → Choose · Select: start</span><span>ONE PLAYER · THREE LIVES</span></div>`;
    else{
      const r=this.run;this.ui.innerHTML=`<header class="run-hud"><div><small>BARCELONA JUMP!</small><strong>${HEROES[this.hero].name}</strong></div><div><small>LIVES</small><strong>${'♥'.repeat(r.lives)}${'♡'.repeat(3-r.lives)}</strong></div><div><small>COINS</small><strong>${r.collected} / ${r.coins.length}</strong></div><div><small>${r.checkpoint>3?'CHECKPOINT REACHED':'TO ARC DE TRIOMF'}</small><strong>${Math.min(100,Math.floor(r.player.x/r.finish*100))}%</strong></div></header><div class="footer run-footer"><span>← / → Run · Opposite arrow: stop · Select / ↑ Jump</span><span>Back: pause</span></div>`;
      if(this.paused||r.status!=='playing'){const end=r.status!=='playing';const labels=end?['Play again','Choose player','Game menu']:['Resume','Restart adventure','Choose player','Game menu',this.isMuted()?'Sound: Off':'Sound: On'];this.ui.innerHTML+=`<div class="veil"><section class="dialog"><div class="eyebrow">${r.status==='won'?'ARC DE TRIOMF · FINISH!':'BARCELONA JUMP!'}</div><h2>${r.status==='won'?'Ben fet, '+HEROES[this.hero].name+'!':r.status==='over'?'Another city adventure?':'A little siesta.'}</h2><p>${end?`${r.collected} coins collected · ${Math.floor(r.time)} seconds`:'Your adventure is paused.'}</p><div class="chick-action-list">${labels.map((t,i)=>this.button(t,i)).join('')}</div></section></div>`;}
    }
    this.ui.querySelectorAll('[data-hero]').forEach(b=>b.onclick=()=>{this.focus=+b.dataset.hero;this.start();});this.ui.querySelectorAll('[data-run]').forEach(b=>b.onclick=()=>{this.focus=+b.dataset.run;this.activate();});
  }
  activate(){this.sound.select();if(this.mode==='pick'){if(this.focus<3)this.start();else this.exit();return;}if(this.run.status!=='playing'){if(this.focus===0)this.start();else if(this.focus===1)this.open();else this.exit();return;}if(this.focus===0){this.paused=false;this.releaseAll();this.draw();}else if(this.focus===1)this.start();else if(this.focus===2)this.open();else if(this.focus===3)this.exit();else{this.onMute();this.draw();}}
  input(key){this.sound.unlock();if(key==='back'){if(this.mode==='pick'){this.exit();return;}if(this.run.status!=='playing'){this.open();return;}this.paused=!this.paused;this.focus=0;this.releaseAll();this.sound.stop();this.draw();return;}
    if(this.mode==='pick'){if(key==='select')this.activate();else{if(key==='down')this.focus=3;else if(key==='up')this.focus=this.hero;else if(key==='left')this.focus=Math.max(0,this.focus-1);else if(key==='right')this.focus=Math.min(2,this.focus+1);this.draw();}return;}
    if(this.paused||this.run.status!=='playing'){if(key==='select')this.activate();else{this.focus=moveGridFocus(this.focus,key,this.paused?5:3);this.draw();}return;}
    if(key==='select'||key==='up')this.run.jump();else if(key==='left'||key==='right'){const requested=key==='left'?-1:1;this.direction=this.direction&&this.direction!==requested?0:requested;}
  }
  // Running is latched until an opposite arrow or a pause, regardless of key release.
  keyUp(){}
  suspend(){this.releaseAll();if(this.mode==='game'&&this.run.status==='playing'){this.paused=true;this.focus=0;}this.sound.suspend();this.draw();}
  inspect(){return {mode:this.mode,hero:HEROES[this.hero].id,paused:this.paused,status:this.run.status,player:{...this.run.player},lives:this.run.lives,coins:this.run.collected,checkpoint:this.run.checkpoint,time:this.run.time,direction:this.direction,enemies:this.run.enemies.map(e=>({...e})),fps:this.frameMs?Math.round(1000/this.frameMs):null,drawCalls:this.drawCalls};}
  render(renderer,time,delta){
    if(!renderer)return;if(!this.rendererSettings){this.rendererSettings={renderer,toneMapping:renderer.toneMapping,exposure:renderer.toneMappingExposure,shadows:renderer.shadowMap.enabled,pixelRatio:renderer.getPixelRatio()};renderer.setPixelRatio(Math.min(devicePixelRatio,1));renderer.setSize(innerWidth,innerHeight,false);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;}this.frameMs=this.frameMs===undefined?delta:this.frameMs*.95+delta*.05;const r=this.run,dt=Math.min(delta/1000,.06);if(this.mode==='game'&&!this.paused){r.advance(dt,this.direction);for(const e of r.events.splice(0)){if(e==='jump')this.sound.note(240,0,.15,{end:580,gain:.045});if(e==='coin')this.sound.note(900,0,.1,{end:1400,gain:.05});if(e==='stomp')this.sound.note(140,0,.14,{end:350});if(e==='checkpoint'){this.sound.note(520,0,.12);this.sound.note(780,.13,.18);}if(e==='hurt')this.sound.finish(false);if(e==='win')this.sound.finish(true);}if(r.status!=='playing')this.releaseAll();}
    const key=[this.mode,this.paused,r.status,r.lives,r.collected,Math.floor(r.player.x/r.finish*100),r.checkpoint].join(':');if(key!==this.hudKey){this.hudKey=key;this.draw();}
    const p=r.player;this.actor.position.set(p.x,p.y,0);this.actor.visible=this.mode==='pick'||this.paused||this.run.invincible===0||Math.sin(time*.025)>0;this.actor.rotation.y=p.facing*.22;
    const gait=p.grounded&&this.direction?Math.sin(time*.018)*.65:0;this.legs.forEach((leg,i)=>leg.rotation.x=(i?1:-1)*gait);this.arms.forEach((arm,i)=>arm.rotation.x=(i?-1:1)*gait);this.actor.rotation.z=!p.grounded?-.08*p.facing:0;
    this.coinMeshes.forEach((m,i)=>{m.visible=!r.coins[i].taken;m.rotation.y=time*.002;m.position.y=r.coins[i].y+Math.sin(time*.003+i)*.08;});this.enemyMeshes.forEach((m,i)=>{const e=r.enemies[i];m.visible=e.alive;m.position.set(e.x,.04+Math.abs(Math.sin(time*.006+i))*.09,0);m.rotation.y=e.dir===1?0:Math.PI;});this.flag.material=this.material(r.checkpoint>3?0x53cb9a:0xf8bd4b);
    const target=this.mode==='pick'?8:Math.max(9,Math.min(204,p.x+4));this.cameraX=this.cameraX===undefined?target:this.cameraX+(target-this.cameraX)*(1-Math.exp(-dt*7));const aspect=innerWidth/innerHeight,half=10*aspect;this.camera.left=-half;this.camera.right=half;this.camera.top=10;this.camera.bottom=-10;this.camera.position.set(this.cameraX,7,30);this.camera.lookAt(this.cameraX,3.7,0);this.camera.updateProjectionMatrix();this.sun.position.set(this.cameraX-18,26,18);this.sun.target.position.set(this.cameraX,1,0);renderer.render(this.scene,this.camera);this.drawCalls=renderer.info.render.calls;
  }
}
