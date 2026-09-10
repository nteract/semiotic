import React, { useState } from "react"
import { createRoot } from "react-dom/client"
import { LineChart } from "../../dist/xy.module.min.js"
import { GaugeChart } from "../../dist/ordinal.module.min.js"
import { RealtimeHistogram } from "../../dist/realtime.module.min.js"
import { renderChart } from "../../dist/server.module.min.js"
import TemporalHistogramLinkedExample from "../../docs/src/examples/TemporalHistogramLinkedExample"

function App() {
  const [compact, setCompact] = useState(false)
  return (
    <main
      style={{
        fontFamily: "Arial, sans-serif",
        color: "#172033",
        background: "white",
        padding: 12
      }}
    >
      <button onClick={() => setCompact(!compact)}>Resize charts</button>
      <section
        data-testid="responsive-example"
        style={{ width: compact ? 420 : 720 }}
      >
        <TemporalHistogramLinkedExample />
      </section>
      <section
        data-testid="responsive-height"
        style={{ width: compact ? 420 : 720, height: compact ? 140 : 220 }}
      >
        <RealtimeHistogram
          data={[
            { time: 5, value: 4 },
            { time: 15, value: 8 }
          ]}
          binSize={10}
          responsiveWidth
          responsiveHeight
          showValueAxis={false}
          tickFormatTime={String}
          margin={{ top: 0, right: 0, bottom: 28 }}
          timeExtent={[0, 20]}
        />
      </section>
      <section data-testid="thresholds-and-top-legend" style={{ width: 720 }}>
        <LineChart
          data={[
            { x: 0, y: 1, category: "North" },
            { x: 10, y: 8, category: "North" },
            { x: 0, y: 8, category: "South" },
            { x: 10, y: 3, category: "South" }
          ]}
          lineBy="category"
          colorBy="category"
          width={720}
          height={280}
          animate={false}
          legendPosition="top"
          title="Thresholds and top axis"
          frameProps={{
            axes: [{ orient: "top", label: "Time" }, { orient: "left" }]
          }}
          annotations={[
            {
              type: "x-threshold",
              value: 5,
              label: "Review",
              endCap: { radius: 5 }
            },
            { type: "y-threshold", value: 4, endCap: "circle" }
          ]}
        />
      </section>
      <section
        data-testid="gauge-parity"
        style={{ display: "flex", width: 720 }}
      >
        <div>
          <p>React gauge</p>
          <GaugeChart value={64} width={300} height={250} />
        </div>
        <div>
          <p>Server SVG gauge</p>
          <div
            data-testid="server-gauge"
            dangerouslySetInnerHTML={{
              __html: renderChart("GaugeChart", {
                value: 64,
                width: 300,
                height: 250
              })
            }}
          />
        </div>
      </section>
    </main>
  )
}
createRoot(document.getElementById("root")!).render(<App />)
