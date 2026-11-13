import {describe,expect,it} from 'vitest'
import {closestMarker} from './hitTest'

describe('warehouse marker hit area',()=>{
 const markers=[{id:'a',x:100,y:100},{id:'b',x:120,y:100}]
 it('selects the nearest marker when the click is outside the visible dot',()=>{
  expect(closestMarker(markers,111,106,18,p=>p)?.id).toBe('b')
 })
 it('keeps distant clicks available for the map',()=>{
  expect(closestMarker(markers,150,140,18,p=>p)).toBeNull()
 })
 it('ignores markers outside the visible selection',()=>{
  expect(closestMarker(markers,100,100,18,p=>p.id==='a'?null:p)).toBeNull()
 })
})
