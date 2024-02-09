export const NORTH = Symbol.for('north'); 
export const SOUTH = Symbol.for('south'); 
export const EAST = Symbol.for('east'); 
export const WEST = Symbol.for('west'); 

export const NORTHEAST = Symbol.for('northeast'); 
export const NORTHWEST = Symbol.for('northwest'); 
export const SOUTHEAST = Symbol.for('southeast'); 
export const SOUTHWEST = Symbol.for('southwest'); 

export const CURRENT = Symbol.for('current'); 

const codirections = [
    [NORTHWEST, NORTH,   NORTHEAST],
    [WEST,      CURRENT, EAST     ],
    [SOUTHWEST, SOUTH,   SOUTHEAST] 
];

const neighbors = (location)=>{
    let x = -1;
    let y = -1;
    codirections.forEach((row, yIndex)=>{
        row.forEach((value, xIndex)=>{
            if(value === location){
                x = xIndex;
                y = yIndex;
            }
        });
    });
    if(x === -1 || y === -1) throw new Error('location not found: '+location)
    return {
        north: codirections[y-1] && codirections[y-1][x],
        south: codirections[y+1] && codirections[y+1][x],
        east: codirections[y][x+1],
        west: codirections[y][x-1],
    }
};

export const allTiles = (handler)=>{
    Object.keys(direction).forEach((dir)=>{
        handler(direction[dir]);
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
    static groups = codirections;
    static list = codirections[0].concat(codirections[1]).concat(codirections[2]);
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