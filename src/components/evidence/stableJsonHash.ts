function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return "null"
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`
  }
  if (value instanceof Date) return JSON.stringify(value)
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, nested]) => nested !== undefined)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(
        ([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`
      )
    return `{${entries.join(",")}}`
  }
  return JSON.stringify(value)
}

/** Stable SHA-256 over key-sorted JSON. */
export function stableEvidenceHash(value: unknown): string {
  return sha256Text(stableStringify(value))
}

/** @internal SHA-256 text primitive used by the stable JSON hash. */
export function sha256Text(message: string): string {
  const h = [...SHA256_INITIAL]
  const bytes = Array.from(new TextEncoder().encode(message))
  const bitLength = bytes.length * 8
  bytes.push(0x80)
  while (bytes.length % 64 !== 56) bytes.push(0)
  const high = Math.floor(bitLength / 4294967296)
  const low = bitLength >>> 0
  bytes.push(
    (high >>> 24) & 255,
    (high >>> 16) & 255,
    (high >>> 8) & 255,
    high & 255,
    (low >>> 24) & 255,
    (low >>> 16) & 255,
    (low >>> 8) & 255,
    low & 255
  )
  const words: number[] = []
  for (let index = 0; index < bytes.length; index += 4) {
    words.push(
      ((bytes[index]! << 24) |
        (bytes[index + 1]! << 16) |
        (bytes[index + 2]! << 8) |
        bytes[index + 3]!) >>>
        0
    )
  }
  for (let chunk = 0; chunk < words.length; chunk += 16) {
    const w = [...words.slice(chunk, chunk + 16)]
    for (let index = 16; index < 64; index += 1) {
      const s0 =
        rotr(w[index - 15]!, 7) ^
        rotr(w[index - 15]!, 18) ^
        (w[index - 15]! >>> 3)
      const s1 =
        rotr(w[index - 2]!, 17) ^
        rotr(w[index - 2]!, 19) ^
        (w[index - 2]! >>> 10)
      w[index] = (w[index - 16]! + s0 + w[index - 7]! + s1) >>> 0
    }
    let [a, b, c, d, e, f, g, hh] = h
    for (let index = 0; index < 64; index += 1) {
      const s1 = rotr(e!, 6) ^ rotr(e!, 11) ^ rotr(e!, 25)
      const ch = (e! & f!) ^ (~e! & g!)
      const temp1 = (hh! + s1 + ch + SHA256_K[index]! + w[index]!) >>> 0
      const s0 = rotr(a!, 2) ^ rotr(a!, 13) ^ rotr(a!, 22)
      const maj = (a! & b!) ^ (a! & c!) ^ (b! & c!)
      const temp2 = (s0 + maj) >>> 0
      hh = g
      g = f
      f = e
      e = (d! + temp1) >>> 0
      d = c
      c = b
      b = a
      a = (temp1 + temp2) >>> 0
    }
    const next = [a, b, c, d, e, f, g, hh]
    for (let index = 0; index < 8; index += 1) {
      h[index] = (h[index]! + next[index]!) >>> 0
    }
  }
  return h.map((word) => word.toString(16).padStart(8, "0")).join("")
}

const rotr = (value: number, count: number): number =>
  ((value >>> count) | (value << (32 - count))) >>> 0

const fractionalWord = (root: number): number =>
  Math.floor((root - Math.floor(root)) * 4294967296) >>> 0
const [SHA256_INITIAL, SHA256_K] = /* @__PURE__ */ (() => {
  const initial: number[] = []
  const round: number[] = []
  for (let candidate = 2; round.length < 64; candidate += 1) {
    let prime = true
    for (let divisor = 2; divisor * divisor <= candidate; divisor += 1) {
      if (candidate % divisor === 0) {
        prime = false
        break
      }
    }
    if (!prime) continue
    if (initial.length < 8) {
      initial.push(fractionalWord(Math.sqrt(candidate)))
    }
    round.push(fractionalWord(Math.cbrt(candidate)))
  }
  return [initial, round]
})()
