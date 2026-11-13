import {describe,it,expect} from 'vitest'
import {assignedRoutes} from './analytics'
import type {Row} from '../api'
const places=[{id:1,type:'a'},{id:2,type:'a'},{id:3,type:'a'}]
const rows=Array.from({length:10},(_,i)=>({id:i,route_id:String(i),timestamp:'2025-01-01T00:00',y_pred:i} as Row))
describe('demo assignment',()=>{it('assigns every route once, evenly and deterministically',()=>{const a=places.map(p=>assignedRoutes(rows,places,p));expect(a.map(x=>x.length)).toEqual([4,3,3]);expect(new Set(a.flat()).size).toBe(10);expect(assignedRoutes([...rows].reverse(),[...places].reverse(),places[0])).toEqual(a[0])});it('does not fabricate assignments for extra OSM entries',()=>expect(assignedRoutes(rows,places,{id:4,type:'node'})).toEqual([]) )})
