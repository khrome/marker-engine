//*
import * as CANNON from './cannon-es.mjs';
const {
    Body,
    Cylinder,
    Quaternion,
    Trimesh,
    Material,
    Vec3,
    Sphere
} = CANNON;

 import {
    CylinderGeometry,
    MeshPhongMaterial,
    Mesh,
    Group,
    Matrix4,
    Raycaster,
    Quaternion as Quat3,
    Euler,
    LineSegments,
    EdgesGeometry,
    LineBasicMaterial,
    Vector2,
    Vector3
} from '../node_modules/three/build/three.module.js';

import { tools } from './development.mjs';
import { createVoxelMesh } from './voxel-mesh.mjs';
//*
const defaultVoxelMesh = createVoxelMesh('test-seed', 16);
//*/

//*
export class Submesh{
    constructor(options={}){
        console.log('>>>')
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.voxelData = options.voxels || [];
        this.markers = [];
        this.voxelMesh = options.voxelMesh || defaultVoxelMesh;
    }
    
    addMarker(marker){
        this.markers.push(marker);
    }
    
    removeMarker(marker){
        const index = this.markers.indexOf(marker);
        if(index !== -1){
            this.markers.splice(index, 1);
        }
    }
    
    voxels(){
        if(!this.voxelData.length){
            this.voxelData = this.voxelMesh.getSubmeshVoxels(this.x, this.y, 2);
        }
        return this.voxelData;
    }
    
    coordinates(){
        if(!this.coords){
            this.coords = this.voxelMesh.getCoordsFromVoxels(this.x, this.y, 2, this.voxelData);
        }
        return this.coords;
    }
    
    model(){
        const groundMaterial = new MeshPhongMaterial({
            color: "#00FF00", 
            flatShading: false
        });
        const coords = this.coordinates();
        const model = this.voxelMesh.getSubmesh(this.x, this.y, 2, coords, groundMaterial);
        
        console.log('###', model)
        return model;
    }
    
    body(){
        const groundMaterial = new Material('ground')
        const coords = this.coordinates();
        const body = new Body({
            shape: new Trimesh(coords, coords.map((item, index)=>index)),
            type: Body.STATIC,
            material: groundMaterial
            //mass:5
        });
        return body;
    }
    
    data(){
        if(!this.voxelData.length){
            this.voxelData = this.voxels();
        }
        return {
            voxels: this.voxelData,
            x: this.x,
            y: this.y,
            position:{
                x: this.mesh.position.x,
                y: this.mesh.position.y,
                z: 0
            }
        }
    }
    
    weld(partnerSubmesh, edge, target='that'){
        weldSubmesh(this, partnerSubmesh, target, edge)
    }
};

const weldSubmesh = (submeshA, submeshB, target, edge)=>{
    let llo = (submeshA.size-1)*submeshA.size*3*3;
    switch(edge){
        case 'bottom':
            if(target === 'this' || !target){
            }else{
                let updateIndices = [];
                let x=0;
                let len = Math.floor(submeshB.coords.length/3);
                for(;x < len; x++){
                    if(
                        submeshB.coords[x*3+1] === 0
                    ){
                        updateIndices.push(x*3)
                    }
                }
                let offset = llo*3;
                let subsearch = submeshA.coords //.slice(offset);
                let lcv=0;
                let item = {x:null, y:null, z:null}
                for(;lcv < updateIndices.length; lcv ++){

                    let updateIndex = updateIndices[lcv];
                    let result = null;
                    let index=0; 
                    for(;index < subsearch.length; index+=3){
                        item.x = subsearch[index];
                        item.y = subsearch[index+1];
                        item.z = subsearch[index+2];
                        if(
                            submeshB.coords[updateIndex] === item.x &&
                            submeshB.coords[updateIndex+1] === submeshB.size - item.y
                        ){
                            result = item;
                            submeshA.coords[index+2] = submeshB.coords[updateIndex+2];
                        }
                    }
                }
                //submeshA.refreshGeometry();
            }
            break;
        case 'top':
            break;
        case 'right':
            break;
        case 'left':
            if(target === 'this' || !target){
            }else{
                let updateIndices = [];
                let x=0;
                let len = Math.floor(submeshB.coords.length/3);
                for(;x < len; x++){
                    if(
                        submeshB.coords[x*3] === 0
                    ){
                        updateIndices.push(x*3)
                    }
                }
                let offset = llo*3;
                let subsearch = submeshA.coords //.slice(offset);
                let lcv=0;
                let item = { x:null, y:null, z:null };
                for(;lcv < updateIndices.length; lcv ++){

                    let updateIndex = updateIndices[lcv];
                    let result = null;
                    let index=0; 
                    for(;index < subsearch.length; index+=3){
                        item.x = subsearch[index];
                        item.y = subsearch[index+1];
                        item.z = subsearch[index+2];
                        if(
                            submeshB.coords[updateIndex] === submeshA.size - item.x &&
                            submeshB.coords[updateIndex+1] === item.y
                        ){
                            result = item;
                            submeshA.coords[index+2] = submeshB.coords[updateIndex+2];
                        }
                    }
                }
                //submeshA.refreshGeometry();
            }
            break;
    }
};
//*/