import { createElement } from "react"
import type { renderChartWithEvidence } from "semiotic/server/edge"
import type { resolveReferenceGeography } from "semiotic/geo"

type EdgeRenderer = { renderChartWithEvidence: typeof renderChartWithEvidence }
type Geography = { resolveReferenceGeography: typeof resolveReferenceGeography }
type Result = ReturnType<typeof renderChartWithEvidence>

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Packed browser edge renderer: ${message}`)
}

function inspect(
  result: Result,
  frameType: string,
  markType: string,
  count: number,
  name: string
) {
  const { svg, evidence } = result
  check(evidence.frameType === frameType, `${name}: wrong frame type`)
  check(evidence.status === "ok" && !evidence.empty, `${name}: empty render`)
  check(
    evidence.markCount === count &&
      evidence.markCountByType[markType] === count,
    `${name}: unexpected data marks`
  )
  check(
    evidence.warnings.length === 0,
    `${name}: ${evidence.warnings.join(", ")}`
  )
  const document = new DOMParser().parseFromString(svg, "image/svg+xml")
  check(!document.querySelector("parsererror"), `${name}: invalid SVG`)
  const root = document.documentElement
  check(
    root.localName === "svg" &&
      root.namespaceURI === "http://www.w3.org/2000/svg",
    `${name}: missing SVG root`
  )
  check(
    root.getAttribute("role") === "img" &&
      root.getAttribute("aria-label") === name,
    `${name}: missing accessible name`
  )
  check(evidence.ariaLabel === name, `${name}: accessible evidence disagrees`)
  const paths = Array.from(document.querySelectorAll("path[d]"))
  check(
    paths.length === count,
    `${name}: expected ${count} SVG data paths, got ${paths.length}`
  )
  for (const path of paths) {
    const d = path.getAttribute("d") ?? ""
    check(
      /^M/.test(d) && /[LlCcHhVvAa]/.test(d) && !/NaN|Infinity/.test(d),
      `${name}: invalid data path`
    )
  }
  return { document, paths }
}

function domain(
  actual: number[] | undefined,
  expected: number[],
  name: string
) {
  check(
    actual?.length === expected.length &&
      actual.every((value, i) => value === expected[i]),
    `${name}: expected domain ${expected}, got ${actual}`
  )
}

/** Runs only after the separate API census loads. Never import this from the
 * ordinary live-chart app: retaining the renderer must not inflate its graph.
 * The supplied namespaces are the real packed exports compiled by each bundler.
 */
export async function checkEdgeRenderer(edge: EdgeRenderer, geo: Geography) {
  check(
    typeof edge?.renderChartWithEvidence === "function",
    "census lacks renderChartWithEvidence"
  )
  const props = {
    data: [
      { x: 0.123456789, y: 12.3456789 },
      { x: 1.987654321, y: 98.7654321 },
      { x: 2.555555555, y: 42.4242424 }
    ],
    xAccessor: "x",
    yAccessor: "y",
    xExtent: [0, 3],
    yExtent: [0, 100],
    width: 281,
    height: 279,
    chartId: "consumer-edge-precision",
    title: "Metric 1.23456789",
    description: "Three edge observations",
    summary: "Values rise then fall",
    accessibleTable: true
  }
  const exact = edge.renderChartWithEvidence("LineChart", props)
  const rounded = edge.renderChartWithEvidence("LineChart", props, {
    precision: 3
  })
  const exactSvg = inspect(exact, "xy", "line", 1, props.description)
  const roundedSvg = inspect(rounded, "xy", "line", 1, props.description)
  domain(rounded.evidence.xDomain, [0, 3], "line x")
  domain(rounded.evidence.yDomain, [0, 100], "line y")
  const exactPath = exactSvg.paths[0].getAttribute("d")!
  const roundedPath = roundedSvg.paths[0].getAttribute("d")!
  check(
    exactPath !== roundedPath &&
      /\.\d{4,}/.test(exactPath) &&
      !/\.\d{4,}/.test(roundedPath),
    "precision must round actual path coordinates"
  )
  check(
    roundedSvg.document.querySelector("title")?.textContent === props.title,
    "precision changed title text"
  )

  const custom = edge.renderChartWithEvidence(
    "LineChart",
    {
      ...props,
      chartId: "consumer-edge-custom",
      description: "Custom edge annotation and legend",
      annotations: [
        { type: "consumer-note", x: 1, y: 50, label: "Reviewed 1.23456789" },
        { type: "y-threshold", value: 25, label: "Floor" }
      ],
      frameProps: {
        legend: createElement(
          "g",
          { "data-consumer-legend": "custom" },
          createElement("text", { x: 2, y: 12 }, "Reviewed series")
        ),
        svgAnnotationRules: (
          annotation: Record<string, unknown>,
          index: number,
          context: {
            scales?: {
              x?: (value: number) => number
              y?: (value: number) => number
            }
          }
        ) => {
          if (annotation.type !== "consumer-note") return null
          const x = context.scales?.x?.(Number(annotation.x))
          const y = context.scales?.y?.(Number(annotation.y))
          check(
            Number.isFinite(x) && Number.isFinite(y),
            "custom annotation lost its scales"
          )
          return createElement(
            "text",
            { key: index, x, y, "data-consumer-annotation": "custom" },
            String(annotation.label)
          )
        }
      }
    },
    { precision: 3 }
  )
  const customSvg = inspect(
    custom,
    "xy",
    "line",
    1,
    "Custom edge annotation and legend"
  ).document
  check(
    custom.evidence.annotationCount === 2,
    "custom and built-in annotations must both render"
  )
  const annotation = customSvg.querySelector(
    '[data-consumer-annotation="custom"]'
  )
  check(
    annotation?.textContent === "Reviewed 1.23456789",
    "custom React annotation lost its text"
  )
  check(
    Number(annotation.getAttribute("x")) > 0 &&
      Number(annotation.getAttribute("y")) > 0,
    "custom annotation must be projected inside the plot"
  )
  check(
    customSvg.querySelector('[data-consumer-legend="custom"]')?.textContent ===
      "Reviewed series",
    "custom React legend is missing"
  )
  check(
    Array.from(customSvg.querySelectorAll(".semiotic-annotations text")).some(
      (node) => node.textContent === "Floor"
    ),
    "null annotation rule must fall through to the built-in threshold"
  )
  domain(custom.evidence.yDomain, [0, 100], "annotated line y")

  const areas: GeoJSON.Feature[] = [
    {
      type: "Feature",
      id: "west",
      properties: { name: "West", value: 3 },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-12, -4],
            [-12, 4],
            [-4, 4],
            [-4, -4],
            [-12, -4]
          ]
        ]
      }
    },
    {
      type: "Feature",
      id: "east",
      properties: { name: "East", value: 9 },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [4, -4],
            [4, 4],
            [12, 4],
            [12, -4],
            [4, -4]
          ]
        ]
      }
    }
  ]
  const geoProps = {
    areas,
    valueAccessor: "value",
    projection: "equalEarth",
    showLegend: false,
    width: 360,
    height: 220,
    chartId: "consumer-edge-local-geo",
    title: "Local regions",
    description: "Two local regions",
    summary: "East exceeds West"
  }
  const local = edge.renderChartWithEvidence("ChoroplethMap", geoProps)
  const localSvg = inspect(local, "geo", "geoarea", 2, geoProps.description)
  check(
    localSvg.document.querySelector("title")?.textContent === geoProps.title,
    "geo title is missing"
  )
  check(
    new Set(localSvg.paths.map((path) => path.getAttribute("d"))).size === 2,
    "local regions must have distinct geometry"
  )
  const fills = localSvg.paths.map((path) => path.getAttribute("fill"))
  check(
    fills.every((fill) => fill && fill !== "none") && new Set(fills).size === 2,
    "local values must produce distinct area fills"
  )

  // The edge renderer is synchronous. An unresolved name must fail explicitly;
  // reference loading belongs to the public async geo helper and its peer data.
  let unresolved = ""
  try {
    edge.renderChartWithEvidence("ChoroplethMap", {
      ...geoProps,
      areas: "world-110m"
    })
  } catch (error) {
    unresolved = String(error)
  }
  check(
    unresolved.includes("world-110m") &&
      unresolved.includes("resolveReferenceGeography") &&
      unresolved.includes("synchronously"),
    "unresolved reference must explain async pre-resolution"
  )
  check(
    typeof geo?.resolveReferenceGeography === "function",
    "census lacks resolveReferenceGeography"
  )
  const world = await geo.resolveReferenceGeography("world-110m")
  check(
    world.length > 100 &&
      world.every((feature) => feature.type === "Feature" && feature.geometry),
    "world-atlas did not resolve real features"
  )
  const reference = edge.renderChartWithEvidence("ChoroplethMap", {
    ...geoProps,
    areas: world,
    chartId: "consumer-edge-world",
    title: "Resolved world",
    description: "World reference regions"
  })
  inspect(reference, "geo", "geoarea", world.length, "World reference regions")

  return {
    entry: "semiotic/server/edge",
    precision: {
      digits: 3,
      markCount: rounded.evidence.markCount,
      xDomain: rounded.evidence.xDomain,
      yDomain: rounded.evidence.yDomain
    },
    customChrome: {
      markCount: custom.evidence.markCount,
      annotationCount: custom.evidence.annotationCount,
      legend: "Reviewed series"
    },
    localGeography: {
      markCount: local.evidence.markCount,
      features: areas.length
    },
    referenceGeography: {
      name: "world-110m",
      loader: "semiotic/geo.resolveReferenceGeography",
      features: world.length,
      markCount: reference.evidence.markCount,
      rejectsUnresolved: true
    }
  }
}
