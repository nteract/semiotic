/** Reviewed coverage only. Unreviewed paths remain in the adoption inventory. */
export interface ServerPropContract {
  id: string
  component: string
  props: readonly string[]
  fixture?: string
  observable: string
}

export const serverPropContracts: readonly ServerPropContract[] = [
  {
    id: "process-sankey-curves",
    component: "ProcessSankey",
    props: ["curves"],
    observable: "Changing inventory interpolation changes the band perimeter while preserving ribbon geometry."
  },
  {
    id: "line-area",
    component: "LineChart",
    props: ["fillArea", "areaOpacity"],
    fixture: "line-mixed-area",
    observable:
      "Area/line mark counts and area opacity, including disabled and default controls."
  },
  {
    id: "line-band",
    component: "LineChart",
    props: ["band"],
    fixture: "line-band",
    observable:
      "Envelope marks and domain expansion disappear when band is omitted."
  },
  {
    id: "area-gradient",
    component: "AreaChart",
    props: ["semanticGradient", "areaOpacity"],
    fixture: "area-semantic-gradient",
    observable:
      "Semantic stops and opacity reach the painted area; ordinary fills have no gradient."
  },
  ...["PieChart", "DonutChart"].map((component) => ({
    id: `${component}-angle`,
    component,
    props: ["startAngle", "showLegend"],
    fixture: component === "PieChart" ? "pie-start-angle" : "donut-start-angle",
    observable:
      "First wedge starts at the requested angle; explicit zero matches the default; legend can be enabled and disabled."
  })),
  ...["BarChart", "StackedBarChart", "GroupedBarChart", "SwimlaneChart"].map(
    (component) => ({
      id: `${component}-bars`,
      component,
      props: ["valueExtent", "roundedTop", "barPadding"],
      fixture:
        component === "SwimlaneChart"
          ? "swimlane-value-extent"
          : "bar-axis-exact",
      observable:
        "Pinned domain, positive bar thickness, rounded versus square tips, callback radii and padding controls."
    })
  ),
  ...["LineChart", "SwimlaneChart"].map((component) => ({
    id: `${component}-axes`,
    component,
    props: ["frameProps.showAxes"],
    fixture:
      component === "LineChart" ? "line-mixed-area" : "swimlane-value-extent",
    observable:
      "Nested false hides axes and nested true overrides compact defaults; documented frame override precedence."
  })),
  {
    id: "ordinal-labels",
    component: "BarChart",
    props: ["categoryLabel", "valueLabel", "valueFormat"],
    fixture: "bar-axis-exact",
    observable:
      "Axis captions and callback-formatted ticks appear, with plain and disabled controls."
  },
  {
    id: "gauge-readout",
    component: "GaugeChart",
    props: [
      "value",
      "min",
      "max",
      "centerLabel",
      "valueFormat",
      "showNeedle",
      "showScaleLabels"
    ],
    observable:
      "Clamped, formatted value and range/caption text; needle and scale labels can be absent."
  },
  ...["AreaChart", "LineChart"].map((component) => ({
    id: `${component}-cursor-target`,
    component,
    props: ["hoverRadius"],
    observable:
      "A cursor-styled area emits one invisible hit target twice hoverRadius wide; the default is 60, zero clamps to 1, and an area without a cursor emits none."
  })),
  {
    id: "line-accessibility",
    component: "LineChart",
    props: ["title", "description"],
    fixture: "line-mixed-area",
    observable:
      "Accessible name and description survive both populated and empty input."
  }
]

export interface ServerPropExclusion {
  component: string
  prop: string
  status: "intentionally-client-only" | "runtime-callback-only"
  reason: string
}

// These are individual reviews, not exemptions applied to every chart by name.
export const serverPropExclusions: readonly ServerPropExclusion[] = [
  {
    component: "LineChart",
    prop: "enableHover",
    status: "intentionally-client-only",
    reason:
      "Pointer hit testing requires a mounted interactive frame; static SVG has no hover controller."
  },
  {
    component: "LineChart",
    prop: "onClick",
    status: "runtime-callback-only",
    reason:
      "A JavaScript event callback requires a mounted frame and cannot execute in a serialized static render."
  },
  {
    component: "LineChart",
    prop: "emptyContent",
    status: "intentionally-client-only",
    reason:
      "React empty-state content belongs to the live frame wrapper; static output uses its empty SVG and evidence contract."
  },
  {
    component: "LineChart",
    prop: "brushExtent",
    status: "intentionally-client-only",
    reason:
      "The brush is a pointer and keyboard overlay on a mounted frame; static SVG draws no brush, so there is no selection to place (src/components/server/brushStatic.test.tsx pins the unchanged SVG)."
  },
  {
    component: "LineChart",
    prop: "onBrushEnd",
    status: "runtime-callback-only",
    reason:
      "A brush callback fires on a pointer or keyboard change to a mounted brush and cannot execute in a serialized static render."
  },
  {
    component: "StackedAreaChart",
    prop: "brush",
    status: "intentionally-client-only",
    reason:
      "The brush is a pointer and keyboard overlay on a mounted frame; static SVG draws no brush, so there is no selection to place (src/components/server/brushStatic.test.tsx pins the unchanged SVG)."
  },
  {
    component: "StackedAreaChart",
    prop: "onBrush",
    status: "runtime-callback-only",
    reason:
      "A brush callback fires on a pointer or keyboard change to a mounted brush and cannot execute in a serialized static render."
  },
  {
    component: "StackedAreaChart",
    prop: "brushExtent",
    status: "intentionally-client-only",
    reason:
      "The brush is a pointer and keyboard overlay on a mounted frame; static SVG draws no brush, so there is no selection to place (src/components/server/brushStatic.test.tsx pins the unchanged SVG)."
  },
  {
    component: "StackedAreaChart",
    prop: "onBrushEnd",
    status: "runtime-callback-only",
    reason:
      "A brush callback fires on a pointer or keyboard change to a mounted brush and cannot execute in a serialized static render."
  },
  {
    component: "Histogram",
    prop: "brushExtent",
    status: "intentionally-client-only",
    reason:
      "The brush is a pointer and keyboard overlay on a mounted frame; static SVG draws no brush, so there is no selection to place (src/components/server/brushStatic.test.tsx pins the unchanged SVG)."
  },
  {
    component: "Histogram",
    prop: "onBrushEnd",
    status: "runtime-callback-only",
    reason:
      "A brush callback fires on a pointer or keyboard change to a mounted brush and cannot execute in a serialized static render."
  }
]

/** Chart-level exclusions are separate from prop exclusions. None currently. */
export const unsupportedServerCharts: Readonly<Record<string, string>> = {}

// frameProps is an open object. These reviewed children are validated against
// the actual frame interface, rather than accepting arbitrary dotted strings.
export const reviewedFramePaths = {
  LineChart: {
    file: "src/components/stream/types.ts",
    type: "StreamXYFrameProps",
    props: ["showAxes"]
  },
  SwimlaneChart: {
    file: "src/components/stream/ordinalTypes.ts",
    type: "StreamOrdinalFrameProps",
    props: ["showAxes"]
  }
} as const
