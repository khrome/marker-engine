/*
import { isBrowser, isJsDom } from 'browser-or-node';
import * as mod from 'module';
import * as path from 'path';
let internalRequire = null;
if(typeof require !== 'undefined') internalRequire = require;
const ensureRequire = ()=> (!internalRequire) && (internalRequire = mod.createRequire(import.meta.url));
//*/
import { Worker } from './worker.mjs';
import { Marker } from './marker.mjs';
import { Submesh } from './submesh.mjs';
import { allTiles, neighbors, weldTreadmill } from './tiles.mjs';
import { tools, enable } from './development.mjs';

export { Marker, tools, enable };

import {
    Clock
} from "three";

/**
 * A JSON object
 * @typedef { object } JSON
 */
import { Emitter } from 'extended-emitter';
 
export class MarkerEngine{
    constructor(options={}){
        this.options = options;
        this.emitter = new Emitter();
        this.tileOffsets = {
            x: this.options.x || 0,
            y: this.options.y || 0
        };
        (this.emitter).onto(this);
        this.submeshes = {};
        this.markers = [];
        this.on('submesh-data', (submeshData)=>{
            const submesh = new Submesh(submeshData);
            this.addSubmesh(submesh);
            this.submeshes[submeshData.location] = submesh;
            if(Object.keys(this.submeshes).length === 9){
                weldTreadmill(this.submeshes);
                Object.keys(this.submeshes).forEach((key)=>{
                    this.emit('submesh', this.submeshes[key]);
                });
                this.emit('load', {});
                //now it's time to weld the submeshes edge-to-edge
            }
        });
        this.on('treadmill-transition', ({x, y})=>{
            const submeshes = {};
            let newPosition = null;
            let neighborhood = null;
            Object.keys(this.submeshes).forEach((key)=>{
                //change position
                this.submeshes[key].mesh.position.x += x*16;
                this.submeshes[key].mesh.position.y += y*16;
                //remap by submesh name
                newPosition = null;
                neighborhood = neighbors(key);
                if(x === -1) newPosition = neighborhood.west;
                if(x === 1) newPosition = neighborhood.east;
                if(newPosition){
                    neighborhood = neighbors(newPosition);
                }
                if(y === -1) newPosition = neighborhood.south;
                if(y === 1) newPosition = neighborhood.north;
                if(newPosition) submeshes[newPosition] = this.submeshes[key];
            });
            this.submeshes = submeshes;
            this.markers.forEach((marker)=>{
                marker.mesh.position.x += x*16;
                marker.mesh.position.y += y*16;
            });
        });
    }
    
    focusOn(marker){
        this.worker.postMessage(JSON.stringify({
            type: 'focus',
            id: marker.id
        }));
    }
    
    worldPositionFor(localPosition){
        return {
            x: localPosition.x + this.submeshes.current.worldX*16,
            y: localPosition.y + this.submeshes.current.worldY*16,
            z: 0
        }
    }
    localPositionFor(worldPosition){
        if(!this.submeshes.current){
            //this should only happen while submeshes are loading
            return worldPosition;
        }
        return {
            x: worldPosition.x - this.submeshes.current.worldX*16,
            y: worldPosition.y - this.submeshes.current.worldY*16,
            z: 0
        }
    }
    
    addMarker(marker){
        //add the marker to the
        marker.engine = this;
        marker.mesh = marker.model();
        marker.normalizeMesh();
        const data = marker.data({includeValues: true});
        marker.mesh.position.x = marker.position.x;
        marker.mesh.position.y = marker.position.y;
        marker.mesh.position.z = marker.position.z;
        marker.mesh.quaternion.x = marker.quaternion.x;
        marker.mesh.quaternion.y = marker.quaternion.y;
        marker.mesh.quaternion.z = marker.quaternion.z;
        marker.mesh.quaternion.w = marker.quaternion.w;
        this.markers.push(marker);
        this.worker.postMessage(JSON.stringify({
            type: 'add-marker',
            marker: data
        }));
        console.log('added marker')
    }
    
    addSubmesh(submesh){
        //add the marker to the
        submesh.engine = this;
        submesh.mesh = submesh.model();
        const data = submesh.data();
        submesh.mesh.position.x = submesh.x*16;
        submesh.mesh.position.y = submesh.y*16;
        submesh.mesh.position.z = 0;
        submesh.mesh.quaternion.x = 0;
        submesh.mesh.quaternion.y = 0;
        submesh.mesh.quaternion.z = 0;
        submesh.mesh.quaternion.w = 0;
        this.worker.postMessage(JSON.stringify({
            type: 'add-submesh',
            submesh: data
        }));
        console.log('added submesh')
    }
    
    async initialize(){
        try{
            const url = new URL('./messaging.mjs', import.meta.url);
            this.worker = new Worker(url, {type:'module'});
            this.worker.onmessage = (e)=>{
                const data = JSON.parse(e.data);
                if(data.type === 'state'){
                    this.emit('state', data.state)
                }
                if(data.type == 'submesh-update'){
                    data.submesh.forEach((submeshData)=>{
                        this.emit('submesh-data', submeshData);
                    });
                }
                if(data.type == 'treadmill-transition'){
                    this.emit('treadmill-transition', data.transition);
                }
            };
            this.worker.postMessage(JSON.stringify({
                type: 'world',
                world: this.options
            }));
            
        }catch(ex){
            consle.log('WORKER INIT ERROR', ex)
        }
    }
    
    start(){
        this.worker.postMessage(JSON.stringify({type: 'start'}));
    }
    
    stop(){
        this.worker.postMessage(JSON.stringify({type: 'stop'}));
    }
    
    cleanup(){
        this.worker.terminate();
    }
    
}

export { Submesh }