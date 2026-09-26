import type { Datum } from "../../src/components/charts/shared/datumTypes"
import React, { useEffect, useRef, useState } from "react"
import { OrdinalCustomChart } from "../../dist/ordinal.module.min.js"
import { XYCustomChart } from "../../dist/xy.module.min.js"
import {
  bulletLayout,
  intervalLanesLayout,
  waffleLayout
} from "../../dist/semiotic-recipes.module.min.js"

type PushHandle = { clear(): void; pushMany(data: Datum[]): void }

const margin = { left: 20, right: 20, top: 40, bottom: 20 }
const kpis = ["Revenue", "Profit", "Orders", "Retention"].map((metric) => ({
  metric,
  actual: 60,
  target: 80,
  ranges: [50, 100]
}))
const intervals = Array.from({ length: 10 }, (_, i) => ({
  lane: `Lane ${i}`,
  start: 0.1,
  end: 0.6
}))
const shares = [
  { cat: "Large", value: 100 },
  { cat: "Tiny", value: 0.001 }
]

export default function Bounds() {
  const [width, setWidth] = useState(500)
  const bulletRef = useRef<PushHandle | null>(null)
  const laneRef = useRef<PushHandle | null>(null)
  const waffleRef = useRef<PushHandle | null>(null)
  const push = new URLSearchParams(location.search).get("input") === "push"
  useEffect(() => {
    if (!push) return
    for (const [ref, data] of [
      [bulletRef, kpis],
      [laneRef, intervals],
      [waffleRef, shares]
    ] as const) {
      ref.current?.clear()
      ref.current?.pushMany(data)
    }
  }, [push])
  return (
    <main>
      <button onClick={() => setWidth(380)}>Resize charts</button>
      <section data-testid="bullet-bounds">
        <OrdinalCustomChart
          ref={bulletRef}
          data={push ? undefined : kpis}
          layout={bulletLayout}
          layoutConfig={{
            categoryAccessor: "metric",
            valueAccessor: "actual",
            targetAccessor: "target",
            rangesAccessor: "ranges"
          }}
          categoryAccessor="metric"
          valueAccessor="actual"
          width={width}
          height={240}
          margin={margin}
          title="KPI bullets"
          description="Four KPI rows in a limited plot."
          showAxes={false}
          tooltip={(d: Datum) => (
            <div>
              {String(d.metric)} {String(d.kind)}:{" "}
              {String(d.value ?? d.target ?? d.rangeValue)}
            </div>
          )}
        />
      </section>
      <section data-testid="lane-bounds">
        <OrdinalCustomChart
          ref={laneRef}
          data={push ? undefined : intervals}
          layout={intervalLanesLayout}
          layoutConfig={{
            laneAccessor: "lane",
            startAccessor: "start",
            endAccessor: "end",
            domain: [0, 1],
            showLaneLabels: false
          }}
          categoryAccessor="lane"
          valueAccessor="start"
          width={width}
          height={160}
          margin={margin}
          title="Short lanes"
          description="Ten intervals in ten small lanes."
          showAxes={false}
          tooltip={(d: Datum) => (
            <div>
              {String(d.lane)}: {String(d.start)} to {String(d.end)}
            </div>
          )}
        />
      </section>
      <section data-testid="waffle-bounds">
        <XYCustomChart
          ref={waffleRef}
          data={push ? undefined : shares}
          layout={waffleLayout}
          layoutConfig={{
            rows: 2,
            columns: 2,
            categoryAccessor: "cat",
            valueAccessor: "value"
          }}
          width={width}
          height={220}
          margin={margin}
          showAxes={false}
          title="Rounded shares"
          description="A tiny category rounds to zero cells."
          tooltip={(d: Datum) => (
            <div>
              {String(d.category)}: {String(d.value)}
            </div>
          )}
        />
      </section>
    </main>
  )
}
