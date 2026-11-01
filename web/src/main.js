import * as THREE from 'three';
import {Snake, SIZE} from './snake.js';
import './style.css';
import {GameSound} from './sound.js';
import {ChickGame} from './chick-view.js';
import {moveGridFocus} from './chick-input.js';
let chick;
const ui = document.querySelector('#ui');
const game = new Snake();
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const save = (key, value) => { try { localStorage.setItem(key,JSON.stringify(value)); } catch {} };
let best = Number(read('best',0)) || 0, muted = read('muted',false), state='menu', selected=0, accumulator=0, last=0;
const sound = new GameSound();
sound.setMuted(muted);
let deathElapsed=0, eatElapsed=1;
const DEATH_DURATION=1800;
const button=(text,index)=>`<button data-index="${index}" class="${selected===index?'selected':''}">${text}</button>`;
function drawUI(){
  if(chick?.active){chick.draw();return;}
  if(state==='menu') ui.innerHTML=`<section class="menu"><div class="eyebrow">Pick up & play</div><h1>Mini Games<span style="color:#b7fa6b">.</span></h1><p>Small games. Big screen. One more round.</p><div class="game-cards"><div class="card ${selected===0?'active':''}"><span class="tag">01 / ARCADE</span><h2>Snake</h2><p>Grow your snake.<br>Keep clear of walls and yourself.</p>${button('Play Snake →',0)}</div><div class="card chick-card ${selected===1?'active':''}"><span class="tag">02 / LOGIC PUZZLE</span><h2>Chickdoku</h2><p>A place for every little chick.<br>Ten difficulties. Take your time.</p>${button('Play Chickdoku →',1)}</div></div>${button(muted?'Sound: Off':'Sound: On',2)}</section><div class="footer"><span>↑ ↓ ← → Choose &nbsp; • &nbsp; Select to play</span><span>SNAKE BEST &nbsp; ${best}</span></div>`;
  else {
    ui.innerHTML=`<div class="hud"><h2>Snake<span style="color:#b7fa6b">.</span></h2><div class="stats"><span>SCORE<strong>${game.score}</strong></span><span>BEST<strong>${best}</strong></span><span>LEVEL<strong>${1+Math.floor(game.score/30)}</strong></span></div></div><div class="footer"><span>↑ ↓ ← → Steer</span><span>Select: pause &nbsp; • &nbsp; Back: menu</span></div>`;
    if(state==='dying') {
      ui.innerHTML+=`<div class="crash-caption"><strong>${game.won?'SNAKE SUPREME!':'OH, SNAP!'}</strong><span>${game.won?'A full board. A very full snake.':'That was a spectacular noodle incident.'}</span></div>`;
    } else if(state!=='playing') {
      const title=state==='ready'?'Ready to grow?':state==='paused'?'Take a breather.':game.won?'Board complete!':'Good run.';
      const text=state==='ready'?'Eat the coral food. Avoid walls and your tail.':state==='paused'?'Your game is paused.':`You scored ${game.score} points. Best: ${best}.`;
      ui.innerHTML+=`<div class="veil"><section class="dialog"><div class="eyebrow">${state==='over'?'ROUND FINISHED':'SNAKE / SINGLE PLAYER'}</div><h2>${title}</h2><p>${text}</p><div class="actions">${button(state==='paused'?'Resume':state==='ready'?'Start game':'Play again',0)}${button('Game menu',1)}${button(muted?'Sound: Off':'Sound: On',2)}</div></section></div>`;
    }
  }
  ui.querySelectorAll('button').forEach(b=>b.onclick=()=>{selected=Number(b.dataset.index);activate();});
}
function setState(next){if(state==='dying' && next!=='over')sound.stop();state=next;selected=0;accumulator=0;drawUI();}
function activate(){
  sound.select();
  if(state==='menu') { if(selected===0){game.reset();setState('ready');syncBoard();}else if(selected===1)chick.open();else toggleMute(); }
  else if(selected===0){if(state==='over'){game.reset();eatElapsed=1;}setState('playing');syncBoard();}
  else if(selected===1)setState('menu');else toggleMute();
}
function toggleMute(){muted=!muted;sound.setMuted(muted);if(!muted)sound.select();save('muted',muted);drawUI();}
function input(key){
  if(chick?.active){chick.input(key);return;}
  sound.unlock();
  if(state==='dying'){if(key==='back')setState('over');return;}
  if(state==='playing'){
    if(key==='select'||key==='back')setState('paused');else game.turn(key);
    return;
  }
  if(key==='back'){if(state==='menu')return; if(state==='paused')setState('playing');else setState('menu');return;}
  if(key==='select'){activate();return;}
  if(state==='menu')selected=moveGridFocus(selected,key,3);
  else if(key==='left')selected=Math.max(0,selected-1);
  else if(key==='right')selected=Math.min(2,selected+1);
  drawUI();
}
window.miniGames={input,isMenu:()=>state==='menu'&&!chick?.active,suspend(){if(chick?.active){chick.suspend();return;}if(state==='playing')setState('paused');else if(state==='dying')setState('over');sound.suspend();}};
window.addEventListener('keydown',e=>{const key={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',Enter:'select',Escape:'back',' ':'select'}[e.key];if(key){e.preventDefault();if(!e.repeat)input(key);}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)window.miniGames.suspend();});
let renderer,scene,camera,board,snakeGroup,food,stars,graphicsError=false;
try {
  renderer=new THREE.WebGLRenderer({canvas:document.querySelector('#scene'),antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0x0b1220);
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(38,innerWidth/innerHeight,.1,150);
  scene.add(new THREE.AmbientLight(0xd8ecff,2));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(-8,20,12);scene.add(light);
  board=new THREE.Group();scene.add(board);
  const base=new THREE.Mesh(new THREE.BoxGeometry(19,.5,19),new THREE.MeshStandardMaterial({color:0x17273b,roughness:.8}));base.position.y=-.4;board.add(base);
  const tileGeo=new THREE.PlaneGeometry(.96,.96),tileMats=[0x203349,0x23384d].map(color=>new THREE.MeshStandardMaterial({color,roughness:.9}));
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){const tile=new THREE.Mesh(tileGeo,tileMats[(x+y)%2]);tile.rotation.x=-Math.PI/2;tile.position.set(x-8.5,-.13,y-8.5);board.add(tile);}
  snakeGroup=new THREE.Group();board.add(snakeGroup);
  food=new THREE.Mesh(new THREE.IcosahedronGeometry(.43,1),new THREE.MeshStandardMaterial({color:0xff796e,emissive:0x6b1714,roughness:.35}));board.add(food);
  const bodyGeo=new THREE.BoxGeometry(.87,.6,.87),headMat=new THREE.MeshStandardMaterial({color:0xd7ff8a}),bodyMat=new THREE.MeshStandardMaterial({color:0x9bd94e});
  const eyeGeo=new THREE.SphereGeometry(.065,8,8),eyeMat=new THREE.MeshBasicMaterial({color:0x101a2b});
  function rebuildSnake(){
    while(snakeGroup.children.length>game.body.length)snakeGroup.remove(snakeGroup.children.at(-1));
    while(snakeGroup.children.length<game.body.length){const i=snakeGroup.children.length,m=new THREE.Mesh(bodyGeo,i===0?headMat:bodyMat);if(i===0){for(const z of [-.22,.22]){const eye=new THREE.Mesh(eyeGeo,eyeMat);eye.position.set(.22,.31,z);m.add(eye);}}snakeGroup.add(m);}
    game.body.forEach((p,i)=>{const m=snakeGroup.children[i];m.position.set(p[0]-8.5,.22,p[1]-8.5);if(i===0)m.rotation.y={right:0,left:Math.PI,up:Math.PI/2,down:-Math.PI/2}[game.direction];});
  }
  window.updateSnake=rebuildSnake;
  stars=new THREE.Group();board.add(stars);
  const starShape=new THREE.Shape();
  for(let i=0;i<10;i++){const angle=i*Math.PI/5-Math.PI/2,r=i%2?.16:.36;const x=Math.cos(angle)*r,y=Math.sin(angle)*r;if(i===0)starShape.moveTo(x,y);else starShape.lineTo(x,y);}
  starShape.closePath();
  const starGeometry=new THREE.ShapeGeometry(starShape),starMaterial=new THREE.MeshBasicMaterial({color:0xffd76e,side:THREE.DoubleSide});
  for(let i=0;i<6;i++)stars.add(new THREE.Mesh(starGeometry,starMaterial));
  stars.visible=false;
  function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}
  window.addEventListener('resize',resize);resize();
} catch(error){graphicsError=true;ui.innerHTML='<section class="error"><h1>Graphics unavailable</h1><p>Mini Games needs a WebGL 2 compatible Android System WebView. Update Android System WebView and reopen the app.</p></section>';console.error(error);}
function syncBoard(){window.updateSnake?.();if(food){food.visible=!!game.food;if(game.food)food.position.set(game.food[0]-8.5,.45,game.food[1]-8.5);}}
function frame(time){
  const delta=Math.min(time-last,250);last=time;
  if(chick?.active){chick.render(renderer,time);requestAnimationFrame(frame);return;}
  if(state==='playing'){
    accumulator+=delta;
    while(accumulator>=game.interval && state==='playing'){
      accumulator-=game.interval;const score=game.score;game.step();
      if(game.score>score){sound.eat();eatElapsed=0;if(game.score>best){best=game.score;save('best',best);}drawUI();}
      if(game.over){deathElapsed=0;sound.finish(game.won);setState('dying');}syncBoard();
    }
  }
  eatElapsed+=delta/1000;
  if(state==='dying') {deathElapsed+=delta;if(deathElapsed>=DEATH_DURATION)setState('over');}
  if(renderer){
    stars.visible=state==='dying';
    snakeGroup.children.forEach((mesh,i)=>{
      mesh.position.y=.22;mesh.rotation.z=0;mesh.rotation.x=0;mesh.scale.set(1,1,1);
      if(state==='dying') {
        const t=Math.max(0,deathElapsed/1000-i*.045),bounce=Math.max(0,1-t/1.55);
        mesh.position.y=.22+Math.abs(Math.sin(t*10))*bounce*(i===0?2:1.3);
        mesh.rotation.z=Math.sin(t*15)*bounce*.55;
        mesh.rotation.x=Math.sin(t*8)*bounce*.25;
        mesh.scale.set(1+.2*bounce*Math.sin(t*12),1-.18*bounce*Math.sin(t*12),1);
      } else if(state==='playing' && eatElapsed<.45) {
        const pulse=Math.max(0,Math.sin((eatElapsed-i*.035)*Math.PI/.22));
        mesh.scale.set(1+pulse*.15,1+pulse*.35,1+pulse*.15);
      }
    });
    if(stars.visible) {
      const head=snakeGroup.children[0].position,t=deathElapsed/1000;
      stars.children.forEach((star,i)=>{const angle=t*5+i*Math.PI/3;star.position.set(head.x+Math.cos(angle)*1.2,1.8+Math.sin(angle*2)*.25,head.z+Math.sin(angle)*1.2);star.rotation.set(-.6,0,-angle);star.scale.setScalar(Math.min(1,deathElapsed/150));});
    }
    const menu=state==='menu';camera.position.set(menu?0:0,menu?24:25,menu?29:25);camera.lookAt(menu?-9:0,0,menu?0:0);board.rotation.y=menu?-.16:0;food.rotation.y=time*.001;renderer.render(scene,camera);}
  requestAnimationFrame(frame);
}
if(!graphicsError){chick=new ChickGame({ui,sound,onExit:()=>setState('menu'),onMute:toggleMute,isMuted:()=>muted});drawUI();syncBoard();requestAnimationFrame(frame);}
