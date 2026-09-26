import React, { useEffect, useMemo, useRef, useState } from "react"
import { BumpChart } from "../../dist/xy.module.min.js"
import { ZoomableNetworkCustomChart } from "../../dist/semiotic-network-zoom.module.min.js"
import {
  unstable_fromGofishIR,
  unstable_gofishIRExamples
} from "../../dist/semiotic-experimental.module.min.js"

const paths = [
  { d: "M10 10 L110 110 L10 110Z", name: "Lower petal" },
  { d: "M10 10 L110 10 L110 110Z", name: "Upper petal" },
  { d: "M140 100 A50 50 0 0 1 240 100Z", name: "Arc" },
  { d: "m260 20h80v70h-80z", name: "Relative bar" },
  { d: "M360 10c0 100 50 100 50 0s50 -50 50 0Z", name: "Curve" }
]
const rows = Array.from({ length: 4 }, (_, period) =>
  ["A", "B", "C"].map((team, i) => ({
    team,
    period,
    value: period % 2 ? 30 + 30 * i : 90 - 30 * i
  }))
).flat()

export default function PathGeometry() {
  const [width, setWidth] = useState(540)
  const [updated, setUpdated] = useState(false)
  const network = useRef(null),
    bump = useRef(null)
  const flower =
    new URLSearchParams(location.search).get("example") === "flower"
  const cfg = useMemo(() => {
    const source = flower
      ? unstable_gofishIRExamples.find((e) => e.key === "flower").doc
      : {
          ir: "gofish-display-list",
          irVersion: 0,
          viewport: { w: 500, h: 300 },
          items: paths.map(({ d, name }, i) => ({
            kind: "path",
            d,
            datum: { name },
            style: { fill: ["#2685a0", "#8858aa", "#cc6644"][i % 3] }
          }))
        }
    // Re-bake into the new viewport, including group transforms in the IR.
    return unstable_fromGofishIR({
      ...source,
      viewport: { w: width - 40, h: 300 },
      items: [
        {
          kind: "group",
          transform: {
            scale: [(width - 40) / source.viewport.w, 300 / source.viewport.h]
          },
          // The upstream flower paths currently omit provenance. Attach test rows
          // explicitly, using the original baked petal geometry unchanged.
          children: flower
            ? source.items.map((item, i) =>
                item.kind === "path"
                  ? { ...item, datum: { name: `Petal ${i}` } }
                  : item
              )
            : source.items
        }
      ]
    })
  }, [flower, width])
  useEffect(() => {
    window.pathGeometry = {
      network: () => network.current.getCustomLayout(),
      bump: () => bump.current.getCustomLayout()
    }
  }, [])
  return (
    <main>
      <button onClick={() => setWidth(420)}>Resize charts</button>
      <button
        onClick={() => network.current.zoomTo({ k: 1.2, x: -20, y: 0 }, 0)}
      >
        Zoom and pan
      </button>
      <button onClick={() => network.current.resetZoom()}>Reset camera</button>
      <button onClick={() => setUpdated(true)}>Update ranks</button>
      <section data-testid="paths">
        <ZoomableNetworkCustomChart
          ref={network}
          nodes={cfg.nodes}
          edges={[]}
          layout={cfg.networkLayout}
          layoutConfig={cfg.layoutConfig}
          width={width}
          height={360}
          margin={{ left: 20, right: 20, top: 40, bottom: 20 }}
          title="Path geometry"
          description="Exact path regions, including overlapping petals and arcs."
          zoomOptions={{ duration: 0 }}
          tooltip={(d) => <div>{JSON.stringify(d)}</div>}
        />
      </section>
      <section data-testid="bump">
        <BumpChart
          ref={bump}
          data={
            updated ? rows.map((d) => ({ ...d, value: 120 - d.value })) : rows
          }
          width={width === 540 ? 220 : 380}
          height={420}
          margin={{ left: 20, right: 20, top: 40, bottom: 20 }}
          xAccessor="period"
          yAccessor="value"
          lineBy="team"
          ribbon
          ribbonSizeRange={[36, 36]}
          showAxes={false}
          showLabels={false}
          showLegend={false}
          showPoints={false}
          title="Steep ranks"
          description="Ribbons keep column magnitudes through steep rank reversals."
          tooltip={(d) => (
            <div>
              {d.team}: period {d.period}, value {d.value}
            </div>
          )}
        />
      </section>
    </main>
  )
}
