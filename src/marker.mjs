import * as CANNON from './cannon-es.mjs';

const {
    Body,
    Cylinder,
    Sphere
} = CANNON;

 import {
    CylinderGeometry,
    Matrix4,
    MeshPhongMaterial,
    EdgesGeometry,
    LineBasicMaterial,
    Vector3
} from '../node_modules/three/build/three.module.js';

import * as actions from './actions.mjs';

export class Marker{
    constructor(options={}){
        console.log('marker options', options);
        this.actions = Object.keys(
            options.actions || {}
        ).reduce((agg, key)=>{
            if(typeof options.actions[key] === 'string'){
                agg[key] = actions[options.actions[key]];
            }else{
                agg[key] = options.actions[key];
            }
        }, {});
        this.actionQueue = [];
        this.position = new Vector3();
        if(options.position){
            this.position.x = options.position.x;
            this.position.y = options.position.y;
            this.position.z = options.position.z;
        }
        this.orientation = new Vector3();
        if(options.orientation){
            this.orientation.x = options.orientation.x;
            this.orientation.y = options.orientation.y;
            this.orientation.z = options.orientation.z;
        }
        this.id = options.id || Math.floor(Math.random()*100000000000);
    }
    
    //external action: a request to add this to the actionQueue
    action(name, options, target){
        if(this.engine){
            //TODO: if we're already attached, remove
            //we're outside the worker and need to send an action through it
            const action = {
                type: 'marker-action',
                action: {
                    name,
                    id: this.id,
                    options,
                    target
                }
            };
            console.log('remote action', action)
            this.engine.worker.postMessage(JSON.stringify(action));
        }else{
            //we're inside the engine and just queue an action directly
            console.log('local')
            this.actionQueue.push({
                name,
                options,
                target
            })
        }
    }
    
    //execute an action *now* using `delta` time
    immediate(delta, name, options, target){
        if(!this.actions[name]) throw new Error(`marker does not have action: ${name}`);
        return this.actions[name](delta, this, target, options);
    }
    
    //representation for physics interaction
    body(){
        const size = this.size || 1
        const body = new Body({
            shape: new Cylinder(size, size),
            mass: 1
        });
        return body;
    }
    
    model(){
        const height = this.options.height || 2;
        const geometry = new CylinderGeometry( this.size, this.size, height, 8 );
        geometry.applyMatrix4( new Matrix4().makeRotationX( Math.PI / 2 ) );
        geometry.applyMatrix4( new Matrix4().makeTranslation( 0,  0, height/2) );
        const material = new MeshPhongMaterial({
            color: this.color,    // red (can also use a CSS color string here)
            flatShading: false,
        });
        const mesh = new Mesh( geometry, material );
        mesh.castShadow = true;
        const object = new Group();
        object.add(mesh);
        
        if(true){
            object.selectedOutline = new LineSegments(
                new EdgesGeometry(geometry), 
                new LineBasicMaterial({color: 0x00FFFF})
            );
            object.highlightedOutline = new LineSegments(
                new EdgesGeometry(geometry), 
                new LineBasicMaterial({color: 0xFFFFFF})
            );
        }
        if(window.tools){ //TODO: make these work
            //console.log('added axes');
            const offset = mesh.position.clone();
            offset.x -= .002;
            offset.y -= .002;
            offset.z -= .002;
            object.add(window.tools.axes(offset));
        }
        return object;
    }
    
    data(options){
        return {
            id: this.id,
            position: {
                x: this.position.x,
                y: this.position.y,
                z: this.position.z
            },
            orientation: {
                x: this.position.x,
                y: this.position.y,
                z: this.position.z
            }
        }
    }
    
    act(delta){
        let remainingTime = delta;
        let actionDetail = null;
        while(remainingTime > 0 && this.actionQueue.length){
            actionDetail = this.actionQueue[0];
            //console.log('>>>', actionDetail);
            if(actionDetail){
                remainingTime = this.actions[actionDetail];
                //we're done with this action and have some time remainder
                if(remainingTime > 0){
                    this.actionQueue.shift();
                }
                if(!this.dirty) this.dirty = true;
            }
        }
        //if there's remaining time after depleting actions, it's spent idle
    }
}

export class Projectile extends Marker{
    constructor(options={}){
        super(options);
    }
}

export class PhysicsProjectile extends Marker{
    constructor(options={}){
        super(options);
        this.physics = true;
    }
    
    body(){
        const body = new Body({
            shape: new Sphere(this.size || 1),
            mass: 1
        });
        return body;
    }
}

export class Scenery extends Marker{
    constructor(options={}){
        super(options);
    }
}

export class Monster extends Marker{
    constructor(options={}){
        super(options);
    }
}