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
    Material,
    Body
} from '../node_modules/cannon-es/dist/cannon-es.js';

//const self = {};

export const messageHandler = (e)=>{
    const data = JSON.parse(e.data);
    if(data.type){
        switch(data.type){
            case 'world': //incoming world definition
                console.log('WORLD')
                self.world = data.world;
                if(data.markerTypes){
                    
                }
                break;
            case 'submesh': //incoming submesh definition
                self.addSubmesh(data.submesh);
                break;
            case 'start': //incoming submesh definition
                console.log('START')
                self.start();
                break;
            case 'stop': //incoming submesh definition
                self.stop();
                break;
            case 'add-marker': //incoming marker definition
                self.addMarker(data.marker);
                break;
            case 'move-marker': //incoming marker command definition
            case 'marker-action': //incoming submesh definition
                console.log(data)
        }
    }
    //*/
};

export const workerStateSetup = ()=>{
    self.markers = [];
    self.addSubmesh = (submeshData)=>{
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
        console.log('markerAdd')
    };
    const evaluateTurn = (delta)=>{
        // physics tick
        // marker actions
        let lcv=null
        for(lcv=0; lcv< self.markers.length; lcv++){
            self.markers[lcv].act();
        }
        // eventually: just deltas
        // treadmill check + optional update
    };
    const markerStates = ()=>{
        return JSON.stringify({});
    };
    self.start = ()=>{
        if(!self.world) throw new Error('must set world to start');
        if(!self.clock) self.clock = new Clock();
        let currentState = null;
        let main = null;
        self.running = true;
        self.clock.start();
        //yielding
        setTimeout((main = ()=>{
            evaluateTurn();
            currentState = markerStates();
            self.postMessage(JSON.stringify({
                type:'state', 
                state: currentState
            }));
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