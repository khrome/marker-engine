//import Stats from '../node_modules/stats.js/src/Stats.js';
import { 
    CameraHelper, 
    Color, 
    Scene, 
    AxesHelper, 
    Raycaster, 
    Vector2, 
    Vector3, 
    LineBasicMaterial, 
    MeshBasicMaterial,
    SphereGeometry,
    Mesh,
    BufferGeometry, 
    Line, 
    ArrowHelper 
} from '../node_modules/three/build/three.module.js';
//import { TextGeometry } from '../node_modules/three/examples/jsm/geometries/TextGeometry.js';
//import * as dat from 'dat.gui';
//import SpriteText from '../node_modules/three-spritetext/dist/three-spritetext.mjs';
import Logger from '../node_modules/bitwise-logger/bitwise-logger.js';

//export const tools=()=>{};
//export const enable=()=>{};
//*
const kvs = {}

const kv = (name)=> kvs[name] || '';

const digits = (num, places)=>{
    let factor = 1;
    let lcv=0;
    for(;lcv < places; lcv++) factor = factor * 10;
    return Math.floor(num*factor)/factor;
}

let arrow = {};
let point = {};
let fonts = {};
let textLabels = {};

//export { Logger };

let toolsInstance = null;
export const enable = ({ scene, clock, renderer, light, camera })=>{
    toolsInstance = new DevelopmentTools({ scene, clock, renderer, light, camera });
};

export const tools = (handler)=>{
    if(toolsInstance){
        handler(toolsInstance);
    }
};

export class DevelopmentTools{
    constructor(options={}){
        try{
            this.options = options;
            this.panes = {};
            this.stats = {};
            const colors = {};
            const colorFor = (name)=>{
                if(!colors[name]) colors[name] = (Math.random() * 0xffffff);
                return colors[name];
            };
            //*
            Logger.registerChannel({ // should work for any console.log() interface
                log: (level, message, ...data)=>{
                    data.forEach((item)=>{
                        if(item instanceof Raycaster){
                            this.showRay(item, message, colorFor(message));
                        }
                        if(item instanceof Vector3){
                            this.showPoint(item, message, colorFor(message));
                        }
                    });
                }
            }); //*/
        }catch(ex){
            console.log('error initializing dev tools')
        }
    }
    
    value(ob, value){
        if(ob && typeof ob === 'object' && !value){
            const safeOb = ob || {};
            Object.keys(safeOb).forEach((key)=>{
                kvs[key] = safeOb[key];
            });
        }else{ //individual value
            if(arguments.length == 2){
                kvs[ob] = value;
            }
            return kvs[ob];
        }
    }
    
    addShadowCamera(){
        this.cameraHelper = new CameraHelper(this.options.light.shadow.camera);
        this.options.scene.add(this.cameraHelper)
    }
    
    sceneAxes(point){
        var axesHelper = new AxesHelper( 5 );
        axesHelper.setColors('red', 'blue', 'green');
        if(point) axesHelper.position.set(point);
        this.options.scene.add( axesHelper );
    }
    
    axes(point){
        var axesHelper = new AxesHelper( 5 );
        axesHelper.setColors('red', 'blue', 'green');
        if(point) axesHelper.position.set(point);
        return axesHelper;
    }
    
    showRay(raycaster, name='default', color=(Math.random() * 0xffffff), incomingScene){
        const scene = incomingScene || this.options.scene;
        if(scene) scene.remove ( arrow[name] );
        arrow[name] = new ArrowHelper(
            raycaster.ray.direction, 
            raycaster.ray.origin, 
            40, 
            color 
        );
        if(scene) scene.add( arrow[name] );
    }
    
    showPoint(position, name='default', color=(Math.random() * 0xffffff), incomingScene){
        const scene = incomingScene || this.options.scene;
        if(scene) scene.remove ( point[name] );
        const geometry = new SphereGeometry( 0.5, 8, 8 );
        const material = new MeshBasicMaterial( { color: color } );
        point[name] = new Mesh( geometry, material );
        point[name].position.copy(position);
        if(scene) scene.add( point[name] );
        this.showTextLabel(name, position, name+'text', color, null, scene);
    }
    
    activateMeshTriangleSelection(container, renderer, scene, camera, treadmill){
        this.isSelectingTriangles = true;
        this.activateHoverInfo(container, renderer, scene, camera, treadmill);
    }
    
    activateHoverInfo(container, renderer, scene, camera, treadmill){
        container.addEventListener('mousemove', (event)=>{
            var raycaster = new Raycaster(); // create once
            var mouse = new Vector2(); // create once
            mouse.x = ( event.clientX / renderer.domElement.clientWidth ) * 2 - 1;
            mouse.y = - ( event.clientY / renderer.domElement.clientHeight ) * 2 + 1;
            raycaster.setFromCamera( mouse, camera );
            var intersects = null;
            try{ //can't do this mid-load
                intersects = raycaster.intersectObjects( treadmill.activeSubmeshMeshes(), true );
            }catch(ex){}
            if(intersects && intersects[0]){
                if(this.isSelectingTriangles){
                    const geometry = intersects[0]?.object?.geometry;
                    if(geometry){
                        const offset = intersects[0].faceIndex * geometry.attributes.position.itemSize*3;
                        const face = Array.prototype.slice.call(geometry.attributes.position.array, offset, offset+3*3);
                        const submeshName = scene.treadmill.positionOfMesh(intersects[0].object);
                        const submesh = scene.treadmill.submesh(submeshName);
                        this.value({ 
                            face, 
                            submesh: submeshName,
                            submeshX: submesh.submeshX,
                            submeshY: submesh.submeshY,
                            submeshTreadmillX: Math.floor(submesh.mesh.position.x/16),
                            submeshTreadmillY: Math.floor(submesh.mesh.position.y/16)
                        });
                        selectTriangle(face, intersects[0], scene);
                        if(this.panes.mesh) this.panes.mesh.refresh();
                    }
                }
                if(this.isSelectingPoints){
                    this.value('point', intersects[0].point);
                    if(this.panes.mesh) this.panes.mesh.refresh();
                }
            }else{
                this.value('face', []);
                this.value('point', '');
            }
        });
    }
    
    activateMeshPointSelection(container, renderer, scene, camera, treadmill){
        this.isSelectingPoints = true;
        this.activateHoverInfo(container, renderer, scene, camera, treadmill);
    }
    
    tickStart(){
        const keys = Object.keys(this.stats);
        let lcv = 0;
        for(; lcv< keys.length; lcv++){
            if(this.stats[keys[lcv]].begin) this.stats[keys[lcv]].begin();
        }
    }
    
    registerFont(name, definition){
        return new Promise((resolve, reject)=>{
            try{
                const loader = new FontLoader();
                loader.load( 'fonts/helvetiker_regular.typeface.json', ( font )=>{
                    fonts[name] = font;
                    resolve(font);
                });
            }catch(ex){  reject(ex) }
        });
    }
    
    showTextLabel(text, position, name='default', color=(Math.random() * 0xffffff), fontName, incomingScene){
        const scene = incomingScene || this.options.scene;
        if(!fontName){
            if(textLabels[name]) scene.remove(textLabels[name]);
            textLabels[name] = new SpriteText(text, 2);
            scene.add(textLabels[name]);
            textLabels[name].position.copy(position)
        }else{
            if(fonts[fontName]){
                const geometry = new TextGeometry(text , {
                    font: fonts[fontName],
                    size: 80,
                    height: 5,
                    curveSegments: 12,
                    bevelEnabled: true,
                    bevelThickness: 10,
                    bevelSize: 8,
                    bevelOffset: 0,
                    bevelSegments: 5
                } );
            }
        }
    }
    
    tickStop(){
        if(this.cameraHelper) this.cameraHelper.update();
        const keys = Object.keys(this.stats);
        let lcv = 0;
        for(; lcv< keys.length; lcv++){
            if(this.stats[keys[lcv]].end) this.stats[keys[lcv]].end();
        }
    }
    
    show(type, container){
        const uncasedType = type.toLowerCase();
        let result = null;
        switch(uncasedType){
            case 'output':
            case 'latency':
            case 'overhead':
                result = createStats(uncasedType);
                this.stats[uncasedType] = result;
                break;
            case 'axis':
                result = createStats();
                this.stats[uncasedType] = result;
                break;
            case 'mesh':
                result = makeInfoPane('Mesh Info', {id: 'mesh_info'});
                result.refresh = ()=>{
                    result.clear().appendChild(createBox(uncasedType));
                }
                result.refresh();
                this.panes[uncasedType] = result;
                break;
        }
        if(container && result){
            container.appendChild(result.dom);
            setHUDPositions(
                Object.keys(this.stats).map((key)=>this.stats[key]),
                Object.keys(this.panes).map((key)=>this.panes[key]),
                this.options.position?.vertical,
                this.options.position?.horizontal
            );
        }
        
        return result;
    }
    
    
}

const setHUDPositions = (statsArray, infoArray, side='right', orientation='top')=>{
    let infoOffset = 0;
    let x = 0;
    let y = 0;
    statsArray.forEach((stats, index)=>{
        if(index%2 === 0){
            infoOffset += 50;
            x = 0;
        }else{
            x += 80;
        }
        stats.dom.style.left = null;
        stats.dom.style.top = null;
        stats.dom.style[orientation] = `${y}px`;
        stats.dom.style[side] = `${x}px`;
        if(index%2 === 1){
            y += 50;
        }
    });
    x = 0;
    y = infoOffset;
    infoArray.forEach((infoPane)=>{
        infoPane.dom.style[orientation] = `${y}px`;
        infoPane.dom.style[side] = `${x}px`;
        y += infoPane.dom.style.height;
    })
};

const createAxisStats = (camera)=>{
    const scene = new Scene();
    var axesHelper = new AxesHelper( 5 );
    axesHelper.setColors('red', 'blue', 'green')
    scene.background = new Color(color);
};

const createStats = (type)=>{
    const existing = document.getElementById(type);
    if(existing) existing.parentNode.removeChild(existing);
    const stats = new Stats();
    // .showPanel(): 0: fps, 1: ms, 2: mb, 3+: custom
    stats.dom.setAttribute('id', type);
    switch(type){
        case'output': stats.showPanel(0); break;
        case'latency': stats.showPanel(1); break;
        case'overhead': stats.showPanel(2); break;
    }
    return stats;
};

const createBox = (type, target) => {
    switch(type){
        case 'mesh' : 
            const thisContent = document.createElement("div");
            const submeshName = document.createTextNode(
                `[${
                    kv('submeshX')
                }, ${
                    kv('submeshY')
                }] ${
                    kv('submesh')
                } (${
                    kv('submeshTreadmillX')
                }, ${
                    kv('submeshTreadmillY')
                })`
            );
            const safeFace = (kvs.face || '');
            const safeCoord = (start, stop)=>{
                return safeFace.slice(start,stop) &&
                safeFace
                .slice(start,stop)
                .concat(safeFace[stop]?Math.floor(safeFace[stop]*10000)/10000:'')
                .join(', ') || ''
            }
            const point = document.createTextNode(kvs.point?`${digits(kvs.point.x, 4)}, ${digits(kvs.point.y, 4)}`:'');
            const coord1 = document.createTextNode(safeCoord(0, 2));
            const coord2 = document.createTextNode(safeCoord(3, 5));
            const coord3 = document.createTextNode(safeCoord(6, 8));
            const bolded = document.createElement("b");
            bolded.appendChild(submeshName);
            thisContent.appendChild(bolded);
            thisContent.appendChild(document.createElement("br"));
            thisContent.appendChild(point);
            thisContent.appendChild(document.createElement("br"));
            thisContent.appendChild(coord1);
            thisContent.appendChild(document.createElement("br"));
            thisContent.appendChild(coord2);
            thisContent.appendChild(document.createElement("br"));
            thisContent.appendChild(coord3);
            if(target){}
            return thisContent;
            break;
    }
};

const makeInfoPane = (title, options={})=>{
    const devtoolsDiv = document.createElement("div");
    if(options.id){
        const existing = document.getElementById(options.id);
        if(existing) existing.parentNode.removeChild(existing);
        devtoolsDiv.setAttribute('id', options.id);
    }
    
    // and give it some content
    const subheading = document.createTextNode(title);
    const contentDiv = document.createElement("div");
    devtoolsDiv.appendChild(subheading);
    devtoolsDiv.appendChild(contentDiv);
    devtoolsDiv.style.display = 'block';
    devtoolsDiv.style.position = 'absolute';
    devtoolsDiv.style.fontSize = '10px';
    devtoolsDiv.style.color = '#FFDDDD';
    if(options.left){
        devtoolsDiv.style.left = options.left;
    }
    if(options.right){
        devtoolsDiv.style.right = options.right;
    }
    if(options.top){
        devtoolsDiv.style.top = options.top;
    }
    if(options.bottom){
        devtoolsDiv.style.bottom = options.bottom;
    }
    devtoolsDiv.style.width = '150px';
    devtoolsDiv.style.backgroundColor = '#991144';
    devtoolsDiv.style.opacity = 0.8;

    contentDiv.style.backgroundColor = '#BB4477';
    contentDiv.style.display = 'block';
    contentDiv.style.maxWidth = '140px';
    contentDiv.style.minHeight = '55px';
    contentDiv.style.marginLeft = '5px';
    contentDiv.style.border = '5px';
    contentDiv.style.marginBottom = '5px;';
    contentDiv.style.overflow = 'hidden';
    const result = { dom : devtoolsDiv };
    result.clear = ()=>{
        while (contentDiv.lastElementChild) {
            contentDiv.removeChild(contentDiv.lastElementChild);
        }
        return contentDiv;
    }
    devtoolsDiv.style.position = 'fixed'
    return result;
};

let selection = null;
const selectTriangle = (faces, intersection, scene)=>{
    if(selection) scene.remove(selection);
    const material = new LineBasicMaterial( { color: 0x0000ff } );
    const offset = intersection.object.position;
    const points = [
        new Vector3( offset.x+faces[0], offset.y+faces[1], faces[2]+0.01 ),
        new Vector3( offset.x+faces[3], offset.y+faces[4], faces[5]+0.01 ),
        new Vector3( offset.x+faces[6], offset.y+faces[7], faces[8]+0.01 ),
        new Vector3( offset.x+faces[0], offset.y+faces[1], faces[2]+0.01 )
    ];
    const geometry = new BufferGeometry().setFromPoints( points );
    const line = new Line( geometry, material );
    selection = line;
    scene.add( line );
}

const activateTriangleSelection = (container, renderer, scene, loop, camera)=>{
    container.addEventListener('mousemove', (event)=>{
        var raycaster = new Raycaster(); // create once
        var mouse = new Vector2(); // create once

        mouse.x = ( event.clientX / renderer.domElement.clientWidth ) * 2 - 1;
        mouse.y = - ( event.clientY / renderer.domElement.clientHeight ) * 2 + 1;

        raycaster.setFromCamera( mouse, camera );
        var intersects = null;
        try{ //can't do this mid-load
            intersects = raycaster.intersectObjects( scene.treadmill.activeSubmeshMeshes(), true );
        }catch(ex){}
        if(intersects && intersects[0]){
            const geometry = intersects[0]?.object?.geometry;
            if(geometry){
                const offset = intersects[0].faceIndex * geometry.attributes.position.itemSize * 3;
                const face = Array.prototype.slice.call(geometry.attributes.position.array, offset, offset+3*3);
                const submeshName = scene.treadmill.positionOfMesh(intersects[0].object);
                const submesh = scene.treadmill.submesh(submeshName);
                loop.devtools.setDevOutput('face', { 
                    face, 
                    submesh: submeshName,
                    submeshX: submesh.submeshX,
                    submeshY: submesh.submeshY,
                    submeshTreadmillX: Math.floor(submesh.mesh.position.x/16),
                    submeshTreadmillY: Math.floor(submesh.mesh.position.y/16)
                });
                selectTriangle(face, intersects[0], scene);
            }
        }else loop.devtools.setDevOutput('face', { face: []});
    });
} //*/