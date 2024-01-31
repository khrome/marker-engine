marker-engine
============================
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
const engine = new MarkerEngine();
const marker = new Marker({
    id : 'foo',
    position: {
        x: 0,
        y: 0,
        z: 0
    }
});
engine.addMarker(marker);
engine.on('state', ()=>{
    // data.markers contain marker updates
    // data.submeshes contain submesh updates
    // use the updated positions to change the viz
});
marker.action('moveTo', {}, {x: 10, y: 10, z: 0});
engine.start();
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

