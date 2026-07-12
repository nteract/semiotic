import React, { useMemo, useState } from "react"
import { DirectManipulationControl } from "semiotic/controls"
import { unwrapDatum } from "semiotic/recipes"
import { XYCustomChart } from "semiotic/xy"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"

const DEMO_VALUES = [42, 55, 61, 49, 72, 67, 58, 78].map((value, index) => ({
  id: `control-demo-${index + 1}`,
  step: index + 1,
  value,
}))

const directControlCode = `import { DirectManipulationControl } from "semiotic/controls"

function ThresholdOverlay({ scaleY, width, threshold, setThreshold }) {
  return (
    <DirectManipulationControl
      controlType="threshold"
      value={threshold}
      min={0}
      max={100}
      step={1}
      x={width - 12}
      y={scaleY(threshold)}
      label="Priority threshold"
      valueText={\`Priority threshold: \${threshold}\`}
      pointerToValue={(event) => scaleY.invert(pointerInOverlay(event).y)}
      onChange={setThreshold}
      labelText="drag threshold"
    />
  )
}

// The chart owns its scales. The control owns focus, keyboard nudging,
// pointer capture, clamping, and a stable data-viz-control semantic.`

const controlsBundleCode = `// Frame-independent controls: no XY, ordinal, geo, network, or physics renderer.
import {
  DirectManipulationControl,
  CircularBrush,
  MobileStandardControls,
} from "semiotic/controls"

// Frame-owned brushing stays close to its scale and streaming contracts.
import { StreamXYFrame } from "semiotic/xy"
import { StreamOrdinalFrame } from "semiotic/ordinal"`

const recipeContractCode = `// Portable recipe control declaration.
controls: [{
  id: "priority-threshold",
  type: "threshold",
  target: "priorityScore",
  domain: [0, 100],
  step: 1,
  label: "Priority threshold",
  valueText: "Priority threshold: {value}",
  keyboard: "slider",
  minimumTargetSize: 24,
  alternatives: ["number-input", "mobile-standard-control"],
  observations: ["control-start", "control-change", "control-end"],
}]`

const auditCode = `import { auditVisualizationControls } from "semiotic/controls"

const audit = auditVisualizationControls({ controls: recipe.controls })
// Checks semantic type, state target, value domain, keyboard path,
// human-readable value text, target size, and control-change observation.`

function visibleRect({ x, y, w, h, fill, datum, id, group }) {
  return {
    type: "rect",
    x,
    y,
    w,
    h,
    roundedTop: 5,
    style: { fill },
    datum,
    group,
    _transitionKey: id,
  }
}

function overlayPoint(event) {
  const svg = event.currentTarget.ownerSVGElement
  if (!svg?.createSVGPoint || !event.currentTarget.getScreenCTM()) return { x: 0, y: 0 }
  const point = svg.createSVGPoint()
  point.x = event.clientX
  point.y = event.clientY
  return point.matrixTransform(event.currentTarget.getScreenCTM().inverse())
}

function DirectControlDemo() {
  const [threshold, setThreshold] = useState(60)
  const [width, hostRef] = useResponsiveWidth(280, 800)
  const chartWidth = Math.max(280, Math.floor(width))
  const layout = useMemo(
    () => (ctx) => {
      const { width: plotWidth, height: plotHeight } = ctx.dimensions.plot
      const x = ctx.scales.x
      const y = ctx.scales.y
      const baseline = y(0)
      const success = ctx.theme.semantic.success ?? ctx.resolveColor("above-threshold")
      const muted = ctx.theme.semantic.secondary ?? ctx.resolveColor("below-threshold")
      const warning = ctx.theme.semantic.warning ?? ctx.resolveColor("threshold")
      const text = ctx.theme.semantic.text ?? "currentColor"
      const barWidth = Math.min(42, (plotWidth - 24) / DEMO_VALUES.length - 8)
      return {
        nodes: DEMO_VALUES.map((datum) => visibleRect({
          x: x(datum.step) - barWidth / 2,
          y: y(datum.value),
          w: barWidth,
          h: baseline - y(datum.value),
          fill: datum.value >= threshold ? success : muted,
          datum,
          id: datum.id,
          group: datum.value >= threshold ? "meets threshold" : "below threshold",
        })),
        overlays: (
          <g>
            <line x1="0" x2={plotWidth} y1={y(threshold)} y2={y(threshold)} stroke={warning} strokeWidth="2" strokeDasharray="5 4" />
            <text x="0" y={y(threshold) - 8} fill={warning} style={styles.svgLabel}>priority threshold {threshold}</text>
            <DirectManipulationControl
              controlType="threshold"
              value={threshold}
              min={20}
              max={90}
              step={1}
              x={plotWidth - 12}
              y={y(threshold)}
              label="Priority threshold"
              valueText={`Priority threshold: ${threshold}`}
              pointerToValue={(event) => y.invert(overlayPoint(event).y)}
              onChange={setThreshold}
              stroke={warning}
              labelText="drag threshold"
              labelDx={-16}
              labelDy={-14}
              labelClassName="controls-page__control-label"
            />
            {DEMO_VALUES.map((datum) => <text key={datum.id} x={x(datum.step)} y={plotHeight - 4} textAnchor="middle" fill={text} style={styles.svgTick}>{datum.step}</text>)}
          </g>
        ),
      }
    },
    [threshold],
  )
  const highCount = DEMO_VALUES.filter((datum) => datum.value >= threshold).length
  return (
    <div ref={hostRef} style={styles.demoShell}>
      <XYCustomChart
        data={DEMO_VALUES}
        layout={layout}
        width={chartWidth}
        height={270}
        xExtent={[0.5, 8.5]}
        yExtent={[0, 100]}
        margin={{ top: 30, right: 28, bottom: 28, left: 28 }}
        enableHover
        accessibleTable
        description="A threshold control layered over eight priority values. Drag the handle or use its keyboard controls to change the threshold."
        summary={`${highCount} of ${DEMO_VALUES.length} values meet the current threshold of ${threshold}.`}
        tooltip={(datum) => {
          const row = unwrapDatum(datum)
          return <strong>Step {row.step}: priority {row.value}</strong>
        }}
        frameProps={{ background: "transparent" }}
      />
      <p style={styles.demoReadout}>
        <strong>{highCount} of {DEMO_VALUES.length}</strong> values currently meet the threshold. The control emits
        <code> data-viz-control="threshold"</code>, supports pointer capture, and is a keyboard slider.
      </p>
    </div>
  )
}

const candidates = [
  {
    surface: "DirectManipulationControl",
    status: "Public now",
    scope: "Frame-independent SVG overlay",
    decision: "Keep generic. It receives geometry and pointer-to-value conversion from the chart, then owns drag, keyboard, ARIA, and semantic control identity.",
  },
  {
    surface: "CircularBrush",
    status: "Public now",
    scope: "Cyclical range control",
    decision: "Move with the controls bundle. Its geometry is self-contained and it does not need frame state.",
  },
  {
    surface: "MobileStandardControls + useMobileRangeControls",
    status: "Public now",
    scope: "HTML fallback and mobile rail",
    decision: "Move with the controls bundle. It is the non-hover counterpart to chart-local gestures.",
  },
  {
    surface: "XYBrushOverlay / OrdinalBrushOverlay",
    status: "Frame-owned",
    scope: "Scale, bin, streaming, selection-aware range brush",
    decision: "Do not export raw D3 overlays. Lift shared selection semantics and accessibility conventions, while keeping scale lifecycles inside each frame.",
  },
  {
    surface: "MinimapChart brush",
    status: "Composite pattern",
    scope: "Overview + detail navigation",
    decision: "Keep as a chart HOC. A minimap is visual context plus a brush, not merely a generic control.",
  },
  {
    surface: "DetailsPanel",
    status: "Observation companion",
    scope: "Click/hover follow-up",
    decision: "Do not classify as a control. It consumes observations and supplies explanation after a selection is made.",
  },
]

export default function VisualizationControlsPage() {
  return (
    <PageLayout
      title="Visualization Controls"
      breadcrumbs={[
        { label: "Features", path: "/features" },
        { label: "Visualization Controls", path: "/features/controls" },
      ]}
      prevPage={{ title: "Interaction", path: "/features/interaction" }}
      nextPage={{ title: "Responsive", path: "/features/responsive" }}
    >
      <p>
        A visualization control changes the state that a chart is explaining. It is not a tooltip,
        a legend, or an arbitrary dashboard widget. Semiotic controls should be controlled, semantic,
        inspectable, and usable through the same chart state on pointer, keyboard, touch, and mobile HTML paths.
      </p>

      <h2 id="control-surface">The control surface</h2>
      <p>
        <code>DirectManipulationControl</code> is the small shared primitive for an SVG control drawn
        in a frame overlay. The frame keeps its own scales; the control receives a pointer-to-value
        adapter. That division lets one component work over XY, ordinal, geographic, radial, and custom
        chart coordinates without embedding a frame dependency in the controls bundle.
      </p>

      <DirectControlDemo />

      <CodeBlock code={directControlCode} language="jsx" />

      <h2 id="current-controls">Current control families</h2>
      <div style={styles.cardGrid}>
        <article style={styles.card}>
          <h3>Direct overlays</h3>
          <p><code>DirectManipulationControl</code> is for thresholds, partition boundaries, reporting windows, and other one-value manipulations embedded in a chart.</p>
          <p>It exposes <code>data-viz-control</code> with one of the public semantic control types.</p>
        </article>
        <article style={styles.card}>
          <h3>Range and brush</h3>
          <p><code>CircularBrush</code> provides a self-contained cyclical range. XY and ordinal brushes remain frame-owned because they must track scale changes, bin snapping, streaming, and selections.</p>
        </article>
        <article style={styles.card}>
          <h3>Mobile alternatives</h3>
          <p><code>MobileStandardControls</code> and <code>useMobileRangeControls</code> provide native buttons, ranges, and legend controls that drive the same controlled state as desktop gestures.</p>
        </article>
      </div>

      <h2 id="bundle-strategy">Bundle strategy</h2>
      <p>
        Import frame-independent controls from <code>semiotic/controls</code>. This entry point carries React
        control surfaces but no frame renderer, canvas scene builder, geographic projection, physics kernel, or D3 brush lifecycle.
        Keep frame-specific brushes in their existing subpaths so importing a small control does not pull an XY or ordinal frame into an application.
      </p>
      <CodeBlock code={controlsBundleCode} language="jsx" />
      <p>
        The root <code>semiotic</code> export remains available for compatibility. Prefer the controls entry
        for applications that place controls in their own shell, annotation layer, or design system.
      </p>

      <h2 id="candidate-inventory">What can be lifted, and what should stay put</h2>
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr><th>Existing surface</th><th>Status</th><th>Scope</th><th>Decision</th></tr>
          </thead>
          <tbody>
            {candidates.map((candidate) => (
              <tr key={candidate.surface}>
                <td><code>{candidate.surface}</code></td>
                <td>{candidate.status}</td>
                <td>{candidate.scope}</td>
                <td>{candidate.decision}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 id="shared-contract">One contract, multiple frames</h2>
      <p>
        A shared control should describe state, not dictate rendering. Every frame can bind the same semantics
        through a local adapter: an XY threshold uses <code>scale.invert</code>; a geographic seam uses
        <code>projection.invert</code>; a radial control uses angle-to-domain conversion. The control itself should not import any of those scale systems.
      </p>
      <ul>
        <li><strong>XY and custom:</strong> overlay control plus an x/y scale adapter.</li>
        <li><strong>Ordinal:</strong> overlay control plus a band or value-scale adapter.</li>
        <li><strong>Geo:</strong> overlay control plus a projected-coordinate adapter.</li>
        <li><strong>Network and physics:</strong> overlay control plus a layout-state adapter; dragging a node is not automatically a data control.</li>
        <li><strong>HOCs:</strong> expose controlled props first. A control should update the same value a developer could pass directly.</li>
      </ul>

      <h2 id="accessibility-observability">Accessibility, observations, annotations, and AI</h2>
      <div style={styles.cardGrid}>
        <article style={styles.card}>
          <h3>Accessibility</h3>
          <p>Controls use slider semantics, meaningful <code>aria-valuetext</code>, Arrow keys, Shift+Arrow, Home, End, and a visible focus state. Every drag needs an HTML or keyboard alternative.</p>
        </article>
        <article style={styles.card}>
          <h3>Observability</h3>
          <p>Direct controls now emit <code>control-start</code>, <code>control-change</code>, and <code>control-end</code> into the existing <code>onObservation</code> stream. The adapter remains usable without an observation provider.</p>
        </article>
        <article style={styles.card}>
          <h3>Annotations</h3>
          <p>Frame overlays default to non-interactive so labels do not steal hover. A real control explicitly opts into pointer events, remains above marks, and may drive annotation state through the same controlled value.</p>
        </article>
        <article style={styles.card}>
          <h3>AI and portable recipes</h3>
          <p>Recipe <code>controls</code> declarations now give agents and serializers a stable vocabulary for target state, domain, keyboard alternative, annotation state, and expected control observations without serializing pointer handlers.</p>
        </article>
      </div>
      <CodeBlock code={recipeContractCode} language="js" />

      <h2 id="control-audit">Control audit</h2>
      <p>
        <code>auditVisualizationControls</code> is the portable counterpart to the scene and mobile audits. Recipe registration rejects
        declarations missing a semantic type, state target, ordered domain, keyboard path, value text, or 24px minimum target. It also reports
        observation coverage and invalid quantization steps.
      </p>
      <CodeBlock code={auditCode} language="js" />

      <h2 id="next-steps">Completed foundations</h2>
      <ol>
        <li>Frame-agnostic control observations now forward into <code>onObservation</code>.</li>
        <li>Portable recipes can declare <code>controls</code> with state, access, and observation metadata.</li>
        <li>XY and ordinal brushes share keyboard and ARIA semantics while keeping their scale-specific D3 lifecycle in their own bundles.</li>
        <li>The portable control audit covers target size, keyboard path, value text, semantic type, state binding, domain, and step.</li>
      </ol>
    </PageLayout>
  )
}

const styles = {
  demoShell: {
    margin: "24px 0",
    padding: 18,
    border: "1px solid var(--surface-3)",
    borderRadius: 12,
    background: "var(--surface-1)",
  },
  demoReadout: {
    margin: "12px 0 0",
    color: "var(--text-secondary)",
  },
  svgLabel: {
    fontFamily: "var(--font-code)",
    fontSize: 11,
    fontWeight: 700,
  },
  svgTick: {
    fontFamily: "var(--font-code)",
    fontSize: 10,
  },
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
    margin: "20px 0",
  },
  card: {
    padding: 16,
    border: "1px solid var(--surface-3)",
    borderRadius: 10,
    background: "var(--surface-1)",
  },
  tableWrap: {
    overflowX: "auto",
    margin: "20px 0",
    border: "1px solid var(--surface-3)",
    borderRadius: 10,
  },
  table: {
    width: "100%",
    minWidth: 760,
    borderCollapse: "collapse",
  },
}
