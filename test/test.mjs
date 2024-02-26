/* global describe:false */
import { chai } from '@environment-safe/chai';
import { it } from '@open-automaton/moka';
import { MarkerEngine, Marker } from '../src/index.mjs';
import { Worker } from '@environment-safe/esm-worker';
const should = chai.should();

describe('module', ()=>{
    describe('performs a simple test suite', ()=>{
        it('worker is working in test mode', async ()=>{
            const worker = new Worker('./test-assets/worker-test.mjs', {
                inheritMap: true, 
                root: import.meta.url,
                type:'module'
            });
            await new Promise((resolve, reject)=>{
                worker.onmessage = (e)=>{
                    resolve();
                }
                worker.postMessage(JSON.stringify({
                    type: 'world'
                }));
            });
            worker.terminate();
        });
        it('worker runs without client', async ()=>{
            const worker = new Worker('./test-assets/messaging-test.mjs', {
                inheritMap: true, 
                root: import.meta.url,
                type:'module'
            });
            await new Promise((resolve, reject)=>{
                worker.onmessage = (e)=>{
                    resolve();
                }
                worker.postMessage(JSON.stringify({
                    type: 'world',
                    world: {
                        
                    }
                }));
            });
            worker.terminate();
        });
        it('marker refreshes a known state', async ()=>{
            const engine = new MarkerEngine({
                //onlyReturnDirtyObjects: false
                //debug:true
            });
            await engine.initialize();
            const marker = new Marker({
                id : 'foo',
                position: {
                    x: 0,
                    y: 0,
                    z: 0
                }
            });
            engine.addMarker(marker);
            engine.start();
            should.exist({});
            let stateCount = 0;
            const states = [];
            marker.action('moveTo', {}, { x: 10, y: 10, z:0 })
            await new Promise((resolve)=>{
                engine.on('state', (data)=>{
                    //console.log('update', data.markers[0]);
                    states.push(data);
                    stateCount++;
                    if(stateCount > 1) resolve();
                });
            });
            engine.stop();
            engine.cleanup();
        });
        /*
        it('loads', async ()=>{
            const engine = new MarkerEngine();
            await engine.initialize();
            const marker = new Marker({
                id : 'foo',
                position: {
                    x: 0,
                    y: 0,
                    z: 0
                }
            });
            engine.addMarker(marker);
            engine.start();
            marker.action('moveTo', {}, {x: 10, y: 10, z: 0});
            should.exist({});
            let stateCount = 0;
            const states = [];
            await new Promise((resolve)=>{
                engine.on('state', (data)=>{
                    console.log('update', data.markers);
                    states.push(data);
                    stateCount++;
                    if(stateCount > 10000) resolve();
                });
            });
            engine.stop();
            engine.cleanup();
        }); //*/
    });
});

