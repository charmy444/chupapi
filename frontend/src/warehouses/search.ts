export type Place={id:number;type:string;lat?:number;lon?:number;center?:{lat:number;lon:number};tags?:Record<string,string>}
export function searchPlaces(places:Place[],query:string):Place[]{
 const normalize=(value:string)=>value.toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/\s+/g,' ').trim()
 const words=normalize(query).split(' ').filter(Boolean)
 if(!words.length)return places
 return places.filter(place=>{const tags=place.tags||{};const text=normalize([tags.name,tags['addr:city'],tags['addr:street'],tags['addr:housenumber']].filter(Boolean).join(' '));return words.every(word=>text.includes(word))})
}
