import { 
    Scene,
    PlaneGeometry,
    Mesh,
    Vector3,
    Color,
    MeshPhongMaterial
} from 'three';

import { Marker } from '../../src/index.mjs';

import { create as createLights } from './lighting.mjs';
import { create as createCamera } from './camera.mjs';
import { create as createRenderer } from './renderer.mjs';
import { enable, tools } from '../../src/development.mjs';

export class Visualizer3D{
    constructor(options={}){
        const scene = new Scene();
        
        //const horizonPlaneGeometry = new PlaneGeometry( 1024, 1024 );
        //horizonPlaneGeometry.translate( 8, 8, -0.001 );
        const horizonPlaneGeometry = new PlaneGeometry( 48, 48 );
        horizonPlaneGeometry.translate( 8, 8, -0.001 ); // 24-16 add half the size then offset
        const horizonMaterial = new MeshPhongMaterial({
            color: "#FFFFFF", 
            flatShading: false
        });
        const horizonPlane = new Mesh( horizonPlaneGeometry, horizonMaterial );
        //horizonPlane.position.x += 24;
        //horizonPlane.position.y += 24;
        scene.add(horizonPlane);
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
        console.log('ADDED', marker.mesh, marker.mesh.position.x, marker.mesh.position.y)
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