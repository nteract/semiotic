import React from "react"
import { XYFrame, OrdinalFrame } from "semiotic"
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

const frameLineData = [
  {
    label: "Revenue",
    coordinates: lineData.map((d) => ({ step: d.month, value: d.revenue })),
  },
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
      nextPage={{ title: "Canvas Rendering", path: "/features/canvas-rendering" }}
    >
      <p>
        Semiotic is committed to making data visualization accessible by
        default. The library automatically adds ARIA labels, supports
        keyboard navigation, and provides screen reader descriptions for
        chart elements. While web standards for interactive chart
        accessibility are still evolving, Semiotic builds in as much
        perceivability and operability as possible out of the box.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* With Charts */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="with-charts">With Charts</h2>

      <p>
        Chart components automatically inherit Semiotic's accessibility
        features. When you provide a <code>title</code> prop, it is used as
        the ARIA label for the chart's SVG element. Axis formatting functions
        are also used to generate ARIA labels for individual data marks.
      </p>

      <LiveExample
        frameProps={{
          data: lineData,
          xAccessor: "month",
          yAccessor: "revenue",
          xLabel: "Month",
          yLabel: "Revenue ($)",
          title: "Monthly Revenue Trend",
        }}
        type={LineChart}
        startHidden={false}
        overrideProps={{
          data: `[
  { month: 1, revenue: 12000 },
  { month: 2, revenue: 18000 },
  // ...more data points
]`,
          title: '"Monthly Revenue Trend"',
        }}
        hiddenProps={{}}
        title="Chart with ARIA Label from Title"
      />

      <p>
        To add additional accessibility configuration through Chart
        components, use the <code>frameProps</code> escape hatch:
      </p>

      <CodeBlock
        code={`<LineChart
  data={salesData}
  xAccessor="month"
  yAccessor="revenue"
  title="Monthly Revenue Trend"
  frameProps={{
    accessibility: {
      title: "Monthly Revenue Trend",
      description: "Line chart showing revenue increasing from $12,000 in January to $27,000 in June",
      elementDescriptionAccessor: d => \`Month \${d.month}: $\${d.revenue.toLocaleString()}\`
    }
  }}
/>`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* With Frames */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="with-frames">With Frames</h2>

      <h3 id="aria-labels">ARIA Labels</h3>
      <p>
        Semiotic uses the chart <code>title</code> prop to set an ARIA label
        on the root SVG element. This gives screen readers a meaningful
        description of the chart's purpose.
      </p>

      <LiveExample
        frameProps={{
          lines: frameLineData,
          xAccessor: "step",
          yAccessor: "value",
          lineStyle: { stroke: "#6366f1", strokeWidth: 2 },
          margin: { top: 40, bottom: 60, left: 70, right: 20 },
          axes: [
            { orient: "left", label: "Revenue ($)" },
            { orient: "bottom", label: "Month" },
          ],
          title: "Monthly Revenue Trend",
          hoverAnnotation: true,
        }}
        type={XYFrame}
        overrideProps={{
          lines: `[{
  label: "Revenue",
  coordinates: salesData
}]`,
          title: '"Monthly Revenue Trend"',
        }}
        hiddenProps={{}}
      />

      <h3 id="keyboard-navigation">Keyboard Navigation</h3>
      <p>
        Semiotic supports keyboard navigation through chart data points.
        After a user focuses on the chart (via tab), the left and right arrow
        keys move focus between data points, triggering the tooltip at each
        point. This makes it possible for keyboard-only users to explore
        every data point in the visualization.
      </p>

      <CodeBlock
        code={`// Keyboard navigation is enabled automatically when hoverAnnotation is true
<XYFrame
  lines={data}
  xAccessor="step"
  yAccessor="value"
  hoverAnnotation={true}
  tooltipContent={d => (
    <div role="tooltip">
      <strong>Month {d.step}</strong>
      <div>Revenue: \${d.value.toLocaleString()}</div>
    </div>
  )}
  title="Interactive Revenue Chart"
/>`}
        language="jsx"
      />

      <p>
        Make sure your <code>tooltipContent</code> function handles both
        piece-level hover and shared hover modes, since keyboard navigation
        focuses on each piece individually.
      </p>

      <h3 id="piece-labels">Data Element Labels</h3>
      <p>
        Semiotic adds ARIA labels to individual chart elements (bars, points,
        line segments) based on the formatting functions you provide for axis
        labels. The axis tick format functions are reused to generate
        meaningful descriptions of each data point for screen readers.
      </p>

      <LiveExample
        frameProps={{
          data: barData,
          oAccessor: "category",
          rAccessor: "revenue",
          type: "bar",
          style: { fill: "#6366f1", stroke: "white" },
          oLabel: true,
          margin: { top: 20, bottom: 60, left: 80, right: 20 },
          axes: [
            {
              orient: "left",
              label: "Revenue ($)",
              tickFormat: (d) => `$${(d / 1000).toFixed(0)}k`,
            },
          ],
          title: "Quarterly Revenue",
          hoverAnnotation: true,
        }}
        type={OrdinalFrame}
        overrideProps={{
          data: `[
  { category: "Q1", revenue: 24000 },
  { category: "Q2", revenue: 31000 },
  { category: "Q3", revenue: 28000 },
  { category: "Q4", revenue: 36000 }
]`,
          title: '"Quarterly Revenue"',
          axes: `[{
  orient: "left",
  label: "Revenue ($)",
  tickFormat: d => \`$\${(d / 1000).toFixed(0)}k\`
}]`,
        }}
        hiddenProps={{}}
        title="Bar Chart with Screen Reader Labels"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Configuration */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="configuration">Configuration</h2>

      <h3 id="what-semiotic-does">What Semiotic Does Automatically</h3>

      <ul>
        <li>
          <strong>ARIA label on the SVG</strong> — uses the <code>title</code>{" "}
          prop you provide to add an <code>aria-label</code> to the chart's
          root SVG element.
        </li>
        <li>
          <strong>ARIA labels on data marks</strong> — generates labels for
          individual bars, points, and line segments using your axis tick
          format functions.
        </li>
        <li>
          <strong>Keyboard navigation</strong> — left/right arrow keys move
          focus between data points when the chart is focused, showing the
          tooltip at each point.
        </li>
        <li>
          <strong>Role attributes</strong> — appropriate ARIA roles are set on
          chart elements.
        </li>
      </ul>

      <h3 id="what-you-should-do">What You Should Do</h3>

      <p>
        Semiotic handles structural accessibility, but you should also
        consider these aspects of your visualization:
      </p>

      <h4>Color and Contrast</h4>
      <p>
        Use colors with sufficient contrast ratios and provide additional
        visual cues beyond color alone (patterns, labels, different shapes).
        Test with tools like{" "}
        <a href="https://chrome.google.com/webstore/detail/colorblinding/dgbgleaofjainknadoffbjkclicbbgaa" target="_blank" rel="noopener noreferrer">
          Colorblinding
        </a>{" "}
        for Chrome.
      </p>

      <CodeBlock
        code={`// Use patterns or labels in addition to color
<OrdinalFrame
  style={d => ({
    fill: colorScale(d.category),
    // Add pattern fills for color-blind accessibility
    fillOpacity: 0.8
  })}
  oLabel={true}  // Always show category labels
/>`}
        language="jsx"
      />

      <h4>Animation</h4>
      <p>
        Follow WCAG guidelines: nothing should flash more than three times
        per second. Allow users to interact with content at their own pace.
        Consider providing a <code>prefers-reduced-motion</code> alternative.
      </p>

      <h4>Text Alternatives</h4>
      <p>
        Provide a text description or data table alongside your chart. This
        is especially important for complex visualizations where the chart
        alone may not convey all the information:
      </p>

      <CodeBlock
        code={`// Provide a text alternative alongside the chart
<figure>
  <XYFrame
    title="Monthly Revenue Trend"
    lines={data}
    {...otherProps}
  />
  <figcaption>
    Revenue grew steadily from $12,000 in January to $27,000 in June,
    with a brief dip in March.
  </figcaption>
</figure>

// Or provide a data table
<details>
  <summary>View data table</summary>
  <table>
    <thead>
      <tr><th>Month</th><th>Revenue</th></tr>
    </thead>
    <tbody>
      {data.map(d => (
        <tr key={d.month}>
          <td>{monthNames[d.month]}</td>
          <td>\${d.revenue.toLocaleString()}</td>
        </tr>
      ))}
    </tbody>
  </table>
</details>`}
        language="jsx"
      />

      <h3 id="tooltip-accessibility">Accessible Tooltips</h3>
      <p>
        When writing custom <code>tooltipContent</code> functions, include
        appropriate ARIA attributes:
      </p>

      <CodeBlock
        code={`<XYFrame
  hoverAnnotation={true}
  tooltipContent={d => (
    <div
      role="tooltip"
      aria-live="polite"
      style={{ background: "var(--surface-1)", padding: 8, borderRadius: 4 }}
    >
      <strong>{d.category}</strong>
      <div aria-label={\`Value: \${d.value}\`}>
        {d.value.toLocaleString()}
      </div>
    </div>
  )}
/>`}
        language="jsx"
      />

      <h3 id="testing">Testing Accessibility</h3>

      <p>
        Resources and tools for testing the accessibility of your
        Semiotic visualizations:
      </p>

      <ul>
        <li>
          <strong>Screen readers</strong>:{" "}
          <a href="https://webaim.org/articles/voiceover/" target="_blank" rel="noopener noreferrer">VoiceOver for Mac</a>{" "}
          or{" "}
          <a href="https://webaim.org/articles/nvda/" target="_blank" rel="noopener noreferrer">NVDA for Windows</a>
        </li>
        <li>
          <strong>Audit tools</strong>:{" "}
          <a href="https://chrome.google.com/webstore/detail/axe/lhdoppojpmngadmnindnejefpokejbdd" target="_blank" rel="noopener noreferrer">aXe for Chrome</a>,{" "}
          <a href="https://www.marcozehe.de/2018/04/11/introducing-the-accessibility-inspector-in-the-firefox-developer-tools/" target="_blank" rel="noopener noreferrer">Firefox Accessibility Inspector</a>
        </li>
        <li>
          <strong>Color contrast</strong>:{" "}
          <a href="https://chrome.google.com/webstore/detail/colorblinding/dgbgleaofjainknadoffbjkclicbbgaa" target="_blank" rel="noopener noreferrer">Colorblinding Chrome extension</a>
        </li>
        <li>
          <strong>Checklists</strong>:{" "}
          <a href="https://webaim.org/standards/wcag/checklist" target="_blank" rel="noopener noreferrer">WebAIM WCAG checklist</a>,{" "}
          <a href="https://accessibility.18f.gov/checklist/" target="_blank" rel="noopener noreferrer">18F accessibility guide</a>
        </li>
        <li>
          <strong>Standards</strong>:{" "}
          <a href="https://www.w3.org/WAI/standards-guidelines/wcag/" target="_blank" rel="noopener noreferrer">W3C WCAG guidelines</a>
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
          <Link to="/features/axes">Axes</Link> — axis formatting functions
          that feed into ARIA labels
        </li>
        <li>
          <Link to="/features/responsive">Responsive</Link> — responsive
          layouts that work across devices
        </li>
        <li>
          <Link to="/frames/xy-frame">XYFrame</Link> — title and
          accessibility props on XY visualizations
        </li>
        <li>
          <Link to="/frames/ordinal-frame">OrdinalFrame</Link> — title and
          accessibility props on ordinal visualizations
        </li>
      </ul>
    </PageLayout>
  )
}
