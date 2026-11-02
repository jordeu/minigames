import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Seeded, bundled surface textures: no downloads during play.
export function surfaceTexture(kind){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const c=canvas.getContext('2d');let seed=751;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  c.fillStyle=kind==='paving'?'#b7b4a9':kind==='brick'?'#aa7962':'#c4bbae';c.fillRect(0,0,512,512);
  const data=c.getImageData(0,0,512,512);for(let i=0;i<data.data.length;i+=4){const n=(random()-.5)*32;for(let k=0;k<3;k++)data.data[i+k]+=n;}c.putImageData(data,0,0);
  const row=kind==='brick'?32:64,col=kind==='brick'?96:64;
  for(let y=0;y<512;y+=row)for(let x=-col;x<512;x+=col){const xx=x+((y/row)%2)*col/2;c.strokeStyle='#645e5355';c.lineWidth=2;c.strokeRect(xx,y,col,row);c.strokeStyle='#ffffff33';c.lineWidth=1;c.strokeRect(xx+2,y+2,col-4,row-4);c.fillStyle=`rgba(255,255,255,${random()*.09})`;c.fillRect(xx+3,y+3,col-6,row-6);
    if(kind==='paving'){// Barcelona's flower panot relief.
      c.strokeStyle='#57574c55';c.lineWidth=1.8;for(let j=0;j<4;j++){const a=j*Math.PI/2;c.beginPath();c.arc(xx+32+Math.cos(a)*9,y+32+Math.sin(a)*9,10,0,Math.PI*2);c.stroke();}c.beginPath();c.arc(xx+32,y+32,6,0,Math.PI*2);c.stroke();}
  }
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return t;
}
export function texturedMaterial(color,map){return new THREE.MeshStandardMaterial({color,map,roughness:.92});}
export function texturedBox(parent,x,y,z,w,h,d,material){const g=new THREE.BoxGeometry(w,h,d),uv=g.attributes.uv;for(let i=0;i<uv.count;i++){const face=Math.floor(i/4),uw=face<2?d:w,vh=face===2||face===3?d:h;uv.setXY(i,uv.getX(i)*uw/5,uv.getY(i)*vh/5);};const m=new THREE.Mesh(g,material);m.position.set(x,y,z);m.receiveShadow=true;m.castShadow=true;parent.add(m);return m;}
export function batchStatic(group,castShadow=false){
  group.updateMatrixWorld(true);const buckets=new Map();
  for(const m of [...group.children]){
    if(!m.isMesh||Array.isArray(m.material))continue;
    let g=m.geometry.clone();g.applyMatrix4(m.matrix);if(g.index){const indexed=g;g=g.toNonIndexed();indexed.dispose();}
    g.computeBoundingBox();const cell=Math.floor((g.boundingBox.min.x+g.boundingBox.max.x)/48),key=m.material.uuid+':'+cell;
    if(!buckets.has(key))buckets.set(key,{material:m.material,parts:[]});buckets.get(key).parts.push(g);group.remove(m);
  }
  for(const {material,parts} of buckets.values()){
    const geometry=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());if(!geometry)continue;
    const mesh=new THREE.Mesh(geometry,material);mesh.receiveShadow=true;mesh.castShadow=castShadow;group.add(mesh);
  }
}
export function detailedCity(game){
  const {city}=game;city.clear();const stone=surfaceTexture('stone'),brick=surfaceTexture('brick');game.pavingTexture=surfaceTexture('paving');game.stoneTexture=stone;
  game.groundMaterial=texturedMaterial(0xc9bea9,stone);game.pavementMaterial=texturedMaterial(0xd2c9b8,game.pavingTexture);game.pavementMaterial.bumpMap=game.pavingTexture;game.pavementMaterial.bumpScale=.035;
  const iron=0x303b3d,trim=0xe2d8c6;
  const glass=new THREE.MeshStandardMaterial({color:0x344b54,metalness:.45,roughness:.22});
  // Quiet, deep blue Mediterranean rather than a flat cyan backdrop.
  const sea=new THREE.Mesh(new THREE.PlaneGeometry(310,100),new THREE.MeshStandardMaterial({color:0x447f97,roughness:.28,metalness:.45}));sea.rotation.x=-Math.PI/2;sea.position.set(105,-3,-28);city.add(sea);
  for(let i=0;i<29;i++){
    const x=i*9-12,h=5.7+i%4*.7,z=-18-i%3*2,w=7.8,color=[0xd7c1a8,0xd5bcaa,0xc8bfb1,0xd2c7b5,0xbfaa99][i%5];
    texturedBox(city,x,h/2-.8,z,w,h,5,texturedMaterial(color,stone));
    for(const y of [h-.8,h-1.05,.05])game.box(city,x,y,z,w+.4,.17,5.4,trim);
    for(let row=0;row<3;row++)for(let col=0;col<3;col++){
      const wx=x-2.45+col*2.45,wy=.65+row*1.9;if(wy+1.4>h-.7)continue;
      game.box(city,wx,wy+.5,z+2.53,1.25,1.65,.14,trim);
      const window=game.box(city,wx,wy+.5,z+2.63,.86,1.32,.04,0x344b54);window.material=glass;
      game.box(city,wx,wy+.5,z+2.68,.045,1.3,.04,trim);game.box(city,wx,wy+.4,z+2.69,.86,.045,.04,trim);
      for(const sign of [-1,1]){game.box(city,wx+sign*.54,wy+.5,z+2.68,.22,1.4,.1,0x5b6a61);for(let j=0;j<6;j++)game.box(city,wx+sign*.54,wy+j*.2,z+2.75,.23,.025,.03,0x889082);}
      game.box(city,wx,wy-.27,z+2.92,1.6,.13,.85,trim);game.box(city,wx,wy+.25,z+3.3,1.6,.055,.06,iron);
      for(let j=0;j<8;j++)game.box(city,wx-.72+j*.205,wy-.02,z+3.3,.035,.54,.04,iron);
      for(const sign of [-1,1])game.box(city,wx+sign*.76,wy+.25,z+2.95,.04,.045,.7,iron);
      if((i+col+row)%4===0){game.box(city,wx,wy-.15,z+3.04,.7,.2,.28,0x8f674e);for(let j=0;j<3;j++){game.ball(city,wx-.23+j*.23,wy+.03,z+3.03,.22,.2,.18,0x526d42);game.ball(city,wx-.2+j*.2,wy+.19,z+3.14,.065,.06,.065,0xb84f54);}}
    }
    for(let j=0;j<6;j++)game.box(city,x-3.3+j*1.3,h-.47,z+2.6,.12,.6,.12,trim);
    game.box(city,x,h-.17,z+2.6,w,.12,.16,trim);
    // Rooftop chimneys and terracotta caps.
    game.box(city,x+2,h-.2,z-1,.6,1.3,.7,0x9c8777);game.box(city,x+2,h+.49,z-1,.8,.12,.9,trim);
  }
  // Tapering, ribbed basilica towers with openings and mosaic finials.
  for(const base of [20,86,151]){
    const sandstone=texturedMaterial(0xc3b59d,stone);texturedBox(city,base,1.4,-38,13,2.8,5,sandstone);
    for(let i=0;i<6;i++){
      const x=base+(i-2.5)*1.9,h=8.2+(2.5-Math.abs(i-2.5))*1.2;
      const tower=new THREE.Mesh(new THREE.CylinderGeometry(.28,.67,h,12),sandstone);tower.position.set(x,h/2,-36);city.add(tower);
      for(let j=0;j<5;j++){game.box(city,x,h-1-j*.85,-35.5,.18,.55,.05,0x5c6058);for(const s of [-1,1])game.box(city,x+s*.31,h-1-j*.85,-35.48,.08,.68,.07,0xc5b89d);}
      const tip=new THREE.Mesh(new THREE.ConeGeometry(.4,1.6,8),sandstone);tip.position.set(x,h+.7,-36);city.add(tip);game.ball(city,x,h+1.6,-36,.3,.35,.3,0xb49d65);
    }
    const star=new THREE.Mesh(new THREE.OctahedronGeometry(.65),new THREE.MeshStandardMaterial({color:0xe6dfc0,metalness:.7,roughness:.2}));star.position.set(base,14,-36);city.add(star);
  }
  // Brick triumphal arch, with a curved opening, mouldings and decorative frieze.
  const archMat=texturedMaterial(0xc49a83,brick);
  for(const x of [209,215]){texturedBox(city,x,3,-7,2.1,6,3,archMat);game.box(city,x,.2,-7,2.6,.4,3.6,trim);game.box(city,x,5.9,-7,2.7,.3,3.5,trim);}
  const arch=new THREE.Shape();arch.absarc(0,0,4.05,0,Math.PI,false);arch.lineTo(-2,0);arch.absarc(0,0,2,Math.PI,0,true);arch.closePath();
  const curved=new THREE.Mesh(new THREE.ExtrudeGeometry(arch,{depth:3,bevelEnabled:false,curveSegments:24}),archMat);curved.position.set(212,4.6,-8.5);city.add(curved);
  game.box(city,212,8.8,-7,9.3,.9,3.5,0xc4b29c);for(let i=0;i<13;i++)game.box(city,208+i*.65,8.8,-5.2,.22,.45,.12,0x958573);game.box(city,212,9.4,-7,9.7,.22,3.8,trim);
  // Palm fronds have individual hanging leaflets and fibrous trunks.
  const leafmat=game.material(0x4b6951);
  for(let i=0;i<23;i++){
    const x=i*10+2,z=-7,h=4.7+(i%3)*.4;
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.12,.2,h,8),texturedMaterial(0x938370,stone));trunk.position.set(x,h/2,z);city.add(trunk);
    for(let j=0;j<7;j++){
      const a=j*Math.PI*2/7;const curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(x,h,z),new THREE.Vector3(x+Math.cos(a)*1.2,h+.8,z+Math.sin(a)*1.2),new THREE.Vector3(x+Math.cos(a)*2.1,h-.7,z+Math.sin(a)*2.1));
      city.add(new THREE.Mesh(new THREE.TubeGeometry(curve,8,.035,3,false),leafmat));
      for(let k=1;k<7;k++){const p=curve.getPoint(k/7);for(const side of [-1,1]){const leaflet=game.box(city,p.x,p.y-.13,p.z,.07,.6,.1,0x4b6951);leaflet.rotation.z=side*.6;leaflet.rotation.y=a;}}
    }
    // Cast-iron boulevard lamps and wooden benches.
    const lx=x+4;game.box(city,lx,1.9,-4,.07,3.8,.07,iron);game.box(city,lx,3.8,-4,.8,.08,.12,iron);game.ball(city,lx+.35,3.7,-4,.2,.12,.2,0xdfd9b6);
    for(let j=0;j<4;j++){game.box(city,x+.4,.55,-4+j*.13,1.8,.07,.1,0x89725c);game.box(city,x+.4,.9+j*.12,-4.1,1.8,.08,.08,0x89725c);}for(const s of [-1,1])game.box(city,x+.4+s*.65,.25,-3.8,.08,.5,.55,iron);
  }
  batchStatic(city);
}
