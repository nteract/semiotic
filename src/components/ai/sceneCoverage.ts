import type { Datum } from "../charts/shared/datumTypes"

/** Index complete semantic tuples once; a partial aggregate is not a row match. */
export function sceneCoverage(
  rows: ReadonlyArray<Datum>,
  datums: ReadonlyArray<Datum | Datum[] | null>,
  fields: ReadonlyArray<string>
): { represented: number; unmatchedMarks: number } {
  const byReference = new Map<Datum, number[]>()
  const byTuple = new Map<string, { indices: number[]; cursor: number }>()
  const objectIds = new Map<unknown, number>()
  const valueKey = (value: unknown): string => {
    if (value instanceof Date) return `date:${value.getTime()}`
    if (
      (typeof value === "object" && value !== null) ||
      typeof value === "symbol" ||
      typeof value === "function"
    ) {
      let id = objectIds.get(value)
      if (id === undefined) {
        id = objectIds.size
        objectIds.set(value, id)
      }
      return `identity:${id}`
    }
    return `${typeof value}:${String(value)}`
  }
  const tuple = (row: Datum): string | undefined => {
    if (
      !fields.length ||
      fields.some((field) => !Object.prototype.hasOwnProperty.call(row, field))
    )
      return undefined
    return JSON.stringify(fields.map((field) => valueKey(row[field])))
  }
  rows.forEach((row, index) => {
    const references = byReference.get(row)
    if (references) references.push(index)
    else byReference.set(row, [index])
    const key = tuple(row)
    if (key === undefined) return
    const entry = byTuple.get(key)
    if (entry) entry.indices.push(index)
    else byTuple.set(key, { indices: [index], cursor: 0 })
  })

  const represented = new Set<number>()
  const visitedReferences = new Set<Datum>()
  const match = (row: Datum): boolean => {
    const references = byReference.get(row)
    if (references) {
      if (!visitedReferences.has(row)) {
        references.forEach((index) => represented.add(index))
        visitedReferences.add(row)
      }
      return true
    }
    const key = tuple(row)
    const entry = key === undefined ? undefined : byTuple.get(key)
    if (!entry) return false
    while (
      entry.cursor < entry.indices.length &&
      represented.has(entry.indices[entry.cursor])
    )
      entry.cursor++
    if (entry.cursor < entry.indices.length)
      represented.add(entry.indices[entry.cursor++])
    return true
  }
  let unmatchedMarks = 0
  for (const datum of datums) {
    const candidates = Array.isArray(datum) ? datum : [datum]
    let matched = false
    for (const candidate of candidates) {
      if (candidate && typeof candidate === "object" && match(candidate))
        matched = true
    }
    if (!matched) unmatchedMarks++
  }
  return { represented: represented.size, unmatchedMarks }
}
