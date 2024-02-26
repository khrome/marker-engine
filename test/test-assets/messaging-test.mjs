 import {
    Clock,
    Raycaster,
    Vector3
} from 'three';
import {
    CBOR
} from '../../src/CBOR.mjs';
import {
    Marker
} from '../../src/marker.mjs';
//*
import {
    Submesh
} from '../../src/submesh.mjs'; //*/
import { 
    World,
    Plane,
    //Trimesh,
    Material,
    Vec3,
    Ray,
    Body
} from '../../src/cannon-es.mjs';
import {
    generateMeshCreationFromVoxelFn
} from '../../src/voxel-mesh.mjs';

import Logger from 'bitwise-logger';

import { allTiles, neighbors, Tile, tileForPos } from '../../src/tiles.mjs';

if(!globalThis.self) globalThis.self = {};

export const messageHandler = async (e)=>{
    const data = JSON.parse(e.data);
    try{
        if(data.type){
            switch(data.type){
                case 'world':
                case 'add-submesh':
                case 'start':
                case 'stop': 
                case 'add-marker':
                case 'move-marker':
                case 'focus':
                case 'marker-action':
                    self.postMessage(JSON.stringify({
                        type: 'world',
                        world: { }
                    }));
            }
        }else{
            console.log('unknown message:', data.type);
        }
    }catch(ex){
        console.log('COMM error', ex);
    }
    //*/
};

try{
    self.onmessage = messageHandler;
}catch(ex){
    console.log('worker startup error', ex)
}
//console.log('WORKER RUNNING')