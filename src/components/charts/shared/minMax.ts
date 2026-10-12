export function getMinMax(values: Iterable<number>): [number, number]
export function getMinMax<T>(values: Iterable<T>, accessor: (value: T) => number): [number, number]
export function getMinMax<T>(values: Iterable<T>, accessor?: (value: T) => number): [number, number] {
  let min = Infinity
  let max = -Infinity
  for (const entry of values) {
    const value = accessor ? accessor(entry) : entry as number
    if (value < min) min = value
    if (value > max) max = value
  }
  return [min, max]
}

export function getMin(values: Iterable<number>, fallback = Infinity): number {
  let min = fallback
  for (const value of values) {
    if (value < min) min = value
  }
  return min
}

export function getMax(values: Iterable<number>, fallback = -Infinity): number {
  let max = fallback
  for (const value of values) {
    if (value > max) max = value
  }
  return max
}
