export const NORTH = Symbol.for('north'); 
export const SOUTH = Symbol.for('south'); 
export const EAST = Symbol.for('east'); 
export const WEST = Symbol.for('west'); 

export const NORTHEAST = Symbol.for('northeast'); 
export const NORTHWEST = Symbol.for('northwest'); 
export const SOUTHEAST = Symbol.for('southeast'); 
export const SOUTHWEST = Symbol.for('southwest'); 

export const CURRENT = Symbol.for('current'); 

const codirectionsBySymbol = [
    [NORTHWEST, NORTH,   NORTHEAST],
    [WEST,      CURRENT, EAST     ],
    [SOUTHWEST, SOUTH,   SOUTHEAST] 
];

const codirectionsByText = [
    ['northwest', 'north',   'northeast'],
    ['west',      'current', 'east'     ],
    ['southwest', 'south',   'southeast'] 
];

export const neighbors = (location)=>{
    let x = -1;
    let y = -1;
    codirectionsByText.forEach((row, yIndex)=>{
        row.forEach((value, xIndex)=>{
            if(value === location){
                x = xIndex;
                y = yIndex;
            }
        });
    });
    if(x === -1 || y === -1) throw new Error('location not found: '+location)
    return {
        north: codirectionsByText[y-1] && codirectionsByText[y-1][x],
        south: codirectionsByText[y+1] && codirectionsByText[y+1][x],
        east: codirectionsByText[y][x+1],
        west: codirectionsByText[y][x-1],
    }
};

export const weldTreadmill = (submeshIndex)=>{
    const directions =  codirectionsByText[0].concat(codirectionsByText[1]).concat(codirectionsByText[2]);
    directions.reverse().forEach((dir)=>{
        const local = neighbors(dir);
        //console.log('neighbors', dir, local);
        if(local.north){ //weld the northern seam
            console.log('H WELD')
            console.log('WELD', dir, local.north)
            submeshIndex[dir].weld(submeshIndex[local.north], 'bottom');
            console.log('H WELD C')
        }
        if(local.east){ //weld the eastern seam
            console.log('WELD', dir, local.east)
            submeshIndex[dir].weld(submeshIndex[local.east], 'left');
        }
    })
};

export const allTiles = (handler)=>{
    Object.keys(direction).forEach((dir)=>{
        handler(direction[dir], dir);
    });
};

const direction = {
    current: { x: 0, y: 0 },

    north: {
        x: 0, y: 1,
        seam : 'bottom', seamTo : 'that'
    },
    south: {
        x: 0, y: -1,
        seam : 'top', seamTo : 'that'
    },
    east: {
        x: 1, y: 0,
        seam : 'left', seamTo : 'this'
    },
    west: {
        x: -1, y: 0,
        seam : 'right', seamTo : 'that'
    },

    northeast: { x:  1, y:  1 },
    northwest: { x: -1, y:  1 },
    southeast: { x:  1, y: -1 },
    southwest: { x: -1, y: -1 }
};
direction[CURRENT] = direction.current;

direction[NORTHEAST] = direction.northeast;
direction[NORTHWEST] = direction.northwest;
direction[SOUTHEAST] = direction.southeast;
direction[SOUTHWEST] = direction.southwest;

direction[NORTH] = direction.north;
direction[SOUTH] = direction.south;
direction[EAST] = direction.east;
direction[WEST] = direction.west;


export class Tile {
    static offset = direction;
    static neighbors = neighbors;
    static groups = codirectionsByText;
    static list = codirectionsByText[0].concat(codirectionsByText[1]).concat(codirectionsByText[2]);
}

Tile.CURRENT = direction.current;

Tile.NORTHEAST = direction.northeast;
Tile.NORTHWEST = direction.northwest;
Tile.SOUTHEAST = direction.southeast;
Tile.SOUTHWEST = direction.southwest;

Tile.NORTH = direction.north;
Tile.SOUTH = direction.south;
Tile.EAST = direction.east;
Tile.WEST = direction.west;