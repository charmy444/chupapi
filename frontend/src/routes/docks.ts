import type {Coordinate} from './geometry'

/** The model's front loading bay is 35 metres from its centre, in local -Y. */
const DOCK_OFFSET=35
export type DockWarehouse={center:Coordinate;rotation:number}
const metres=(lat:number)=>111320*Math.cos(lat*Math.PI/180)
export function warehouseForDock(dock:Coordinate,bearing:number,start:boolean):DockWarehouse {
 const rotation=(start?Math.PI:0)-bearing*Math.PI/180
 const east=DOCK_OFFSET*Math.sin(rotation),north=-DOCK_OFFSET*Math.cos(rotation)
 return {center:[dock[0]-east/metres(dock[1]),dock[1]-north/111320],rotation}
}
export function dockForWarehouse(warehouse:DockWarehouse):Coordinate {
 const east=DOCK_OFFSET*Math.sin(warehouse.rotation),north=-DOCK_OFFSET*Math.cos(warehouse.rotation)
 const latitude=warehouse.center[1]+north/111320
 return [warehouse.center[0]+east/metres(latitude),latitude]
}

import {measure} from './geometry'
import type {DemoRoute} from './catalog'
export function routeWithDocks(route:DemoRoute,warehouses:[DockWarehouse|null,DockWarehouse|null]):DemoRoute {
 const coordinates=[...(warehouses[0]?[dockForWarehouse(warehouses[0])]:[]),...route.coordinates,...(warehouses[1]?[dockForWarehouse(warehouses[1])]:[])]
 const cumulative=measure(coordinates)
 return {...route,coordinates,cumulative,length:cumulative[cumulative.length-1]}
}

/** Offset the local origin so the rendered building is centred on the clear plot. */
export function originForModelCenter(center:Coordinate,rotation:number):DockWarehouse {
 const shift=25.41,east=shift*Math.sin(rotation),north=-shift*Math.cos(rotation)
 return {center:[center[0]-east/metres(center[1]),center[1]-north/111320],rotation}
}
