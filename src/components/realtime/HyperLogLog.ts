import { fnv1a32 } from "../utils/hash"

/**
 * HyperLogLog distinct-count sketch. Per-window memory is a fixed
 * register file (default p=10, 1024 registers), so a dashboard can
 * ask "how many distinct customers in this minute?" without retaining ids.
 */

const DEFAULT_P = 10

function fnv1a(value: string): number {
  let hash = fnv1a32(value)
  // Avalanche so nearby strings do not share high bits used for the register.
  hash ^= hash >>> 16
  hash = Math.imul(hash, 0x7feb352d)
  hash ^= hash >>> 15
  hash = Math.imul(hash, 0x846ca68b)
  hash ^= hash >>> 16
  return hash >>> 0
}

export class HyperLogLog {
  private readonly p: number
  private readonly m: number
  private readonly registers: Uint8Array
  private readonly alpha: number
  private harmonicSum: number
  private zeros: number

  constructor(p = DEFAULT_P) {
    const precision = Math.max(4, Math.min(16, Math.floor(p)))
    this.p = precision
    this.m = 1 << precision
    this.registers = new Uint8Array(this.m)
    this.alpha = 0.7213 / (1 + 1.079 / this.m)
    this.harmonicSum = this.m
    this.zeros = this.m
  }

  add(value: string | number): void {
    const hash = fnv1a(String(value))
    // High p bits select the register. Count leading zeros in the remaining
    // bits, clamping the all-zero case to the available 32-p bits.
    const idx = hash >>> (32 - this.p)
    const rank = Math.min(Math.clz32(hash << this.p), 32 - this.p) + 1
    this.updateRegister(idx, rank)
  }

  private updateRegister(index: number, rank: number): void {
    const previous = this.registers[index]
    if (rank <= previous) return
    this.registers[index] = rank
    this.harmonicSum += 2 ** -rank - 2 ** -previous
    if (previous === 0) this.zeros--
  }

  merge(other: HyperLogLog): void {
    if (other.m !== this.m) return
    for (let i = 0; i < this.m; i++) {
      this.updateRegister(i, other.registers[i])
    }
  }

  clone(): HyperLogLog {
    const copy = new HyperLogLog(this.p)
    copy.registers.set(this.registers)
    copy.harmonicSum = this.harmonicSum
    copy.zeros = this.zeros
    return copy
  }

  count(): number {
    const estimate = (this.alpha * this.m * this.m) / this.harmonicSum
    if (estimate <= 2.5 * this.m && this.zeros > 0) {
      return Math.round(this.m * Math.log(this.m / this.zeros))
    }
    return Math.round(estimate)
  }
}
