import { Marker, Projectile, PhysicsProjectile, Scenery, Monster } from './marker.mjs';
export { Marker, Projectile, PhysicsProjectile, Scenery, Monster };

export const markerTypes = async ()=>{
    return [
        Marker, 
        Monster, 
        Projectile, 
        PhysicsProjectile, 
        Scenery
    ];
}