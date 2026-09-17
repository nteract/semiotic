/**
 * HyperLogLog distinct-count sketch. Per-window memory is a fixed
 * register file (default 256 bytes of state at p=8), so a dashboard can
 * ask "how many distinct customers in this minute?" without retaining ids.
 */

const DEFAULT_P = 10

function fnv1a(value: string): number {
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function rho(hash: number, precision: number): number {
  const shifted = hash << precision
  if (shifted === 0) return 32 - precision + 1
  return Math.clz32(shifted) + 1
}

export class HyperLogLog {
  private readonly p: number
  private readonly m: number
  private readonly registers: Uint8Array
  private readonly alpha: number

  constructor(p = DEFAULT_P) {
    const precision = Math.max(4, Math.min(16, Math.floor(p)))
    this.p = precision
    this.m = 1 << precision
    this.registers = new Uint8Array(this.m)
    this.alpha = 0.7213 / (1 + 1.079 / this.m)
  }

  add(value: string | number): void {
    const hash = fnv1a(String(value))
    const idx = hash & (this.m - 1)
    const rank = rho(hash, this.p)
    if (rank > this.registers[idx]) this.registers[idx] = rank
  }

  merge(other: HyperLogLog): void {
    if (other.m !== this.m) return
    for (let i = 0; i < this.m; i++) {
      if (other.registers[i] > this.registers[i]) {
        this.registers[i] = other.registers[i]
      }
    }
  }

  clone(): HyperLogLog {
    const copy = new HyperLogLog(this.p)
    copy.registers.set(this.registers)
    return copy
  }

  count(): number {
    let sum = 0
    let zeros = 0
    for (let i = 0; i < this.m; i++) {
      const r = this.registers[i]
      if (r === 0) zeros += 1
      sum += 2 ** -r
    }
    const estimate = this.alpha * this.m * this.m / sum
    if (estimate <= 2.5 * this.m && zeros > 0) {
      return Math.round(this.m * Math.log(this.m / zeros))
    }
    return Math.round(estimate)
  }
}
