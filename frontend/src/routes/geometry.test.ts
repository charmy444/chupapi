import {describe, it, expect} from 'vitest'
import {distance, measure, pointAlong, slicePath, type Coordinate} from './geometry'
import {demoRoute} from './catalog'

describe('distance-based playback', () => {
  const route: Coordinate[] = [[37,55], [37.001,55], [37.01,55]]
  it('does not accelerate across unevenly sampled road points', () => {
    const cumulative = measure(route)
    const middle = pointAlong(route, cumulative, 0.5).coordinate
    expect(middle[0]).toBeCloseTo(37.005, 5)
    expect(distance(route[0], middle)).toBeCloseTo(cumulative[2] / 2, 1)
  })
  it('clamps progress and preserves endpoints', () => {
    expect(pointAlong(route, measure(route), -1).coordinate).toEqual(route[0])
    expect(pointAlong(route, measure(route), 2).coordinate).toEqual(route[2])
  })
  it('handles duplicate road nodes', () => {
    const path: Coordinate[] = [[37,55],[37,55],[37.01,55]]
    expect(Number.isFinite(pointAlong(path, measure(path), 0).bearing)).toBe(true)
  })
  it('slices roads without shortcutting their intermediate points', () => {
    expect(slicePath(route, 0, 1)).toEqual(route)
    expect(slicePath(route, 0.2, 0.8)[0][0]).toBeCloseTo(37.002, 5)
  })
})

describe('illustrative geography', () => {
  it('assigns a distinct stable path to each of 1,000 directions', () => {
    const keys = new Set<string>()
    for (let i = 0; i < 1000; i++) {
      const route = demoRoute(String(i), i, 1000)
      keys.add(JSON.stringify(route.coordinates))
      expect(route.length).toBeGreaterThan(100)
      expect(route.coordinates.length).toBeGreaterThan(2)
      expect(route).toEqual(demoRoute(String(i), i, 1000))
    }
    expect(keys.size).toBe(1000)
  })
})
