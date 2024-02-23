marker-engine
============================
![markers on layered perlin mesh](https://github.com/khrome/preview-images/blob/master/marker-engine/mesh-attached.gif)

An ESM marker interface for keeping marker calculations out of your render thread and handling game-world state

Structure
---------

- **Marker** - An object which is positioned on the Mesh (Entities, Scenery or Projectiles)
- **Entity** - An object which is mobile on the mesh from it's own effort
- **Avatar** - An entity which represents a player
- **Projectile** - An object moving from forces applied to it
- **Scenery** - A primarily stationary object
- **Mesh** - The walkable ground all markers are attached to
- **Submesh** - A subsection of the mesh which can load in and out of memory

Usage
-----

```javascript
const engine = new MarkerEngine({
    // the mesh voxel generation algorithm for the groundlayer
    voxelFile: '/mesh-voxel-generator.mjs'
});
// marker may be extended to override the default .model() and .body()
const marker = new Marker({
    id : 'foo',
    position: {
        x: 0,
        y: 0,
        z: 0
    }
});
engine.addMarker(marker);
// track this marker as the center of the treadmill
engine.on('state', ()=>{
    // data.markers contain marker updates
    // use position + quaternion to update the viz
});
engine.on('add-markers', (markers)=>{
    // markers were found when loading a submesh
});
engine.on('submesh', (submesh)=>{
    // submesh is a new submesh
    // compute mesh from voxels and add to viz
});
engine.on('remove-submesh', (submesh)=>{
    // remove this submesh from the viz
});
engine.on('remove-markers', (markers)=>{
    // markers is a list of markers to remove from the viz
});
// add an action to the marker action queue
marker.action('moveTo', {}, {x: 10, y: 10, z: 0});
// start the simulation
engine.start();
```

The voxel generation file looks like: 

```js
export const voxels = (x, y, depth)=>{
    const results = [];
    for(let lcv=0; lcv<256; lcv++){
        results.push(0);
    }
    return results;
};
```

Testing
-------

Run the es module tests to test the root modules
```bash
npm run import-test
```
to run the same test inside the browser:

```bash
npm run browser-test
```
to run the same test headless in chrome:
```bash
npm run headless-browser-test
```

to run the same test inside docker:
```bash
npm run container-test
```

Run the commonjs tests against the `/dist` commonjs source (generated with the `build-commonjs` target).
```bash
npm run require-test
```

Development
-----------
All work is done in the .mjs files and will be transpiled on commit to commonjs and tested.

If the above tests pass, then attempt a commit which will generate .d.ts files alongside the `src` files and commonjs classes in `dist`

