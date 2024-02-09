/* global describe:false */
import { chai } from '@environment-safe/chai';
import { it } from '@open-automaton/moka';
import { MarkerEngine, Marker } from '../src/index.mjs';
const should = chai.should();

describe('module', ()=>{
    describe('performs a simple test suite', ()=>{
        it('marker refreshes a known state', async ()=>{
            const engine = new MarkerEngine({
                onlyReturnDirtyObjects: false
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
            console.log('>>', marker.position);
            console.log('=>', marker.quaternion);
            await new Promise((resolve)=>{
                engine.on('state', (data)=>{
                    console.log('update', data.markers[0]);
                    states.push(data);
                    stateCount++;
                    console.log()
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

