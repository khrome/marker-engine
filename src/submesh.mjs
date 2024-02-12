//*
import * as CANNON from './cannon-es.mjs';
const {
    Body,
    Cylinder,
    Quaternion,
    Trimesh,
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
        return this.voxelMesh.getSubmeshVoxels(this.x, this.y, 2)
    }
    
    coordinates(){
        if(!this.voxelData){
            this.voxelData = this.voxels();
        }
        return this.voxelMesh.getCoordsFromVoxels(this.x, this.y, 2, this.voxelData);
    }
    
    model(){
        const coords = this.coordinates();
        return this.voxelMesh.getSubmesh(this.x, this.y, 2, coords, material.visual);
    }
    
    body(){
        const coords = this.coordinates();
        const body = new Body({
            shape: new Trimesh(coords, coords.map((item, index)=>index)),
            type: Body.STATIC,
            material: material.physical
            //mass:5
        });
        return body;
    }
    
    data(){
        return {
            voxels: (this.voxelData || this.voxels()),
            position:{
                x: this.mesh.position.x,
                y: this.mesh.position.y,
                z: 0
            }
        }
    }
}
//*/