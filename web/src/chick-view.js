import * as THREE from 'three';
import bank from './chick-boards.json';
import {ChickPuzzle,transformBoard} from './chick.js';
import {ChickSelect,moveGridFocus} from './chick-input.js';
import {PuzzleClock,formatTime,readBestTimes,recordBestTime} from './chick-time.js';
const COLORS=[0xef6967,0x429ed1,0xe6b63a,0x825ac2,0x46ab72,0xe58d3f,0xd982b0,0x4ac4c0,0xb3becb];
const LABELS=['First steps','Little explorer','Curious chick','Finding your feet','Brain workout','Clever clucker','Deep thinker','Expert nest','Master hatch','Eggspert'];
export class ChickGame {
  constructor({ui,sound,onExit,onMute,isMuted}){
    Object.assign(this,{ui,sound,onExit,onMute,isMuted});this.active=false;this.mode='difficulty';this.level=1;this.choice=0;this.cursor=0;this.puzzle=null;this.lastBoard={};this.selectGesture=new ChickSelect();this.clock=null;this.newBest=false;
    try{this.bestTimes=readBestTimes(localStorage);}catch{this.bestTimes={};}
    try{this.level=Math.min(10,Math.max(1,Number(localStorage.getItem('chick-level'))||1));}catch{}
    this.scene=new THREE.Scene();this.camera=new THREE.OrthographicCamera(-10,10,6,-6,.1,60);this.camera.position.z=20;
    this.scene.add(new THREE.AmbientLight(0xffffff,2.4));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(-3,6,12);this.scene.add(light);
    this.white=new THREE.MeshBasicMaterial({color:0xffffff});
    this.blush=new THREE.MeshBasicMaterial({color:0xff977e});
    this.outlineMat=new THREE.MeshBasicMaterial({color:0x8b541e,side:THREE.BackSide});
    this.crossMat=new THREE.MeshStandardMaterial({color:0x32475e,roughness:.45});
    this.crossGeo=new THREE.BoxGeometry(.59,.12,.07);
    this.trayMat=new THREE.MeshStandardMaterial({color:0x243b51,roughness:.65});
    this.root=new THREE.Group();this.root.position.set(3,-.2,0);this.root.rotation.set(-.16,-.075,0);this.scene.add(this.root);
    this.tileGeo=new THREE.BoxGeometry(.97,.97,.12);this.bodyGeo=new THREE.SphereGeometry(.24,16,12);this.headGeo=new THREE.SphereGeometry(.19,16,12);this.eyeGeo=new THREE.SphereGeometry(.025,8,8);this.beakGeo=new THREE.ConeGeometry(.07,.13,4);this.wingGeo=new THREE.SphereGeometry(.105,10,8);
    this.yellow=new THREE.MeshStandardMaterial({color:0xffd84d,roughness:.6});this.orange=new THREE.MeshStandardMaterial({color:0xff983d});this.black=new THREE.MeshBasicMaterial({color:0x172331});this.wingMat=new THREE.MeshStandardMaterial({color:0xffbd35});
    // Unlit cell colours preserve contrast instead of washing out under the chick lighting.
    this.regionMats=COLORS.map(color=>new THREE.MeshBasicMaterial({color}));
    this.borderMat=new THREE.MeshBasicMaterial({color:0x142033});
    this.borderHorizontal=new THREE.BoxGeometry(1,.045,.025);this.borderVertical=new THREE.BoxGeometry(.045,1,.025);
    this.lineMaterial=new THREE.LineBasicMaterial({color:0x172331});
    const selectionRing=(outer,inner,color,order)=>{
      const shape=new THREE.Shape();shape.moveTo(-outer,-outer);shape.lineTo(outer,-outer);shape.lineTo(outer,outer);shape.lineTo(-outer,outer);shape.closePath();
      const hole=new THREE.Path();hole.moveTo(-inner,-inner);hole.lineTo(-inner,inner);hole.lineTo(inner,inner);hole.lineTo(inner,-inner);hole.closePath();shape.holes.push(hole);
      const mesh=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,depthTest:false,depthWrite:false}));mesh.renderOrder=order;return mesh;
    };
    this.focus=new THREE.Group();
    this.focus.add(selectionRing(.497,.365,0x101a2b,100));
    this.focusHighlight=selectionRing(.477,.39,0xffdf36,101);
    this.focusHighlight.material.transparent=true;
    this.focus.add(this.focusHighlight);this.focus.position.z=.13;this.root.add(this.focus);
    this.tiles=[];this.chicks=[];this.crosses=[];
  }
  open(){this.active=true;this.mode='difficulty';this.choice=0;this.sound.stop();this.draw();}
  close(){this.clock?.pause();this.active=false;this.sound.stop();this.onExit();}
  makeChick(){
    const g=new THREE.Group();
    // Squashy pear body, oversized face, goofy eyes and a little comic quiff.
    const body=new THREE.Mesh(this.bodyGeo,this.yellow);body.scale.set(1.08,.87,.82);body.position.set(0,-.16,.24);g.add(body);
    const head=new THREE.Mesh(this.headGeo,this.yellow);head.scale.set(1.38,1.18,1.05);head.position.set(0,.12,.34);g.add(head);
    for(const source of [body,head]){const outline=new THREE.Mesh(source.geometry,this.outlineMat);outline.position.copy(source.position);outline.scale.copy(source.scale).multiplyScalar(1.055);g.add(outline);}
    for(const [x,y,scale] of [[-.1,.16,1],[.105,.19,1.14]]){
      const white=new THREE.Mesh(this.eyeGeo,this.white);white.scale.set(2.15*scale,2.7*scale,1.1);white.position.set(x,y,.515);g.add(white);
      const pupil=new THREE.Mesh(this.eyeGeo,this.black);pupil.scale.set(.95,1.35,1);pupil.position.set(x+.012,y-.008,.55);g.add(pupil);
      const glint=new THREE.Mesh(this.eyeGeo,this.white);glint.scale.setScalar(.28);glint.position.set(x+.007,y+.008,.575);g.add(glint);
      const cheek=new THREE.Mesh(this.eyeGeo,this.blush);cheek.scale.set(1.6,.8,.5);cheek.position.set(x*1.75,.035,.48);g.add(cheek);
    }
    const beak=new THREE.Mesh(this.beakGeo,this.orange);beak.rotation.set(Math.PI/2,0,-.14);beak.scale.set(1.35,1.1,.8);beak.position.set(.015,.04,.565);g.add(beak);
    for(const x of [-.25,.25]){
      const wing=new THREE.Mesh(this.wingGeo,this.wingMat);wing.scale.set(.6,1.5,.65);wing.position.set(x,-.1,.28);wing.rotation.z=x<0?-.65:.65;g.add(wing);
      const foot=new THREE.Mesh(this.wingGeo,this.orange);foot.scale.set(.8,.35,.65);foot.position.set(x*.46,-.37,.32);g.add(foot);
    }
    for(let i=0;i<3;i++){const tuft=new THREE.Mesh(this.beakGeo,this.wingMat);tuft.position.set(-.055+i*.055,.34+(i===1?.035:0),.33);tuft.rotation.z=.5-i*.35;tuft.scale.set(.65,.9,.55);g.add(tuft);}
    return g;
  }
  start(){
    const boards=bank[this.level-1];let next=Math.floor(Math.random()*boards.length);if(next===this.lastBoard[this.level])next=(next+1)%boards.length;this.lastBoard[this.level]=next;
    this.puzzle=new ChickPuzzle(transformBoard(boards[next],Math.floor(Math.random()*4),Math.random()<.5));this.cursor=0;this.selectGesture.clear();this.mode='playing';this.clock=new PuzzleClock();this.newBest=false;
    try{localStorage.setItem('chick-level',String(this.level));}catch{}
    this.build();this.draw();
  }
  build(){
    for(const child of [...this.root.children])if(child!==this.focus){this.root.remove(child);if(child.userData.disposable)child.geometry.dispose();}
    this.tiles=[];this.chicks=[];this.crosses=[];const n=this.puzzle.size;this.root.scale.setScalar(8.1/n);
    const tray=new THREE.Mesh(new THREE.BoxGeometry(n+.2,n+.2,.3),this.trayMat);tray.position.z=-.2;tray.userData.disposable=true;this.root.add(tray);
    for(let r=0;r<n;r++)for(let c=0;c<n;c++){
      const i=r*n+c,x=c-(n-1)/2,y=(n-1)/2-r,region=this.puzzle.regions[r][c];
      const tile=new THREE.Mesh(this.tileGeo,this.regionMats[region]);tile.position.set(x,y,0);this.root.add(tile);this.tiles.push(tile);
      const chick=this.makeChick();chick.position.set(x,y,.08);this.root.add(chick);this.chicks.push(chick);
      const cross=new THREE.Group();cross.position.set(x,y,.18);
      for(const angle of [-Math.PI/4,Math.PI/4]){const stroke=new THREE.Mesh(this.crossGeo,this.crossMat);stroke.rotation.z=angle;cross.add(stroke);}
      this.root.add(cross);this.crosses.push(cross);
      // Raised dark seams outline regions more strongly than ordinary cell gaps.
      const seam=(horizontal,dx,dy)=>{const mesh=new THREE.Mesh(horizontal?this.borderHorizontal:this.borderVertical,this.borderMat);mesh.position.set(x+dx,y+dy,.095);this.root.add(mesh);};
      if(r===0||this.puzzle.regions[r-1][c]!==region)seam(true,0,.5);
      if(c===0||this.puzzle.regions[r][c-1]!==region)seam(false,-.5,0);
      if(r===n-1)seam(true,0,-.5);
      if(c===n-1)seam(false,.5,0);
    }
    this.sync();
  }
  sync(){if(!this.puzzle)return;const n=this.puzzle.size,bad=this.puzzle.conflicts;
    this.chicks.forEach((chick,i)=>{chick.visible=this.puzzle.cells[i]===1;chick.userData.bad=bad.has(i);});
    this.crosses.forEach((cross,i)=>cross.visible=this.puzzle.cells[i]===2);
    this.focus.position.set(this.cursor%n-(n-1)/2,(n-1)/2-Math.floor(this.cursor/n),.13);
  }
  btn(text,i){return `<button data-action="${i}" class="${this.choice===i?'selected':''}">${text}</button>`;}
  draw(){
    if(!this.active)return;this.needsLayout=true;
    let done={};try{done=JSON.parse(localStorage.getItem('chick-completed')||'{}');}catch{}
    if(this.mode==='difficulty'){
      this.ui.innerHTML=`<section class="chick-picker"><div class="eyebrow">02 / A little logic. A lot of chirp.</div><h1>Chickdoku<span style="color:#ffd84d">.</span></h1><p>A cosy puzzle for a curious mind.<br>One chick per row, column and coloured region.<br>No touching, even at the corners.</p><h2>Choose your difficulty</h2><div class="level-strip ${this.choice===0?'focused':''}">${Array.from({length:10},(_,i)=>`<button data-level="${i+1}" class="${this.level===i+1?'selected':''}">${i+1}${done[i+1]?' ✓':''}</button>`).join('')}</div><p><strong>${LABELS[this.level-1]}</strong> · ${bank[this.level-1][0].regions.length} × ${bank[this.level-1][0].regions.length} board · ${bank[this.level-1][0].givens.length} starter chicks<br>Best time: <strong>${formatTime(this.bestTimes[this.level])}</strong></p><div class="actions">${this.btn('Start puzzle →',1)}${this.btn('Game menu',2)}</div></section><div class="footer"><span>← → Difficulty &nbsp; • &nbsp; ↑ ↓ Choose &nbsp; • &nbsp; Select to start</span><span>DIFFICULTY ${this.level} / 10</span></div>`;
      this.ui.querySelectorAll('[data-level]').forEach(b=>b.onclick=()=>{this.level=Number(b.dataset.level);this.choice=0;this.draw();});
    }else{
      const n=this.puzzle.size,bad=this.puzzle.conflicts;
      this.ui.innerHTML=`<aside class="chick-sidebar"><div class="eyebrow">The chick challenge</div><h2>Chickdoku.</h2><p>Difficulty <strong>${this.level} / 10</strong></p><div class="chick-counter">${this.puzzle.count}<span> / ${n} chicks</span></div><div class="chick-scoreboard"><div>TIME<strong data-stat="time" data-ms="${this.clock.total(this.puzzle.failures)}">${formatTime(this.clock.total(this.puzzle.failures))}</strong></div><div>BEST · LEVEL ${this.level}<strong data-stat="best" data-ms="${this.bestTimes[this.level]??''}">${formatTime(this.bestTimes[this.level])}</strong></div><div>FAILURES<strong data-stat="failures">${this.puzzle.failures}</strong></div></div><p>One chick in every:<br><strong>row · column · region</strong><br><br>Chicks cannot touch,<br>even at the corners.</p><p class="chick-feedback ${this.puzzle.lastFailure!==null?'warning':''}">${this.puzzle.lastFailure!==null?'Oops! Not that spot.<br>+1:00 penalty · try again.':this.puzzle.failures===0?'Perfect run so far!<br>Each failure adds 1 minute.':'Every chick has a place.<br>Keep going!'}</p><p class="muted">Starter chicks stay put.<br>Back opens puzzle actions.<br>Select + arrow twice: cross to edge.</p></aside><div class="chick-grid-overlay" style="--n:${n}">${this.puzzle.cells.map((value,i)=>`<button class="chick-cell ${i===this.cursor?'cursor':''} ${this.puzzle.givens.has(i)?'given':''} ${this.puzzle.lastFailure===i?'conflict':''}" data-cell="${i}" data-region="${this.puzzle.regions[Math.floor(i/n)][i%n]}" aria-label="Row ${Math.floor(i/n)+1}, column ${i%n+1}, region ${String.fromCharCode(65+this.puzzle.regions[Math.floor(i/n)][i%n])}${value===1?', chick':value===2?', crossed out':''}">${this.puzzle.givens.has(i)?'<small>•</small>':''}</button>`).join('')}</div><div class="footer"><span>↑ ↓ ← → Move &nbsp; • &nbsp; Select: cross · Double Select: chick</span><span>Back: puzzle actions</span></div>`;
      this.ui.querySelectorAll('[data-cell]').forEach(b=>b.onclick=()=>{if(this.mode==='playing'){const next=Number(b.dataset.cell);if(next!==this.cursor)this.selectGesture.clear();this.cursor=next;this.place();}});
      if(this.mode==='actions'||this.mode==='won'){
        const won=this.mode==='won',labels=won?['Another puzzle','Choose difficulty','Game menu']:['Resume','Undo last move','Clear board (keep timer)','Choose difficulty','Game menu',this.isMuted()?'Sound: Off':'Sound: On'];
        this.ui.innerHTML+=`<div class="veil"><section class="dialog"><div class="eyebrow">${won?'A perfect little flock':'CHICKDOKU'}</div><h2>${won?'Egg-cellent!':'Puzzle break'}</h2><p>${won?'Time: '+formatTime(this.clock.total(this.puzzle.failures))+' · Failures: '+this.puzzle.failures+(this.newBest?' · NEW BEST TIME!':''):'Your chicks will wait right here.'}</p><div class="chick-action-list">${labels.map((label,i)=>this.btn(label,i)).join('')}</div></section></div>`;
      }
    }
    this.ui.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>{this.choice=Number(b.dataset.action);this.activate();});
  }
  place(){
    if(this.selectGesture.press(this.puzzle,this.cursor,performance.now())){
      if(this.puzzle.cells[this.cursor]===1){this.sound.unlock();this.sound.note(1047,0,.09,{type:'sine',end:1568,gain:.05});this.sound.note(1397,.09,.1,{type:'sine',end:1175,gain:.04});}
      else this.sound.select();
      if(this.puzzle.won){this.clock.pause();this.newBest=recordBestTime(this.bestTimes,this.level,this.clock.total(this.puzzle.failures));try{localStorage.setItem('chick-best-times',JSON.stringify(this.bestTimes));}catch{}this.mode='won';this.choice=0;this.sound.finish(true);try{const completed=JSON.parse(localStorage.getItem('chick-completed')||'{}');completed[this.level]=(completed[this.level]||0)+1;localStorage.setItem('chick-completed',JSON.stringify(completed));}catch{}}
      this.sync();this.draw();
    }
  }
  activate(){
    this.sound.select();
    if(this.mode==='difficulty'){if(this.choice===2)this.close();else this.start();}
    else if(this.mode==='won'){if(this.choice===0)this.start();else if(this.choice===1){this.mode='difficulty';this.choice=0;this.draw();}else this.close();}
    else if(this.mode==='actions'){
      if(this.choice===0)this.mode='playing';
      else if(this.choice===1){this.puzzle.undo();this.mode='playing';this.sync();}
      else if(this.choice===2){this.puzzle.reset();this.mode='playing';this.sync();}
      else if(this.choice===3){this.mode='difficulty';this.choice=0;}
      else if(this.choice===4){this.close();return;}
      else this.onMute();
      if(this.mode==='playing')this.clock.resume();else this.clock?.pause();
      this.draw();
    }
  }
  input(key){
    this.sound.unlock();
    if(key==='back'){this.clock?.pause();this.selectGesture.clear();if(this.mode==='difficulty'){this.close();return;}if(this.mode==='playing'){this.mode='actions';this.choice=0;}else if(this.mode==='actions')this.mode='playing';else{this.mode='difficulty';this.choice=0;}if(this.mode==='playing')this.clock.resume();this.sound.stop();this.draw();return;}
    if(this.mode==='playing'){
      const n=this.puzzle.size;let r=Math.floor(this.cursor/n),c=this.cursor%n;
      if(key==='select'){this.place();return;}
      const line=this.selectGesture.arrow(this.puzzle,this.cursor,key,performance.now());
      if(line){this.cursor=line.cursor;this.sound.select();this.sync();this.draw();return;}
      if(key==='up')r=Math.max(0,r-1);if(key==='down')r=Math.min(n-1,r+1);if(key==='left')c=Math.max(0,c-1);if(key==='right')c=Math.min(n-1,c+1);
      this.cursor=r*n+c;this.sync();this.draw();return;
    }
    if(key==='select'){this.activate();return;}
    if(this.mode==='difficulty'){
      if(key==='left'||key==='right'){if(this.choice===0)this.level=Math.min(10,Math.max(1,this.level+(key==='right'?1:-1)));else this.choice=this.choice===1?2:1;}
      else if(key==='up')this.choice=0;else if(key==='down'&&this.choice===0)this.choice=1;
    }else{const count=this.mode==='won'?3:6;this.choice=moveGridFocus(this.choice,key,count);}
    this.draw();
  }
  suspend(){this.clock?.pause();this.selectGesture.clear();if(this.mode==='playing'){this.mode='actions';this.choice=0;this.draw();}this.sound.suspend();}
  render(renderer,time){
    const timer=this.ui.querySelector('[data-stat="time"]');
    if(timer&&this.clock){const total=this.clock.total(this.puzzle.failures),label=formatTime(total);timer.dataset.ms=String(total);if(timer.textContent!==label)timer.textContent=label;}
    const aspect=innerWidth/innerHeight;this.camera.left=-6*aspect;this.camera.right=6*aspect;this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();this.root.updateMatrixWorld(true);
    const width=innerWidth,height=innerHeight,n=this.puzzle?.size;
    if(n && this.mode==='playing' && (this.needsLayout||this.layoutWidth!==width||this.layoutHeight!==height))this.ui.querySelectorAll('[data-cell]').forEach(cell=>{
      const i=Number(cell.dataset.cell),x=i%n-(n-1)/2,y=(n-1)/2-Math.floor(i/n);
      const points=[[-.5,.5],[.5,.5],[.5,-.5],[-.5,-.5]].map(([dx,dy])=>new THREE.Vector3(x+dx,y+dy,.1).applyMatrix4(this.root.matrixWorld).project(this.camera));
      const xs=points.map(p=>(p.x+1)*width/2),ys=points.map(p=>(1-p.y)*height/2),left=Math.min(...xs),top=Math.min(...ys),w=Math.max(...xs)-left,h=Math.max(...ys)-top;
      Object.assign(cell.style,{left:left+'px',top:top+'px',width:w+'px',height:h+'px',clipPath:'polygon('+xs.map((v,j)=>`${(v-left)/w*100}% ${(ys[j]-top)/h*100}%`).join(',')+')'});
    });
    this.needsLayout=false;this.layoutWidth=width;this.layoutHeight=height;
    this.root.visible=this.mode!=='difficulty';this.focus.visible=this.mode==='playing';
    this.focusHighlight.material.opacity=.88+.12*(.5+.5*Math.sin(time*.004));
    this.chicks.forEach((chick,i)=>{const base=(this.puzzle.size-1)/2-Math.floor(i/this.puzzle.size);chick.position.y=base+(this.mode==='won'?Math.abs(Math.sin(time*.004+i*.4))*.16:0);chick.rotation.z=chick.userData.bad?Math.sin(time*.008)*.14:0;});
    renderer.render(this.scene,this.camera);
  }
}
