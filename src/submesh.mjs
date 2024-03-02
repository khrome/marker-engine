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
import { 
    createVoxelMesh as defaultMesh, 
    generateMeshCreationFromVoxelFn 
} from './voxel-mesh.mjs';

let createVoxelMesh = defaultMesh;
/*
const defaultVoxelMesh = createVoxelMesh('test-seed', 16);
//*/

const copyColumnCoords = (originSubmesh, destinationSubmesh, originCol, destinationCol)=>{
    const updateIndex = {};
    let x=0;
    let len = originSubmesh.coords.length;
    for(;x < len; x += 3){
        if(
            originSubmesh.coords[x] === originCol
        ){
            if(!updateIndex[originSubmesh.coords[x+1]]){
                updateIndex[originSubmesh.coords[x+1]] = originSubmesh.coords[x+2]; // z for x
            }else{
                if(updateIndex[originSubmesh.coords[x+1]] !== originSubmesh.coords[x+2]){
                    throw new Error('discontinuous mesh!');
                }
            }
        }
    }
    len = destinationSubmesh.coords.length;
    x=0;
    let orig = null
    for(;x < len; x += 3){
        if(
            destinationSubmesh.coords[x] === destinationCol
        ){
            orig = destinationSubmesh.coords[x+2];
            destinationSubmesh.coords[x+2] = updateIndex[
                destinationSubmesh.coords[x+1]
            ];
        }
    }
    let reaverage = null;
    if(destinationCol === 0){
        reaverage = 0.5;
    }
    if(destinationCol === 16){
        reaverage = 15.5;
    }
    if(reaverage){
        let quadIndex = null;
        const quadInc = 3 * 3 * 4;
        for(;quadIndex < len; quadIndex += quadInc){
            if(
                destinationSubmesh.coords[quadIndex+6] === reaverage &&
                destinationSubmesh.coords[quadIndex+15] === reaverage &&
                destinationSubmesh.coords[quadIndex+24] === reaverage &&
                destinationSubmesh.coords[quadIndex+33] === reaverage
            ){
                const zValue = (
                    destinationSubmesh.coords[quadIndex+2] +
                    destinationSubmesh.coords[quadIndex+5] +
                    destinationSubmesh.coords[quadIndex+11] +
                    destinationSubmesh.coords[quadIndex+14] +
                    destinationSubmesh.coords[quadIndex+20] +
                    destinationSubmesh.coords[quadIndex+23] + 
                    destinationSubmesh.coords[quadIndex+29] +
                    destinationSubmesh.coords[quadIndex+32]
                ) / 8
                destinationSubmesh.coords[quadIndex+8] = zValue;
                destinationSubmesh.coords[quadIndex+17] = zValue;
                destinationSubmesh.coords[quadIndex+26] = zValue;
                destinationSubmesh.coords[quadIndex+35] = zValue;
            }
        }
    }
    
};

const copyRowCoords = (originSubmesh, destinationSubmesh, originRow, destinationRow)=>{
    const updateIndex = {};
    let x=0;
    let len = originSubmesh.coords.length;
    for(;x < len; x += 3){
        if(
            originSubmesh.coords[x+1] === originRow
        ){
            if(!updateIndex[originSubmesh.coords[x]]){
                updateIndex[originSubmesh.coords[x]] = originSubmesh.coords[x+2]; // z for x
            }else{
                if(updateIndex[originSubmesh.coords[x]] !== originSubmesh.coords[x+2]){
                    throw new Error('discontinuous mesh!');
                }
            }
        }
    }
    len = destinationSubmesh.coords.length;
    x=0;
    let orig = null
    for(;x < len; x += 3){
        if(
            destinationSubmesh.coords[x+1] === destinationRow
        ){
            orig = destinationSubmesh.coords[x+2];
            destinationSubmesh.coords[x+2] = updateIndex[
                destinationSubmesh.coords[x]
            ];
            //console.log('SET', x % (16*3), destinationRow, orig, destinationSubmesh.coords[x+2])
        }
    }
    let reaverage = null;
    if(destinationRow === 16){
        reaverage = 15.5;
    }
    if(destinationRow === 0){
        reaverage = 0.5;
    }
    if(reaverage){
        let quadIndex = null;
        const quadInc = 3 * 3 * 4;
        for(;quadIndex < len; quadIndex += quadInc){
            if(
                destinationSubmesh.coords[quadIndex+7] === reaverage &&
                destinationSubmesh.coords[quadIndex+16] === reaverage &&
                destinationSubmesh.coords[quadIndex+25] === reaverage &&
                destinationSubmesh.coords[quadIndex+34] === reaverage
            ){
                const zValue = (
                    destinationSubmesh.coords[quadIndex+2] +
                    destinationSubmesh.coords[quadIndex+5] +
                    destinationSubmesh.coords[quadIndex+11] +
                    destinationSubmesh.coords[quadIndex+14] +
                    destinationSubmesh.coords[quadIndex+20] +
                    destinationSubmesh.coords[quadIndex+23] + 
                    destinationSubmesh.coords[quadIndex+29] +
                    destinationSubmesh.coords[quadIndex+32]
                ) / 8
                destinationSubmesh.coords[quadIndex+8] = zValue;
                destinationSubmesh.coords[quadIndex+17] = zValue;
                destinationSubmesh.coords[quadIndex+26] = zValue;
                destinationSubmesh.coords[quadIndex+35] = zValue;
            }
        }
    }
    
};

//*
export class Submesh{
    constructor(options={}){
        if(!options.tileX) console.log(new Error().stack);
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.worldX = options.tileX || options.x || 0;
        this.worldY = options.tileY || options.y || 0;
        this.voxelData = options.voxels || [];
        this.markers = [];
        this.size = 16;
        this.seed = `${options.seed || 'submesh-seed'}-${this.worldX}-${this.worldY}`;
        if(!options.voxelMesh) throw new Error('No Voxel Mesh!')
        this.voxelMesh = options.voxelMesh;
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
            this.voxelData = this.voxelMesh.getSubmeshVoxels(this.worldX, this.worldY, 2);
        }
        return this.voxelData;
    }
    
    coordinates(){
        if(!this.coords){
            this.coords = this.voxelMesh.getCoordsFromVoxels(this.x, this.y, 2, this.voxels());
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
        model.name = 'ground_mesh';
        if(!this.mesh) this.mesh = model;
        
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
        body.coords = coords;
        if(!this.mesh) this.mesh = body;
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
            tileX: this.worldX || this.x,
            tileY: this.worldY || this.y,
            position:{
                x: this.mesh.position.x,
                y: this.mesh.position.y,
                z: 0
            }
        }
    }
    
    refreshGeometry(){
        if(this.mesh){
            if(this.mesh.geometry){
                this.mesh.geometry.attributes.position.array = Float32Array.from(
                    this.coordinates()
                );
                this.mesh.geometry.attributes.position.needsUpdate = true;
                this.mesh.material.needsUpdate = true;
                this.mesh.geometry.computeVertexNormals();
            }else{
                //refresh physics mesh for 
                //this.body();
            }
            
        } //else no refresh
    }
    
    weld(partnerSubmesh, edge, target='that'){
        weldSubmesh(this, partnerSubmesh, target, edge);
    }
};

const weldSubmesh = (submeshA, submeshB, target, edge)=>{
    let llo = (submeshA.size-1)*submeshA.size*3*3;
    switch(edge){
        case 'bottom':
            if(target === 'this' || !target){
                console.log('no weld');
            }else{
                //copyRowCoords(submeshA, submeshB, 16, 0);
                copyRowCoords(submeshB, submeshA, 0, 16);
                submeshB.refreshGeometry();
            }
            break;
        case 'top':
            if(target === 'this' || !target){
                console.log('no weld');
            }else{
                copyRowCoords(submeshA, submeshB, 0, 16);
                submeshB.refreshGeometry();
            }
            break;
        case 'right':
            if(target === 'this' || !target){
                console.log('no weld');
            }else{
                copyColumnCoords(submeshA, submeshB, 0, 16);
                submeshB.refreshGeometry();
            }
            break;
        case 'left':
            if(target === 'this' || !target){
                console.log('no weld');
            }else{
                copyColumnCoords(submeshA, submeshB, 16, 0);
                submeshB.refreshGeometry();
            }
            break;
    }
};
//*/