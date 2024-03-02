/* global describe:false */
import { chai } from '@environment-safe/chai';
import { it } from '@open-automaton/moka';
import { MarkerEngine, Marker } from '../src/index.mjs';
import { Worker } from '@environment-safe/esm-worker';
import { shiftTiles } from '../src/tiles.mjs';
const should = chai.should();

describe('marker-engine', ()=>{
    describe.skip('performs a simple test suite', ()=>{
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
            const engine = new MarkerEngine({});
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
        it('marker refreshes a known state with submeshes', async ()=>{
            const engine = new MarkerEngine({
                voxelFile: '../test/demo/layered-perlin-mesh.mjs',
                markerTypesFile: '../src/default-markers.mjs'
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
        
        it('marker refreshes a known state with submeshes @ 5, 5 ', async ()=>{
            const engine = new MarkerEngine({
                voxelFile: '../test/demo/layered-perlin-mesh.mjs',
                markerTypesFile: '../src/default-markers.mjs',
                x: 5,
                y: 5
            });
            await engine.initialize();
            const marker = new Marker({
                id : 'foo',
                position: {
                    x: 10,
                    y: 10,
                    z: 0
                }
            });
            engine.addMarker(marker);
            engine.start();
            should.exist({});
            let stateCount = 0;
            const states = [];
            let startCheckHasRun = false;
            const checkStart = (handler)=>{
                if(!startCheckHasRun) handler;
                startCheckHasRun = true;
            }
            await new Promise((resolve)=>{
                engine.on('load', ()=>{
                    engine.on('state', (data)=>{
                        const worldPosition = engine.worldPositionFor(data.markers[0].position);
                        checkStart(()=>{
                            worldPosition.x.should.equal(90);
                            worldPosition.y.should.equal(90);
                        });
                        console.log(
                            'WP', 
                            data.markers[0].position,
                            worldPosition, 
                            engine.submeshes.current.worldX, 
                            engine.submeshes.current.worldY
                        );
                        states.push(data);
                        stateCount++;
                        if(stateCount > 10) resolve();
                    });
                    marker.action('moveTo', {}, { x: 100, y: 100, z:0 })
                });
            });
            engine.stop();
            engine.cleanup();
        });
    });
    describe('basic shifting validation', ()=>{
        it('shifts northeast', async ()=>{
            const submeshes  = {
                current : 'foo',
                north : 'bar',
                south : 'baz',
                east : 'bat',
                west : 'qux',
                northeast : 'quux',
                northwest : 'corge',
                southeast : 'grault',
                southwest : 'garply'
                // where's waldo?
            };
            const deleted = [];
            const mutatedSubmeshes = await shiftTiles(submeshes, {
                horizontal: 1,
                vertical: 1
            }, (submesh, direction)=>{ //shiftFn
                //noop
            }, (tile, location)=>{ //loadFn
                return '*';
            }, (submesh)=>{ //removeFn
                deleted.push(submesh)
            });
            mutatedSubmeshes.current.should.equal(submeshes.northeast);
            
            mutatedSubmeshes.north.should.equal('*');
            mutatedSubmeshes.south.should.equal(submeshes.east);
            mutatedSubmeshes.east.should.equal('*');
            mutatedSubmeshes.west.should.equal(submeshes.north);
            
            mutatedSubmeshes.northeast.should.equal('*');
            mutatedSubmeshes.northwest.should.equal('*');
            mutatedSubmeshes.southeast.should.equal('*');
            mutatedSubmeshes.southwest.should.equal(submeshes.current);
            
            // corge | bar quux
            // qux   | foo bat
            //       +----------
            // garply baz grault
            deleted.should.deep.equal([ 'baz', 'qux', 'corge', 'grault', 'garply' ]);
            console.log(mutatedSubmeshes, deleted);
        });
        
        it('shifts southwest', async ()=>{
            const submeshes  = {
                current : 'foo',
                north : 'bar',
                south : 'baz',
                east : 'bat',
                west : 'qux',
                northeast : 'quux',
                northwest : 'corge',
                southeast : 'grault',
                southwest : 'garply'
                // where's waldo?
            };
            const deleted = [];
            const mutatedSubmeshes = await shiftTiles(submeshes, {
                horizontal: -1,
                vertical: -1
            }, (submesh, direction)=>{ //shiftFn
                //noop
            }, (tile, location)=>{ //loadFn
                console.log('tile', tile);
                return '*';
            }, (submesh)=>{ //removeFn
                deleted.push(submesh)
            });
            mutatedSubmeshes.current.should.equal(submeshes.southwest);
            
            mutatedSubmeshes.north.should.equal(submeshes.west);
            mutatedSubmeshes.south.should.equal('*');
            mutatedSubmeshes.east.should.equal(submeshes.south);
            mutatedSubmeshes.west.should.equal('*');
            
            mutatedSubmeshes.northeast.should.equal(submeshes.current);
            mutatedSubmeshes.northwest.should.equal('*');
            mutatedSubmeshes.southeast.should.equal('*');
            mutatedSubmeshes.southwest.should.equal('*');
            
            // corge  bar   quux
            // -----------+
            // qux    foo | bat
            // garply baz | grault
            deleted.should.deep.equal([ 'bar', 'bat', 'quux', 'corge', 'grault' ]);
            console.log(mutatedSubmeshes, deleted);
        });
    });
});

