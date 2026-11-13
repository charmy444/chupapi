import {describe,it,expect} from 'vitest'
import {warehouseForDock,dockForWarehouse} from './docks'
import {distance} from './geometry'

describe('warehouse route connections',()=>{
 it.each([0,45,90,180,270])('places entrance on endpoint for heading %s',bearing=>{
  const endpoint:[number,number]=[37.61,55.75]
  for(const start of [true,false]){
   const warehouse=warehouseForDock(endpoint,bearing,start)
   expect(distance(dockForWarehouse(warehouse),endpoint)).toBeLessThan(0.02)
  }
 })
})

import {routeWithDocks} from './docks'
import {measure} from './geometry'
it('extends a route to both warehouse entrances',()=>{
 const coordinates:[number,number][]=[[37.61,55.75],[37.62,55.76]]
 const route={id:'1',city:'x',origin:'a',destination:'b',coordinates,cumulative:measure(coordinates),length:1000}
 const a=warehouseForDock([37.609,55.749],20,true),b=warehouseForDock([37.621,55.761],20,false)
 const extended=routeWithDocks(route,[a,b])
 expect(distance(extended.coordinates[0],dockForWarehouse(a))).toBeLessThan(0.02)
 expect(distance(extended.coordinates[extended.coordinates.length-1],dockForWarehouse(b))).toBeLessThan(0.02)
 expect(extended.coordinates.slice(1,-1)).toEqual(coordinates)
})
