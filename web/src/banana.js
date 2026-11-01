export const WORLD_WIDTH=100;
export const GRAVITY=18;
export const FIXED_STEP=1/120;
export const AVATARS=[
  {id:'jordi',name:'Jordi',image:'./avatars/jordi.png',color:'#ffc96b',description:'The cap. The glasses. The legendary beard.'},
  {id:'anna',name:'Anna',image:'./avatars/anna.png',color:'#6ae0d4',description:'Wavy hair. Cool teal. A very good aim.'},
  {id:'guim',name:'Guim',image:'./avatars/guim.png',color:'#a9b5ff',description:'Blue tee. Big backpack. Banana trouble.'},
];
export function shotOrigin(player,side){return {x:player.x+(side===0?2.4:-2.4),y:player.y+5.2};}
export function launchVelocity(angle,power,side){
  const radians=Math.max(10,Math.min(85,angle))*Math.PI/180,speed=12+Math.max(5,Math.min(100,power))*.4;
  return {x:Math.cos(radians)*speed*(side===0?1:-1),y:Math.sin(radians)*speed};
}
export function pointOnShot(origin,velocity,wind,time){return {x:origin.x+velocity.x*time+.5*wind*time*time,y:origin.y+velocity.y*time-.5*GRAVITY*time*time};}
export function createSkyline(random=Math.random){
  const buildings=[],blocks=[],players=[];
  const roofHeights=[18+Math.floor(random()*4)*2,18+Math.floor(random()*4)*2];
  for(let i=0;i<10;i++){
    // Two tall interior towers and raised neighbours force meaningful high arcs.
    const height=i===1?roofHeights[0]:i===8?roofHeights[1]:i===3?roofHeights[0]+24+Math.floor(random()*2)*2:i===6?roofHeights[1]+24+Math.floor(random()*2)*2:i===2?roofHeights[0]+2+Math.floor(random()*3)*2:i===7?roofHeights[1]+2+Math.floor(random()*3)*2:16+Math.floor(random()*12)*2;
    buildings.push({x:i*10+.4,width:9.2,height,color:i%5});
    for(let c=0;c<5;c++)for(let r=0;r<height/2;r++)blocks.push({x:i*10+c*2+1,y:r*2+1,building:i,alive:true});
    if(i===1||i===8)players.push({x:i*10+5,y:height});
  }
  return {buildings,blocks,players};
}
export class BananaMatch {
  constructor({random=Math.random,target=3}={}){this.random=random;this.target=target;this.wins=[0,0];this.round=0;this.turn=0;this.phase='aim';this.shot=null;this.nextRound();}
  nextRound(){
    const world=createSkyline(this.random);Object.assign(this,world);
    this.round++;this.turn=(this.round-1)%2;this.rollWind();this.worldTime=0;
    this.birds=Array.from({length:3},(_,id)=>({id,start:12+this.random()*72,height:45+id*6+this.random()*2,speed:(5+this.random()*3)*(id%2?1:-1),phase:this.random()*Math.PI*2,stolenUntil:0}));
    this.aims=[{angle:48,power:62},{angle:48,power:62}];this.phase='aim';this.shot=null;this.result=null;this.accumulator=0;
  }
  rollWind(){this.wind=(this.random()<.5?-1:1)*Math.round(8+this.random()*24)/10;}
  birdPosition(bird,time=this.worldTime){return {x:8+((bird.start+bird.speed*time)%84+84)%84,y:bird.height+Math.sin(time*1.3+bird.phase)*1.8};}
  adjust(key){
    if(this.phase!=='aim')return;
    const aim=this.aims[this.turn];
    if(key==='up')aim.angle=Math.min(85,aim.angle+1);if(key==='down')aim.angle=Math.max(10,aim.angle-1);
    if(key==='right')aim.power=Math.min(100,aim.power+2);if(key==='left')aim.power=Math.max(5,aim.power-2);
  }
  preview(){const aim=this.aims[this.turn],origin=shotOrigin(this.players[this.turn],this.turn),velocity=launchVelocity(aim.angle,aim.power,this.turn);
    return Array.from({length:14},(_,i)=>pointOnShot(origin,velocity,this.wind,i*.037));
  }
  fire(){
    if(this.phase!=='aim')return false;
    const {angle,power}=this.aims[this.turn];this.shot={origin:shotOrigin(this.players[this.turn],this.turn),velocity:launchVelocity(angle,power,this.turn),time:0};
    this.shot.position={...this.shot.origin};this.phase='flight';this.result=null;this.accumulator=0;return true;
  }
  impact(point,type,hit=null){
    const destroyed=[];
    for(let i=0;i<this.blocks.length;i++){
      const block=this.blocks[i];
      if(type!=='bird'&&block.alive&&Math.hypot(block.x-point.x,block.y-point.y)<4.2){block.alive=false;destroyed.push(i);}
    }
    let winner=null;
    if(hit!==null){winner=1-hit;this.wins[winner]++;}
    this.phase=winner===null?'turn':this.wins[winner]>=this.target?'match':'round';
    this.result={point:{...point},type,hit,winner,destroyed,shooter:this.turn};return this.result;
  }
  advance(seconds){
    // Rendering never changes the simulation step; small steps prevent tunnelling.
    this.accumulator+=Math.min(Math.max(seconds,0),.25);
    while(this.accumulator>=FIXED_STEP){
      this.accumulator-=FIXED_STEP;this.worldTime+=FIXED_STEP;
      if(this.phase!=='flight')continue;
      this.shot.time+=FIXED_STEP;
      const point=pointOnShot(this.shot.origin,this.shot.velocity,this.wind,this.shot.time);this.shot.position=point;
      for(const bird of this.birds){const p=this.birdPosition(bird);if(Math.hypot(point.x-p.x,point.y-p.y)<1.65){bird.stolenUntil=this.worldTime+2;const result=this.impact(point,'bird');result.bird=bird.id;return result;}}
      if(this.shot.time>.09){for(let i=0;i<2;i++){const p=this.players[i];if(Math.abs(point.x-p.x)<1.65&&point.y>=p.y&&point.y<=p.y+7.5)return this.impact(point,'splat',i);}}
      if(point.y<0||point.x< -12||point.x>WORLD_WIDTH+12||this.shot.time>12)return this.impact(point,'miss');
      const block=this.blocks.find(b=>b.alive&&Math.abs(point.x-b.x)<=1&&Math.abs(point.y-b.y)<=1);
      if(block)return this.impact(point,'building');
    }
    return null;
  }
  nextTurn(){if(this.phase!=='turn')return false;this.turn=1-this.turn;this.rollWind();this.phase='aim';this.shot=null;this.result=null;return true;}
}
