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

export { Marker };

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
        (this.emitter).onto(this);
        this.submeshes = {};
    }
    
    addMarker(marker){
        //add the marker to the 
        const data = marker.data();
        marker.engine = this;
        marker.mesh = marker.model();
        this.worker.postMessage(JSON.stringify({
            type: 'add-marker',
            marker: data
        }));
        console.log('added')
    }
    
    async initialize(){
        const url = new URL('./messaging.mjs', import.meta.url);
        this.worker = new Worker(url, {type:'module'});
        this.worker.onmessage = (e)=>{
            const data = JSON.parse(e.data);
            if(data.type === 'state'){
                this.emit('state', data.state)
            }
        };
        this.worker.postMessage(JSON.stringify({
            type: 'world',
            world: this.options
        }));
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

export class MarkerSubmesh {
    constructor(){
        
    }
    
    addMarker(){
        //add the marker to the 
    }
    
    body(){
        
    }
}