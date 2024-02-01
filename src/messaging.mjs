 import {
    Clock,
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

//const self = {};

export const messageHandler = (e)=>{
    const data = JSON.parse(e.data);
    if(data.type){
        switch(data.type){
            case 'world': //incoming world definition
                console.log('WORLD')
                self.world = data.world;
                self.physicalWorld = new World({
                    gravity: new Vec3(0, 0, -9.81)
                });
                if(data.markerTypes){
                    
                }
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
            case 'add-marker': //incoming marker definition
                self.addMarker(new Marker(data.marker));
                break;
            case 'move-marker': //incoming marker command definition
                break;
            case 'marker-action': //incoming submesh definition
                const action = data.action;
                const subject = self.markers.find((marker)=> marker.id == action.id );
                subject.action(action.name, action.options, action.target);
                //console.log(`object for id: ${data.action.id}`, subject, action);
                
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
        self.physicalWorld.addBody(physicsBody);
        console.log('markerAdd')
    };
    const evaluateTurn = (delta)=>{
        // physics tick
        // marker actions
        let lcv=null;
        for(lcv=0; lcv < self.markers.length; lcv++){
            self.markers[lcv].act(delta);
        }
        // treadmill check + optional update
    };
    const markerStates = ()=>{
        const markers = [];
        self.markers.forEach((marker)=>{
            if(marker.dirty){
                markers.push(marker.data());
                marker.dirty = false;
            }
        });
        return {
            markers
        };
    };
    self.start = ()=>{
        if(!self.world) throw new Error('must set world to start');
        if(!self.clock) self.clock = new Clock();
        let currentState = null;
        let main = null;
        self.running = true;
        self.clock.start();
        let delta = null;
        //yielding
        setTimeout((main = ()=>{
            delta = clock.getDelta();
            
            evaluateTurn(delta);
            currentState = markerStates();
            //*
            if(currentState.markers.length){
                self.postMessage(JSON.stringify({
                    type:'state', 
                    state: currentState
                }));
            }
            //*/
            if(self.running) setTimeout(main, 0);
        }), 0);
    };
    self.stop = ()=>{
        self.running = false;
        self.clock.stop();
    };
}

workerStateSetup();
self.onmessage = messageHandler;