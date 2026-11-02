// Original Barcelona platformer: deterministic level and fixed-step physics.
export const HEROES=[
  {id:'jordi',name:'Jordi',image:'./avatars/jordi.png',color:0x303c54,hair:0x634c3b},
  {id:'anna',name:'Anna',image:'./avatars/anna.png',color:0x139da8,hair:0x795534},
  {id:'guim',name:'Guim',image:'./avatars/guim.png',color:0x246ddb,hair:0xc49a57},
];
export function createLevel(){
  const platforms=[{x:0,y:0,w:32},{x:36,y:0,w:30},{x:71,y:0,w:34},{x:110,y:0,w:33},{x:148,y:0,w:34},{x:187,y:0,w:30}];
  for(const [x,y,w] of [[12,2.4,4],[21,4.3,4],[39,2.5,5],[50,4.5,5],[62,2.2,5],[77,2.7,5],[88,4.7,5],[99,2.4,5],[117,2.5,5],[128,4.5,6],[139,2.3,5],[154,2.6,5],[165,4.7,6],[177,2.3,5],[195,2.4,5],[204,4.5,5]])platforms.push({x,y,w});
  const coins=platforms.filter(p=>p.y>0).flatMap(p=>[1,2,3].map(n=>({x:p.x+p.w*n/4,y:p.y+1.4,taken:false})));
  const enemies=[25,45,81,97,120,137,158,178,199].map(x=>({x,start:x-2,end:x+2,y:0,dir:1,alive:true}));
  return {platforms,coins,enemies,finish:212};
}
export class BarcelonaRun {
  constructor(){this.reset();}
  reset(){Object.assign(this,createLevel());this.player={x:3,y:0,vx:0,vy:0,grounded:true,facing:1};this.lives=3;this.collected=0;this.checkpoint=3;this.time=0;this.invincible=0;this.status='playing';this.accumulator=0;this.events=[];this.jumpBuffer=0;this.coyote=.1;}
  jump(){if(this.status==='playing')this.jumpBuffer=.14;}
  hurt(){if(this.invincible>0||this.status!=='playing')return;this.lives--;this.events.push('hurt');if(this.lives<=0){this.status='over';return;}Object.assign(this.player,{x:this.checkpoint,y:2,vx:0,vy:0,grounded:false});this.invincible=2;this.jumpBuffer=0;}
  advance(dt,direction=0){if(this.status!=='playing')return;this.accumulator+=Math.min(dt,.1);while(this.accumulator>=1/120&&this.status==='playing'){this.step(1/120,direction);this.accumulator-=1/120;}}
  step(dt,direction){
    const p=this.player;this.time+=dt;this.invincible=Math.max(0,this.invincible-dt);this.jumpBuffer=Math.max(0,this.jumpBuffer-dt);this.coyote=p.grounded?.1:Math.max(0,this.coyote-dt);
    if(this.jumpBuffer>0&&this.coyote>0){p.vy=13.2;p.grounded=false;this.coyote=0;this.jumpBuffer=0;this.events.push('jump');}
    p.vx=direction*6.8;if(direction)p.facing=direction;
    const previous=p.y;p.x=Math.max(.5,Math.min(this.finish+.5,p.x+p.vx*dt));p.vy-=25*dt;p.y+=p.vy*dt;p.grounded=false;
    if(p.vy<=0){let top=-Infinity;for(const block of this.platforms)if(p.x+.35>block.x&&p.x-.35<block.x+block.w&&previous>=block.y-.02&&p.y<=block.y)top=Math.max(top,block.y);if(top>-Infinity){p.y=top;p.vy=0;p.grounded=true;}}
    if(p.x>=112&&this.checkpoint<112){this.checkpoint=113;this.events.push('checkpoint');}
    if(p.y< -6){this.invincible=0;this.hurt();return;}
    for(const coin of this.coins)if(!coin.taken&&Math.hypot(p.x-coin.x,p.y+1-coin.y)<.9){coin.taken=true;this.collected++;this.events.push('coin');}
    for(const enemy of this.enemies){if(!enemy.alive)continue;enemy.x+=enemy.dir*1.1*dt;if(enemy.x>enemy.end){enemy.x=enemy.end;enemy.dir=-1;}if(enemy.x<enemy.start){enemy.x=enemy.start;enemy.dir=1;}
      if(Math.abs(p.x-enemy.x)<.8&&p.y<.9&&p.y>-.5){if(p.vy< -1&&previous>.65){enemy.alive=false;p.vy=7;this.events.push('stomp');}else this.hurt();}}
    if(p.x>=this.finish){this.status='won';this.events.push('win');}
  }
}
