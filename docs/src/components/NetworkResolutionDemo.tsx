import { useMemo, useState, type RefObject } from "react"
import { ThemeProvider } from "semiotic/themes/react"
import { defaultResolutionView } from "semiotic/experimental/network-resolution"
import {
  BoundaryLoomChart,
  ComponentCutaway,
  ResolutionAtlasChart,
  resolutionChartProps,
} from "semiotic/experimental/network-resolution/react"
import { flagship } from "../../../scripts/network-resolution/fixtures"
import { cutawayFixture } from "../../../scripts/network-resolution/cutawayFixtures"
import { useDocsTheme } from "../hooks/useDocsTheme"
import useResponsiveWidth from "../hooks/useResponsiveWidth"
import "./NetworkResolutionDemo.css"

export type ResolutionReaderMode = "resolution-atlas" | "boundary-loom"

export const representationNames = [
  "Original graph",
  "Group chain interiors and pendant fans",
  "Group strongly connected components",
  "Apply authored groups",
  "Mark edges with indirect paths",
]

// The same admitted synthetic graph underlies both readers and their exports.
const resolution = flagship()
const cutawayExamples = {
  single: cutawayFixture("single"),
  multi: cutawayFixture("multi"),
  missing: cutawayFixture("missing"),
}

function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function NetworkResolutionDemo({ mode }: { mode: ResolutionReaderMode }) {
  const [docsTheme] = useDocsTheme()
  const theme = docsTheme === "light" ? "light" : "dark"
  const [example, setExample] = useState<keyof typeof cutawayExamples>("multi")
  const cutawayResolution = cutawayExamples[example]
  const [palette, setPalette] = useState("theme")
  const appearance = useMemo(
    () => ({ generationColors: palette === "theme" ? undefined : palette }),
    [palette],
  )
  const [ordinal, setOrdinal] = useState(mode === "resolution-atlas" ? 3 : 4)
  const [compact, setCompact] = useState(false)
  const [zoomed, setZoomed] = useState(false)
  const [error, setError] = useState("")
  const [containerWidth, container] = useResponsiveWidth(720, 1100) as [
    number,
    RefObject<HTMLDivElement | null>,
  ]
  const width = compact ? Math.max(600, containerWidth - 120) : containerWidth
  const page = resolution.pages[ordinal]
  const view = useMemo(
    () => ({
      ...defaultResolutionView(resolution, mode),
      pageIds: resolution.pages.slice(0, ordinal + 1).map((p) => p.id),
    }),
    [mode, ordinal],
  )
  const chartProps = {
    resolution,
    appearance,
    view,
    width,
    height: 660,
    frameProps: {
      viewTransform: zoomed ? { x: -80, y: -20, k: 1.08 } : { x: 0, y: 0, k: 1 },
    },
  }
  const Reader = mode === "resolution-atlas" ? ResolutionAtlasChart : BoundaryLoomChart
  const exportFile = async (format: "json" | "svg") => {
    try {
      const content =
        format === "json"
          ? JSON.stringify({ synthetic: true, resolution, view }, null, 2)
          : (await import("semiotic/server")).renderChartWithEvidence("NetworkCustomChart", {
              ...resolutionChartProps(chartProps, mode),
              accessibleTable: true,
              theme,
            }).svg
      download(
        `${mode}.${format}`,
        content,
        format === "json" ? "application/json" : "image/svg+xml",
      )
      setError("")
    } catch (failure) {
      setError(String(failure))
    }
  }
  return (
    <section
      className="network-resolution-demo"
      data-testid="network-resolution-demo"
      ref={container}
    >
      <h2>Interactive example</h2>
      <p>
        This synthetic graph has 14 nodes and 18 edges, including a chain, a fan, a directed cycle,
        two parallel edges, and a self-loop. Each original edge is classified as internal to a group
        or crossing a group boundary. Select a representation to display its groups and edge
        annotations.
      </p>
      <div className="network-resolution-demo__controls">
        <label>
          Representation{" "}
          <select
            aria-label="Representation"
            value={ordinal}
            onChange={(event) => setOrdinal(Number(event.target.value))}
          >
            {resolution.pages.map((p, i) => (
              <option key={p.id} value={i}>
                Page {i}: {representationNames[i]}
              </option>
            ))}
          </select>
        </label>
        {mode === "resolution-atlas" && (
          <label>
            Generation colors{" "}
            <select
              aria-label="Generation colors"
              value={palette}
              onChange={(event) => setPalette(event.target.value)}
            >
              <option value="theme">Theme default (blues)</option>
              <option value="purples">Purples</option>
              <option value="greens">Greens</option>
            </select>
          </label>
        )}
        <label>
          <input
            type="checkbox"
            checked={compact}
            onChange={(event) => setCompact(event.target.checked)}
          />{" "}
          Compact layout
        </label>
        <label>
          <input
            type="checkbox"
            checked={zoomed}
            onChange={(event) => setZoomed(event.target.checked)}
          />{" "}
          Zoom and pan
        </label>
      </div>
      <p role="status" data-testid="resolution-account">
        Page {ordinal}: {page.groupIds.length} groups, {page.internalEdgeCount} internal edges, and{" "}
        {page.boundaryEdgeCount} boundary edges. Total cycle rank: {page.cycles.sourceRank}.
      </p>
      <p>
        {mode === "resolution-atlas"
          ? "Hover a group to highlight the components in earlier and later generations that share its original nodes. Fill colors use the generation index; the tooltip reports node and edge counts. Click a group to list its members, show the grouping rule, and display its boundary path support."
          : "Column and endpoint colors distinguish intra-group and inter-group connections on the selected page. Hover a column to see its classification and original endpoints. Filled history cells indicate internal ownership. A column connects to a row only at a marked endpoint."}{" "}
        The source table provides the same inspection controls. Inspect e17 to see an alternative
        path for the direct r → z edge. On small screens, the drawing scrolls horizontally.
      </p>
      <ThemeProvider theme={theme}>
        <div className="network-resolution-demo__paper">
          <div
            className="network-resolution-demo__scroll"
            tabIndex={0}
            role="region"
            aria-label="Network Resolution drawing and source tables; horizontal scrolling available"
            data-testid="resolution-reader"
            data-reader-width={width}
            data-page-ordinal={ordinal}
            data-reader-mode={mode}
            data-zoomed={zoomed}
          >
            <Reader {...chartProps} />
          </div>
        </div>
        <h2>Component Cutaway: directed path support</h2>
        <p>
          Select an entry–exit pair to highlight its endpoints and a supporting path in the original
          graph. Structural paths test what the connections allow. Observed journeys require one
          recorded journey through the component and both boundary connections.
        </p>
        <label>
          Cutaway example{" "}
          <select
            aria-label="Cutaway example"
            value={example}
            onChange={(event) => setExample(event.target.value as keyof typeof cutawayExamples)}
          >
            <option value="multi">Two entries, two exits</option>
            <option value="single">Single pair: reversed internal edge</option>
            <option value="missing">Two entries, two exits: missing journeys</option>
          </select>
        </label>
        <p>
          {example === "single"
            ? "A → x1 and x2 → D cross the group boundary, but the internal edge points x2 → x1. Entry x1 cannot reach exit x2."
            : example === "multi"
              ? "Three of four pairs have a structural path. Only A → x1 → y1 → B and C → x2 → y2 → D were recorded. Switch to Observed journeys: x1 → y2 changes from yes to no."
              : "This graph has the same connections but no journey records. Observed support is unknown for every pair."}
        </p>
        <div
          className="network-resolution-demo__paper network-resolution-demo__scroll"
          data-testid="resolution-cutaway"
        >
          <ComponentCutaway
            appearance={appearance}
            resolution={cutawayResolution}
            pageId={cutawayResolution.pages[1].id}
            groupId={cutawayResolution.pages[1].nodeOwner.x1}
            width={Math.min(width, 600)}
          />
        </div>
      </ThemeProvider>
      <h2>Export</h2>
      <p>
        The JSON export contains the source graph, group membership, edge histories, evidence, and
        view settings. The SVG export contains the current drawing, including its zoom and pan.
      </p>
      <div className="network-resolution-demo__controls">
        <button type="button" onClick={() => void exportFile("json")}>
          Export analysis JSON
        </button>
        <button type="button" onClick={() => void exportFile("svg")}>
          Export static SVG
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
    </section>
  )
}
