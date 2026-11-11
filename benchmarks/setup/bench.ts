import * as vitest from "vitest"
import type { BenchFn, BenchRunOptions } from "vitest"

export { describe } from "vitest"
export type BenchOptions = Pick<
  BenchRunOptions,
  "time" | "iterations" | "warmupTime" | "warmupIterations"
>

type Register = (name: string, fn: BenchFn, options?: BenchOptions) => void

// The comparison gate overlays this manifest onto older release checkouts.
// Keep their Vitest 4 runner usable while registering context benchmarks in 5.
const legacyBench = Reflect.get(vitest, "bench") as
  (Register & { skip: Register }) | undefined

const register: Register = (name, fn, options) => {
  vitest.test(name, async ({ bench }) => {
    // Preserve tinybench 2's defaults used by release baselines. Tinybench 6
    // otherwise increases both the sample minimum and the measurement window.
    await bench(name, fn).run({
      time: 500,
      iterations: 10,
      warmupTime: 100,
      warmupIterations: 5,
      ...options
    })
  })
}

export const bench =
  legacyBench ??
  Object.assign(register, {
    skip: ((name) => vitest.test.skip(name, () => {})) as Register
  })
