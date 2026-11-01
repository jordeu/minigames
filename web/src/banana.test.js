import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BananaMatch,createSkyline,launchVelocity,pointOnShot,shotOrigin} from './banana.js';
test('avatar rooftops and building blocks are generated consistently',()=>{const world=createSkyline(()=>.5);assert.equal(world.players.length,2);for(const p of world.players)assert.ok(world.blocks.some(b=>Math.abs(b.x-p.x)<1&&b.y===p.y-1));});
test('mirrored players have mirrored shots and wind changes the arc',()=>{const a=launchVelocity(45,60,0),b=launchVelocity(45,60,1);assert.equal(a.x,-b.x);assert.equal(a.y,b.y);const p=pointOnShot({x:0,y:0},a,0,1),q=pointOnShot({x:0,y:0},a,2,1);assert.equal(q.x-p.x,1);assert.equal(q.y,p.y);});
test('controls clamp angle/power and prevent firing twice',()=>{const m=new BananaMatch();for(let i=0;i<200;i++){m.adjust('up');m.adjust('right');}assert.deepEqual(m.aims[0],{angle:85,power:100});assert.equal(m.fire(),true);assert.equal(m.fire(),false);m.adjust('down');assert.equal(m.aims[0].angle,85);});
test('impact destroys nearby building voxels and misses alternate turns',()=>{const m=new BananaMatch({random:()=>.5}),block=m.blocks[0];const result=m.impact(block,'building');assert.ok(result.destroyed.length);assert.equal(block.alive,false);assert.equal(m.nextTurn(),true);assert.equal(m.turn,1);});
test('direct hit wins a round, self-hit awards opponent, and first to target wins',()=>{const m=new BananaMatch({random:()=>.5,target:3});m.impact(m.players[1],'splat',1);assert.equal(m.phase,'round');assert.deepEqual(m.wins,[1,0]);m.nextRound();assert.equal(m.turn,1);m.impact(m.players[1],'splat',1);m.nextRound();m.impact(m.players[1],'splat',1);assert.equal(m.phase,'match');assert.deepEqual(m.wins,[3,0]);});
test('flight collision cannot tunnel through the opposing avatar',()=>{const m=new BananaMatch({random:()=>.5});m.blocks=[];m.wind=0;m.fire();m.shot.origin={x:m.players[1].x-3,y:m.players[1].y+3};m.shot.velocity={x:200,y:0};m.shot.time=.1; // Set origin so the next fixed sample reaches the target.
  m.shot.origin.x=m.players[1].x-200*.116;
  const result=m.advance(.05);assert.equal(result?.hit,1);assert.equal(m.phase,'round');});
test('equal simulated time produces the same flight at different frame rates',()=>{const a=new BananaMatch({random:()=>.5}),b=new BananaMatch({random:()=>.5});a.fire();b.fire();for(let i=0;i<60;i++)a.advance(1/60);for(let i=0;i<30;i++)b.advance(1/30);assert.ok(Math.abs(a.shot.position.x-b.shot.position.x)<.001);assert.ok(Math.abs(a.shot.position.y-b.shot.position.y)<.001);});
test('rooftop origin is outside shooter hitbox and points toward opponent',()=>{const world=createSkyline(()=>.5);assert.ok(shotOrigin(world.players[0],0).x>world.players[0].x+1.65);assert.ok(shotOrigin(world.players[1],1).x<world.players[1].x-1.65);});

test('every skyline blocks the old easy default arc from both sides',()=>{
  for(let seed=1;seed<=30;seed++){
    let value=seed;const random=()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};
    const m=new BananaMatch({random});
    for(let side=0;side<2;side++){
      m.turn=side;m.phase='aim';m.blocks.forEach(b=>b.alive=true);m.fire();for(let t=0;t<12&&m.phase==='flight';t+=1/60)m.advance(1/60);
      assert.equal(m.result.type,'building',`seed ${seed}, side ${side}`);
    }
  }
});
test('birds steal a banana and cost a turn without awarding points or damaging buildings',()=>{
  const m=new BananaMatch({random:()=>.5});m.birds=[{id:0,start:42,height:60,speed:0,phase:0,stolenUntil:0}];m.fire();m.shot.origin={x:50,y:60};m.shot.velocity={x:0,y:0};
  const result=m.advance(1/60);assert.equal(result.type,'bird');assert.equal(m.phase,'turn');assert.deepEqual(m.wins,[0,0]);assert.deepEqual(result.destroyed,[]);assert.equal(result.bird,0);assert.ok(m.birds[0].stolenUntil>m.worldTime);assert.equal(m.nextTurn(),true);
});
test('birds move during aiming and wind stays fixed throughout a throw',()=>{
  const m=new BananaMatch({random:()=>.5}),before=m.birdPosition(m.birds[0]);m.advance(.2);assert.notDeepEqual(m.birdPosition(m.birds[0]),before);const wind=m.wind;m.fire();for(let i=0;i<10;i++)m.advance(.05);assert.equal(m.wind,wind);
});

test('hard skylines still offer a clearing arc for both players across 30 layouts',()=>{
for(let seed=1;seed<=30;seed++){
let rng=seed;const random=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};const s=new BananaMatch({random});
for(let side=0;side<2;side++){
const origin=shotOrigin(s.players[side],side),target=s.players[1-side];let hit=null;
outer:for(let angle=55;angle<=80;angle++)for(let power=60;power<=100;power+=2){
const v=launchVelocity(angle,power,side),dx=target.x-origin.x,d=v.x*v.x+2*s.wind*dx,times=d<0?[]:[(-v.x+Math.sqrt(d))/s.wind,(-v.x-Math.sqrt(d))/s.wind];if(!times.some(t=>t>.1&&t<12&&pointOnShot(origin,v,s.wind,t).y>target.y-2&&pointOnShot(origin,v,s.wind,t).y<target.y+10))continue;
const m=new BananaMatch({random:()=>.5});Object.assign(m,{players:s.players,blocks:s.blocks.map(b=>({...b})),turn:side,wind:s.wind,birds:[]});m.aims[side]={angle,power};m.fire();for(let t=0;t<12&&m.phase==='flight';t+=1/60)m.advance(1/60);if(m.result?.hit===1-side){hit={angle,power};break outer;}
}
assert.ok(hit,`no clearing arc for seed ${seed}, side ${side}, wind ${s.wind}`);
}}
});
