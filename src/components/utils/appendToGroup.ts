/** Append in encounter order without allocating a fresh bucket on a hit. */
export function appendToGroup<K, V>(groups: Map<K, V[]>, key: K, value: V): void {
  const group = groups.get(key)
  if (group) group.push(value)
  else groups.set(key, [value])
}
