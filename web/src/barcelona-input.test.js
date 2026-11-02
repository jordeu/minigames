import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BarcelonaGame} from './barcelona-view.js';
function fixture(){const game=Object.create(BarcelonaGame.prototype);let jumps=0;Object.assign(game,{mode:'game',paused:false,direction:0,focus:0,run:{status:'playing',jump(){jumps++;}},sound:{unlock(){},stop(){},suspend(){},select(){}},draw(){}});return {game,jumps:()=>jumps};}
test('a tap starts running, release and repeated same-direction taps keep it running',()=>{const {game}=fixture();game.input('right');game.keyUp('right');assert.equal(game.direction,1);game.input('right');assert.equal(game.direction,1);});
test('opposite arrow stops before another press starts running in that direction',()=>{const {game}=fixture();game.input('right');game.input('left');assert.equal(game.direction,0);game.input('left');assert.equal(game.direction,-1);game.input('right');assert.equal(game.direction,0);game.input('right');assert.equal(game.direction,1);});
test('jumping preserves the running direction',()=>{const {game,jumps}=fixture();game.input('left');game.input('select');game.keyUp('select');game.input('up');assert.equal(jumps(),2);assert.equal(game.direction,-1);});
test('pause, resume, and Home clear running so it never restarts unexpectedly',()=>{const {game}=fixture();game.input('right');game.input('back');assert.equal(game.direction,0);assert.equal(game.paused,true);game.input('select');assert.equal(game.paused,false);assert.equal(game.direction,0);game.input('left');game.suspend();assert.equal(game.direction,0);assert.equal(game.paused,true);});
