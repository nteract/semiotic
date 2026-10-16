import * as React from "react"
import { createRoot } from "react-dom/client"
import Legend, { GradientLegend } from "../../src/components/Legend"
import { SentenceFilter } from "../../src/components/controls/SentenceFilter"
import { MobileStandardControls, useMobileRangeControls } from "../../src/components/MobileStandardControls"
import { MobileChartContainer } from "../../src/components/MobileChartContainer"
import { DetailsPanel } from "../../src/components/DetailsPanel"
import { Scatterplot } from "../../src/components/charts/xy/Scatterplot"
import type { ChartObservation } from "../../src/components/store/ObservationStore"

function Fixture() {
  const [small, setSmall] = React.useState(false)
  const [hovered, setHovered] = React.useState("None")
  const [selected, setSelected] = React.useState("None")
  const [observation, setObservation] = React.useState<ChartObservation | null>(null)
  const mobileRange = useMobileRangeControls({
    domain: [Date.UTC(2026, 0, 1), Date.UTC(2026, 0, 11)],
    label: "Reporting date",
    formatValue: (value) => new Date(value).toISOString().slice(0, 10),
  })
  return <>
    <h1>Controls and legends</h1>
    <button onClick={() => setSmall((current) => !current)}>Resize and shrink</button>
    <section aria-label="Legends">
      <svg width={small ? 380 : 500} height={240}>
        <Legend title="Color and size" legendGroups={[
          { label: "Color", styleFn: () => ({ fill: "#4682b4" }), items: [{ label: "Blue" }, { label: "Red" }] },
          { label: "Empty", styleFn: () => ({}), items: [] },
          { label: "Size", styleFn: () => ({ fill: "#4a8c5c" }), items: small ? [{ label: "Small" }] : [{ label: "Small" }, { label: "Large" }] },
        ]} customHoverBehavior={(item) => setHovered(item?.label ?? "None")} customClickBehavior={(item) => setSelected(item.label)} />
      </svg>
      <svg width={280} height={70}>
        <GradientLegend config={{ label: "Intensity", domain: [0, 100], colorFn: () => "#4682b4", format: String }}
          orientation="horizontal" width={260}
          customHoverBehavior={(item) => setHovered(item?.label ?? "None")}
          customClickBehavior={(item) => setSelected(item.label)} />
      </svg>
      <p data-testid="legend-hover">Hovered: {hovered}</p><p data-testid="legend-selection">Selected: {selected}</p>
    </section>
    <section aria-label="Sentence controls" style={{ marginBottom: 30 }}>
      <SentenceFilter
        as="p" sentence="Show {amount} observations in {region}."
        defaultFilters={{ amount: 2, region: "West" }}
        definitions={{
          amount: { type: "number", label: "Amount", min: -10, max: 10 },
          region: { type: "select", label: "Region", searchable: true, options: [{ value: "West", label: "West", count: 12 }, { value: "New York", label: "New York" }, ...Array.from({ length: 20 }, (_, i) => ({ value: `Region ${i}`, label: `Region ${i}` }))] },
        }}
      />
    </section>
    <section aria-label="Point chart" style={{ position: "relative", width: small ? 380 : 500, height: 300 }} data-testid="point-chart">
      <Scatterplot data={[{ x: 5, y: 5, name: "Alpha" }]} width={small ? 380 : 500} height={300}
        margin={{ left: 40, right: 20, top: 20, bottom: 40 }}
        title="Inspection chart" description="Alpha is at five, five" xExtent={[0, 10]} yExtent={[0, 10]} pointRadius={10}
        tooltip={(datum) => <span>Point {String(datum.name)}: {String(datum.x)}, {String(datum.y)}</span>}
        onObservation={setObservation} />
      <DetailsPanel position="overlay" ariaLabel="Point details" observation={observation}>
        {(datum) => <p>Selected point: {String(datum.name)}</p>}
      </DetailsPanel>
    </section>
    <button onClick={() => setObservation({ type: "activate", datum: { name: "Keyboard Alpha" }, inputType: "keyboard", chartType: "Scatterplot", timestamp: Date.now() })}>Inspect by keyboard</button>
    <MobileStandardControls brush={mobileRange.brush} zoom={mobileRange.zoom} />
    <output data-testid="range-span">{mobileRange.value[1] - mobileRange.value[0]}</output>
    <MobileChartContainer title="Mobile report" breakpoint={1000} chips={[{ id: "overview", label: "Overview" }, { id: "regions", label: "By region" }]} detail={<p>Mobile detail content</p>} detailTitle="Mobile details">
      <div style={{ height: 40 }}>Chart summary</div>
    </MobileChartContainer>
  </>
}

createRoot(document.getElementById("root")!).render(<Fixture />)
