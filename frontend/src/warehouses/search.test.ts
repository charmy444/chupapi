import {describe,it,expect} from 'vitest'
import {searchPlaces, type Place} from './search'
const places:Place[]=[{id:1,type:'wb-center',tags:{name:'СЦ Артём','addr:street':'Солнечная улица, 46'}},{id:2,type:'wb',tags:{name:'Склад Коледино','addr:city':'Подольск','addr:street':'Троицкая','addr:housenumber':'20'}}]
describe('warehouse search',()=>{
 it('matches names case insensitively and treats ё as е',()=>expect(searchPlaces(places,'АРТЕМ').map(p=>p.id)).toEqual([1]))
 it('matches words across name and address regardless of order',()=>expect(searchPlaces(places,'20 подольск').map(p=>p.id)).toEqual([2]))
 it('returns all entries for whitespace and none for unknown terms',()=>{expect(searchPlaces(places,'  ')).toHaveLength(2);expect(searchPlaces(places,'несуществующий')).toEqual([])})
})
