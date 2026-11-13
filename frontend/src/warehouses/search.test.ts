import {describe,it,expect} from 'vitest'
import {searchPlaces,uniquePlaces, type Place} from './search'
const places:Place[]=[{id:1,type:'wb-center',tags:{name:'СЦ Артём','addr:street':'Солнечная улица, 46'}},{id:2,type:'wb',tags:{name:'Склад Коледино','addr:city':'Подольск','addr:street':'Троицкая','addr:housenumber':'20'}}]
describe('warehouse search',()=>{
 it('matches names case insensitively and treats ё as е',()=>expect(searchPlaces(places,'АРТЕМ').map(p=>p.id)).toEqual([1]))
 it('matches words across name and address regardless of order',()=>expect(searchPlaces(places,'20 подольск').map(p=>p.id)).toEqual([2]))
 it('returns all entries for whitespace and none for unknown terms',()=>{expect(searchPlaces(places,'  ')).toHaveLength(2);expect(searchPlaces(places,'несуществующий')).toEqual([])})
})

describe('duplicate warehouses',()=>{
 it('removes repeated ids and nearby copies while retaining distinct places',()=>{
  const input:Place[]=[{id:1,type:'wb-center',lat:55,lon:37},{id:1,type:'wb-center',lat:55,lon:37},{id:9,type:'node',lat:55.0001,lon:37.0001},{id:2,type:'node',lat:56,lon:38}]
  expect(uniquePlaces(input).map(p=>p.id)).toEqual([1,2])
 })
})
