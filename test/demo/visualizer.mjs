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
        console.log('states', states);
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