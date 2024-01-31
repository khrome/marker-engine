import { 
    Scene,
    PlaneGeometry,
    Mesh,
    Vector3,
    Color,
    MeshPhongMaterial
} from 'three';

import { create as createLights } from './lighting.mjs';
import { create as createCamera } from './camera.mjs';
import { create as createRenderer } from './renderer.mjs';


export class Visualizer3D{
    constructor(){
        const scene = new Scene();
        
        const horizonPlaneGeometry = new PlaneGeometry( 1024, 1024 );
        horizonPlaneGeometry.translate( 8, 8, -0.001 );
        const horizonMaterial = new MeshPhongMaterial({
            color: "#00FF00", 
            flatShading: false
        });
        const horizonPlane = new Mesh( horizonPlaneGeometry, horizonMaterial );
        scene.add(horizonPlane);
        this.markers = [];
        
        const renderer = createRenderer();
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
    }
    
    addMarker(incomingMarker){
        const marker = (
            incomingMarker instanceof Marker
        )?incomingMarker:new Marker(incomingMarker);
        this.markers.push(marker)
    }
    
    update(states){
        states.markers.forEach((changedMarker)=>{
            this.markers.forEach((existingMarker)=>{
                if(existingMarker.id === changedMarker.id){
                    existingMarker.position.x = changedMarker.position.x;
                    existingMarker.position.y = changedMarker.position.y;
                    existingMarker.position.z = changedMarker.position.z;
                    existingMarker.orientation.x = changedMarker.orientation.x;
                    existingMarker.orientation.y = changedMarker.orientation.y;
                    existingMarker.orientation.z = changedMarker.orientation.z;
                }
            });
        });
    }
    
    draw(){
        const context = this.canvas.getContext('2d');
        context.fillStyle = '#FF0000';
        context.fillRect(
            0, 
            0,
            this.canvas.width,
            this.canvas.height
        );
    }
    
    start(turnHandler){
        this.renderer.setAnimationLoop(() => {
            //if(window.tools) window.tools.tickStart();
            //if(directional.tick) directional.tick();
            this.controls.update();
            this.renderer.render(this.scene, this.camera);
            //if(window.tools) window.tools.tickStop();
            if(turnHandler) turnHandler();
        }, 100);
    }
    
    attach(el){
        el.appendChild(this.renderer.domElement);
    }
}