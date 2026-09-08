import React, { useMemo, useState } from "react"
import { LineChart } from "semiotic/xy"
import { usePretextAnnotations } from "semiotic/text"
import { useResponsiveSize } from "semiotic/utils/react"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"
import "./text-layout.css"

const data = [
  { month: 1, revenue: 8 },
  { month: 2, revenue: 27 },
  { month: 3, revenue: 23 },
  { month: 4, revenue: 21 },
  { month: 5, revenue: 34 },
  { month: 6, revenue: 42 },
]
const samples = {
  english:
    "Minimum initial investment, maximum worldwide momentum. Revenue rose after the spring launch.",
  chinese: "季度营收增长显著，华东地区表现最佳。新产品发布后，更多客户选择了年度订阅。",
  thai: "รายได้เพิ่มขึ้นอย่างต่อเนื่องในไตรมาสนี้หลังจากเปิดตัวผลิตภัณฑ์ใหม่",
  identifier: "VeryLongUnbrokenProductIdentifier2026 gained momentum after launch.",
  softHyphen: "Long\u00adterm inter\u00adnational investment increased",
}

function NoteChart({ annotations, name, fontFamily, fontSize, autoPlace }) {
  const [ref, [width]] = useResponsiveSize([420, 410], true)
  return (
    <div
      ref={ref}
      className="pretext-note-chart"
      style={{
        "--note-font-family": fontFamily,
        "--note-font-size": `${fontSize}px`,
      }}
    >
      <LineChart
        data={data}
        xAccessor="month"
        yAccessor="revenue"
        title={name}
        description="Monthly revenue rises from 8 to 42. A note explains the increase."
        width={width}
        height={410}
        showPoints
        showGrid
        xLabel="Month"
        yLabel="Revenue ($K)"
        margin={{ top: 32, left: 48, right: 16, bottom: 48 }}
        annotations={annotations}
        autoPlaceAnnotations={autoPlace}
        frameProps={{ yExtent: [0, 46] }}
      />
    </div>
  )
}

const usage = `import { LineChart } from "semiotic/xy"
import { usePretextAnnotations } from "semiotic/text"

function RevenueChart({ data }) {
  const annotations = usePretextAnnotations([
    {
      type: "callout",
      month: 2,
      revenue: 27,
      title: "Spring launch",
      label: "季度营收增长显著，华东地区表现最佳。",
      wrap: 160
    }
  ], {
    fontFamily: "Arial, sans-serif",
    fontSize: 14,
    lineHeight: 20
  })

  return (
    <LineChart
      data={data}
      xAccessor="month"
      yAccessor="revenue"
      title="Revenue after launch"
      annotations={annotations}
      autoPlaceAnnotations
    />
  )
}`

export default function TextLayoutPage() {
  const [text, setText] = useState(samples.chinese)
  const [wrap, setWrap] = useState(160)
  const [fontFamily, setFontFamily] = useState("Arial, sans-serif")
  const [fontSize, setFontSize] = useState(14)
  const [enabled, setEnabled] = useState(true)
  const [autoPlace, setAutoPlace] = useState(false)
  const raw = useMemo(
    () => [
      {
        type: "callout",
        month: 2,
        revenue: 27,
        title: "Spring launch",
        label: text,
        wrap,
        ...(autoPlace ? {} : { dx: 0, dy: 40 }),
        radius: 5,
      },
    ],
    [text, wrap, autoPlace],
  )
  const measured = usePretextAnnotations(raw, {
    enabled,
    fontFamily,
    fontSize,
    lineHeight: Math.ceil(fontSize * 1.4),
  })

  return (
    <PageLayout
      title="Text Layout with Pretext"
      breadcrumbs={[
        { label: "Annotations", path: "/annotations" },
        { label: "Text Layout", path: "/annotations/text-layout" },
      ]}
      prevPage={{ title: "Design Guidance", path: "/annotations/design-guidance" }}
      nextPage={{ title: "Advanced Annotations", path: "/annotations/advanced" }}
    >
      <p>
        Long notes, narrow charts, and languages without spaces need careful wrapping. Opt in to{" "}
        <a href="https://github.com/chenglou/pretext">Pretext</a> to measure annotation text in its
        actual font and share those lines with Semiotic’s automatic note placement.
      </p>

      <h2 id="try-it">Try different text and fonts</h2>
      <p>
        Both charts show the same note. The first uses Semiotic’s character-based wrapping; the
        second uses font measurements. Try Chinese, Thai, or an unbroken identifier, then adjust the
        wrap width.
      </p>
      <div className="pretext-controls">
        <label>
          Sample text
          <select
            aria-label="Sample text"
            defaultValue="chinese"
            onChange={(event) => setText(samples[event.target.value])}
          >
            <option value="english">English · narrow and wide letters</option>
            <option value="chinese">Chinese · no spaces</option>
            <option value="thai">Thai · no spaces</option>
            <option value="identifier">Unbroken identifier</option>
            <option value="softHyphen">Soft hyphens</option>
          </select>
        </label>
        <label>
          Font
          <select
            aria-label="Font"
            value={fontFamily}
            onChange={(event) => setFontFamily(event.target.value)}
          >
            <option value="Arial, sans-serif">Arial</option>
            <option value="Georgia, serif">Georgia</option>
            <option value={'"Courier New", monospace'}>Courier New</option>
          </select>
        </label>
        <label>
          Wrap width: {wrap}px
          <input
            aria-label="Wrap width"
            type="range"
            min="80"
            max="220"
            step="10"
            value={wrap}
            onChange={(event) => setWrap(Number(event.target.value))}
          />
        </label>
        <label>
          Font size: {fontSize}px
          <input
            aria-label="Font size"
            type="range"
            min="12"
            max="18"
            value={fontSize}
            onChange={(event) => setFontSize(Number(event.target.value))}
          />
        </label>
        <label className="pretext-copy">
          Annotation text
          <textarea
            aria-label="Annotation text"
            rows={3}
            maxLength={240}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </label>
        <label className="pretext-toggle">
          <input
            type="checkbox"
            checked={autoPlace}
            onChange={(event) => setAutoPlace(event.target.checked)}
          />
          Place notes automatically
        </label>
        <label className="pretext-toggle">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          Enable Pretext on the second chart
        </label>
      </div>
      <div className="pretext-comparison">
        <section aria-label="Default wrapping" data-testid="default-note-demo">
          <h3>Default wrapping</h3>
          <NoteChart
            name="Default annotation wrapping"
            annotations={raw}
            fontFamily={fontFamily}
            fontSize={fontSize}
            autoPlace={autoPlace}
          />
        </section>
        <section aria-label="Pretext wrapping" data-testid="pretext-note-demo">
          <h3>{enabled ? "Pretext wrapping" : "Pretext disabled"}</h3>
          <NoteChart
            name="Optional annotation wrapping"
            annotations={measured}
            fontFamily={fontFamily}
            fontSize={fontSize}
            autoPlace={autoPlace}
          />
        </section>
      </div>

      <h2 id="enable">Enable it on a chart</h2>
      <p>
        Install the optional peer alongside Semiotic. Import the hook from{" "}
        <code>semiotic/text</code> and pass its returned array to <code>annotations</code>. The hook
        supports <code>label</code>, <code>callout</code>, <code>callout-circle</code>,{" "}
        <code>callout-rect</code>, and <code>bracket</code> notes.
      </p>
      <CodeBlock code="npm install semiotic @chenglou/pretext@0.0.9" language="bash" />
      <CodeBlock code={usage} language="jsx" />
      <p>
        Use <code>autoPlaceAnnotations</code> to let Semiotic choose label and callout offsets using
        the measured dimensions. Brackets retain their authored placement. Explicit <code>dx</code>/
        <code>dy</code> still work; toggle automatic placement in the comparison to try both. The original
        annotations are not mutated. Other annotation types pass through unchanged.
      </p>

      <h2 id="when">When to use it</h2>
      <ul>
        <li>Multilingual notes, especially text with few or no spaces.</li>
        <li>Long descriptions or identifiers that need to fit a narrow note.</li>
        <li>Custom typography where character-count estimates waste space or overflow.</li>
        <li>Automatic placement where note dimensions should follow the painted lines.</li>
      </ul>
      <p>
        This option changes SVG annotation notes. Axes, legends, plain <code>text</code>{" "}
        annotations, and HTML tooltips retain their existing behavior. Short, single-line labels
        usually do not need a text layout engine.
      </p>

      <h2 id="fonts">Fonts, rendering, and exports</h2>
      <p>
        Choose a named font, such as Arial or Georgia. The hook applies the same family, size, and
        weight to measurement and rendering, measures bold titles separately, waits for fonts, and
        refreshes when fonts finish loading. Set <code>fontWeight</code> and{" "}
        <code>titleFontWeight</code> when needed. Generic system fonts can resolve differently
        between canvas and SVG on macOS. Keep CSS font overrides consistent with the hook’s
        typography options so the painted text matches its measurements.
      </p>
      <p>
        Server rendering and the first hydration render use ordinary wrapping. Measurement starts
        after mounting; browsers without <code>Intl.Segmenter</code> or canvas measurement keep
        ordinary wrapping. Allow room for the note to settle after fonts load. Set{" "}
        <code>enabled: false</code> to turn the option off.
      </p>
      <p>
        This is a React hook, not a JSON chart configuration field. Serialized/MCP configs and
        standalone Node/edge rendering use the default wrapping. Exporting an already rendered
        browser SVG retains its measured text lines. Pretext loads only through the optional entry;
        charts that do not import it do not need the peer or pay its bundle cost.
      </p>
    </PageLayout>
  )
}
