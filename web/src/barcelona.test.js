import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BarcelonaRun,createLevel} from './barcelona.js';
test('run jumps, lands on raised platforms, and collects coins',()=>{const m=new BarcelonaRun();m.player.x=13;m.jump();for(let i=0;i<120;i++)m.advance(1/120);assert.equal(m.player.y,2.4);assert.ok(m.collected>0);});
test('gaps cost a life and respawn; three falls end the run',()=>{const m=new BarcelonaRun();for(let life=2;life>=0;life--){m.player.x=34;m.player.y=-7;m.advance(1/60);assert.equal(m.lives,life);}assert.equal(m.status,'over');});
test('checkpoint preserves progress after falling',()=>{const m=new BarcelonaRun();m.player.x=114;m.advance(1/60);m.player.y=-7;m.invincible=0;m.advance(1/60);assert.equal(m.player.x,113);});
test('falling on a pigeon bounces; walking into it loses a life',()=>{const m=new BarcelonaRun(),e=m.enemies[0];m.player.x=e.x;m.player.y=.85;m.player.vy=-5;m.advance(.05);assert.equal(e.alive,false);assert.ok(m.player.vy>0);const n=new BarcelonaRun();n.player.x=n.enemies[0].x;n.advance(.02);assert.equal(n.lives,2);});
test('finish freezes the world and all gaps are within jump range',()=>{const m=new BarcelonaRun();m.player.x=212;m.advance(.02);assert.equal(m.status,'won');const t=m.time;m.advance(1);assert.equal(m.time,t);const ground=createLevel().platforms.filter(p=>p.y===0);for(let i=1;i<ground.length;i++)assert.ok(ground[i].x-ground[i-1].x-ground[i-1].w<5.8);});

test('complete level can be cleared with running and timed jumps without losing lives',()=>{
  const m=new BarcelonaRun();for(let i=0;i<120*60&&m.status==='playing';i++){
    const p=m.player,edge=m.platforms.find(b=>b.y===0&&b.x<=p.x&&b.x+b.w>=p.x);
    if(p.grounded&&((edge&&edge.x+edge.w-p.x<1)||m.enemies.some(e=>e.alive&&e.x>p.x&&e.x-p.x<2.2)))m.jump();
    m.advance(1/120,1);
  }
  assert.equal(m.status,'won');assert.equal(m.lives,3);assert.ok(m.collected>0);
});
