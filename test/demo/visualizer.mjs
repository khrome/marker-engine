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
    
    drawPoint(context, marker, target, treadmill){
        context.strokeStyle = '#000000'
        context.fillStyle = marker.color || marker.values.color || '#FF0000';
        context.beginPath();
        const pos = {
            x: (marker.mesh.position.x+16)*10, 
            y: ((32 - marker.mesh.position.y)*10), 
        };
        //circle
        context.arc(
            pos.x, 
            pos.y, 
            10, 0, 2 * Math.PI
        );
        context.fill();
        context.stroke();
        //coords
        context.fillStyle = '#FFFFFF';
        const labelText = `(${
            marker.mesh.position.x.toPrecision(2)
        }, ${
            marker.mesh.position.y.toPrecision(2)
        })`;
        //*
        context.fillText(
            labelText, 
            pos.x-0.5, 
            pos.y-0.5
        );
        context.fillText(
            labelText, 
            pos.x+0.5, 
            pos.y+0.5
        ); //*/
        context.fillStyle = '#000000'
        context.fillText(
            labelText, 
            pos.x, 
            pos.y
        );
        if(marker.target){
            const localPoint = treadmill.localPositionFor(marker.target|| target)
            const targ = {
                x: (localPoint.x+16)*10, 
                y: (32 - localPoint.y)*10
            };
            context.beginPath();
            // angle
            context.strokeStyle = '#999999'
            //const r = Mat.sqrt(marker.target.x^2 + marker.target.y^2);
            context.moveTo(pos.x, pos.y);
            context.lineTo(targ.x, targ.y);
            context.stroke();
            context.beginPath();
            context.strokeStyle = '#FFFFFF'
            context.moveTo(targ.x-5, targ.y);
            context.lineTo(targ.x+5, targ.y);
            context.moveTo(targ.x, targ.y-5);
            context.lineTo(targ.x, targ.y+5);
            context.stroke();
        }
        context.beginPath();
        // angle
        context.strokeStyle = '#FFFFFF'
        const r = 20;
        //const angle = marker.mesh.rotation.z;
        //context.moveTo(pos.x, pos.y);
        //context.lineTo(pos.x + 20 * Math.cos(angle), pos.y + 20 * Math.sin(angle));
        //context.stroke();
    }
    
    draw(treadmill){
        const context = this.canvas.getContext('2d');
        context.strokeStyle = '#000000';
        context.fillStyle = '#FF0000';
        context.fillRect(
            0, 
            0,
            this.canvas.width,
            this.canvas.height
        );
        context.font = "12px serif";
        // grid
        context.beginPath();
        context.moveTo(16*10, 0);
        context.lineTo(16*10, 48*10);
        context.moveTo(0, 16*10);
        context.lineTo(48*10, 16*10);
        context.moveTo(32*10, 0);
        context.lineTo(32*10, 48*10);
        context.moveTo(0, 32*10);
        context.lineTo(48*10, 32*10);
        context.stroke();
        this.markers.forEach((existingMarker)=>{
                this.drawPoint(context, existingMarker, existingMarker.target, treadmill);
        });
    }
    
    start(engine, turnHandler){
        const drawLoop = ()=>{
            this.draw(engine);
            if(turnHandler) turnHandler();
            setTimeout(drawLoop, 0);
        };
        drawLoop();
    }
    
    attach(el){
        el.appendChild(this.canvas);
        this.canvas.removeAttribute('hidden');
    }
}