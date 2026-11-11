export type Coordinate = [number, number]
const radians = Math.PI / 180

export function distance(a: Coordinate, b: Coordinate): number {
  const lat = (b[1] - a[1]) * radians
  const lng = (b[0] - a[0]) * radians
  const h = Math.sin(lat / 2) ** 2 + Math.cos(a[1] * radians) * Math.cos(b[1] * radians) * Math.sin(lng / 2) ** 2
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)))
}

export function measure(coordinates: Coordinate[]): number[] {
  const cumulative = [0]
  for (let i = 1; i < coordinates.length; i++) cumulative.push(cumulative[i - 1] + distance(coordinates[i - 1], coordinates[i]))
  return cumulative
}

export function pointAlong(coordinates: Coordinate[], cumulative: number[], progress: number): {coordinate: Coordinate; bearing: number; index: number} {
  if (coordinates.length < 2) return {coordinate: coordinates[0] || [0, 0], bearing: 0, index: 0}
  const target = Math.max(0, Math.min(1, progress)) * cumulative[cumulative.length - 1]
  let i = 1
  while (i < cumulative.length - 1 && cumulative[i] < target) i++
  const a = coordinates[i - 1], b = coordinates[i]
  const factor = (target - cumulative[i - 1]) / (cumulative[i] - cumulative[i - 1] || 1)
  return {
    coordinate: [a[0] + (b[0] - a[0]) * factor, a[1] + (b[1] - a[1]) * factor],
    bearing: Math.atan2((b[0] - a[0]) * Math.cos(a[1] * radians), b[1] - a[1]) / radians,
    index: i,
  }
}

export function slicePath(coordinates: Coordinate[], start: number, end: number): Coordinate[] {
  const cumulative = measure(coordinates)
  const a = pointAlong(coordinates, cumulative, start), b = pointAlong(coordinates, cumulative, end)
  return [a.coordinate, ...coordinates.slice(a.index, b.index), b.coordinate]
}
