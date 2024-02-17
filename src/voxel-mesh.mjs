import { 
    Random 
} from "./random.mjs";
//*
import {
    BufferGeometry,
    Float32BufferAttribute,
    Mesh,
    MeshNormalMaterial,
    MeshBasicMaterial,
    MeshPhongMaterial,
    MeshToonMaterial,
    MeshLambertMaterial,
    DoubleSide
} from "../node_modules/three/build/three.module.js";
import { ValueNoise } from './perlin.mjs'
function createGroundMesh(coords, groundMaterial) {
    const geometry = new BufferGeometry();

    const positions = coords;

    geometry.setAttribute( 'position', new Float32BufferAttribute( positions, 3 ) );
    geometry.computeVertexNormals();

    const material = groundMaterial || new MeshPhongMaterial({
      color: 0x00CC00,    // red (can also use a CSS color string here)
      flatShading: false,
    });

    const object = new Mesh( geometry, material );
    return object;
}
class VoxelCompute {
    constructor(seed, opts) {
        const options = opts || {};
        this.layerCount = options.layerCount || 3;
        this.submeshSize = options.submeshSize || 32;
        this.offset = 1;
        this.extent = this.submeshSize;
        this.layerScaleFactor = 10;
        this.seed = seed;
        this.layers = [];
        this.bottom = -1;
        this.top = 1;
        let lcv = 0;
        let direction = 1;
        for(; lcv < this.layerCount; lcv++){
            this.layers.push(new VoxelLayer(
                `${this.seed}-submesh-layer-${lcv}`, 
                direction * (lcv+1) * this.offset
            ));
            direction = direction * -1;
        }
    }

    getHeight(x, y, readDepth){ //todo: support updates as res enhances
        if(this.layerCount < readDepth) throw new Error('Voxel compute context not that deep');
        let height = 0;
        this.layers.forEach((layer, index)=>{
            if(index > readDepth) return;
            let factor = (this.layerScaleFactor ^ (this.layers.length - index - 1)) || 1;
            height = height + layer.getHeightAt(Math.floor(x/factor), Math.floor(y/factor));
        });
        return height;
    }

    getSeed(x, y){
        return `${this.seed}-submesh-${x}-${y}`
    }

    getSubMesh(x, y, readDepth){ //todo: support updates as res enhances
        //todo: pluggable heightmap logic
        const xRandom = new Random(`${this.getSeed(x, y)}-random-x`);
        const yRandom = new Random(`${this.getSeed(x, y)}-random-y`);
        console.log('RND', xRandom, yRandom)
        const xSeeds = [];
        const ySeeds = [];
        let lcv = 0;
        for(;lcv < this.extent; lcv++){
            xSeeds.push(xRandom.random());
            ySeeds.push(yRandom.random());
        }
        const halfSubmesh = Math.floor(this.submeshSize / 2)
        const values = [];
        let yExtent = 0;
        for(;yExtent < this.extent; yExtent++){
            let xExtent = 0;
            let yMod = ((yExtent <= halfSubmesh)?(1-(yExtent/halfSubmesh)):(yExtent-halfSubmesh)/halfSubmesh)*0.5;
            for(;xExtent < this.extent; xExtent++){
                let xMod = ((xExtent <= halfSubmesh)?(1-(xExtent/halfSubmesh)):(xExtent-halfSubmesh)/halfSubmesh)*0.5;
                let xIndex = xRandom.random() > 0.5?(xExtent+yExtent)%this.submeshSize:xExtent;
                let yIndex = yRandom.random() > 0.5?(xExtent+yExtent)%this.submeshSize:yExtent;
                values.push(xSeeds[xIndex]*(0.5-yMod+xMod) + ySeeds[yIndex]*(0.5+yMod-xMod));
            }
        }
        return values.map((value)=>(this.top - this.bottom) * value + this.bottom);
    }
}

class VoxelLayer {
  constructor(seed, offset) {
    this.positions = [];
    this.random = new Random(seed);
    this.offset = offset;
    this.perlin = new ValueNoise();
  }
  // Getter
  getHeightAt(x, y){
    console.log("sx,sy", x, y);
    this.perlin.evalXY(x,y);
    //return this.getPosition(x * this.offset + y);
  }

  getPosition(pos){
    if(this.positions.length < pos){
        let lcv = this.positions.length-1;
        for(;lcv <= pos; lcv++){
            this.positions[lcv] = (((lcv > 0)?this.positions[lcv-1]:0)*0.9+ (this.random.random()-0.5)*0.1);
        }
    } 
    return this.positions[pos]
  }
}

const flatArrayTo2DArray  = (arr, size)=>{
    return arr.reduce((agg, item)=>{
        if(agg[agg.length-1].length === size) agg.push([]);
        agg[agg.length-1].push(item);
        return agg;
    }, [[]])
}

const vox = {
    left : (thisIndex, rowSize, array) => array[thisIndex - 1], 
    right : (thisIndex, rowSize, array) => array[thisIndex + 1], 
    up : (thisIndex, rowSize, array) => array[thisIndex - rowSize], 
    down : (thisIndex, rowSize, array) => array[thisIndex + rowSize], 
    diagonal : {
        upleft: (thisIndex, rowSize, array) => array[thisIndex - rowSize - 1], 
        upright: (thisIndex, rowSize, array) => array[thisIndex - rowSize + 1],
        downleft: (thisIndex, rowSize, array) => array[thisIndex + rowSize - 1], 
        downright: (thisIndex, rowSize, array) => array[thisIndex + rowSize + 1], 
    },
}

const zeroSafeAverage = (v1, v2, v3, v4)=>{
    const vSum = v1 + v2 + v3 + v4;
    if(vSum === 0) return 0;
    else return vSum/4;
}

const voxelsToCoords  = (voxels, submeshSize)=>{
    let coords = [];
    voxels.forEach((voxel, index)=>{
        const x = index % submeshSize;
        const y = Math.floor(index / submeshSize);
        const tl = voxel;
        const tr = vox.right(index, submeshSize, voxels) || 0;
        const bl = vox.down(index, submeshSize, voxels) || 0;
        const br = vox.diagonal.downright(index, submeshSize, voxels) || 0;
        if(true){
            const tlp = [x, y, tl || 0];
            const trp = [x+1, y, tr || 0];
            const blp = [x, y+1, bl || 0];
            const brp = [x+1, y+1, br || 0];
            const php = [
                (tlp[0] + trp[0] + blp[0] + brp[0])/4,
                (tlp[1] + trp[1] + blp[1] + brp[1])/4,
                (tlp[2] + trp[2] + blp[2] + brp[2])/4,
            ];
            if(isNaN(php[0])) php[0] = 0;
            if(isNaN(php[1])) php[1] = 0;
            const face1 = (typeof tl === 'number' && typeof bl === 'number')?blp.concat(tlp).concat(php):[];
            const face2 = (typeof tl === 'number' && typeof tr === 'number')?tlp.concat(trp).concat(php):[];
            const face3 = (typeof tr === 'number' && typeof br === 'number')?trp.concat(brp).concat(php):[];
            const face4 = (typeof bl === 'number' && typeof br === 'number')?brp.concat(blp).concat(php):[];
            coords = coords.concat(face1.concat(face2).concat(face3).concat(face4))
        }
    });
    return coords;
}

function createVoxelMesh(worldSeed, submeshSize) {
    const context = new VoxelCompute(worldSeed, {submeshSize});
    return {
        getSeed : (x, y) => {
            return context.getSeed(x, y);
        },
        getSubmesh : (x, y, depth, coords, material) => {
            const groundMesh = createGroundMesh(coords, material);
            return groundMesh;
        },
        getCoordsFromVoxels : (x, y, depth, voxels) => {
            const submesh = voxels || context.getSubMesh(x, y, depth);
            const voxelGroundMeshCoords = voxelsToCoords(submesh, submeshSize);
            return voxelGroundMeshCoords;
        },
        getSubmeshVoxels : (x, y, depth) => {
            return context.getSubMesh(x, y, depth);
        },
        submeshSize: context.submeshSize
    };
}

const generateMeshCreationFromVoxelFn = (makeVoxels)=>{
    return (worldSeed, submeshSize)=>{
        const context = {
            getSeed : (x, y) => {
                return `${worldSeed}-${x}-${y}`;
            },
            getSubmesh : (x, y, depth, coords, material) => {
                const groundMesh = createGroundMesh(coords, material);
                return groundMesh;
            },
            getCoordsFromVoxels : (x, y, depth, voxels) => {
                const submesh = voxels || context.getSubmeshVoxels(x, y, depth);
                const voxelGroundMeshCoords = voxelsToCoords(submesh, submeshSize);
                return voxelGroundMeshCoords;
            },
            getSubmeshVoxels : (x, y, depth) => {
                const voxels =  makeVoxels(x, y, depth);
                return voxels;
            },
            submeshSize
        };
        
        return context;
    }
};

export { createVoxelMesh, generateMeshCreationFromVoxelFn };