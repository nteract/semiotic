import React, { useMemo, useState } from "react"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"

import DoomChart from "../../examples/DoomChart"

const SAMPLE_DATA = [
  { quarter: "Q1", revenue: 1.2, region: "north" },
  { quarter: "Q2", revenue: 1.6, region: "north" },
  { quarter: "Q3", revenue: 2.1, region: "north" },
  { quarter: "Q4", revenue: 2.8, region: "north" },
  { quarter: "Q1", revenue: 0.9, region: "south" },
  { quarter: "Q2", revenue: 1.3, region: "south" },
  { quarter: "Q3", revenue: 1.7, region: "south" },
  { quarter: "Q4", revenue: 2.3, region: "south" },
]

export default function DoomChartPage() {
  const [observations, setObservations] = useState([])

  const handleObservation = useMemo(
    () => (obs) => {
      setObservations((prev) => [obs, ...prev].slice(0, 5))
    },
    []
  )

  return (
    <PageLayout
      title="Doom Chart"
      breadcrumbs={[
        { label: "Cookbook", path: "/cookbook" },
        { label: "Doom Chart", path: "/cookbook/doom-chart" },
      ]}
    >
      <p>
        A long-standing gap in the Semiotic visualization catalog has been the
        complete absence of charts capable of running Doom. This recipe closes
        that gap.
      </p>
      <p>
        <code>DoomChart</code> accepts the standard Semiotic HOC prop surface
        — <code>data</code>, <code>xAccessor</code>, <code>yAccessor</code>,
        <code>onObservation</code>, <code>title</code>, and friends. It
        receives your data, counts the rows, and politely surfaces that count
        in the chart chrome so you know it arrived safely. It then visualizes
        the data via the deeply expressive medium of a fully playable 3D
        software-rendered first-person shooter.
      </p>

      <h2 id="the-visualization">The Visualization</h2>
      <p>
        Click anywhere in the canvas below to start the renderer, then use
        the standard Doom controls: arrow keys to move, Ctrl to fire, Space
        to open doors, Alt + arrows to strafe. The shareware DOOM episode is
        hosted by the Internet Archive&apos;s{" "}
        <a
          href="https://github.com/db48x/emularity"
          target="_blank"
          rel="noreferrer"
        >
          Emularity
        </a>{" "}
        DOSBox emulator.
      </p>
      <div
        style={{
          background: "var(--surface-1)",
          borderRadius: "8px",
          padding: "16px",
          border: "1px solid var(--surface-3)",
        }}
      >
        <DoomChart
          chartId="doom-demo"
          data={SAMPLE_DATA}
          xAccessor="quarter"
          yAccessor="revenue"
          title="Quarterly Revenue (Existential Encoding)"
          width={720}
          height={520}
          onObservation={handleObservation}
        />
      </div>

      <h2 id="onobservation">Observations</h2>
      <p>
        Like every Semiotic chart, <code>DoomChart</code> fires{" "}
        <code>onObservation</code> events. Move your mouse into the canvas to
        start receiving them.
      </p>
      <pre
        style={{
          background: "var(--surface-1)",
          padding: 12,
          borderRadius: 6,
          fontSize: 12,
          minHeight: 120,
          margin: 0,
        }}
      >
        {observations.length
          ? observations.map((o) => JSON.stringify(o)).join("\n")
          : "(awaiting player movement)"}
      </pre>

      <h2 id="how-it-works">How It Works</h2>
      <p>
        Under the hood, <code>DoomChart</code> embeds the Internet
        Archive&apos;s pre-configured shareware DOOM emulator via iframe.
        The emulator is a JavaScript port of DOSBox running the original
        1993 DOS executable against id Software&apos;s freely-distributable
        shareware WAD. The chart wrapper handles the standard HOC contract:
        prop receipt, observation emission, theme-aware borders via CSS
        custom properties.
      </p>
      <CodeBlock
        code={`<DoomChart
  data={salesData}
  xAccessor="quarter"
  yAccessor="revenue"
  title="Quarterly Revenue"
  onObservation={(obs) => console.log(obs.type)}
/>`}
        language="jsx"
      />

      <h2 id="caveats">Caveats</h2>
      <ul>
        <li>
          <strong>The data is ignored.</strong> It is received, counted, and
          displayed as metadata — but the geometry, color, and pacing of the
          visualization are not driven by it. A future revision may map each
          data point to one (1) imp.
        </li>
        <li>
          <strong>One click to start.</strong> Browser audio policy requires
          a user gesture before the emulator can boot. Click the canvas
          once and DOOM loads automatically.
        </li>
        <li>
          <strong>Not a real chart type.</strong> This is not exported from{" "}
          <code>semiotic</code> or any of its subpath bundles. It lives only
          in the cookbook.
        </li>
      </ul>
    </PageLayout>
  )
}
