import React, { useMemo, useState } from "react"
import { DirectManipulationControl, SentenceFilter } from "semiotic/controls"
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

const PASSAGE_SIGNALS = [
  { id: "love-1", subject: "love", work: "Romeo and Juliet", weight: 31 },
  { id: "love-2", subject: "love", work: "Twelfth Night", weight: 24 },
  { id: "love-3", subject: "love", work: "Sonnet 116", weight: 27 },
  { id: "love-4", subject: "love", work: "Much Ado", weight: 19 },
  { id: "love-5", subject: "love", work: "As You Like It", weight: 22 },
  { id: "love-6", subject: "love", work: "The Tempest", weight: 17 },
  { id: "death-1", subject: "death", work: "Hamlet", weight: 34 },
  { id: "death-2", subject: "death", work: "Macbeth", weight: 29 },
  { id: "death-3", subject: "death", work: "King Lear", weight: 26 },
  { id: "death-4", subject: "death", work: "Julius Caesar", weight: 23 },
  { id: "death-5", subject: "death", work: "Richard II", weight: 18 },
  { id: "death-6", subject: "death", work: "Cymbeline", weight: 15 },
  { id: "power-1", subject: "power", work: "Macbeth", weight: 32 },
  { id: "power-2", subject: "power", work: "Julius Caesar", weight: 28 },
  { id: "power-3", subject: "power", work: "Henry V", weight: 25 },
  { id: "power-4", subject: "power", work: "The Tempest", weight: 21 },
  { id: "power-5", subject: "power", work: "Coriolanus", weight: 20 },
  { id: "power-6", subject: "power", work: "Measure for Measure", weight: 16 },
]

const subjectOptions = ["love", "death", "power"].map((value) => ({ value, label: value }))

const basicSentenceDefinitions = {
  amount: {
    type: "number",
    label: "Number of sentences",
    min: 10,
    max: 30,
    step: 5,
    inputMode: "both",
  },
  subject: {
    type: "select",
    label: "Subject",
    options: subjectOptions,
  },
}

const advancedSentenceDefinitions = {
  amount: {
    type: "number",
    label: "Number of passages",
    min: 5,
    max: 50,
    step: 5,
    inputMode: "both",
  },
  forms: {
    type: "multiselect",
    label: "Literary forms",
    options: [
      { value: "plays", label: "plays" },
      { value: "sonnets", label: "sonnets" },
      { value: "poems", label: "poems" },
    ],
    conjunction: "and",
  },
  subject: {
    type: "select",
    label: "Subject",
    searchable: true,
    options: [
      { value: "love", label: "love", keywords: ["affection", "romance"] },
      { value: "death", label: "death", keywords: ["mortality"] },
      { value: "power", label: "power", keywords: ["rule", "authority"] },
      { value: "identity", label: "identity" },
    ],
  },
  years: {
    type: "range",
    label: "Composition years",
    min: 1588,
    max: 1613,
    step: 1,
    formatValue: ([start, end]) => `${start}–${end}`,
    getAccessibleValue: ([start, end]) => `${start} through ${end}`,
  },
  annotated: {
    type: "toggle",
    label: "Annotation status",
    trueLabel: "with annotations",
    falseLabel: "without annotations",
  },
  speaker: {
    type: "text",
    label: "Speaker",
    placeholder: "any speaker",
    suggestions: [
      { value: "Hamlet", label: "Hamlet" },
      { value: "Juliet", label: "Juliet" },
      { value: "Prospero", label: "Prospero" },
      { value: "Viola", label: "Viola" },
    ],
  },
}

const sentenceFilterBasicCode = `import { SentenceFilter } from "semiotic/controls"

const [filters, setFilters] = useState({ amount: 20, subject: "love" })

<SentenceFilter
  as="h2"
  sentence="{amount} sentences about {subject}"
  filters={filters}
  definitions={{
    amount: { type: "number", label: "Number of sentences", min: 10, max: 30, step: 5 },
    subject: { type: "select", label: "Subject", options: subjectOptions },
  }}
  onChange={setFilters}
/>

// Derive the chart from the same controlled object.
const visible = sampleByWork(passages, filters.subject, filters.amount)`

const sentenceFilterTypesCode = `definitions={{
  amount: { type: "number", label: "Amount", min: 5, max: 50, step: 5 },
  subject: { type: "select", label: "Subject", options: subjectOptions, searchable: true },
  forms: { type: "multiselect", label: "Forms", options: formOptions, conjunction: "and" },
  years: { type: "range", label: "Years", min: 1588, max: 1613 },
  annotated: { type: "toggle", label: "Annotation status", trueLabel: "with annotations" },
  speaker: { type: "text", label: "Speaker", suggestions: speakerOptions },
}}`

const sentenceFilterCustomizationCode = `const budgetDefinition = {
  type: "number",
  label: "Budget",
  formatValue: (value) => \`$\${value.toLocaleString()}\`,
  getAccessibleValue: (value) => \`\${value.toLocaleString()} dollars\`,
}

<SentenceFilter
  sentence="Products under {budget}"
  filters={filters}
  definitions={{ budget: budgetDefinition }}
  onChange={setFilters}
/>

<SentenceFilter
  sentence="Compare {subject} with other examples of {subject}"
  filters={filters}
  definitions={{ subject: { type: "select", label: "Subject", options: subjectOptions } }}
  onChange={setFilters}
  renderControl={({ value, definition, setValue, close }) => (
    <ProjectSubjectPicker
      label={definition.label}
      value={value}
      onSelect={(next) => { setValue(next, "input"); close() }}
    />
  )}
/>
// Both {subject} buttons stay synchronized; the template parser is unchanged.`

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
  SentenceFilter,
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
        <code> data-viz-control=&quot;threshold&quot;</code>, supports pointer capture, and is a keyboard slider.
      </p>
    </div>
  )
}

function SentenceFilterChartDemo() {
  const [filters, setFilters] = useState({ amount: 20, subject: "love" })
  const subjectPassages = PASSAGE_SIGNALS.filter((passage) => passage.subject === filters.subject)
  const totalWeight = subjectPassages.reduce((total, passage) => total + passage.weight, 0)
  let allocated = 0
  let cumulativeWeight = 0
  const visiblePassages = subjectPassages.map((passage) => {
    cumulativeWeight += passage.weight
    const nextAllocated = Math.round((cumulativeWeight / totalWeight) * filters.amount)
    const count = nextAllocated - allocated
    allocated = nextAllocated
    return { ...passage, count }
  })
  const maxCount = Math.max(...visiblePassages.map((passage) => passage.count))

  return (
    <div style={styles.demoShell}>
      <SentenceFilter
        as="h3"
        sentence="{amount} sentences about {subject}"
        filters={filters}
        definitions={basicSentenceDefinitions}
        onChange={setFilters}
        size="large"
        style={styles.sentenceTitle}
      />
      <div
        role="img"
        aria-label={`${filters.amount} sentences about ${filters.subject}, distributed across ${visiblePassages.length} works.`}
        style={styles.miniChart}
      >
        {visiblePassages.map((passage) => (
          <div key={passage.id} style={styles.miniChartRow}>
            <span style={styles.miniChartLabel}>{passage.work}</span>
            <span style={styles.miniChartTrack}>
              <span
                style={{
                  ...styles.miniChartBar,
                  width: `${Math.round((passage.count / maxCount) * 100)}%`,
                }}
              />
            </span>
            <strong style={styles.miniChartValue}>{passage.count}</strong>
          </div>
        ))}
      </div>
      <p style={styles.demoReadout}>
        The sample distributes <strong>{filters.amount}</strong> sentences across{" "}
        <strong>{visiblePassages.length}</strong> works. Both inline controls update this readout
        and chart immediately.
      </p>
    </div>
  )
}

function SentenceFilterTypesDemo() {
  const [filters, setFilters] = useState({
    amount: 20,
    forms: ["plays", "sonnets"],
    subject: "love",
    years: [1590, 1610],
    annotated: true,
    speaker: "Juliet",
  })

  return (
    <div style={{ ...styles.demoShell, ...styles.wrappingDemo }}>
      <SentenceFilter
        as="p"
        sentence="Explore {amount} {forms} passages about {subject}, written between {years}, {annotated}, and spoken by {speaker}; compare {subject} across forms."
        filters={filters}
        definitions={advancedSentenceDefinitions}
        onChange={setFilters}
        size="large"
        wrap
        style={styles.longSentence}
      />
      <p style={styles.compactReadout}>
        Current query: {filters.amount} passages · {filters.forms.join(" + ")} ·{" "}
        {filters.years.join("–")} · {filters.annotated ? "annotated" : "plain"} ·{" "}
        {filters.speaker || "any speaker"}
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

const sentenceFilterProps = [
  {
    names: "sentence",
    purpose:
      "Named-placeholder template. Static punctuation and whitespace are preserved, {{ and }} escape literal braces, and repeated placeholders share one value.",
  },
  {
    names: "filters, defaultFilters, definitions",
    purpose:
      "Use filters for the documented controlled form, or defaultFilters for convenience. Definitions select and configure each inline editor.",
  },
  {
    names: "onChange",
    purpose:
      "Receives the complete next filter object plus { key, previousValue, value, source } metadata.",
  },
  {
    names: "as, className, style",
    purpose:
      "Choose the semantic wrapper and integrate it with the surrounding chart-title or design-system styles.",
  },
  {
    names: "size, align, wrap",
    purpose:
      "Control title scale, alignment, and responsive wrapping without changing editor behavior.",
  },
  {
    names: "disabled, readOnly",
    purpose: "Disable the component or retain the readable sentence while preventing edits.",
  },
  {
    names: "ariaLabel, id",
    purpose:
      "Override the full-sentence accessible name and provide a stable instance identifier when needed.",
  },
  {
    names: "renderControl, onOpenChange",
    purpose:
      "Replace only the popover editor or observe which placeholder is open; parsing and trigger behavior remain owned by SentenceFilter.",
  },
]

const sentenceFilterDefinitionTypes = [
  ["number", "min, max, step, inputMode", "Number field, slider, or both"],
  ["select", "options, searchable", "Single searchable option list"],
  ["multiselect", "options, searchable, conjunction", "Checkbox list with readable joined values"],
  ["range", "min, max, step", "Paired values for a numeric interval"],
  ["toggle", "trueLabel, falseLabel", "Two-state choice phrased for the sentence"],
  ["text", "suggestions, placeholder", "Free text with optional suggestions"],
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

      <h2 id="sentence-filter">Sentence Filter</h2>
      <p>
        <code>SentenceFilter</code> turns a readable title into a small set of controlled filters.
        Named placeholders become editorial-style buttons rather than a toolbar of inputs, while the
        application remains the source of truth. Change the amount or subject below and the compact
        chart is derived from the same <code>filters</code> object immediately.
      </p>

      <SentenceFilterChartDemo />

      <CodeBlock code={sentenceFilterBasicCode} language="jsx" />

      <h3 id="sentence-filter-types">Six definition types, one wrapping sentence</h3>
      <p>
        A definition selects the appropriate editor: number, select, multiselect, range, toggle, or
        text with suggestions. This intentionally long sentence wraps at narrow widths, and its
        repeated <code>{"{subject}"}</code> placeholder stays synchronized in both positions.
      </p>

      <SentenceFilterTypesDemo />

      <CodeBlock code={sentenceFilterTypesCode} language="jsx" />

      <h3 id="sentence-filter-accessibility">Keyboard and screen-reader behavior</h3>
      <div style={styles.cardGrid}>
        <article style={styles.card}>
          <h4 style={styles.cardHeading}>Open and close</h4>
          <p>
            Tab reaches each value in sentence order. Enter or Space opens it; Escape closes it and
            returns focus to the triggering word. Clicking outside also dismisses the editor.
          </p>
        </article>
        <article style={styles.card}>
          <h4 style={styles.cardHeading}>Move and choose</h4>
          <p>
            Arrow keys move through options, Home and End jump in long lists, and select editors
            support typeahead. Native fields and sliders preserve their familiar keyboard behavior.
          </p>
        </article>
        <article style={styles.card}>
          <h4 style={styles.cardHeading}>Hear the sentence</h4>
          <p>
            The wrapper exposes a continuous readable sentence, each button names its filter and
            value, and a polite live region announces changes without moving focus.
          </p>
        </article>
      </div>

      <h3 id="sentence-filter-customization">Formatting, repeated values, and custom editors</h3>
      <p>
        Use <code>formatValue</code> for visual phrasing and <code>getAccessibleValue</code> when
        that phrasing needs a clearer spoken form. <code>renderControl</code> receives{" "}
        <code>key</code>, <code>value</code>, <code>filters</code>, <code>definition</code>,{" "}
        <code>setValue</code>, and <code>close</code>; it replaces the popover editor without
        replacing the sentence parser or accessible trigger.
      </p>
      <CodeBlock code={sentenceFilterCustomizationCode} language="jsx" />

      <h3 id="sentence-filter-api">API at a glance</h3>
      <details style={styles.apiDetails}>
        <summary style={styles.apiSummary}>Show the complete prop and definition reference</summary>
        <div style={styles.tableWrap}>
          <table style={{ ...styles.table, minWidth: 680 }}>
            <thead>
              <tr>
                <th>Props</th>
                <th>Contract</th>
              </tr>
            </thead>
            <tbody>
              {sentenceFilterProps.map((row) => (
                <tr key={row.names}>
                  <td>
                    <code>{row.names}</code>
                  </td>
                  <td>{row.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Every definition also accepts <code>label</code>, <code>description</code>,{" "}
          <code>disabled</code>, <code>allowClear</code>, <code>emptyLabel</code>,{" "}
          <code>accent</code>, <code>formatValue</code>, and <code>getAccessibleValue</code>.
          Type-specific options are deliberately small:
        </p>
        <div style={styles.tableWrap}>
          <table style={{ ...styles.table, minWidth: 680 }}>
            <thead>
              <tr>
                <th>Type</th>
                <th>Options</th>
                <th>Default editor</th>
              </tr>
            </thead>
            <tbody>
              {sentenceFilterDefinitionTypes.map(([type, options, editor]) => (
                <tr key={type}>
                  <td>
                    <code>{type}</code>
                  </td>
                  <td>
                    <code>{options}</code>
                  </td>
                  <td>{editor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Option entries require <code>value</code> and <code>label</code>, with optional{" "}
          <code>description</code>, <code>count</code>, <code>disabled</code>, and{" "}
          <code>keywords</code> for richer searchable lists.
        </p>
      </details>

      <h3 id="sentence-filter-design">Design guidance</h3>
      <div style={styles.cardGrid}>
        <article style={styles.card}>
          <h4 style={styles.cardHeading}>A good fit</h4>
          <p>
            Chart titles, compact exploratory controls, narrative analytics, and embedded filters
            with a few dimensions whose current values form a clear sentence.
          </p>
        </article>
        <article style={styles.card}>
          <h4 style={styles.cardHeading}>Choose a form instead</h4>
          <p>
            Use a conventional filter panel for dozens of dimensions, complex query builders,
            lengthy validation, or state that cannot be explained naturally in one sentence.
          </p>
        </article>
      </div>
      <p>
        The wrapper inherits surrounding typography. Stable <code>data-semiotic-control</code> and
        <code>data-sentence-filter-key</code> attributes plus <code>--sentence-filter-*</code>{" "}
        custom properties support local theming without turning the values into dashboard chips.
      </p>

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
        <article style={styles.card}>
          <h3>Sentence titles</h3>
          <p>
            <code>SentenceFilter</code> embeds a small controlled filter vocabulary in readable
            prose, with native button triggers and definition-driven HTML editors.
          </p>
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
  sentenceTitle: {
    margin: "0 0 18px",
    "--sentence-filter-accent": "var(--accent)",
  },
  longSentence: {
    margin: 0,
    lineHeight: 1.65,
    "--sentence-filter-accent": "var(--accent)",
  },
  wrappingDemo: {
    maxWidth: 680,
  },
  miniChart: {
    display: "grid",
    gap: 9,
    padding: "14px 0",
    borderTop: "1px solid var(--surface-3)",
    borderBottom: "1px solid var(--surface-3)",
  },
  miniChartRow: {
    display: "grid",
    gridTemplateColumns: "minmax(96px, 150px) minmax(80px, 1fr) 28px",
    alignItems: "center",
    gap: 10,
  },
  miniChartLabel: {
    overflow: "hidden",
    color: "var(--text-secondary)",
    fontSize: 13,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  miniChartTrack: {
    display: "block",
    height: 10,
    overflow: "hidden",
    borderRadius: 999,
    background: "var(--surface-3)",
  },
  miniChartBar: {
    display: "block",
    height: "100%",
    borderRadius: "inherit",
    background: "var(--accent)",
  },
  miniChartValue: {
    fontFamily: "var(--font-code)",
    fontSize: 12,
    textAlign: "right",
  },
  compactReadout: {
    margin: "16px 0 0",
    paddingTop: 12,
    borderTop: "1px solid var(--surface-3)",
    color: "var(--text-secondary)",
    fontFamily: "var(--font-code)",
    fontSize: 12,
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
  cardHeading: {
    margin: "0 0 8px",
  },
  apiDetails: {
    margin: "16px 0 24px",
    padding: "12px 16px",
    border: "1px solid var(--surface-3)",
    borderRadius: 10,
    background: "var(--surface-1)",
  },
  apiSummary: {
    cursor: "pointer",
    fontWeight: 700,
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
