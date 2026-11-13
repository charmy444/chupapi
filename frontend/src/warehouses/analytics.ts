import type {Row} from '../api'
import type {Place} from './search'
export const placeKey=(place:Place)=>`${place.type}:${place.id}`
function hash(value:string){let result=2166136261;for(let i=0;i<value.length;i++)result=Math.imul(result^value.charCodeAt(i),16777619);return result>>>0}
/** Fixed catalogue and seeded ordering keep assignment balanced and independent of search or OSM fetches. */
export function assignedRoutes(rows:Row[],catalog:Place[],place:Place):string[]{
 const keys=catalog.map(placeKey).sort();if(!keys.length)return []
 const key=placeKey(place),known=keys.indexOf(key);if(known<0)return []
 const ids=Array.from(new Set(rows.map(row=>row.route_id))).sort((a,b)=>hash(`forecast-route:${a}`)-hash(`forecast-route:${b}`)||a.localeCompare(b))
 return ids.filter((_,i)=>i%keys.length===known)
}
