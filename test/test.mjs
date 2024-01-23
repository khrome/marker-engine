/* global describe:false */
import { chai } from '@environment-safe/chai';
import { it } from '@open-automaton/moka';
import { MarkerEngine } from '../src/index.mjs';
const should = chai.should();

describe('module', ()=>{
    describe('performs a simple test suite', ()=>{
        it('loads', async ()=>{
            console.log('1');
            const engine = new MarkerEngine();
            console.log('2');
            await engine.initialize();
            console.log('3');
            engine.start();
            console.log('4');
            should.exist({});
            console.log('5');
            let stateCount = 0;
            console.log('6');
            const states = [];
            console.log('7');
            await new Promise((resolve)=>{
                engine.on('state', (data)=>{
                    states.push(data);
                    stateCount++;
                    if(stateCount > 10) resolve();
                });
            });
            console.log('1');
            engine.stop();
            engine.cleanup();
        });
    });
});

