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
//*
import {
    Submesh
} from './submesh.mjs'; //*/
import { 
    World,
    Plane,
    //Trimesh,
    Material,
    Vec3,
    Body
} from './cannon-es.mjs';

import { allTiles, neighbors } from './tiles.mjs';

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
                let submeshData = [];
                let submesh = null;
                allTiles((tile, location)=>{
                    submesh = new Submesh({
                        x: tile.x,
                        y: tile.y,
                        tileX: tile.x,
                        tileY: tile.y,
                    });
                    self.addSubmesh(submesh, location);
                    const data = submesh.data();
                    data.location = location
                    submeshData.push(data);
                });
                self.postMessage(JSON.stringify({
                    type:'submesh-update', 
                    submesh: submeshData
                }));
                break;
            case 'add-submesh': //incoming submesh definition
                //self.addSubmesh(data.submesh);
                break;
            case 'start': //incoming start execution loop
                console.log('START')
                self.start();
                break;
            case 'stop': //incoming stop execution loop after next turn
                self.stop();
                break;
            case 'add-marker':
                const marker = new Marker(data.marker);
                self.addMarker(marker);
                break;
            case 'move-marker':
                break;
            case 'focus':
                const found = self.markers.find((marker)=> marker.id === data.id);
                if(found){
                    self.focusedMarker = found;
                }else{
                    console.log(`could not focus on marker ${data.id}`);
                }
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
    self.submeshes = {};
    self.addSubmesh = (submesh, name)=>{
        const physicsBody = submesh.body();
        self.submeshes[name] = submesh;
        self.physicalWorld.addBody(physicsBody);
        submesh.mesh = physicsBody;
        submesh.mesh.position.x = submesh.x * 16;
        submesh.mesh.position.y = submesh.y * 16;
        submesh.mesh.position.z = 0;
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
        //self.physicalWorld.addBody(physicsBody);
    };
    self.worldPositionFor = (localPosition)=>{
        return {
            x: localPosition.x + self.submeshes.current.worldX*16,
            y: localPosition.y + self.submeshes.current.worldY*16,
            z: 0
        }
    }
    self.localPositionFor = (worldPosition)=>{
        if(!self.submeshes.current){
            return worldPosition;
        }
        return {
            x: worldPosition.x - self.submeshes.current.worldX*16,
            y: worldPosition.y - self.submeshes.current.worldY*16,
            z: 0
        }
    }
    const evaluateTurn = (delta)=>{
        // physics tick
        self.physicalWorld.step(delta);
        // marker actions
        try{
            let lcv=null;
            for(lcv=0; lcv < self.markers.length; lcv++){
                self.markers[lcv].act(delta, self);
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
    
    let xMod = null;
    let yMod = null;
    const transitionTreadmill = (dir)=>{
        console.log('TR', dir)
        xMod = dir.x * 16;
        yMod = dir.y * 16;
        /*if(self.submeshes) self.submeshes.forEach((submesh)=>{
            submesh.mesh.position.x += xMod;
            submesh.mesh.position.y += yMod;
        });*/
        const submeshes = {};
        let newPosition = null;
        let neighborhood = null;
        console.log('1');
        Object.keys(self.submeshes).forEach((key)=>{
            //change position
            self.submeshes[key].mesh.position.x += dir.x*16;
            self.submeshes[key].mesh.position.y += dir.y*16;
            //remap by submesh name
            newPosition = null;
            neighborhood = neighbors(key);
            if(dir.x === -1) newPosition = neighborhood.west;
            if(dir.x === 1) newPosition = neighborhood.east;
            if(newPosition){
                neighborhood = neighbors(newPosition);
            }
            if(dir.y === -1) newPosition = neighborhood.south;
            if(dir.y === 1) newPosition = neighborhood.north;
            if(newPosition) submeshes[newPosition] = self.submeshes[key];
        });
        console.log('2');
        console.log(submeshes);
        self.submeshes = submeshes;
        if(self.markers) self.markers.forEach((marker)=>{
            marker.mesh.position.x += xMod;
            marker.mesh.position.y += yMod;
        });
    }
    
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
                evaluateTurn(delta);
                currentState = markerStates();
                if(currentState.markers.length){
                    self.postMessage(JSON.stringify({
                        type:'state', 
                        state: currentState
                    }));
                }
                //*
                if(self.focusedMarker){
                    if(
                        self.focusedMarker.mesh.position.x < 0 || 
                        self.focusedMarker.mesh.position.x > 16 ||
                        self.focusedMarker.mesh.position.y < 0 || 
                        self.focusedMarker.mesh.position.y > 16
                    ){
                        const transition = {x:0, y:0};
                        if(self.focusedMarker.mesh.position.x < 0) transition.x = 1;
                        if(self.focusedMarker.mesh.position.y < 0) transition.y = 1;
                        if(self.focusedMarker.mesh.position.x > 16) transition.x = -1;
                        if(self.focusedMarker.mesh.position.y > 16) transition.y = -1;
                        
                        transitionTreadmill(transition);
                        self.postMessage(JSON.stringify({
                            type:'treadmill-transition', 
                            transition
                        }));
                    }
                } //*/
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