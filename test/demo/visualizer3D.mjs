import { 
    Scene,
    PlaneGeometry,
    Mesh,
    Vector3,
    Color,
    MeshPhongMaterial
} from 'three';

import { Marker, Submesh } from '../../src/index.mjs';

import { create as createLights } from './lighting.mjs';
import { create as createCamera } from './camera.mjs';
import { create as createRenderer } from './renderer.mjs';
import { enable, tools } from '../../src/development.mjs';

export class Visualizer3D{
    constructor(options={}){
        const scene = new Scene();
        this.engine = options.engine
        //const horizonPlaneGeometry = new PlaneGeometry( 1024, 1024 );
        //horizonPlaneGeometry.translate( 8, 8, -0.001 );
        /*const horizonPlaneGeometry = new PlaneGeometry( 48, 48 );
        horizonPlaneGeometry.translate( 8, 8, -0.001 ); // 24-16 add half the size then offset
        const horizonMaterial = new MeshPhongMaterial({
            color: "#FFFFFF", 
            flatShading: false
        });
        const horizonPlane = new Mesh( horizonPlaneGeometry, horizonMaterial );
        //horizonPlane.position.x += 24;
        //horizonPlane.position.y += 24;
        scene.add(horizonPlane);*/
        /*
        const horizonPlane = new Mesh( horizonPlaneGeometry, horizonMaterial );
        scene.add(horizonPlane);
        //*/
        this.markers = [];
        console.log('^^', options.width, options.height)
        const renderer = createRenderer();
        renderer.setSize((options.width), (options.height), false);
        this.renderer = renderer;
        //container.append(renderer.domElement);
        const { ambient, directional } = createLights({ 
            ambient : {},
            directional : { 
                shadows: true, 
                position : new Vector3(8, 8, 0)
            }
        });
        this.directional = directional;
        scene.add(ambient);
        scene.add(directional);
        
        scene.background = new Color('#99AAEE');
        const { camera, controls } = createCamera({
            type: 'orbital',
            dom: renderer.domElement,
            aspectRatio: (window.innerWidth / window.innerHeight)
        });
        controls.update();
        this.controls = controls;
        
        this.scene = scene;
        this.camera = camera;
    }
    
    addMarker(incomingMarker){
        const marker = (
            incomingMarker instanceof Marker
        )?incomingMarker:new Marker(incomingMarker);
        this.markers.push(marker);
        this.scene.add(marker.mesh);
        tools((tool)=>{
            tool.axes(marker.position)
        });
    }
    
    addSubmesh(incomingSubmesh){
        const submesh = (
            incomingSubmesh instanceof Submesh
        )?incomingSubmesh:new Submesh(incomingSubmesh);
        if(!submesh.mesh){
            submesh.mesh = submesh.model();
        }
        //this.markers.push(submesh);
        this.scene.add(submesh.mesh);
        tools((tool)=>{
            tool.axes(submesh.position, 2)
        });
    }
    
    
    update(states){
        states.markers.forEach((changedMarker)=>{
            this.markers.forEach((existingMarker)=>{
                if(existingMarker.id === changedMarker.id){
                    existingMarker.mesh.position.x = changedMarker.position.x;
                    existingMarker.mesh.position.y = changedMarker.position.y;
                    existingMarker.mesh.position.z = changedMarker.position.z;
                    existingMarker.mesh.quaternion.x = changedMarker.quaternion.x;
                    existingMarker.mesh.quaternion.y = changedMarker.quaternion.y;
                    existingMarker.mesh.quaternion.z = changedMarker.quaternion.z;
                    existingMarker.mesh.quaternion.w = changedMarker.quaternion.w;
                }
            });
        });
    }
    
    start(engine, turnHandler){
        this.renderer.setAnimationLoop(() => {
            //if(window.tools) window.tools.tickStart();
            //if(directional.tick) directional.tick();
            this.controls.update();
            this.renderer.render(this.scene, this.camera);
            //if(window.tools) window.tools.tickStop();
            if(turnHandler) turnHandler();
        }, 100);
        engine.on('remove-submesh', (submesh)=>{
            this.scene.remove(submesh.mesh);
            submesh.mesh.material.color.set(0x0000ff);
            console.log('RMSBMSH', submesh);
        });
        engine.on('remove-markers', (markers)=>{
            markers.forEach((marker)=>{
                this.scene.remove(marker.mesh);
            })
        });
    }
    
    attach(el){
        this.el = el;
        enable({ 
            scene:this.scene, 
            renderer: this.renderer, 
            light: this.directional, 
            camera: this.camera, 
            container: this.el,
            treadmill: this.engine
        });
        el.appendChild(this.renderer.domElement);
    }
}