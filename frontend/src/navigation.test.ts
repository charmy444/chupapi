import {describe,it,expect} from 'vitest'
import {parseLocation,makeLocation} from './navigation'
describe('navigation persistence',()=>{
 it('restores a selected route and time after reload',()=>{const s=makeLocation({page:'routes',route:'471',time:'2025-11-01T11:00:00'});expect(parseLocation(s)).toEqual({page:'routes',route:'471',time:'2025-11-01T11:00:00',warehouse:''})})
 it('ignores unsupported pages',()=>{expect(parseLocation('#bad').page).toBe('overview')})
 it('preserves a warehouse identifier',()=>{expect(parseLocation(makeLocation({page:'warehouses',warehouse:'wb-center:42'})).warehouse).toBe('wb-center:42')})
})
