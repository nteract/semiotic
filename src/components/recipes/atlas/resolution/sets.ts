import { contentId, sortedIds } from "./identity"
import type { Domain, SetRef, SourceSet } from "./types"

/** Deduplicated JSON set store. Ancestors reference children instead of copying leaves. */
export class SourceSetStore {
  private sets = new Map<string, SourceSet>()

  add(domain: Domain, ids: Iterable<string>): SetRef {
    const values = sortedIds(ids)
    const ref = { id: contentId("set", [domain, values]), domain }
    if (!this.sets.has(ref.id))
      this.sets.set(ref.id, { ref, codec: "sorted-string-ids/v1", values })
    return ref
  }

  union(domain: Domain, inputs: SetRef[]): SetRef {
    const refs = [...new Map(inputs.map((ref) => [ref.id, ref])).values()].sort(
      (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
    )
    if (refs.some((ref) => ref.domain !== domain || !this.sets.has(ref.id))) {
      throw new Error("Invalid set union")
    }
    if (refs.length === 1) return refs[0]
    const ref = { id: contentId("set-union", [domain, refs]), domain }
    if (!this.sets.has(ref.id))
      this.sets.set(ref.id, { ref, codec: "set-union/v1", refs })
    return ref
  }

  values(): SourceSet[] {
    return [...this.sets.values()]
  }
}

/** Expand a validated store iteratively; reject malformed codecs, cycles and domain aliases. */
export function sourceSetValues(
  sets: readonly SourceSet[],
  ref: SetRef
): string[] {
  const byId = new Map(sets.map((set) => [set.ref.id, set]))
  if (byId.size !== sets.length) throw new Error("Duplicate set id")
  const active = new Set<string>()
  const visited = new Set<string>()
  const values = new Set<string>()
  const stack = [{ ref, exit: false }]
  while (stack.length) {
    const frame = stack.pop()!
    if (frame.exit) {
      active.delete(frame.ref.id)
      visited.add(frame.ref.id)
      continue
    }
    const set = byId.get(frame.ref.id)
    if (
      !set ||
      set.ref.domain !== ref.domain ||
      frame.ref.domain !== ref.domain
    ) {
      throw new Error("Missing set or mismatched domain")
    }
    if (active.has(frame.ref.id)) throw new Error("Cyclic source set")
    if (visited.has(frame.ref.id)) continue
    active.add(frame.ref.id)
    stack.push({ ref: frame.ref, exit: true })
    if (set.codec === "sorted-string-ids/v1") {
      if (
        !Array.isArray(set.values) ||
        set.values.some(
          (id, i) =>
            typeof id !== "string" || (i > 0 && id <= set.values[i - 1])
        )
      ) {
        throw new Error("Invalid sorted source set")
      }
      for (const id of set.values) values.add(id)
    } else if (set.codec === "set-union/v1" && Array.isArray(set.refs)) {
      for (const child of set.refs) stack.push({ ref: child, exit: false })
    } else throw new Error("Unsupported source set codec")
  }
  return sortedIds(values)
}
