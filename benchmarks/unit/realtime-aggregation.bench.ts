import { bench, describe } from "vitest"
import { WindowAccumulator } from "../../src/components/realtime/WindowAccumulator"
import { ReorderBuffer } from "../../src/components/realtime/ReorderBuffer"
import { TDigest } from "../../src/components/realtime/TDigest"
import { HyperLogLog } from "../../src/components/realtime/HyperLogLog"

describe("Realtime aggregation", () => {
  bench("session-20k-events-with-sketches", () => {
    const acc = new WindowAccumulator({
      window: "session",
      size: 10,
      percentiles: [0.5, 0.95, 0.99],
      distinct: true
    })
    for (let i = 0; i < 20_000; i++) acc.push(i, i % 997, `user-${i % 1000}`)
    if (acc.emit()[0].count !== 20_000) throw new Error("Lost session events")
  })

  bench("tumbling-20k-windows-retain-1000", () => {
    const acc = new WindowAccumulator({ size: 10, retain: 1000 })
    for (let i = 0; i < 20_000; i++) acc.push(i * 10, i)
    if (acc.windowCount !== 1000) throw new Error("Incorrect retention")
  })

  bench("reorder-20k-events-grace-10k", () => {
    const buffer = new ReorderBuffer<number>({
      lateness: 10_000,
      getTime: (t) => t
    })
    let count = 0
    for (let i = 0; i < 20_000; i++) count += buffer.push(i).released.length
    count += buffer.flush().length
    if (count !== 20_000) throw new Error("Lost reordered events")
  })

  const digest = new TDigest()
  const acc = new WindowAccumulator({
    size: 100,
    percentiles: [0.5, 0.95, 0.99],
    distinct: true
  })
  for (let i = 0; i < 10_000; i++) {
    digest.push(i % 997)
    acc.push(i, i % 997, i % 50)
  }
  bench("digest-3000-quantile-reads", () => {
    let sum = 0
    for (let i = 0; i < 1000; i++) {
      sum +=
        digest.quantile(0.5) + digest.quantile(0.95) + digest.quantile(0.99)
    }
    if (!(sum > 0)) throw new Error("Invalid quantiles")
  })
  bench("hll-3000-add-and-count", () => {
    const hll = new HyperLogLog()
    let sum = 0
    for (let i = 0; i < 3000; i++) {
      hll.add(i)
      sum += hll.count()
    }
    if (!(sum > 0)) throw new Error("Invalid distinct counts")
  })
  bench("emit-100-windows-with-sketches", () => {
    if (acc.emit().length !== 100) throw new Error("Lost window snapshots")
  })
})
