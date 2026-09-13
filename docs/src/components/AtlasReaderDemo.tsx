import * as React from "react"
import { useMemo, useState } from "react"
import { ThemeProvider } from "semiotic/themes/react"
import { LinkedCharts } from "semiotic/ai"
import { prepareMotifBraid, readCircuitEdition, getRequiredPaths } from "semiotic/atlas/core"
import {
  atlasStory,
  atlasStoryNames,
  type AtlasStoryId,
} from "../../../scripts/network-atlas/stories/atlasStories"
import { supplierStory } from "../../../scripts/network-atlas/stories/supplierStory"
import { AtlasObservation } from "./AtlasObservation"
import { useDocsTheme } from "../hooks/useDocsTheme"
import ChartGrounding from "./ChartGrounding"
import CodeBlock from "./CodeBlock"
import "./AtlasReaderDemo.css"

/** Public-import playground with the same serialized inputs as the consumer check. */
export function AtlasReaderDemo({
  stories,
  children,
}: {
  stories: AtlasStoryId[]
  children: (props: Record<string, unknown>) => React.ReactNode
}) {
  const [id, setId] = useState(stories[0])
  const [time, setTime] = useState(60)
  const [modeled, setModeled] = useState(false)
  const [bypass, setBypass] = useState(false)
  const [selected, setSelected] = useState("")
  const [error, setError] = useState("")
  const [docsTheme] = useDocsTheme()
  const theme = docsTheme === "light" ? "light" : "dark"
  const story = useMemo(() => atlasStory(id), [id])
  const supplier = useMemo(() => (id === "supplier" ? supplierStory(bypass) : null), [id, bypass])
  const atlas =
    story.component === "MotifBraidChart"
      ? story.props.atlas
      : story.component === "DependencyForestChart"
        ? supplier!.projection.atlas
        : story.props.circuit.atlas
  const braid = useMemo(
    () => (story.component === "MotifBraidChart" ? prepareMotifBraid(story.props.atlas) : null),
    [story],
  )
  const edition =
    story.component === "FlowCircuitChart"
      ? modeled
        ? story.modeledEdition
        : story.props.edition
      : null
  const reading = edition
    ? readCircuitEdition(edition, modeled ? "modeled-scenario" : "observed-replay", time)
    : null
  const chartId = `atlas-reference-${id}`
  const props = {
    ...story.props,
    ...(supplier && { forest: supplier.projection }),
    ...(edition && { edition, reading, reducedMotion: true }),
    ...(selected &&
      story.component !== "MotifBraidChart" && {
        selection: {
          nodeId: selected,
          analysisRevision: atlas.analysisRevision,
          relationScopeId: "directed-admitted",
        },
      }),
    chartId,
    title: atlasStoryNames[id],
    description: story.question,
    summary: story.takeaway,
    accessibleTable: true,
    onSelectNode: setSelected,
  }
  // JSON is the complete reusable reading. UI callbacks are React-only.
  const serialized = JSON.parse(JSON.stringify(props))
  const exportFile = async (format: "json" | "svg") => {
    try {
      const content =
        format === "json"
          ? JSON.stringify(
              {
                component: story.component,
                props: serialized,
                fixture: story.fixture,
                synthetic: true,
              },
              null,
              2,
            )
          : (await import("semiotic/server")).renderChartWithEvidence(story.component, {
              ...serialized,
              theme,
            }).svg
      const url = URL.createObjectURL(
        new Blob([content], { type: format === "json" ? "application/json" : "image/svg+xml" }),
      )
      const link = document.createElement("a")
      link.href = url
      link.download = `${id}-atlas.${format}`
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setError("")
    } catch (failure) {
      setError(String(failure))
    }
  }
  return (
    <section className="atlas-reader-demo" data-testid="atlas-reader-demo">
      <p>
        <strong>Synthetic design fixtures.</strong> These stories demonstrate evidence handling, not
        production findings.
      </p>
      <div className="atlas-reader-demo__controls">
        <label>
          Story{" "}
          <select
            value={id}
            onChange={(event) => {
              setId(event.target.value as AtlasStoryId)
              setSelected("")
              setModeled(false)
            }}
          >
            {stories.map((key) => (
              <option key={key} value={key}>
                {atlasStoryNames[key]}
              </option>
            ))}
          </select>
        </label>
        {supplier && (
          <label>
            <input
              type="checkbox"
              checked={bypass}
              onChange={(event) => {
                const nextBypass = event.target.checked
                const nextNodes = supplierStory(nextBypass).projection.atlas.source.nodes
                setBypass(nextBypass)
                setSelected((current) =>
                  nextNodes.some((node) => node.id === current) ? current : "",
                )
              }}
            />{" "}
            Add zero-capacity bypass
          </label>
        )}
        {edition && (
          <>
            <label>
              <input
                type="checkbox"
                checked={modeled}
                onChange={(event) => setModeled(event.target.checked)}
              />{" "}
              Read modeled edition
            </label>
            <label>
              Observation time{" "}
              <input
                aria-label="Observation time"
                type="range"
                min={0}
                max={60}
                step={10}
                value={time}
                onChange={(event) => setTime(Number(event.target.value))}
              />{" "}
              {reading!.observedAt}s
            </label>
          </>
        )}
      </div>
      <h2>{story.question}</h2>
      <p data-testid="atlas-takeaway">
        {edition && "Observed baseline: "}
        {story.takeaway}
      </p>
      <ThemeProvider theme={theme}>
        <LinkedCharts>
          <div
            className="atlas-reader-demo__chart"
            tabIndex={0}
            role="region"
            aria-label="Atlas chart; scroll to inspect all steps"
          >
            {children(props)}
          </div>
          <AtlasObservation chartId={chartId} />
        </LinkedCharts>
      </ThemeProvider>
      <h3>Read the evidence</h3>
      {braid ? (
        <div className="atlas-reader-demo__table">
          <table>
            <caption>
              Supported journeys. Each numbered step is a depth. Counts repeat when no per-step
              counts were supplied; widths do not imply measured attrition.
            </caption>
            <thead>
              <tr>
                <th scope="col">Cohort</th>
                <th scope="col">Steps and counts</th>
              </tr>
            </thead>
            <tbody>
              {braid.groups.map((group) => (
                <tr key={group.id}>
                  <th scope="row">{group.partition ?? group.occurrenceId}</th>
                  <td>
                    {group.nodePath
                      .map(
                        (node, i) =>
                          `${i + 1}. ${node}: ${(group.stepEntityCounts?.[i] ?? group.entityCount).toLocaleString()}`,
                      )
                      .join(" → ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <label>
            Inspect vertex{" "}
            <select value={selected} onChange={(event) => setSelected(event.target.value)}>
              <option value="">Choose a vertex</option>
              {atlas.source.nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.id}
                </option>
              ))}
            </select>
          </label>
          <div className="atlas-reader-demo__table">
            <table>
              <caption>
                {edition
                  ? `${edition.kind} edition at ${reading!.observedAt}s. Rates are per second; queue is stock. Unmeasured values remain unknown.`
                  : "Required predecessors in the admitted directed graph, from the declared roots. Capacity is a separate measurement."}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Vertex</th>
                  <th scope="col">Reading</th>
                </tr>
              </thead>
              <tbody>
                {atlas.source.nodes
                  .filter((node) => !selected || node.id === selected)
                  .map((node) => (
                    <tr key={node.id}>
                      <th scope="row">{node.id}</th>
                      <td>
                        {reading
                          ? Object.entries(reading.entry.nodes[node.id])
                              .map(([key, value]) => `${key}: ${value ?? "unmeasured"}`)
                              .join(" · ")
                          : JSON.stringify(getRequiredPaths(atlas, node.id).value)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <p>
        Source revision: <code>{atlas.provenance.sourceRevision}</code>. Selection and exported
        evidence retain the complete analysis identity.
      </p>
      <ul>
        {story.limitations.map((text) => (
          <li key={text}>{text}</li>
        ))}
      </ul>
      <button type="button" onClick={() => void exportFile("json")}>
        Export reading and evidence
      </button>{" "}
      <button type="button" onClick={() => void exportFile("svg")}>
        Export static SVG
      </button>
      {error && <p role="alert">{error}</p>}
      <details>
        <summary>Data dictionary and independent inputs</summary>
        <pre>{JSON.stringify(story.fixture, null, 2)}</pre>
      </details>
      <details>
        <summary>Serialized public chart props</summary>
        <CodeBlock code={JSON.stringify(serialized, null, 2)} language="json" />
      </details>
      <ChartGrounding component={story.component} props={serialized} />
    </section>
  )
}
