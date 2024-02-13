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
        return this.voxelMesh.getSubmeshVoxels(this.x, this.y, 2)
    }
    
    coordinates(){
        if(!this.voxelData.length){
            this.voxelData = this.voxels();
        }
        return this.voxelMesh.getCoordsFromVoxels(this.x, this.y, 2, this.voxelData);
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
}
//*/