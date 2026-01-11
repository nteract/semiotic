import * as React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import {
  Scatterplot,
  LineChart,
  BarChart,
  Tooltip,
  MultiLineTooltip
} from "../../components"
import { TooltipProvider } from "../../components/store/TooltipStore"

const components = []

components.push({
  name: "Tooltip Utilities"
})

const TooltipDocs = () => {
  // Sample data for examples
  const scatterData = [
    { x: 1, y: 10, name: "Point A", category: "Group 1", value: 100 },
    { x: 2, y: 20, name: "Point B", category: "Group 1", value: 150 },
    { x: 3, y: 15, name: "Point C", category: "Group 2", value: 120 },
    { x: 4, y: 25, name: "Point D", category: "Group 2", value: 180 },
    { x: 5, y: 30, name: "Point E", category: "Group 3", value: 200 }
  ]

  const lineData = [
    { x: 1, y: 10, series: "A" },
    { x: 2, y: 20, series: "A" },
    { x: 3, y: 15, series: "A" },
    { x: 1, y: 15, series: "B" },
    { x: 2, y: 25, series: "B" },
    { x: 3, y: 20, series: "B" }
  ]

  const barData = [
    { category: "A", value: 100, subcategory: "X" },
    { category: "B", value: 150, subcategory: "Y" },
    { category: "C", value: 120, subcategory: "Z" },
    { category: "D", value: 180, subcategory: "X" }
  ]

  const examples = []

  // Example 1: Default tooltip
  examples.push({
    name: "Default Tooltip (boolean)",
    demo: (
      <TooltipProvider>
        <Scatterplot
          data={scatterData}
          width={500}
          height={300}
          tooltip={true}
          xLabel="X Axis"
          yLabel="Y Axis"
        />
      </TooltipProvider>
    ),
    source: `<Scatterplot
  data={data}
  width={500}
  height={300}
  tooltip={true}
  xLabel="X Axis"
  yLabel="Y Axis"
/>`
  })

  // Example 2: Simple Tooltip with title
  examples.push({
    name: "Tooltip with Title Field",
    demo: (
      <TooltipProvider>
        <Scatterplot
          data={scatterData}
          width={500}
          height={300}
          tooltip={Tooltip({ title: "name" })}
          xLabel="X Axis"
          yLabel="Y Axis"
          colorBy="category"
        />
      </TooltipProvider>
    ),
    source: `import { Tooltip } from "semiotic"

<Scatterplot
  data={data}
  width={500}
  height={300}
  tooltip={Tooltip({ title: "name" })}
  xLabel="X Axis"
  yLabel="Y Axis"
  colorBy="category"
/>`
  })

  // Example 3: Tooltip with custom format
  examples.push({
    name: "Tooltip with Formatting",
    demo: (
      <TooltipProvider>
        <Scatterplot
          data={scatterData}
          width={500}
          height={300}
          tooltip={Tooltip({
            title: "name",
            format: v => `Value: ${v}`
          })}
          xLabel="X Axis"
          yLabel="Y Axis"
          sizeBy="value"
          colorBy="category"
        />
      </TooltipProvider>
    ),
    source: `import { Tooltip } from "semiotic"

<Scatterplot
  data={data}
  tooltip={Tooltip({
    title: "name",
    format: v => \`Value: \${v}\`
  })}
  sizeBy="value"
  colorBy="category"
/>`
  })

  // Example 4: Multi-line tooltip with fields
  examples.push({
    name: "MultiLineTooltip with Fields",
    demo: (
      <TooltipProvider>
        <Scatterplot
          data={scatterData}
          width={500}
          height={300}
          tooltip={MultiLineTooltip({
            fields: ["name", "x", "y", "value", "category"]
          })}
          xLabel="X Axis"
          yLabel="Y Axis"
          colorBy="category"
        />
      </TooltipProvider>
    ),
    source: `import { MultiLineTooltip } from "semiotic"

<Scatterplot
  data={data}
  tooltip={MultiLineTooltip({
    fields: ["name", "x", "y", "value", "category"]
  })}
  colorBy="category"
/>`
  })

  // Example 5: Multi-line tooltip with custom field config
  examples.push({
    name: "MultiLineTooltip with Custom Fields",
    demo: (
      <TooltipProvider>
        <Scatterplot
          data={scatterData}
          width={500}
          height={300}
          tooltip={MultiLineTooltip({
            title: "name",
            fields: [
              { label: "X Value", accessor: "x", format: v => v.toFixed(1) },
              { label: "Y Value", accessor: "y", format: v => v.toFixed(1) },
              { label: "Total", accessor: "value", format: v => `$${v.toLocaleString()}` },
              { label: "Group", accessor: "category" }
            ]
          })}
          xLabel="X Axis"
          yLabel="Y Axis"
          colorBy="category"
        />
      </TooltipProvider>
    ),
    source: `import { MultiLineTooltip } from "semiotic"

<Scatterplot
  data={data}
  tooltip={MultiLineTooltip({
    title: "name",
    fields: [
      { label: "X Value", accessor: "x", format: v => v.toFixed(1) },
      { label: "Y Value", accessor: "y", format: v => v.toFixed(1) },
      { label: "Total", accessor: "value", format: v => \`$\${v.toLocaleString()}\` },
      { label: "Group", accessor: "category" }
    ]
  })}
/>`
  })

  // Example 6: Custom tooltip function
  examples.push({
    name: "Custom Tooltip Function",
    demo: (
      <TooltipProvider>
        <BarChart
          data={barData}
          width={500}
          height={300}
          tooltip={(d) => (
            <div style={{
              background: "white",
              border: "2px solid #333",
              borderRadius: "8px",
              padding: "10px",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
            }}>
              <div style={{ fontWeight: "bold", marginBottom: "5px" }}>
                {d.category}
              </div>
              <div style={{ color: "#666" }}>
                Value: {d.value}
              </div>
              <div style={{ color: "#999", fontSize: "12px" }}>
                Type: {d.subcategory}
              </div>
            </div>
          )}
          categoryAccessor="category"
          valueAccessor="value"
        />
      </TooltipProvider>
    ),
    source: `<BarChart
  data={data}
  tooltip={(d) => (
    <div style={{
      background: "white",
      border: "2px solid #333",
      borderRadius: "8px",
      padding: "10px"
    }}>
      <div style={{ fontWeight: "bold" }}>{d.category}</div>
      <div>Value: {d.value}</div>
      <div>Type: {d.subcategory}</div>
    </div>
  )}
/>`
  })

  // Example 7: Tooltip with custom styling
  examples.push({
    name: "Tooltip with Custom Styling",
    demo: (
      <TooltipProvider>
        <LineChart
          data={lineData}
          width={500}
          height={300}
          lineBy="series"
          colorBy="series"
          tooltip={MultiLineTooltip({
            fields: ["series", "x", "y"],
            style: {
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              padding: "12px 16px",
              borderRadius: "8px",
              fontSize: "14px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
            }
          })}
        />
      </TooltipProvider>
    ),
    source: `import { MultiLineTooltip } from "semiotic"

<LineChart
  data={data}
  lineBy="series"
  colorBy="series"
  tooltip={MultiLineTooltip({
    fields: ["series", "x", "y"],
    style: {
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      color: "white",
      padding: "12px 16px",
      borderRadius: "8px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
    }
  })}
/>`
  })

  return (
    <DocumentComponent
      name="Tooltip Utilities"
      components={components}
      examples={examples}
    >
      <p>
        Semiotic provides simplified tooltip utilities that abstract away the complexity
        of the underlying hover annotation system. Instead of working with
        <code>hoverAnnotation</code>, <code>tooltipContent</code>, or other low-level props,
        you can use the <code>Tooltip</code> and <code>MultiLineTooltip</code> utilities
        for common tooltip patterns.
      </p>

      <h2>Why Use Tooltip Utilities?</h2>
      <p>
        The tooltip utilities provide several benefits:
      </p>
      <ul>
        <li>
          <strong>Simplified API:</strong> Single <code>tooltip</code> prop instead of
          multiple hover annotation props
        </li>
        <li>
          <strong>Smart Defaults:</strong> Automatic field detection, number formatting,
          and professional styling
        </li>
        <li>
          <strong>Best Practices:</strong> Built-in accessibility, contrast, and positioning
        </li>
        <li>
          <strong>Flexibility:</strong> Support for simple tooltips, multi-line tooltips,
          or completely custom functions
        </li>
        <li>
          <strong>Type Safety:</strong> Full TypeScript support with autocomplete
        </li>
      </ul>

      <h2>Basic Usage</h2>

      <h3>1. Boolean Tooltip (Default)</h3>
      <p>
        The simplest way to enable tooltips is to pass <code>tooltip=&#123;true&#125;</code>.
        This enables Semiotic's default hover behavior:
      </p>
      <pre>
        {`<Scatterplot data={data} tooltip={true} />`}
      </pre>

      <h3>2. Tooltip() Function</h3>
      <p>
        For simple, single-value tooltips, use the <code>Tooltip()</code> utility:
      </p>
      <pre>
        {`import { Tooltip } from "semiotic"

<Scatterplot
  data={data}
  tooltip={Tooltip({ title: "name" })}
/>`}
      </pre>

      <h3>3. MultiLineTooltip() Function</h3>
      <p>
        For tooltips displaying multiple fields, use <code>MultiLineTooltip()</code>:
      </p>
      <pre>
        {`import { MultiLineTooltip } from "semiotic"

<Scatterplot
  data={data}
  tooltip={MultiLineTooltip({
    fields: ["name", "value", "category"]
  })}
/>`}
      </pre>

      <h3>4. Custom Tooltip Function</h3>
      <p>
        For complete control, pass a function that returns JSX:
      </p>
      <pre>
        {`<Scatterplot
  data={data}
  tooltip={(d) => (
    <div style={{ padding: "10px", background: "white" }}>
      <strong>{d.name}</strong>: {d.value}
    </div>
  )}
/>`}
      </pre>

      <h2>Tooltip Configuration</h2>

      <h3>Tooltip() Options</h3>
      <pre>
        {`interface TooltipConfig {
  // Field to display (or accessor function)
  title?: string | ((d: any) => string)

  // Array of field names to try (if title not specified)
  fields?: Array<string | TooltipField>

  // Format function for the value
  format?: (value: any) => string

  // Custom style object
  style?: React.CSSProperties

  // Custom className
  className?: string
}`}
      </pre>

      <h3>MultiLineTooltip() Options</h3>
      <pre>
        {`interface MultiLineTooltipConfig {
  // Optional title field at the top
  title?: string | ((d: any) => string)

  // Array of fields to display
  fields?: Array<string | TooltipField>

  // Show field labels (default: true)
  showLabels?: boolean

  // Separator between label and value (default: ": ")
  separator?: string

  // Format function for all values
  format?: (value: any) => string

  // Custom style object
  style?: React.CSSProperties

  // Custom className
  className?: string
}`}
      </pre>

      <h3>TooltipField Object</h3>
      <p>
        For fine-grained control over individual fields:
      </p>
      <pre>
        {`interface TooltipField {
  // Display label
  label: string

  // Field name or accessor function
  accessor: string | ((d: any) => any)

  // Optional format function for this field
  format?: (value: any) => string
}`}
      </pre>

      <h2>Formatting</h2>

      <h3>Automatic Formatting</h3>
      <p>
        The tooltip utilities automatically format common data types:
      </p>
      <ul>
        <li>
          <strong>Numbers:</strong> Formatted with locale-specific thousands separators
        </li>
        <li>
          <strong>Dates:</strong> Formatted using <code>toLocaleDateString()</code>
        </li>
        <li>
          <strong>null/undefined:</strong> Displayed as empty string
        </li>
        <li>
          <strong>Other types:</strong> Converted to string
        </li>
      </ul>

      <h3>Custom Formatting</h3>
      <p>
        You can provide custom format functions at different levels:
      </p>
      <pre>
        {`// Format applied to all fields
MultiLineTooltip({
  fields: ["x", "y", "value"],
  format: (v) => typeof v === "number" ? v.toFixed(2) : v
})

// Format specific to individual fields
MultiLineTooltip({
  fields: [
    { label: "X", accessor: "x", format: v => v.toFixed(1) },
    { label: "Y", accessor: "y", format: v => v.toFixed(1) },
    { label: "Value", accessor: "value", format: v => \`$\${v.toLocaleString()}\` }
  ]
})`}
      </pre>

      <h2>Styling</h2>

      <h3>Default Styles</h3>
      <p>
        Tooltips come with professional default styling following best practices:
      </p>
      <ul>
        <li>Dark background (rgba(0, 0, 0, 0.85)) with white text for contrast</li>
        <li>Proper padding and border radius</li>
        <li>Box shadow for depth</li>
        <li>Pointer events disabled to prevent interference</li>
        <li>Max width with word wrapping</li>
      </ul>

      <h3>Custom Styles</h3>
      <p>
        Override default styles using the <code>style</code> prop:
      </p>
      <pre>
        {`Tooltip({
  title: "name",
  style: {
    background: "white",
    color: "#333",
    border: "2px solid #007bff",
    borderRadius: "8px",
    padding: "12px",
    fontSize: "16px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
  }
})`}
      </pre>

      <h3>Custom Class Names</h3>
      <p>
        Add custom CSS classes for styling:
      </p>
      <pre>
        {`Tooltip({
  title: "name",
  className: "my-custom-tooltip"
})`}
      </pre>

      <h2>Advanced Usage</h2>

      <h3>Accessor Functions</h3>
      <p>
        Use functions to compute tooltip values dynamically:
      </p>
      <pre>
        {`Tooltip({
  title: (d) => \`\${d.name} (\${d.category})\`,
  format: (v) => \`Score: \${v}\`
})

MultiLineTooltip({
  fields: [
    { label: "Full Name", accessor: d => \`\${d.firstName} \${d.lastName}\` },
    { label: "Score", accessor: "score", format: v => \`\${v}%\` },
    { label: "Rank", accessor: d => d.rank + 1 } // 1-indexed
  ]
})`}
      </pre>

      <h3>Conditional Display</h3>
      <p>
        Return null from a custom tooltip function to hide the tooltip:
      </p>
      <pre>
        {`<Scatterplot
  data={data}
  tooltip={(d) => {
    if (d.value < 10) return null // Don't show tooltip for small values

    return (
      <div style={{ padding: "10px", background: "white" }}>
        {d.name}: {d.value}
      </div>
    )
  }}
/>`}
      </pre>

      <h3>Integration with Other Props</h3>
      <p>
        The <code>tooltip</code> prop works seamlessly with other chart props:
      </p>
      <pre>
        {`<Scatterplot
  data={data}
  colorBy="category"
  sizeBy="value"
  tooltip={MultiLineTooltip({
    title: "name",
    fields: ["category", "value", "x", "y"]
  })}
/>`}
      </pre>

      <h2>TypeScript Support</h2>
      <p>
        All tooltip utilities are fully typed for excellent IDE support:
      </p>
      <pre>
        {`import type { TooltipConfig, MultiLineTooltipConfig, TooltipProp } from "semiotic"

const config: TooltipConfig = {
  title: "name",
  format: (v) => v.toFixed(2)
}

const multiConfig: MultiLineTooltipConfig = {
  fields: ["x", "y", "value"],
  showLabels: true
}`}
      </pre>

      <h2>Migration from hoverAnnotation</h2>
      <p>
        If you're currently using <code>hoverAnnotation</code>, <code>tooltipContent</code>,
        or other hover props, you can easily migrate to the tooltip utilities:
      </p>

      <h3>Before (hoverAnnotation)</h3>
      <pre>
        {`<Scatterplot
  data={data}
  hoverAnnotation={true}
  tooltipContent={(d) => (
    <div style={{ background: "black", color: "white", padding: "8px" }}>
      {d.name}: {d.value}
    </div>
  )}
/>`}
      </pre>

      <h3>After (tooltip prop)</h3>
      <pre>
        {`<Scatterplot
  data={data}
  tooltip={Tooltip({
    title: d => \`\${d.name}: \${d.value}\`
  })}
/>`}
      </pre>

      <h2>Best Practices</h2>
      <ul>
        <li>
          <strong>Keep it concise:</strong> Show only the most relevant information
        </li>
        <li>
          <strong>Format values:</strong> Always format numbers, dates, and currencies
        </li>
        <li>
          <strong>Use labels:</strong> Make field names human-readable with proper labels
        </li>
        <li>
          <strong>Consider contrast:</strong> Ensure text is readable against background
        </li>
        <li>
          <strong>Avoid clutter:</strong> Don't overwhelm users with too many fields
        </li>
        <li>
          <strong>Match chart colors:</strong> Consider using similar colors to chart elements
        </li>
        <li>
          <strong>Test on mobile:</strong> Ensure tooltips work well on touch devices
        </li>
      </ul>

      <h2>Performance Considerations</h2>
      <p>
        The tooltip utilities are optimized for performance:
      </p>
      <ul>
        <li>Functions are memoized to prevent unnecessary re-renders</li>
        <li>Default formatting is efficient for common data types</li>
        <li>Styles are merged once, not on every hover</li>
        <li>Custom tooltip functions should be memoized if they're expensive</li>
      </ul>

      <h2>Troubleshooting</h2>

      <h3>Tooltip Not Showing</h3>
      <ul>
        <li>Ensure <code>enableHover</code> is not set to <code>false</code></li>
        <li>Verify data has the fields you're trying to access</li>
        <li>Check that your custom tooltip function returns valid JSX</li>
        <li>Make sure you're wrapping components in <code>TooltipProvider</code> if needed</li>
      </ul>

      <h3>Incorrect Field Values</h3>
      <ul>
        <li>Check that field names match your data structure</li>
        <li>Use accessor functions if fields are nested or computed</li>
        <li>Verify format functions are returning the expected types</li>
      </ul>

      <h3>Styling Issues</h3>
      <ul>
        <li>Custom styles override defaults completely - include all necessary properties</li>
        <li>Use <code>!important</code> if CSS specificity is an issue</li>
        <li>Check z-index if tooltips appear behind other elements</li>
      </ul>

      <h2>Related Documentation</h2>
      <ul>
        <li>
          <a href="/xyframe">XYFrame Hover Annotations</a> - Low-level hover control
        </li>
        <li>
          <a href="/orframe">OrdinalFrame Hover Annotations</a> - Low-level hover control
        </li>
        <li>
          <a href="/networkframe">NetworkFrame Hover Annotations</a> - Low-level hover control
        </li>
        <li>
          <a href="/higherordercharts">Higher-Order Charts</a> - Chart components overview
        </li>
      </ul>
    </DocumentComponent>
  )
}

TooltipDocs.title = "Tooltips"

export default TooltipDocs
