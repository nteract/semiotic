import * as React from "react"
import { BumpChart, TooltipRoot, markTooltipChrome } from "semiotic/xy"

const data = [
  { year: 2022, team: "Alpha", score: 90 },
  { year: 2022, team: "Bravo", score: 70 },
  { year: 2023, team: "Alpha", score: 40 },
  { year: 2023, team: "Bravo", score: 95 }
]
const label = (datum: Record<string, unknown>) =>
  `${datum.team}: ${datum.score}`
const WrappedTooltip = ({ text }: { text: string }) => (
  <TooltipRoot style={{ background: "navy", color: "white" }}>
    {text}
  </TooltipRoot>
)
const renderers = {
  owned: markTooltipChrome((datum: Record<string, unknown>) => (
    <WrappedTooltip text={label(datum)} />
  )),
  plain: label,
  empty: markTooltipChrome(() => false)
}

export function BumpTooltipFixture() {
  const multi = new URLSearchParams(location.search).has("multi")
  const [renderer, setRenderer] =
    React.useState<keyof typeof renderers>("owned")
  const [width, setWidth] = React.useState(520)
  const content = renderers[renderer]
  return (
    <main>
      <select
        aria-label="Tooltip renderer"
        value={renderer}
        onChange={(event) =>
          setRenderer(event.target.value as keyof typeof renderers)
        }
      >
        <option value="owned">Owned</option>
        <option value="plain">Plain</option>
        <option value="empty">Empty</option>
      </select>
      <button onClick={() => setWidth(360)}>Narrow chart</button>
      <BumpChart
        data={data}
        xAccessor="year"
        yAccessor="score"
        lineBy="team"
        showLabels={false}
        showLegend={false}
        showPoints
        pointRadius={6}
        animate={false}
        width={width}
        height={260}
        margin={{ left: 40, right: 40, top: 20, bottom: 40 }}
        tooltip={multi ? { mode: "multi", content } : content}
        title="Bump tooltip ownership"
      />
    </main>
  )
}
