export type Place={id:number;type:string;lat?:number;lon?:number;center?:{lat:number;lon:number};tags?:Record<string,string>}
export function searchPlaces(places:Place[],query:string):Place[]{
 const normalize=(value:string)=>value.toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/\s+/g,' ').trim()
 const words=normalize(query).split(' ').filter(Boolean)
 if(!words.length)return places
 return places.filter(place=>{const tags=place.tags||{};const text=normalize([tags.name,tags['addr:city'],tags['addr:street'],tags['addr:housenumber']].filter(Boolean).join(' '));return words.every(word=>text.includes(word))})
}

/** Keep one listing per source ID and merge near-identical map points. */
export function uniquePlaces(places:Place[]):Place[]{
 const kept:Place[]=[],ids=new Set<string>()
 for(const place of places){
  const key=`${place.type}:${place.id}`,lat=place.lat??place.center?.lat,lon=place.lon??place.center?.lon
  if(ids.has(key))continue
  if(lat!==undefined&&lon!==undefined&&kept.some(other=>{const a=other.lat??other.center?.lat,b=other.lon??other.center?.lon;return a!==undefined&&b!==undefined&&Math.abs(a-lat)<0.0003&&Math.abs(b-lon)<0.0003}))continue
  ids.add(key);kept.push(place)
 }
 return kept
}
