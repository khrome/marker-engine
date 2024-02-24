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
        
        const renderer = createRenderer();
        renderer.setSize(480, 480, false);
        this.renderer = renderer;
        //container.append(renderer.domElement);
        const { ambient, directional } = createLights({ 
            ambient : {},
            directional : { 
                shadows: true, 
                position : new Vector3(8, 8, 0)
            }
        });
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
        
        const selection = Marker.enableSelection({ 
            container: document.body, 
            camera, 
            renderer, 
            treadmill,
            onMouseOver: (marker)=>{
                console.log('mouseover', marker);
                /*
                if(marker.mesh.highlightedOutline && !selection.contains(marker)){
                    marker.mesh.highlightedOutline.position.copy(marker.mesh.position);
                    scene.add(marker.mesh.highlightedOutline);
                } //*/
            },
            onMouseAway: (marker)=>{
                /*
                if(marker.mesh.highlightedOutline && !selection.contains(marker)){
                    scene.remove(marker.mesh.highlightedOutline);
                } //*/
            },
            onSelect: (marker)=>{
                console.log('select', marker);
                /*if(marker.mesh.selectedOutline){
                    marker.mesh.selectedOutline.position.copy(marker.mesh.position);
                    scene.add(marker.mesh.selectedOutline);
                }*/
            },
            onDeselect: (marker)=>{
                /*if(marker.mesh.selectedOutline){
                    console.log('deselect', marker);
                    scene.remove(marker.mesh.selectedOutline);
                } //*/
            },
            markerTypes: [Cube]
        });
        
        enable({ scene, renderer, light: directional , camera });
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
        });
        engine.on('remove-markers', (markers)=>{
            markers.forEach((marker)=>{
                this.scene.remove(marker.mesh);
            })
        });
    }
    
    attach(el){
        el.appendChild(this.renderer.domElement);
    }
}