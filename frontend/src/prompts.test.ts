import {describe,it,expect} from 'vitest'
import {samplePrompts,assistantPrompts} from './prompts'
describe('assistant suggestions',()=>{
 it('picks three distinct suggestions from a larger pool',()=>{
  const sample=samplePrompts(()=>0.5)
  expect(assistantPrompts.length).toBeGreaterThan(3)
  expect(sample).toHaveLength(3)
  expect(new Set(sample).size).toBe(3)
  expect(sample.every(x=>assistantPrompts.includes(x))).toBe(true)
 })
})
