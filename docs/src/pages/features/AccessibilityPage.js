import React from "react"
import { LineChart, BarChart } from "semiotic"
import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const lineData = [
  { month: 1, revenue: 12000 },
  { month: 2, revenue: 18000 },
  { month: 3, revenue: 14000 },
  { month: 4, revenue: 22000 },
  { month: 5, revenue: 19000 },
  { month: 6, revenue: 27000 },
]

const barData = [
  { category: "Q1", revenue: 24000 },
  { category: "Q2", revenue: 31000 },
  { category: "Q3", revenue: 28000 },
  { category: "Q4", revenue: 36000 },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AccessibilityPage() {
  return (
    <PageLayout
      title="Accessibility"
      breadcrumbs={[
        { label: "Features", path: "/features" },
        { label: "Accessibility", path: "/features/accessibility" },
      ]}
      prevPage={{ title: "Responsive", path: "/features/responsive" }}
      nextPage={{ title: "Linked Charts", path: "/features/small-multiples" }}
    >
      <p>
        Semiotic renders charts on canvas for performance. Canvas-based rendering
        presents accessibility challenges because the visual output has no DOM
        structure for screen readers to traverse. This page documents what
        Semiotic provides today and what you should add in your application.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* What Semiotic Provides */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="what-semiotic-provides">What Semiotic Provides</h2>

      <h3 id="aria-labels">ARIA Labels on Chart Containers</h3>

      <p>
        Every Stream Frame and HOC chart renders its root container with{" "}
        <code>role="img"</code> and an <code>aria-label</code>. When you
        provide a <code>title</code> prop (as a string), it becomes the
        aria-label. Without a title, a default is used ("XY chart",
        "Ordinal chart", or "Network chart").
      </p>

      <LiveExample
        frameProps={{
          data: lineData,
          xAccessor: "month",
          yAccessor: "revenue",
          title: "Monthly Revenue Trend",
          showGrid: true,
        }}
        type={LineChart}
        startHidden={false}
        overrideProps={{
          data: `[
  { month: 1, revenue: 12000 },
  { month: 2, revenue: 18000 },
  // ...
]`,
          title: '"Monthly Revenue Trend"',
        }}
        hiddenProps={{}}
        title="Chart with ARIA Label"
      />

      <p>
        Inspect the rendered HTML — the root <code>&lt;div&gt;</code> has{" "}
        <code>role="img"</code> and{" "}
        <code>aria-label="Monthly Revenue Trend"</code>. This tells screen
        readers that the element is an image with a meaningful description.
      </p>

      <CodeBlock
        code={`// The title prop becomes the aria-label
<LineChart
  data={salesData}
  xAccessor="month"
  yAccessor="revenue"
  title="Monthly Revenue Trend"  // → aria-label="Monthly Revenue Trend"
/>

// Works on all chart types
<BarChart title="Quarterly Sales" ... />
<SankeyDiagram title="Budget Flow" ... />
<RealtimeLineChart title="CPU Usage" ... />`}
        language="jsx"
      />

      <h3 id="keyboard-navigation">Keyboard Navigation</h3>

      <p>
        All charts are focusable via <strong>Tab</strong>. Once focused, use
        arrow keys to navigate between data points — the tooltip follows the
        keyboard focus, and a dashed ring highlights the active point. Press{" "}
        <strong>Escape</strong> to clear focus. Mouse interaction automatically
        clears keyboard focus.
      </p>

      <CodeBlock
        code={`// Keyboard navigation is built in — no props needed
// Tab → focus chart
// ←/→ or ↑/↓ → move between data points
// Home/End → jump to first/last point
// Escape → clear focus

// Works on all chart types:
<LineChart data={data} xAccessor="x" yAccessor="y" title="Revenue" />
<BarChart data={data} categoryAccessor="cat" valueAccessor="val" />
<ForceDirectedGraph nodes={n} edges={e} />`}
        language="jsx"
      />

      <h3 id="svg-overlay-labels">SVG Overlay Labels</h3>

      <p>
        While the canvas itself is opaque to assistive technology, Semiotic
        renders labels, annotations, and axis text in an SVG overlay on top of
        the canvas. These SVG text elements <em>are</em> accessible to screen
        readers and provide some structural information about the chart.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* What You Should Do */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="what-you-should-do">What You Should Do</h2>

      <p>
        Semiotic's built-in accessibility covers the baseline — identifying the
        chart as an image with a description. For production applications, you
        should provide additional context:
      </p>

      <h3 id="text-alternatives">Text Alternatives</h3>

      <p>
        The most effective accessibility strategy for data visualizations is
        providing a text description or data table alongside the chart. This
        works regardless of the rendering technology:
      </p>

      <CodeBlock
        code={`<figure>
  <LineChart
    data={salesData}
    xAccessor="month"
    yAccessor="revenue"
    title="Monthly Revenue Trend"
  />
  <figcaption>
    Revenue grew from $12,000 in January to $27,000 in June,
    with a brief dip in March.
  </figcaption>
</figure>

// Or provide an expandable data table
<details>
  <summary>View data table</summary>
  <table>
    <thead><tr><th>Month</th><th>Revenue</th></tr></thead>
    <tbody>
      {data.map(d => (
        <tr key={d.month}>
          <td>{d.month}</td>
          <td>\${d.revenue.toLocaleString()}</td>
        </tr>
      ))}
    </tbody>
  </table>
</details>`}
        language="jsx"
      />

      <h3 id="color-contrast">Color and Contrast</h3>

      <p>
        Use colors with sufficient contrast ratios. Provide visual cues beyond
        color alone — labels, patterns, or different shapes. Test with tools like{" "}
        <a href="https://www.toptal.com/designers/colorfilter/" target="_blank" rel="noopener noreferrer">
          Toptal Color Blind Filter
        </a>.
      </p>

      <CodeBlock
        code={`// Always show labels alongside color encoding
<BarChart
  data={data}
  categoryAccessor="region"
  valueAccessor="sales"
  colorBy="region"
  // Labels provide a non-color channel for the category
/>

// Use colorScheme with sufficient contrast
<LineChart
  data={data}
  xAccessor="x"
  yAccessor="y"
  colorScheme={["#1f77b4", "#d62728", "#2ca02c"]}
/>`}
        language="jsx"
      />

      <h3 id="animation">Animation</h3>

      <p>
        Follow WCAG guidelines: nothing should flash more than three times per
        second. For streaming charts with <code>pulse</code> encoding, keep
        pulse durations above 333ms. Consider providing a reduced-motion
        alternative:
      </p>

      <CodeBlock
        code={`// Respect prefers-reduced-motion
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

<RealtimeLineChart
  ref={chartRef}
  timeAccessor="time"
  valueAccessor="value"
  // Skip pulse animation for users who prefer reduced motion
  pulse={prefersReducedMotion ? undefined : { duration: 500 }}
/>`}
        language="jsx"
      />

      <h3 id="tooltip-accessibility">Accessible Tooltips</h3>

      <p>
        When writing custom tooltip functions, include ARIA attributes so screen
        readers announce tooltip content:
      </p>

      <CodeBlock
        code={`<LineChart
  data={data}
  xAccessor="month"
  yAccessor="revenue"
  tooltip={(d) => (
    <div role="tooltip" aria-live="polite">
      <strong>{d.month}</strong>: \${d.revenue.toLocaleString()}
    </div>
  )}
/>`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Current Limitations */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="limitations">Current Limitations</h2>

      <p>
        Semiotic's canvas-based architecture means some accessibility features
        that SVG-based libraries provide are not yet available:
      </p>

      <ul>
        <li>
          <strong>No per-element ARIA</strong> — individual bars, points, and
          line segments in the canvas do not have ARIA labels. The SVG overlay
          provides labels for text elements only.
        </li>
        <li>
          <strong>Brush/selection is mouse-only</strong> — LinkedCharts brush
          interactions and ScatterplotMatrix crossfilter do not have keyboard
          equivalents.
        </li>
        <li>
          <strong>Streaming charts</strong> — realtime charts continuously
          update their scene graph. Keyboard navigation works but the point
          list refreshes as new data arrives.
        </li>
      </ul>

      <p>
        For applications that require WCAG AA compliance where charts are the
        primary content, provide a data table fallback. For charts used as
        supplementary illustrations, the <code>role="img"</code> +{" "}
        <code>aria-label</code> baseline is sufficient under WCAG's "decorative
        image" guidance.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Testing */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="testing">Testing Accessibility</h2>

      <ul>
        <li>
          <strong>Screen readers</strong>:{" "}
          <a href="https://webaim.org/articles/voiceover/" target="_blank" rel="noopener noreferrer">VoiceOver (Mac)</a>,{" "}
          <a href="https://webaim.org/articles/nvda/" target="_blank" rel="noopener noreferrer">NVDA (Windows)</a>
        </li>
        <li>
          <strong>Audit tools</strong>:{" "}
          <a href="https://chrome.google.com/webstore/detail/axe/lhdoppojpmngadmnindnejefpokejbdd" target="_blank" rel="noopener noreferrer">aXe</a>,{" "}
          Firefox Accessibility Inspector
        </li>
        <li>
          <strong>Standards</strong>:{" "}
          <a href="https://www.w3.org/WAI/standards-guidelines/wcag/" target="_blank" rel="noopener noreferrer">WCAG 2.1</a>,{" "}
          <a href="https://webaim.org/standards/wcag/checklist" target="_blank" rel="noopener noreferrer">WebAIM checklist</a>
        </li>
      </ul>

      {/* ----------------------------------------------------------------- */}
      {/* Related */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/features/tooltips">Tooltips</Link> — custom tooltip
          rendering with accessible markup
        </li>
        <li>
          <Link to="/features/theming">Theming</Link> — dark mode support
          for visual contrast
        </li>
        <li>
          <Link to="/features/realtime-encoding">Realtime Encoding</Link> —
          pulse and decay animation settings
        </li>
      </ul>
    </PageLayout>
  )
}
