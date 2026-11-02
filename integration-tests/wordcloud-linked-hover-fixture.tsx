import * as React from "react"
import { LinkedCharts, useSelection } from "semiotic/ai"
import { useChartObserver } from "semiotic"
import { WordCloud } from "semiotic/wordcloud"
import { makeWordCloudParityCases } from "./wordcloud-parity-fixtures"

const cases = makeWordCloudParityCases()
const linkedHover = { name: "cloud-terms", fields: ["term"] }
const selection = { name: linkedHover.name, unselectedOpacity: 0.25 }

function SelectedTerm({ testId = "linked-term" }: { testId?: string }) {
  const selection = useSelection(linkedHover)
  const { observations } = useChartObserver()
  const latest = observations
    .filter((event) => event.chartType === "WordCloud")
    .at(-1)
  return (
    <p>
      Linked term:{" "}
      <output data-testid={testId}>
        {selection.isActive
          ? cases[0].props.data
              .filter(selection.predicate)
              .map((row) => row.term)
              .join(", ")
          : "none"}
      </output>
      {" · Observed hover: "}
      <output data-testid={`${testId}-observed`}>
        {latest?.type === "hover" ? String(latest.datum.term) : "none"}
      </output>
    </p>
  )
}

export function WordCloudLinkedHoverFixture() {
  return (
    <>
      <LinkedCharts>
        <section data-testid="wordcloud-linked-hover" style={{ width: "100%" }}>
          <h2>WordCloud linked hover · canvas and SVG</h2>
          <SelectedTerm />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(382px, 1fr))",
              gap: 16
            }}
          >
            {cases.map(({ id, props }) => (
              <article
                key={id}
                className="test-case"
                data-testid={`linked-${props.renderAs}`}
              >
                <h2>
                  {props.renderAs === "canvas" ? "Canvas words" : "SVG words"}
                </h2>
                <WordCloud
                  {...props}
                  chartId={`linked-${props.renderAs}`}
                  linkedHover={linkedHover}
                  selection={selection}
                  colorBy="term"
                  colorScheme={{
                    care: "#a85730",
                    trust: "#406fab",
                    wonder: "#39714c"
                  }}
                />
              </article>
            ))}
          </div>
        </section>
      </LinkedCharts>
      <LinkedCharts>
        <article className="test-case" data-testid="isolated-cloud">
          <h2>Separate LinkedCharts provider · no selection</h2>
          <SelectedTerm testId="isolated-term" />
          <WordCloud
            {...cases[1].props}
            chartId="isolated-cloud"
            linkedHover={linkedHover}
            selection={selection}
          />
        </article>
      </LinkedCharts>
    </>
  )
}
