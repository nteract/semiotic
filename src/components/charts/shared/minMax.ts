export function getMinMax(values: ReadonlyArray<number>): [number, number] {
  let min = Infinity
  let max = -Infinity
  for (const value of values) {
    if (value < min) min = value
    if (value > max) max = value
  }
  return [min, max]
}

export function getMin(values: ReadonlyArray<number>, fallback = Infinity): number {
  let min = fallback
  for (const value of values) {
    if (value < min) min = value
  }
  return min
}

export function getMax(values: ReadonlyArray<number>, fallback = -Infinity): number {
  let max = fallback
  for (const value of values) {
    if (value > max) max = value
  }
  return max
}
