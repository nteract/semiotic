/**
 * Dev-mode helper that warns when user callbacks access properties that exist
 * on `.data` but not on the RealtimeNode/RealtimeEdge wrapper.
 *
 * Common pitfall:
 *   nodeStyle={(d) => ({ fill: d.category })}     // undefined!
 *   nodeStyle={(d) => ({ fill: d.data?.category })} // correct
 *
 * In production, this is a no-op passthrough.
 */

const warned = new Set<string>()
const proxyCache = new WeakMap<object, Map<string, object>>()

export function wrapWithDataHint<T extends { data?: Record<string, any> }>(
  datum: T,
  callbackName: string
): T {
  if (process.env.NODE_ENV === "production") return datum
  if (!datum || !datum.data || typeof datum.data !== "object") return datum

  let byName = proxyCache.get(datum)
  if (byName) {
    const cached = byName.get(callbackName)
    if (cached) return cached as T
  } else {
    byName = new Map()
    proxyCache.set(datum, byName)
  }

  const proxy = new Proxy(datum, {
    get(target, prop, receiver) {
      if (typeof prop === "string" && !(prop in target) && target.data && prop in target.data) {
        const key = `${callbackName}:${prop}`
        if (!warned.has(key)) {
          warned.add(key)
          console.warn(
            `[Semiotic] "${callbackName}" callback accessed "${prop}" on the wrapper object, but it only exists on ".data". ` +
            `Use d.data.${prop} (or d.data?.${prop}) instead. Frame callbacks receive RealtimeNode/RealtimeEdge wrappers, not your raw data.`
          )
        }
      }
      return Reflect.get(target, prop, receiver)
    }
  })

  byName.set(callbackName, proxy)
  return proxy
}
