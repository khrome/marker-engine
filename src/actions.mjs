export const moveTo = (delta, marker, target, options ={}, treadmill)  => { //meta
    //const direction  = dir.subVectors( point, this.mesh.position ).normalize();
    //var raycaster  = new Raycaster( this.mesh.position, direction );
    //todo = test "crow flies" obstruction, if obstructed = path find
    marker.action('turn', treadmill.worldPointFor(target), options, treadmill);
    marker.action('forward', treadmill.worldPointFor(target), options, treadmill);
    return delta; 
};
export const pathTo = (delta, marker, target, options ={}, treadmill)  => { //meta
    //const direction  = dir.subVectors( point, this.mesh.position ).normalize();
    //var raycaster  = new Raycaster( this.mesh.position, direction );
    
    /*
    const path  = treadmill.pathfind(
        treadmill.worldPointFor(marker.mesh.position),
        treadmill.worldPointFor(target)
    );
    let point  = null;
    path.forEach((waypoint) =>{
        point  = new Vector3( waypoint.x, waypoint.y, 0 );
        marker.action('turn', treadmill.worldPointFor(point), options, treadmill);
        marker.action('forward', treadmill.worldPointFor(point), options, treadmill);
    }); //*/
    //console.log('PATH', path);
    marker.action('moveTo', target, options, treadmill);
    return delta; 
};
//MoMa
export const turn = (delta, marker, target, options ={}, treadmill)  => {
    return marker.turnRight(delta, target, options, treadmill);
};
export const turnLeft = (delta, marker, target, options ={}, treadmill)  => {
    return marker.turnLeft(delta, target, options, treadmill);
};
export const turnRight = (delta, marker, target, options ={}, treadmill)  => {
    return marker.turnRight(delta, target, options, treadmill);
};
export const strafeLeft = (delta, marker, target, options ={}, treadmill)  => {
    return marker.strafeLeft(delta, target, options, treadmill);
};
export const strafeRight = (delta, marker, target, options ={}, treadmill)  => {
    return marker.strafeRight(delta, target, options, treadmill);
};
export const forward = (delta, marker, target, options ={}, treadmill)  => {
    return marker.forward(delta, target, options, treadmill);
};
export const backward = (delta, marker, target, options ={}, treadmill)  => {
    return marker.backward(delta, target, options, treadmill);
};

export const generateFireFn = (Projectile)=>{
    return (delta, marker, target, options ={}, treadmill)  => {
        // create projectile
        const ball  = new Projectile();
        const worldPoint  = treadmill.worldPointFor(target);
        const newMarker  = marker.spawn(ball, target);
        const submesh  = treadmill.submeshAt(marker.mesh.position.x, marker.mesh.position.y);
        submesh.markers.push(newMarker);
        treadmill.scene.add(newMarker.mesh);
        if(ball.physics){
            /*
            newMarker.addTo(treadmill.scene, null, target, { 
                velocity = 15 
            }); //*/
        }else{
            newMarker.action('moveTo', worldPoint, {}, treadmill);
        }
    };
};