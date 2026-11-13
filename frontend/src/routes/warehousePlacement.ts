import type {Map as MapLibreMap} from 'maplibre-gl'
import type {Coordinate} from './geometry'

export type WarehousePlacement={coordinate:Coordinate;rotation:number}

/** Find a clear footprint beside the route, keeping its long side parallel to the road. */
export function findWarehousePlacement(map:MapLibreMap,road:Coordinate,bearing:number,buildingLayer:string):WarehousePlacement|null {
 const rad=bearing*Math.PI/180, along:[number,number]=[Math.sin(rad),Math.cos(rad)], across:[number,number]=[Math.cos(rad),-Math.sin(rad)]
 const lngScale=111320*Math.cos(road[1]*Math.PI/180),latScale=111320
 const move=(east:number,north:number):Coordinate=>[road[0]+east/lngScale,road[1]+north/latScale]
 const blockers=[buildingLayer,'water','waterway','highway_major_inner','highway_motorway_inner','railway'].filter(id=>map.getLayer(id))
 const width=map.getCanvas().clientWidth,height=map.getCanvas().clientHeight
 for(const dist of [100,150,210,280,360,460,560,660,780,900]) for(const side of [1,-1]) for(const offset of [0,110,-110,210,-210,320,-320,450,-450,600,-600]){
  const east=across[0]*dist*side+along[0]*offset,north=across[1]*dist*side+along[1]*offset
  const projected=[[-38,-32],[-38,32],[38,-32],[38,32]].map(([x,y])=>map.project(move(east+along[0]*x+across[0]*y,north+along[1]*x+across[1]*y)))
  const left=Math.min(...projected.map(p=>p.x)),right=Math.max(...projected.map(p=>p.x)),top=Math.min(...projected.map(p=>p.y)),bottom=Math.max(...projected.map(p=>p.y))
  if(left<1||top<1||right>width-1||bottom>height-1)continue
  if(map.queryRenderedFeatures([[left,top],[right,bottom]],{layers:blockers}).length===0)return {coordinate:move(east,north),rotation:Math.PI/2-rad}
 }
 return null
}
