/* global describe:false */
import { chai } from '@environment-safe/chai';
import { it } from '@open-automaton/moka';
import { MarkerEngine, Marker } from '../src/index.mjs';
import { Worker } from '@environment-safe/esm-worker';
const should = chai.should();

( async ()=>{
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
    should.exist({});
    let stateCount = 0;
    const states = [];
    await new Promise((resolve)=>{
        console.log('@@@@')
        engine.on('load', (data)=>{
        engine.on('state', (data)=>{
            const worldPosition = engine.worldPositionFor(data.markers[0].position);
            console.log(
                'WP', 
                worldPosition, 
                engine.submeshes.current.worldX, 
                engine.submeshes.current.worldY
            );
            states.push(data);
            stateCount++;
            if(stateCount > 10) resolve();
        });
        engine.start();
        marker.action('moveTo', {}, { x: 20, y: 20, z:0 });
        });
    });
    engine.stop();
    engine.cleanup();
})();