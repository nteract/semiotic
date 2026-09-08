import { bench, describe } from "vitest"
import { profileNumericFields } from "../../src/components/data/numericFieldProfiler"
import { summarizeData } from "../../src/components/data/DataSummarizer"
import { WindowAccumulator } from "../../src/components/realtime/WindowAccumulator"

describe("Data profiling", () => {
  const rows = Array.from({ length: 100_000 }, (_, i) => ({
    x: i,
    value: ((i * 7919) % 10000) / 10,
    amount: i % 97 === 0 ? null : String(i % 1234),
    category: `group-${i % 8}`
  }))

  bench("numeric-profile-100k-without-quartiles", () => {
    profileNumericFields(rows, { quantiles: false })
  })
  bench("numeric-profile-100k-with-quartiles", () => {
    profileNumericFields(rows)
  })
  bench("summary-100k", () => {
    summarizeData(rows)
  })
})

describe("Session window ingestion", () => {
  for (const retain of [Infinity, 1000]) {
    bench(`sessions-10000-events-retain-${retain}`, () => {
      const acc = new WindowAccumulator({
        window: "session",
        gap: 5,
        size: 0,
        retain
      })
      for (let i = 0; i < 10_000; i++) {
        // Three events per session, separated by an inactivity gap.
        acc.push(Math.floor(i / 3) * 20 + (i % 3), (i % 31) / 10)
      }
      if (acc.windowCount !== Math.min(3334, retain)) {
        throw new Error("Unexpected session count")
      }
    })
  }
})
