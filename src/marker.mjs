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
    Mesh,
    Group,
    Raycaster,
    LineSegments,
    EdgesGeometry,
    LineBasicMaterial,
    Quaternion,
    Vector3
} from '../node_modules/three/build/three.module.js';

import * as actions from './actions.mjs';

const twoPI = Math.PI * 2;

const quaternionToEuler = (q)=>{
    const angle = 2 * Math.acos(q.w);
    const s = Math.sqrt(1 - q.w * q.w);
    //const x = q.x / s;
    //const y = q.y / s;
    const z = q.z / s;
    return z;
}

export class Marker{
    static CLOCKWISE = -1;
    static WIDDERSHINS = 1;
    constructor(options={}){
        const enabledActions = (options.actions || {
            'moveTo':'moveTo', 
            'turn':'turn', 
            'turnLeft':'turnLeft',
            'turnRight':'turnRight',
            'forward':'forward', 
            'backward':'backward', 
            'strafeLeft':'strafeLeft', 
            'strafeRight':'strafeRight', 
        });
        this.actions = Object.keys(
            enabledActions
        ).reduce((agg, key)=>{
            if(typeof enabledActions[key] === 'string'){
                agg[key] = actions[enabledActions[key]];
            }else{
                agg[key] = enabledActions[key];
            }
            return agg;
        }, {});
        this.actionQueue = [];
        this.position = new Vector3();
        if(options.position){
            this.position.x = options.position.x;
            this.position.y = options.position.y;
            this.position.z = options.position.z;
        }
        this.orientation = new Vector3();
        if(options.quaternion){
            this.quaternion = new Quaternion(
                options.quaternion.x,
                options.quaternion.y,
                options.quaternion.z,
                options.quaternion.w
            );
        }else{
            this.quaternion = new Quaternion();
        }
        console.log('MO', options);
        this.id = options.id || Math.floor(Math.random()*100000000000);
        this.values = options.values || (options.entity?options.entity.defaultValues():{
            "movementSpeed" : 1,
            "durability": 100,
            "collisionRadius" : 0.5,
            "turnSpeed" : 0.1,
            "health" : 10
        })
    }
    
    normalizeMesh(){
        this.mesh.position.x = this.position.x;
        this.mesh.position.y = this.position.y;
        this.mesh.position.z = this.position.z;
        
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
            this.engine.worker.postMessage(JSON.stringify(action));
        }else{
            //we're inside the engine and just queue an action directly
            this.actionQueue.push({
                name,
                options,
                target
            });
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
        const height = 2; //this.options.height || 2;
        const geometry = new CylinderGeometry( this.size, this.size, height, 8 );
        geometry.applyMatrix4( new Matrix4().makeRotationX( Math.PI / 2 ) );
        geometry.applyMatrix4( new Matrix4().makeTranslation( 0,  0, height/2) );
        const material = new MeshPhongMaterial({
            color: this.color || '#FF0000',    // red (can also use a CSS color string here)
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
        /*if(window.tools){ //TODO: make these work
            //console.log('added axes');
            const offset = mesh.position.clone();
            offset.x -= .002;
            offset.y -= .002;
            offset.z -= .002;
            object.add(window.tools.axes(offset));
        }*/
        return object;
    }
    
    data(options){
        if(this.mesh){
            return {
                id: this.id,
                position: {
                    x: this.mesh.position.x,
                    y: this.mesh.position.y,
                    z: this.mesh.position.z
                },
                quaternion: {
                    w: this.mesh.quaternion.w,
                    x: this.mesh.quaternion.x,
                    y: this.mesh.quaternion.y,
                    z: this.mesh.quaternion.z
                }
            }
        }else{
            return {
                id: this.id,
                position: {
                    x: this.position.x,
                    y: this.position.y,
                    z: this.position.z
                },
                quaternion: {
                    w: this.quaternion.w,
                    x: this.quaternion.x,
                    y: this.quaternion.y,
                    z: this.quaternion.z
                }
            }
        }
    }
    
    act(delta){
        let remainingTime = delta;
        let actionDetail = null;
        let action = null;
        
        while(remainingTime > 0 && this.actionQueue.length){
            actionDetail = this.actionQueue[0];
            try{
                if(actionDetail){
                    action = this.actions[actionDetail.name];
                    //todo: support marker targets
                    if(!action) throw new Error(`could not find action: ${actionDetail.name}`);
                    
                    remainingTime = action(
                        delta, 
                        this,
                        actionDetail.target, 
                        actionDetail.options
                    );
                    //we're done with this action and have some time remainder
                    if(remainingTime > 0){
                        this.actionQueue.shift();
                    }
                    if(!this.dirty) this.dirty = true;
                }else{
                    //we're idle
                    remainingTime = 0;
                }
            }catch(ex){
                console.log('EX', ex)
                remainingTime = 0;
            }
            //remainingTime = 0;
        }
        //if there's remaining time after depleting actions, it's spent idle
    }
    
    moveInOrientation(directionVector, delta=1, target, treadmill){
        let origin = null;
        if(this.boundingBox){
            origin = this.boundingBox.getCenter()
        }else{
            origin = this.mesh.position;
            //origin = new Vector3();
            //this.mesh.getWorldPosition(origin);
        }
        const movementSpeed = this.values.movementSpeed || 1;
        const maxDistance = movementSpeed * delta;
        const quaternion = new Quaternion();
        directionVector.applyQuaternion(this.mesh.quaternion);
        raycaster.ray.origin.copy(origin);
        raycaster.ray.direction.copy(directionVector);
        let localTarget = target; //&& treadmill.treadmillPointFor(target);
        //Logger.log('mio-target', Logger.DEBUG, 'marker', localTarget);
        //Logger.log('mio-ray', Logger.DEBUG, 'marker', raycaster);
        /*if(window.tools){
            Logger.log('mio-target', Logger.DEBUG, 'marker', localTarget);
            Logger.log('mio-ray', Logger.DEBUG, 'marker', raycaster);
            //if(localTarget) window.tools.showPoint(localTarget, 'target', '#0000FF');
            //if(target) window.tools.showPoint(target, 'target', '#000099');
            //window.tools.showRay(raycaster, 'bearing-ray', '#000055');
        }*/
        const markers = treadmill.activeMarkers();
        let lcv=0;
        for(;lcv < markers.length; lcv++){
            const threshold = markers[lcv].values.collisionRadius + this.values.collisionRadius;
            if(markers[lcv] === this) continue;
            if(this.mesh.position.distanceTo(markers[lcv].mesh.position) <= threshold){
                this.impact(markers[lcv], treadmill);
            }
        }
        if(
            target &&
             origin && 
             localTarget && 
             origin.distanceTo(localTarget) < maxDistance
         ){
            //todo: compute remaining time
            this.mesh.position.copy(localTarget);
            return 0;
        }else{
            raycaster.ray.at(maxDistance, result);
            this.moveTo(new Vector2(result.x, result.y));
            return -1;
        }
    }
    
    // all movement functions either proceed to the target or their movement max, whichever comes first
    // and return the remaining delta when complete.
    
    forward(delta=1, target, options, treadmill){ // +x
        return this.moveInOrientation(direction.forward.clone(), delta, target, treadmill);
    }
    
    backward(delta=1, target, options, treadmill){ // -y
        return this.moveInOrientation(direction.backward.clone(), delta, target, treadmill);
    }
    
    strafeRight(delta=1, target, options, treadmill){ // +x
        return this.moveInOrientation(direction.right.clone(), delta, target, treadmill);
    }
    
    strafeLeft(delta=1, target, options, treadmill){ // -x
        return this.moveInOrientation(direction.left.clone(), delta, target, treadmill);
    }
    
    turn(delta=1, direction, target, options, treadmill){
        const turnSpeed = this.values.turnSpeed || 0.1;
        const maxRotation = turnSpeed * delta;
        if(target){
            const localTarget = target; //treadmill.treadmillPointFor(target);
            const raycaster = this.lookAt(localTarget);
            const xDist = localTarget.x - this.mesh.position.x;
            const yDist = localTarget.y - this.mesh.position.y;
            let targetAngle = Math.atan2(yDist, xDist);
            if (targetAngle < 0) { targetAngle += twoPI; }
            if (targetAngle > twoPI) { targetAngle -= twoPI; }
            
            //const q = this.mesh.quaternion;
            //const angle = 2 * Math.acos(q.w);
            //const s = Math.sqrt(1 - q.w * q.w);
            //const x = q.x / s;
            //const y = q.y / s;
            //const z = this.mesh.quaternion.z / s;
            const delta = quaternionToEuler(this.mesh.quaternion) - targetAngle;
            //const delta = this.mesh.rotation.z - targetAngle;
            const motion = direction * maxRotation;
            //console.log('turn angle', this.mesh.quaternion, this.mesh.rotation);
            if(delta > maxRotation){
                const z = quaternionToEuler(this.mesh.quaternion);
                const newValue = z + motion;
                if(newValue < 0){
                    this.mesh.quaternion.setFromAxisAngle( 
                        new Vector3( 0, 0, 1 ), 
                        (z + motion) + twoPI 
                    );
                    //this.mesh.rotation.z = (z + motion) + twoPI;
                }else{
                    this.mesh.quaternion.setFromAxisAngle( 
                        new Vector3( 0, 0, 1 ), 
                        (z + motion) % twoPI 
                    );
                    //this.mesh.rotation.z = (z + motion) % twoPI;
                }
                return -1;
            }else{
                this.mesh.quaternion.setFromAxisAngle( 
                    new Vector3( 0, 0, 1 ), 
                    targetAngle
                );
                //this.mesh.rotation.z = targetAngle;
                //TBD compute remaining time
                return 0;
            }
            return 0;
        }else{
            this.mesh.quaternion.setFromAxisAngle( 
                new Vector3( 0, 0, 1 ), 
                direction * maxRotation
            );
            //this.mesh.rotation.z += direction * maxRotation;
            return 0;
        }
    }
    
    turnRight(delta=1, target, options, treadmill){
        return this.turn(delta=1, Marker.CLOCKWISE, target, options, treadmill);
    }
    
    turnLeft(delta=1, target, options, treadmill){
        return this.turn(delta=1, Marker.WIDDERSHINS, target, options, treadmill);
    }
    
    moveTo(point){
        const from = this.mesh.position.clone()
        this.mesh.position.set(point.x, point.y);
        if(this.body){
            this.body.position.set(point.x, point.y);
        }
        if(this.linked.length){
            const delta = {
                x: point.x - from.x,
                y: point.y - from.y
            }
            this.linked.forEach((marker)=>{
               if(marker.moveTo){ //a marker
                   marker.moveTo(new Vector3(
                       marker.mesh.position.x + delta.x,
                       marker.mesh.position.y + delta.y,
                       marker.mesh.position.z
                   ));
               }else{ //a positionable object
                    marker.position.set(
                        marker.position.x + delta.x,
                        marker.position.y + delta.y
                    )
               }
            });
        }
        //if(this.animation) this.convertAnimation(point.x, point.y);
    }
    
    lookAt(point){
        try{
            var dir = new Vector3();
            const direction = dir.subVectors( point, this.mesh.position ).normalize();
            var raycaster = new Raycaster( this.mesh.position, direction );
            return raycaster;
        }catch(ex){
            console.log(ex);
        }
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