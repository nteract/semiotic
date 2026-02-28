import React from "react"
import { FacetController, XYFrame, OrdinalFrame } from "semiotic"

import PageLayout from "../../components/PageLayout"
import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PropTable from "../../components/PropTable"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const theme = [
  "#ac58e5",
  "#E0488B",
  "#9fd0cb",
  "#e0d33a",
  "#7566ff",
  "#533f82",
]

const categoriesA = [
  { column: "Q1", color: theme[0], step: 1, value: 15 },
  { column: "Q2", color: theme[0], step: 2, value: 25 },
  { column: "Q3", color: theme[0], step: 3, value: 5 },
  { column: "Q4", color: theme[0], step: 4, value: 8 },
]

const categoriesB = [
  { column: "Q1", color: theme[1], step: 1, value: 15 },
  { column: "Q2", color: theme[1], step: 2, value: 15 },
  { column: "Q3", color: theme[1], step: 3, value: 7 },
  { column: "Q4", color: theme[1], step: 4, value: 15 },
]

const ordinalDataSet1 = categoriesA.concat(categoriesB)
const ordinalDataSet2 = categoriesA
  .concat(categoriesB)
  .map((d) => ({ ...d, value: Math.round(d.value * Math.random() * 4) }))

const xyDataSet1 = [
  {
    color: theme[1],
    coordinates: categoriesB.map((d) => ({ ...d })),
  },
  {
    color: theme[0],
    coordinates: categoriesA.map((d) => ({ ...d })),
  },
]

const xyDataSet2 = [
  {
    color: theme[1],
    coordinates: categoriesB.map((d) => ({
      ...d,
      value: Math.round(d.value * Math.random() * 2),
    })),
  },
  {
    color: theme[0],
    coordinates: categoriesA.map((d) => ({
      ...d,
      value: Math.round(d.value * Math.random() * 2),
    })),
  },
]

// ---------------------------------------------------------------------------
// Prop definitions
// ---------------------------------------------------------------------------

const facetControllerProps = [
  {
    name: "sharedXExtent",
    type: "boolean",
    required: false,
    default: "false",
    description:
      "When true, all child XYFrames share the same x-axis extent, computed from the min/max of all sibling data.",
  },
  {
    name: "sharedYExtent",
    type: "boolean",
    required: false,
    default: "false",
    description:
      "When true, all child XYFrames share the same y-axis extent.",
  },
  {
    name: "sharedRExtent",
    type: "boolean",
    required: false,
    default: "false",
    description:
      "When true, all child OrdinalFrames share the same r-axis (value) extent.",
  },
  {
    name: "hoverAnnotation",
    type: "boolean",
    required: false,
    default: "false",
    description:
      "When true, hovering over a data element in one frame will show a coordinated tooltip in all sibling frames. Requires lineIDAccessor or pieceIDAccessor to be set for cross-frame matching.",
  },
  {
    name: "pieceHoverAnnotation",
    type: "boolean",
    required: false,
    default: "false",
    description:
      "When true, enables coordinated hover tooltips across OrdinalFrame children.",
  },
  {
    name: "react15Wrapper",
    type: "JSX.Element",
    required: false,
    default: "null",
    description:
      "A wrapper element for the child frames. Useful for layout, e.g., <div style={{ display: 'flex' }} />.",
  },
  {
    name: "size",
    type: "array",
    required: false,
    default: "null",
    description:
      "Shared [width, height] applied to all child frames.",
  },
  {
    name: "margin",
    type: "object",
    required: false,
    default: "null",
    description:
      "Shared margin applied to all child frames.",
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SmallMultiplesPage() {
  return (
    <PageLayout
      title="Small Multiples"
      breadcrumbs={[
        { label: "Features", path: "/features" },
        { label: "Small Multiples", path: "/features/small-multiples" },
      ]}
      prevPage={{ title: "Sparklines", path: "/features/sparklines" }}
      nextPage={{ title: "Styling", path: "/features/styling" }}
    >
      <p>
        Small multiples are a series of similar charts arranged in a grid, each
        showing a different subset or view of the data. They make it easy to
        compare patterns across categories, time periods, or other facets.
        Semiotic provides the <code>FacetController</code> component for
        creating coordinated small multiples with synchronized scales, shared
        hover annotations, and consistent styling.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* With Charts */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="with-charts">With Charts</h2>

      <p>
        Chart components can be wrapped in <code>FacetController</code> to
        create coordinated small multiples. Any shared props set on{" "}
        <code>FacetController</code> are passed through to all child frames.
        However, Chart components use their own simplified API, so for maximum
        control over small multiples, consider using the Frame components
        directly.
      </p>

      <CodeBlock
        code={`import { FacetController } from "semiotic"
import { BarChart } from "semiotic"

<FacetController
  size={[250, 200]}
  sharedRExtent={true}
  react15Wrapper={<div style={{ display: "flex", gap: "16px" }} />}
>
  <BarChart
    data={regionA}
    xAccessor="quarter"
    yAccessor="revenue"
    title="Region A"
  />
  <BarChart
    data={regionB}
    xAccessor="quarter"
    yAccessor="revenue"
    title="Region B"
  />
</FacetController>`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* With Frames */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="with-frames">With Frames</h2>

      <h3 id="basic-faceting">Basic Faceting</h3>
      <p>
        Wrap multiple Frame components in <code>FacetController</code> and set
        shared properties at the controller level. Each child Frame provides
        its own data. The <code>react15Wrapper</code> prop controls the layout
        of the generated frames.
      </p>

      <div style={{ marginBottom: 32 }}>
        <FacetController
          size={[280, 280]}
          margin={{ top: 40, left: 55, bottom: 40, right: 10 }}
          xAccessor="step"
          yAccessor="value"
          lineStyle={(d) => ({ stroke: d.color })}
          hoverAnnotation={true}
          lineIDAccessor="color"
          axes={[{ orient: "left" }, { orient: "bottom", ticks: 4 }]}
          sharedXExtent={true}
          sharedYExtent={true}
          oPadding={5}
          oAccessor="column"
          rAccessor="value"
          type="bar"
          style={(d) => ({ fill: d.color })}
          pieceHoverAnnotation={true}
          pieceIDAccessor="color"
          sharedRExtent={true}
          react15Wrapper={
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "12px",
              }}
            />
          }
        >
          <OrdinalFrame data={ordinalDataSet1} title="Dataset 1 (Bar)" />
          <OrdinalFrame data={ordinalDataSet2} title="Dataset 2 (Bar)" />
          <XYFrame title="Dataset 1 (Line)" lines={xyDataSet1} />
          <XYFrame title="Dataset 2 (Line)" lines={xyDataSet2} />
        </FacetController>
      </div>

      <CodeBlock
        code={`import { FacetController, OrdinalFrame, XYFrame } from "semiotic"

<FacetController
  size={[280, 280]}
  margin={{ top: 40, left: 55, bottom: 40, right: 10 }}
  // XYFrame shared props
  xAccessor="step"
  yAccessor="value"
  lineStyle={d => ({ stroke: d.color })}
  hoverAnnotation={true}
  lineIDAccessor="color"
  axes={[{ orient: "left" }, { orient: "bottom", ticks: 4 }]}
  sharedXExtent={true}
  sharedYExtent={true}
  // OrdinalFrame shared props
  oPadding={5}
  oAccessor="column"
  rAccessor="value"
  type="bar"
  style={d => ({ fill: d.color })}
  pieceHoverAnnotation={true}
  pieceIDAccessor="color"
  sharedRExtent={true}
  // Layout wrapper
  react15Wrapper={<div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }} />}
>
  <OrdinalFrame data={ordinalDataSet1} title="Dataset 1 (Bar)" />
  <OrdinalFrame data={ordinalDataSet2} title="Dataset 2 (Bar)" />
  <XYFrame title="Dataset 1 (Line)" lines={xyDataSet1} />
  <XYFrame title="Dataset 2 (Line)" lines={xyDataSet2} />
</FacetController>`}
        language="jsx"
        showLineNumbers
      />

      <h3 id="mixed-frame-types">Mixing Frame Types</h3>
      <p>
        One of the most powerful aspects of <code>FacetController</code> is
        that it can coordinate across different frame types. In the example
        above, both <code>OrdinalFrame</code> and <code>XYFrame</code>{" "}
        children share props and coordinated hover behavior. If your pieces in{" "}
        <code>OrdinalFrame</code> have matching data structures with points in{" "}
        <code>XYFrame</code>, tooltips will appear across frames when hovering.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Configuration */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="configuration">Configuration</h2>

      <PropTable
        componentName="FacetController"
        props={facetControllerProps}
      />

      <h3 id="shared-extents">Shared Extents</h3>
      <p>
        The most important feature of <code>FacetController</code> is
        synchronized scales. Without shared extents, each frame computes its
        own axis range independently, which makes visual comparison misleading.
        Use the shared extent props to ensure all frames use the same scales:
      </p>

      <CodeBlock
        code={`<FacetController
  sharedXExtent={true}  // Same x-axis range for all XYFrames
  sharedYExtent={true}  // Same y-axis range for all XYFrames
  sharedRExtent={true}  // Same r-axis range for all OrdinalFrames
>
  <XYFrame lines={salesNorth} title="North" />
  <XYFrame lines={salesSouth} title="South" />
  <XYFrame lines={salesEast} title="East" />
  <XYFrame lines={salesWest} title="West" />
</FacetController>`}
        language="jsx"
      />

      <h3 id="coordinated-hover">Coordinated Hover</h3>
      <p>
        When <code>hoverAnnotation</code> or <code>pieceHoverAnnotation</code>{" "}
        is set to <code>true</code> on the <code>FacetController</code>,
        hovering over a data element in one frame will display a corresponding
        annotation in all sibling frames. For this to work correctly, you need
        to set the appropriate ID accessor so Semiotic can match elements
        across frames:
      </p>

      <CodeBlock
        code={`<FacetController
  hoverAnnotation={true}
  lineIDAccessor="series"      // for XYFrame lines
  pieceIDAccessor="category"   // for OrdinalFrame pieces
>
  {/* ... child frames ... */}
</FacetController>`}
        language="jsx"
      />

      <h3 id="layout-options">Layout Options</h3>
      <p>
        The <code>react15Wrapper</code> prop takes a JSX element that wraps all
        the child frames. Use CSS flexbox or grid for layout:
      </p>

      <CodeBlock
        code={`// Flex row (horizontal)
<FacetController
  react15Wrapper={<div style={{ display: "flex", gap: "16px" }} />}
>
  {/* frames */}
</FacetController>

// CSS Grid (2x2)
<FacetController
  react15Wrapper={
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "16px",
    }} />
  }
>
  {/* frames */}
</FacetController>

// Responsive wrap
<FacetController
  react15Wrapper={
    <div style={{
      display: "flex",
      flexWrap: "wrap",
      gap: "16px",
    }} />
  }
>
  {/* frames */}
</FacetController>`}
        language="jsx"
        showLineNumbers
      />

      <h3 id="per-frame-overrides">Per-Frame Overrides</h3>
      <p>
        Props set on individual child frames take precedence over props set on
        the <code>FacetController</code>. This lets you share most settings
        while customizing specific frames:
      </p>

      <CodeBlock
        code={`<FacetController
  size={[300, 200]}
  margin={{ top: 30, left: 50, bottom: 30, right: 10 }}
  axes={[{ orient: "left" }, { orient: "bottom" }]}
>
  {/* This frame uses the shared size and margin */}
  <XYFrame lines={dataA} title="Region A" />

  {/* This frame overrides size for emphasis */}
  <XYFrame lines={dataB} title="Region B (Enlarged)" size={[500, 300]} />
</FacetController>`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Related */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/frames/xy-frame">XYFrame</Link> — child frame type for
          lines, areas, and scatterplots
        </li>
        <li>
          <Link to="/frames/ordinal-frame">OrdinalFrame</Link> — child frame
          type for bars, swarms, and distributions
        </li>
        <li>
          <Link to="/frames/network-frame">NetworkFrame</Link> — child frame
          type for network diagrams
        </li>
        <li>
          <Link to="/features/sparklines">Sparklines</Link> — tiny inline
          charts as an alternative to full small multiples
        </li>
        <li>
          <Link to="/features/legends">Legends</Link> — adding legends to your
          small multiple layouts
        </li>
      </ul>
    </PageLayout>
  )
}
