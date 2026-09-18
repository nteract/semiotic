/** Array-backed heap operations shared by event ordering and window eviction. */
export function heapPush<T>(
  items: T[],
  item: T,
  compare: (a: T, b: T) => number
): void {
  let index = items.length
  items.push(item)
  while (index > 0) {
    const parent = (index - 1) >>> 1
    if (compare(items[parent], item) <= 0) break
    items[index] = items[parent]
    index = parent
  }
  items[index] = item
}

export function heapPop<T>(
  items: T[],
  compare: (a: T, b: T) => number
): T | undefined {
  const first = items[0]
  const last = items.pop()
  if (items.length > 0) {
    let index = 0
    while (index * 2 + 1 < items.length) {
      let child = index * 2 + 1
      if (
        child + 1 < items.length &&
        compare(items[child + 1], items[child]) < 0
      )
        child++
      if (compare(last!, items[child]) <= 0) break
      items[index] = items[child]
      index = child
    }
    items[index] = last!
  }
  return first
}
