import * as CANNON from './cannon-es.mjs';

const {
    Body,
    Cylinder,
    Quaternion,
    Vec3,
    Ray,
    RaycastResult,
    Sphere
} = CANNON;

 import {
    CylinderGeometry,
    MeshPhongMaterial,
    Mesh,
    Group,
    Matrix4,
    Raycaster,
    Quaternion as Quat3,
    Euler,
    LineSegments,
    EdgesGeometry,
    LineBasicMaterial,
    Vector2,
    Vector3
} from '../node_modules/three/build/three.module.js';

import { tools } from './development.mjs';
import * as actions from './actions.mjs';

const twoPI = Math.PI * 2;
const deg2rad = Math.PI/180;
const direction = {
    right: new Vector3(0, 1, 0),
    left: new Vector3(0, -1, 0),
    forward: new Vector3(1, 0, 0), //TBD: ??
    backward: new Vector3(-1, 0, 0),
    up: new Vector3(0, 0, 1)
};
let raycaster = new Raycaster();
let result = new Vector3();

const quaternionToEulerZ = (q)=>{
    const angle = 2 * Math.acos(q.w);
    const s = Math.sqrt(1 - q.w * q.w);
    const z = q.z / s;
    return z;
}

export class Marker{
    static CLOCKWISE = -1;
    static WIDDERSHINS = 1;
    treadmillInit = null;
    constructor(options={}){
        this.options = options;
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
        this.meshAttached = typeof options.meshAttached === "boolean"?options.meshAttached:false;
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
            this.position.x = options.position.x || 0;
            this.position.y = options.position.y || 0;
            this.position.z = options.position.z || 0;
        }
        if(options.x){
            this.position = {};
            this.position.x = options.x || 0;
            this.position.y = options.y || 0;
            this.position.z = options.z || 0;
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
        this.id = options.id || Math.floor(Math.random()*100000000000);
        this.values = options.values || (options.entity?options.entity.defaultValues():{
            'movementSpeed' : 0.00001,
            'durability': 100,
            'collisionRadius' : 0.5,
            'turnSpeed' : 0.00001,
            'health' : 10,
            'color' : '#00FF00'
        })
    }
    
    adoptedBySubmesh(submesh){
        if(this.options.x){
            const x = submesh.x*16 + this.options.x;
            const y = submesh.y*16 + this.options.y;
            const z = 0;
            if(!this.position) this.position = {};
            this.position.x = x;
            this.position.y = y;
            this.position.z = z;
            if(this.mesh){
                this.mesh.position.x = x;
                this.mesh.position.y = y;
                this.mesh.position.z = z;
            }
        }
    }
    
    adoptedByTreadmill(treadmill){
    }
    
    normalizeMesh(){
        this.mesh.position.x = this.position.x;
        this.mesh.position.y = this.position.y;
        this.mesh.position.z = this.position.z;
    }
    
    //external action: a request to add this to the actionQueue
    action(name, options, target){
        const targetV = new Vector3(
            target.x, 
            target.y, 
            target.z
        );
        this.target = targetV;
        tools((tool)=>{
            const dir = new Vector3();
            dir.subVectors( targetV, this.mesh.position ).normalize();
            raycaster.ray.origin.copy(this.mesh.position);
            raycaster.ray.direction.copy(dir);
            tool.showRay(raycaster, `target-${this.id}`)
            tool.sceneAxes(targetV);
        });
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
            console.log('remote action', action)
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
        if(!this.mesh) this.mesh = body;
        this.normalizeMesh();
        return body;
    }
    
    model(){
        const height = 2; //this.options.height || 2;
        const geometry = new CylinderGeometry( this.size, this.size, height, 8 );
        geometry.applyMatrix4( new Matrix4().makeRotationX( Math.PI / 2 ) );
        geometry.applyMatrix4( new Matrix4().makeTranslation( 0,  0, height/2) );
        const material = new MeshPhongMaterial({
            color: this.color || this.values.color || '#FF0000',    // red (can also use a CSS color string here)
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
        tools((tool)=>{
            const offset = mesh.position.clone();
            offset.x -= .002;
            offset.y -= .002;
            offset.z -= .002;
            const axes = tool.axes(offset);
            object.add(axes);
        });
        if(!this.mesh) this.mesh = object;
        this.normalizeMesh();
        return object;
    }
    
    scenePosition(){ //scene context?
        return {
            x: this.mesh.position.x,
            y: this.mesh.position.y,
            z: this.mesh.position.z
        }
    }
    
    worldPosition(treadmill, position){
        return treadmill.worldPositionFor(
            position || this.mesh.position
        );
    }
    
    data(options){
        let result = null;
        if(this.mesh){
            result = {
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
            result = {
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
        result.meshAttached = this.meshAttached;
        if(options && options.includeValues){
            result.values = this.values;
        }
        return result;
    }
    
    act(delta, treadmill){
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
                        actionDetail.options,
                        treadmill
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
    
    moveInOrientation(directionVector, delta=1, localTarget, treadmill){
        //*
        const target = treadmill.localPositionFor(localTarget);
        let origin = null;
        if(this.boundingBox){
            origin = this.boundingBox.getCenter()
        }else{
            origin = this.mesh.position;
            //origin = new Vector3();
            //this.mesh.getWorldPosition(origin);
        }
        origin.z =0;
        const movementSpeed = this.values.movementSpeed || 1;
        const maxDistance = movementSpeed * delta;
        const quaternion = new Quaternion();
        directionVector.applyQuaternion(this.mesh.quaternion);
        raycaster.ray.origin.copy(origin);
        raycaster.ray.direction.copy(directionVector);
        //let localTarget = target; //&& treadmill.treadmillPointFor(target);
        //Logger.log('mio-target', Logger.DEBUG, 'marker', localTarget);
        //Logger.log('mio-ray', Logger.DEBUG, 'marker', raycaster);
        //*
        /*tools((tool)=>{
            Logger.log('mio-target', Logger.DEBUG, 'marker', localTarget);
            Logger.log('mio-ray', Logger.DEBUG, 'marker', raycaster);
            //if(localTarget) tool.showPoint(localTarget, 'target', '#0000FF');
            //if(target) tool.showPoint(target, 'target', '#000099');
            //tool.showRay(raycaster, 'bearing-ray', '#000055');
        }); //*/
        /* non-physics collision
        const markers = treadmill.activeMarkers();
        let lcv=0;
        for(;lcv < markers.length; lcv++){
            const threshold = markers[lcv].values.collisionRadius + this.values.collisionRadius;
            if(markers[lcv] === this) continue;
            if(this.mesh.position.distanceTo(markers[lcv].mesh.position) <= threshold){
                this.impact(markers[lcv], treadmill);
            }
        }
        //*/
        if(
            target &&
             origin && 
             localTarget && 
             origin.distanceTo(target) < maxDistance
         ){
            //todo: compute remaining time
            this.moveTo(new Vector2(target.x, target.y), treadmill);
            return 0;
        }else{
            raycaster.ray.at(maxDistance, result);
            this.moveTo(new Vector2(result.x, result.y), treadmill);
            return -1;
        } //*/
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
    
    turn(delta=1, direction, localTarget, options, treadmill){
        const target = treadmill.localPositionFor(localTarget);
        const turnSpeed = this.values.turnSpeed || 0.00001;
        const maxRotation = turnSpeed * delta;
        const position = new Vector3();
        //const rotationMatrix = new Matrix4();
        //const t = new Matrix4();
        const targetV = new Vector3(
            target.x, 
            target.y, 
            target.z
        );
        const positionV = new Vector3(
            this.mesh.position.x, 
            this.mesh.position.y, 
            this.mesh.position.z
        );
        
        position.copy(target);
        const speed = 2;
        if(target){
            //let targetAngle = positionV.angleTo(targetV);
            //let targetAngle = Math.atan2(targetV.y, targetV.x) - Math.atan2(positionV.y, positionV.x);
            let targetAngle = Math.atan2(targetV.y - positionV.y, targetV.x - positionV.x);
            if (targetAngle < 0) { targetAngle += 2 * Math.PI; }
            //const targetAngle = this.targetAngle || positionV.angleTo(this.target)*180/Math.PI;
            //if(!this.targetAngle) this.targetAngle = targetAngle
            let currentAngle = quaternionToEulerZ(this.mesh.quaternion);
            const localTarget = target; //treadmill.treadmillPointFor(target);
            
            const maxTurn = maxRotation * delta;
            const motion = direction * maxTurn;
            const increment = direction * Math.PI / 64;
            const angle = (twoPI + (this.turnAngle || 0) + increment) % twoPI; //make positive
            if( //if this iteration crosses the boundary of the target
                (angle > targetAngle && this.turnAngle < targetAngle) || //clockwise
                (angle < targetAngle && this.turnAngle > targetAngle)
            ){
                this.mesh.quaternion.setFromAxisAngle(new Vec3(0,0,1), targetAngle);
                const remainder = delta * 1/(targetAngle/angle);
                this.turnAngle = null;
                return remainder;
            }else{
                this.mesh.quaternion.setFromAxisAngle(new Vec3(0,0,1), angle);
                this.turnAngle = angle;
                return 0;
            }
        }else{
            this.mesh.quaternion.setFromAxisAngle( 
                new Vector3( 0, 0, 1 ), 
                direction * maxRotation
            );
            return 0;
        }
    }
    
    turnRight(delta=1, target, options, treadmill){
        return this.turn(delta=1, Marker.CLOCKWISE, target, options, treadmill);
    }
    
    turnLeft(delta=1, target, options, treadmill){
        return this.turn(delta=1, Marker.WIDDERSHINS, target, options, treadmill);
    }
    
    moveTo(point, treadmill){
        //*
        const from = this.mesh.position.clone();
        this.mesh.position.x = point.x;
        this.mesh.position.y = point.y;
        if(this.meshAttached){
            const submesh = treadmill.getSubmeshAt(point.x, point.y);
            if(submesh && submesh.mesh){
                const intersection = new RaycastResult()
                const ray = new Ray(
                    new Vec3(point.x, point.y, 0),
                    new Vec3(point.x, point.y, 16)
                );
                ray.intersectBody(submesh.mesh, intersection);
                if(intersection.hitPointWorld.z){
                    this.mesh.position.z = intersection.hitPointWorld.z;
                }
            }
        }
        if(this.linked && this.linked.length){
            const delta = {
                x: point.x - from.x,
                y: point.y - from.y
            };
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
        } //*/
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