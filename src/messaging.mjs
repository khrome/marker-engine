 import {
    Clock,
    Raycaster,
    Vector3
} from 'three';
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
    Ray,
    Body
} from './cannon-es.mjs';
import {
    generateMeshCreationFromVoxelFn
} from './voxel-mesh.mjs';

import Logger from 'bitwise-logger';

import { allTiles, neighbors, Tile, weldTreadmill, tileForPos, shiftTiles } from './tiles.mjs';


try{
    if(!globalThis.self) globalThis.self = {};
}catch(ex){
    
}

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
    self.getSubmeshAt = (x, y)=>{
        const submeshName = tileForPos(x, y);
        if(submeshName) return self.submeshes[submeshName];
    };
    self.addMarker = (markerData)=>{
        //todo: look up against class index
        const marker = new Marker(markerData);
        self.markers.push(marker);
        const physicsBody = marker.body();
        marker.mesh = physicsBody; //TODO: remove (now side-effect)
        marker.adoptedByTreadmill(this);
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
        if(!self.submeshes.current) return localPosition;
        return {
            x: localPosition.x + self.submeshes.current.worldX*16,
            y: localPosition.y + self.submeshes.current.worldY*16,
            z: 0
        }
    }
    self.localPositionFor = (worldPosition)=>{
        if(!self.submeshes.current) return worldPosition;
        return {
            x: worldPosition.x - self.submeshes.current.worldX*16,
            y: worldPosition.y - self.submeshes.current.worldY*16,
            z: 0
        }
    }
    self.getSubmeshes = (worldPosition)=>{
        return Object.keys(self.submeshes).map((key)=> self.submeshes[key]);
    }
    self.getSubmeshMeshes = (localPosition)=>{
        const submeshes = self.getSubmeshes();
        return submeshes.map((submesh)=> submesh.mesh);
    }
    const evaluateTurn = (delta)=>{
        // physics tick
        self.physicalWorld.step(delta);
        // marker actions
        try{
            let lcv=null;
            for(lcv=0; lcv < self.markers.length; lcv++){
                self.markers[lcv].act(delta, self);
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
            if(markerReturn){
                markers.push(marker.data());
                marker.dirty = false;
            }
        }
        return {
            markers
        };
    };
    
    let xMod = null;
    let yMod = null;
    self.transitionTreadmill = async (dir)=>{
        const addedSubmeshes = [];
        const removedSubmeshes = [];
        const moveSubmeshActions = [];
        const submeshData = [];
        //these actions are async, so we just schedule
        const mutatedSubmeshes = await shiftTiles(self.submeshes, {
            horizontal: dir.x,
            vertical: dir.y
        }, (submesh, direction)=>{ //shiftFn
            moveSubmeshActions.push(()=>{
                submesh.mesh.position.x += -1*dir.x*16;
                submesh.mesh.position.y += -1*dir.y*16;
            });
        }, (tile, location)=>{ //loadFn
            console.log('TILE', tile)
            const submesh = new Submesh({
                x: tile.x,
                y: tile.y,
                tileX: tile.worldX,
                tileY: tile.worldY,
                voxelMesh: self.voxelMesh
            });
            submesh.location = location
            submesh.body();
            submesh.mesh.position.x = tile.x;
            submesh.mesh.position.y = tile.y;
            addedSubmeshes.push(submesh);
            return submesh;
        }, (submesh)=>{ //removeFn
            removedSubmeshes.push(submesh);
        });
        //add incoming markers
        const markerCreationPromises = addedSubmeshes.map((submesh)=>{
            return new Promise(async (resolve, reject)=>{
                const data = submesh.data();
                data.location = submesh.location;
                console.log('data', data);
                submeshData.push(data);
                const localMarkers = await self.createMarkers(submesh.worldX, submesh.worldY);
                localMarkers.forEach((marker)=>{
                    marker.adoptedBySubmesh(submesh);
                });
                resolve(submesh);
            })
        })
        await Promise.all(markerCreationPromises);
        // act on scheduled actions all at once on submeshes
        moveSubmeshActions.forEach((moveFn)=>moveFn());
        addedSubmeshes.forEach((submesh)=>{
            delete submesh.location;
            self.addSubmesh(submesh, submesh.location);
        });
        const removalData = [];
        removedSubmeshes.forEach((submesh)=>{
            self.physicalWorld.removeBody(submesh.mesh);
            removalData.push({ 
               worldX: submesh.worldX,
               worldY: submesh.worldY
            });
        });
        weldTreadmill(mutatedSubmeshes);
        self.submeshes = mutatedSubmeshes;
        
        // send mesh state to client
        // TODO: merge these messages?
        const message = {
            type:'treadmill-transition', 
            transition: dir,
            submeshes: submeshData,
            removals: removalData
        };
        if(self.world.debug){
            message.surfaces = self.getSubmeshMeshes().map((mesh)=> mesh.coords);
            message.positions = self.getSubmeshMeshes().map((mesh)=> mesh.position);
        }
        self.postMessage(JSON.stringify(message));
        /*self.postMessage(JSON.stringify({
            type:'submesh-update', 
            submesh: submeshData
        }));
        self.postMessage(JSON.stringify({
            type:'submesh-remove', 
            removals: removalData
        }));*/
        /*xMod = dir.x * 16;
        yMod = dir.y * 16;
        const submeshes = {};
        let newPosition = null;
        let neighborhood = null;
        const oldSubmeshes = Object.keys(self.submeshes).map((key)=> self.submeshes[key]);
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
        self.submeshes = submeshes;
        const loadingMeshes = [];
        const current = self.submeshes.current;
        let x = null;
        let y = null;
        const submeshData = [];
        const reusedSubmeshes = [];
        allTiles((tile, location)=>{
            if(!submeshes[location]){
                loadingMeshes.push(new Promise(async (resolve, reject)=>{
                    try{
                        const offset = Tile.offset[location];
                        x = current.worldX + offset.x;
                        y = current.worldY + offset.y;
                        const submesh = new Submesh({
                            x: tile.x,
                            y: tile.y,
                            tileX: x,
                            tileY: y,
                            voxelMesh: self.voxelMesh
                        });
                        self.addSubmesh(submesh, location);
                        
                        const data = submesh.data();
                        data.location = location;
                        submeshData.push(data);
                        const localMarkers = await self.createMarkers(x, y);
                        localMarkers.forEach((marker)=>{
                            marker.adoptedBySubmesh(submesh);
                        });
                        resolve(submesh);
                    }catch(ex){
                        reject(ex);
                    }
                }));
            }else{
                reusedSubmeshes.push(submeshes[location])
            }
        });
        const removedSubmeshes = [];
        oldSubmeshes.forEach((submesh)=>{
            let found = false;
            reusedSubmeshes.forEach((submeshB)=>{
                if(
                    submesh.worldX == submeshB.worldX &&
                    submesh.worldY == submeshB.worldY
                ){
                    found = true;
                }
            });
            if(!found) removedSubmeshes.push(submesh);
        });
        if(self.markers) self.markers.forEach((marker)=>{
            marker.mesh.position.x += xMod;
            marker.mesh.position.y += yMod;
        });
        (async ()=>{
            const meshes = await Promise.all(loadingMeshes);
            self.postMessage(JSON.stringify({
                type:'submesh-update', 
                submesh: submeshData
            }));
            const removalData = [];
            removedSubmeshes.forEach((submesh)=>{
                self.physicalWorld.removeBody(submesh.mesh);
                removalData.push({ 
                   worldX: submesh.worldX,
                   worldY: submesh.worldY
                });
            });
            self.postMessage(JSON.stringify({
                type:'submesh-remove', 
                removals: removalData
            }));
        })(); //*/
    }
    
    self.start = ()=>{
        if(!self.world) throw new Error('must set world to start');
        if(!self.clock) self.clock = new Clock();
        let currentState = null;
        self.running = true;
        self.clock.start();
        let delta = null;
        const interval = 0;
        let removedMarkers = [];
        const main = ()=>{
            try{
                delta = self.clock.getDelta();
                evaluateTurn(delta);
                currentState = markerStates();
                if(currentState.markers.length){
                    self.postMessage(JSON.stringify({
                        type: 'state', 
                        state: currentState
                    }));
                }
                if(self.focusedMarker){ //to treadmill, you must focus on a marker
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
                        
                        /*const message = {
                            type:'treadmill-transition', 
                            transition
                        };*/
                        self.transitionTreadmill(transition);
                        /*if(self.world.debug){
                            message.surfaces = self.getSubmeshMeshes().map((mesh)=> mesh.coords);
                            message.positions = self.getSubmeshMeshes().map((mesh)=> mesh.position);
                        }
                        self.postMessage(JSON.stringify(message));*/
                    }
                }
                removedMarkers = [];
                let marker = null;
                for(let index = self.markers.length-1; index >= 0; index--){
                    marker = self.markers[index];
                    if(
                        marker.mesh.position.x > 32 ||
                        marker.mesh.position.x < -16 ||
                        marker.mesh.position.y > 32 ||
                        marker.mesh.position.y < -16
                    ){
                        //TODO: exempt markers with valid, in range, targets
                        removedMarkers.push(marker.id);
                        self.markers.splice(index, 1);
                        self.physicalWorld.removeBody(marker.mesh);
                    }
                }
                if(removedMarkers.length) self.postMessage(JSON.stringify({
                    type:'remove-markers', 
                    markers: removedMarkers
                }));
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
    
} //*/
try{
    workerStateSetup();
    self.onmessage = async (e)=>{
        const data = JSON.parse(e.data);
        try{
            if(data.type){
                switch(data.type){
                    //*
                    case 'world': //incoming world definition
                        
                        if(data.world.debug){
                            Logger.level = Logger.ERROR & Logger.DEBUG & Logger.INFO;
                        }
                        Logger.log(data, Logger.INFO);
                        let voxelFilePromise;
                        if(data.world.voxelFile){
                            voxelFilePromise = import(data.world.voxelFile);
                            (async ()=>{
                                const { voxels, markers } = await voxelFilePromise;
                                const creationFn = generateMeshCreationFromVoxelFn(
                                    voxels
                                );
                                self.voxelMesh = creationFn('test-seed', 16);
                                self.createMarkers = markers;
                            })();
                        }
                        self.world = data.world;
                        self.physicalWorld = new World({
                            gravity: new Vec3(0, 0, -9.81)
                        });
                        self.onlyReturnDirtyObjects = data.world.onlyReturnDirtyObjects;
                        if(data.markerTypes){
                            
                        }
                        let submeshData = [];
                        let currentMarkers = [];
                        if(voxelFilePromise) await voxelFilePromise;
                        //*
                        if(voxelFilePromise){
                            await allTiles(async (tile, location)=>{
                                const worldX = tile.x + (data.world.x || 0);
                                const worldY = tile.y + (data.world.y || 0);
                                const submesh = new Submesh({
                                    x: tile.x,
                                    y: tile.y,
                                    tileX: worldX,
                                    tileY: worldY,
                                    voxelMesh: self.voxelMesh
                                });
                                const localMarkers = await self.createMarkers(worldX, worldY);
                                localMarkers.forEach((marker)=>{
                                    marker.adoptedBySubmesh(submesh);
                                });
                                self.addSubmesh(submesh, location);
                                const thisData = submesh.data();
                                thisData.location = location
                                submeshData.push(thisData);
                                localMarkers.forEach((marker)=>{
                                    self.addMarker(marker);
                                });
                                currentMarkers = currentMarkers.concat(
                                    localMarkers.map((marker)=> marker.data())
                                ); //*/
                            }); //*/
                        }
                        
                        self.postMessage(JSON.stringify({
                            type:'submesh-update', 
                            submesh: submeshData
                        }));
                        self.postMessage(JSON.stringify({
                            type:'create-markers', 
                            markers: currentMarkers
                        }));
                        break;
                    //*/
                    case 'add-submesh': //incoming submesh definition
                        //self.addSubmesh(data.submesh);
                        break;
                    case 'start': //incoming start execution loop
                        Logger.log('START', Logger.INFO & Logger.DEBUG)
                        self.start();
                        break;
                    case 'stop': //incoming stop execution loop after next turn
                        self.stop();
                        break;
                    case 'add-marker':
                        const marker = new Marker(data.marker);
                        self.addMarker(marker);
                        break;
                    case 'shift':
                        self.transitionTreadmill(data.transition);
                        break;
                    case 'move-marker':
                        break;
                    case 'focus':
                        const found = self.markers.find((marker)=> marker.id === data.id);
                        if(found){
                            self.focusedMarker = found;
                        }else{
                            Logger.log(`could not focus on marker ${data.id}`, Logger.INFO & Logger.DEBUG);
                        }
                        break;
                    case 'marker-action': 
                        const action = data.action;
                        const subject = self.markers.find((marker)=> marker.id == action.id );
                        subject.action(action.name, action.options, action.target);
                        Logger.log(`object for id: ${data.action.id}`, Logger.DEBUG & Logger.INFO, subject, action);
                        
                }
            }else{
                Logger.log(`unknown message: ${data.type}`, Logger.ERROR);
            }
        }catch(ex){
            console.log(ex);
            Logger.log('COMM error', Logger.ERROR);
        }
    };
}catch(ex){
    Logger.log('worker startup error', Logger.ERROR, '*', ex);
}
Logger.log('WORKER RUNNING', Logger.INFO | Logger.DEBUG);