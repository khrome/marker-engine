 import {
    Clock,
    Raycaster,
    Vector3
} from '../node_modules/three/build/three.module.js';
import {
    CBOR
} from './CBOR.mjs';
import {
    Marker
} from './marker.mjs';
import { 
    World,
    Plane,
    //Trimesh,
    Material,
    Vec3,
    Body
} from './cannon-es.mjs';

import { allTiles } from './tiles.mjs';

//const self = {};

export const messageHandler = (e)=>{
    const data = JSON.parse(e.data);
    if(data.type){
        switch(data.type){
            case 'world': //incoming world definition
                console.log('WORLD', data)
                self.world = data.world;
                self.physicalWorld = new World({
                    gravity: new Vec3(0, 0, -9.81)
                });
                self.onlyReturnDirtyObjects = data.world.onlyReturnDirtyObjects;
                if(data.markerTypes){
                    
                }
                allTiles((tile)=>{
                    console.log('TILE', tile);
                    self.addSubmesh({
                        tileX: tile.x,
                        tileY: tile.y,
                    });
                });
                break;
            case 'submesh': //incoming submesh definition
                self.addSubmesh(data.submesh);
                break;
            case 'start': //incoming start execution loop
                console.log('START')
                self.start();
                break;
            case 'stop': //incoming stop execution loop after next turn
                self.stop();
                break;
            case 'add-marker':
                console.log('+', data.marker)
                const marker = new Marker(data.marker);
                self.addMarker(marker);
                break;
            case 'move-marker':
                break;
            case 'marker-action': 
                const action = data.action;
                const subject = self.markers.find((marker)=> marker.id == action.id );
                subject.action(action.name, action.options, action.target);
                console.log(`object for id: ${data.action.id}`, subject, action);
                
        }
    }
    //*/
};

export const workerStateSetup = ()=>{
    self.markers = [];
    self.addSubmesh = (submeshData)=>{
        if(submeshData.tileX && submeshData.tileY){
            
        }
        const physicalGroundMaterial = new Material();
        const physicsMesh = new Body({
            shape: new Plane(),
            //new CANNON.Trimesh(submesh.coords, submesh.coords.map((item, index)=>index)),
            type: Body.STATIC,
            material: physicalGroundMaterial
            //mass:5
        });
    };
    self.addMarker = (markerData)=>{
        //todo: look up against class index
        const marker = new Marker(markerData);
        self.markers.push(marker);
        const physicsBody = marker.body();
        marker.mesh = physicsBody;
        marker.mesh.position.x = marker.position.x;
        marker.mesh.position.y = marker.position.y;
        marker.mesh.position.z = marker.position.z;
        marker.mesh.quaternion.x = marker.quaternion.x;
        marker.mesh.quaternion.y = marker.quaternion.y;
        marker.mesh.quaternion.z = marker.quaternion.z;
        marker.mesh.quaternion.w = marker.quaternion.w;
        marker.normalizeMesh();
        //console.log('MESH', marker.mesh);
        //self.physicalWorld.addBody(physicsBody);
        console.log('markerAdd')
    };
    const evaluateTurn = (delta)=>{
        // physics tick
        self.physicalWorld.step(delta);
        // marker actions
        try{
            let lcv=null;
            for(lcv=0; lcv < self.markers.length; lcv++){
                self.markers[lcv].act(delta);
                //console.log('MESH ON ACT', self.markers[lcv].mesh);
            }
        }catch(ex){
            console.log("ERR", ex)
        }
        // treadmill check + optional update
    };
    const markerStates = ()=>{
        const markers = [];
        let marker = null;
        for(let lcv=0; lcv < self.markers.length; lcv++){
            marker = self.markers[lcv];
            const markerReturn = (
                self.onlyReturnDirtyObjects === false ||
                marker.dirty
            )?true:false;
            //console.log('??', markerReturn, self.onlyReturnDirtyObjects, marker.dirty)
            if(markerReturn){
                markers.push(marker.data());
                marker.dirty = false;
            }
        }
        //console.log('??', markers)
        return {
            markers
        };
    };
    self.start = ()=>{
        if(!self.world) throw new Error('must set world to start');
        if(!self.clock) self.clock = new Clock();
        let currentState = null;
        self.running = true;
        self.clock.start();
        let delta = null;
        const interval = 0;
        const main = ()=>{
            try{
                delta = clock.getDelta();
                delta = 0.00005;
                evaluateTurn(delta);
                currentState = markerStates();
                if(currentState.markers.length){
                    self.postMessage(JSON.stringify({
                        type:'state', 
                        state: currentState
                    }));
                }
                if(self.running) setTimeout(main, interval);
            }catch(ex){
                console.log('MAIN LOOP EX', ex);
            }
        }
        //yielding
        setTimeout(main, interval);
    };
    self.stop = ()=>{
        self.running = false;
        self.clock.stop();
    };
}
try{
    workerStateSetup();
    self.onmessage = messageHandler;
}catch(ex){
    console.log('worker startup error', ex)
}
console.log('WORKER RUNNING')