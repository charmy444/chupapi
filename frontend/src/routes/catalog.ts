import cities from './cities.json'
import {measure, slicePath, type Coordinate} from './geometry'

export type DemoRoute = {
  id: string
  city: string
  origin: string
  destination: string
  coordinates: Coordinate[]
  cumulative: number[]
  length: number
}

// Index-based assignment makes every direction in the loaded dataset unique.
// Sorting IDs in the caller keeps the assignment stable across sources and time slices.
export function demoRoute(id: string, index: number, count: number): DemoRoute {
  const city = cities[index % cities.length]
  // Keep departures and arrivals near the outer ends of the interurban route.
  const variant = Math.floor(index / cities.length)
  const variants = Math.ceil(count / cities.length)
  const side = Math.ceil(Math.sqrt(variants))
  const start = (variant % side) / Math.max(1, side - 1) * 0.04
  const end = 0.96 + Math.floor(variant / side) / Math.max(1, side - 1) * 0.04
  const coordinates = slicePath(city.coordinates as Coordinate[], start, end)
  const cumulative = measure(coordinates)
  return {id, city: city.city, origin: `Склад ${id} · А`, destination: `Склад ${id} · Б`, coordinates, cumulative, length: cumulative[cumulative.length - 1]}
}
