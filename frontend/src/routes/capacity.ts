/** An illustrative upper-bound load assumption, not a dispatch recommendation. */
export function estimateLoads(prediction: number | undefined, capacity: number): number | null {
  if (prediction === undefined || !Number.isFinite(prediction) || prediction < 0 || !Number.isSafeInteger(capacity) || capacity <= 0 || capacity > 1000000000) return null
  return Math.ceil(prediction / capacity)
}
