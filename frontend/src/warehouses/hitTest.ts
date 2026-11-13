/** Select the closest marker in screen pixels, keeping its visual size unchanged. */
export function closestMarker<T>(markers:Iterable<T>, x:number, y:number, radius:number, project:(marker:T)=>{x:number;y:number}|null):T|null {
 let closest:T|null=null, best=radius*radius
 for(const marker of markers){
  const point=project(marker);if(!point)continue
  const distance=(point.x-x)**2+(point.y-y)**2
  if(distance<=best){best=distance;closest=marker}
 }
 return closest
}

/** At country scale, a click selects an area; only closer views open a warehouse. */
export function isWarehouseScale(cameraDistance:number):boolean {
 return cameraDistance < 100
}
