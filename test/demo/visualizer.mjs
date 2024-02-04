import { Canvas } from '@environment-safe/canvas';
import { Marker } from 'marker-engine';

export class Visualizer{
    constructor(){
        this.canvas = Canvas({ height:48*10, width:48*10 });
        this.markers = [];
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
                    existingMarker.mesh.position.x = changedMarker.position.x;
                    existingMarker.mesh.position.y = changedMarker.position.y;
                    existingMarker.mesh.position.z = changedMarker.position.z;
                    existingMarker.mesh.quaternion.x = changedMarker.quaternion.x;
                    existingMarker.mesh.quaternion.y = changedMarker.quaternion.y;
                    existingMarker.mesh.quaternion.z = changedMarker.quaternion.z;
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
        this.markers.forEach((existingMarker)=>{
            context.beginPath();
            context.arc(
                existingMarker.mesh.position.x, 
                existingMarker.mesh.position.y, 
                10, 0, 2 * Math.PI
            );
            context.stroke();
        });
    }
    
    start(turnHandler){
        const drawLoop = ()=>{
            this.draw();
            if(turnHandler) turnHandler();
            setTimeout(drawLoop, 500);
        };
        drawLoop();
    }
    
    attach(el){
        el.appendChild(this.canvas);
        this.canvas.removeAttribute('hidden');
    }
}