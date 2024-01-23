import {
    Body,
    Cylinder,
    Sphere
} from '../node_modules/cannon-es/dist/cannon-es.js';

export class Marker{
    constructor(options={}){
        this.actions = options.actions || {};
        this.actionQueue = [];
    }
    
    action(options){
        
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
    
    data(options){
        
    }
    
    act(delta){
        
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