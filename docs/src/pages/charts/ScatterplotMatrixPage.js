import React from "react"
import { ScatterplotMatrix } from "semiotic"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import LiveExample from "../../components/LiveExample"
import PageLayout from "../../components/PageLayout"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data — iris-like dataset (~60 points, 4 numeric fields, 1 species)
// ---------------------------------------------------------------------------

const irisData = [
  // setosa (20 points)
  { sepalLength: 5.1, sepalWidth: 3.5, petalLength: 1.4, petalWidth: 0.2, species: "setosa" },
  { sepalLength: 4.9, sepalWidth: 3.0, petalLength: 1.4, petalWidth: 0.2, species: "setosa" },
  { sepalLength: 4.7, sepalWidth: 3.2, petalLength: 1.3, petalWidth: 0.2, species: "setosa" },
  { sepalLength: 4.6, sepalWidth: 3.1, petalLength: 1.5, petalWidth: 0.2, species: "setosa" },
  { sepalLength: 5.0, sepalWidth: 3.6, petalLength: 1.4, petalWidth: 0.2, species: "setosa" },
  { sepalLength: 5.4, sepalWidth: 3.9, petalLength: 1.7, petalWidth: 0.4, species: "setosa" },
  { sepalLength: 4.6, sepalWidth: 3.4, petalLength: 1.4, petalWidth: 0.3, species: "setosa" },
  { sepalLength: 5.0, sepalWidth: 3.4, petalLength: 1.5, petalWidth: 0.2, species: "setosa" },
  { sepalLength: 4.4, sepalWidth: 2.9, petalLength: 1.4, petalWidth: 0.2, species: "setosa" },
  { sepalLength: 4.9, sepalWidth: 3.1, petalLength: 1.5, petalWidth: 0.1, species: "setosa" },
  { sepalLength: 5.4, sepalWidth: 3.7, petalLength: 1.5, petalWidth: 0.2, species: "setosa" },
  { sepalLength: 4.8, sepalWidth: 3.4, petalLength: 1.6, petalWidth: 0.2, species: "setosa" },
  { sepalLength: 4.8, sepalWidth: 3.0, petalLength: 1.4, petalWidth: 0.1, species: "setosa" },
  { sepalLength: 4.3, sepalWidth: 3.0, petalLength: 1.1, petalWidth: 0.1, species: "setosa" },
  { sepalLength: 5.8, sepalWidth: 4.0, petalLength: 1.2, petalWidth: 0.2, species: "setosa" },
  { sepalLength: 5.7, sepalWidth: 4.4, petalLength: 1.5, petalWidth: 0.4, species: "setosa" },
  { sepalLength: 5.4, sepalWidth: 3.9, petalLength: 1.3, petalWidth: 0.4, species: "setosa" },
  { sepalLength: 5.1, sepalWidth: 3.5, petalLength: 1.4, petalWidth: 0.3, species: "setosa" },
  { sepalLength: 5.7, sepalWidth: 3.8, petalLength: 1.7, petalWidth: 0.3, species: "setosa" },
  { sepalLength: 5.1, sepalWidth: 3.8, petalLength: 1.5, petalWidth: 0.3, species: "setosa" },
  // versicolor (20 points)
  { sepalLength: 7.0, sepalWidth: 3.2, petalLength: 4.7, petalWidth: 1.4, species: "versicolor" },
  { sepalLength: 6.4, sepalWidth: 3.2, petalLength: 4.5, petalWidth: 1.5, species: "versicolor" },
  { sepalLength: 6.9, sepalWidth: 3.1, petalLength: 4.9, petalWidth: 1.5, species: "versicolor" },
  { sepalLength: 5.5, sepalWidth: 2.3, petalLength: 4.0, petalWidth: 1.3, species: "versicolor" },
  { sepalLength: 6.5, sepalWidth: 2.8, petalLength: 4.6, petalWidth: 1.5, species: "versicolor" },
  { sepalLength: 5.7, sepalWidth: 2.8, petalLength: 4.5, petalWidth: 1.3, species: "versicolor" },
  { sepalLength: 6.3, sepalWidth: 3.3, petalLength: 4.7, petalWidth: 1.6, species: "versicolor" },
  { sepalLength: 4.9, sepalWidth: 2.4, petalLength: 3.3, petalWidth: 1.0, species: "versicolor" },
  { sepalLength: 6.6, sepalWidth: 2.9, petalLength: 4.6, petalWidth: 1.3, species: "versicolor" },
  { sepalLength: 5.2, sepalWidth: 2.7, petalLength: 3.9, petalWidth: 1.4, species: "versicolor" },
  { sepalLength: 5.0, sepalWidth: 2.0, petalLength: 3.5, petalWidth: 1.0, species: "versicolor" },
  { sepalLength: 5.9, sepalWidth: 3.0, petalLength: 4.2, petalWidth: 1.5, species: "versicolor" },
  { sepalLength: 6.0, sepalWidth: 2.2, petalLength: 4.0, petalWidth: 1.0, species: "versicolor" },
  { sepalLength: 6.1, sepalWidth: 2.9, petalLength: 4.7, petalWidth: 1.4, species: "versicolor" },
  { sepalLength: 5.6, sepalWidth: 2.9, petalLength: 3.6, petalWidth: 1.3, species: "versicolor" },
  { sepalLength: 6.7, sepalWidth: 3.1, petalLength: 4.4, petalWidth: 1.4, species: "versicolor" },
  { sepalLength: 5.6, sepalWidth: 3.0, petalLength: 4.5, petalWidth: 1.5, species: "versicolor" },
  { sepalLength: 5.8, sepalWidth: 2.7, petalLength: 4.1, petalWidth: 1.0, species: "versicolor" },
  { sepalLength: 6.2, sepalWidth: 2.2, petalLength: 4.5, petalWidth: 1.5, species: "versicolor" },
  { sepalLength: 5.6, sepalWidth: 2.5, petalLength: 3.9, petalWidth: 1.1, species: "versicolor" },
  // virginica (20 points)
  { sepalLength: 6.3, sepalWidth: 3.3, petalLength: 6.0, petalWidth: 2.5, species: "virginica" },
  { sepalLength: 5.8, sepalWidth: 2.7, petalLength: 5.1, petalWidth: 1.9, species: "virginica" },
  { sepalLength: 7.1, sepalWidth: 3.0, petalLength: 5.9, petalWidth: 2.1, species: "virginica" },
  { sepalLength: 6.3, sepalWidth: 2.9, petalLength: 5.6, petalWidth: 1.8, species: "virginica" },
  { sepalLength: 6.5, sepalWidth: 3.0, petalLength: 5.8, petalWidth: 2.2, species: "virginica" },
  { sepalLength: 7.6, sepalWidth: 3.0, petalLength: 6.6, petalWidth: 2.1, species: "virginica" },
  { sepalLength: 4.9, sepalWidth: 2.5, petalLength: 4.5, petalWidth: 1.7, species: "virginica" },
  { sepalLength: 7.3, sepalWidth: 2.9, petalLength: 6.3, petalWidth: 1.8, species: "virginica" },
  { sepalLength: 6.7, sepalWidth: 2.5, petalLength: 5.8, petalWidth: 1.8, species: "virginica" },
  { sepalLength: 7.2, sepalWidth: 3.6, petalLength: 6.1, petalWidth: 2.5, species: "virginica" },
  { sepalLength: 6.5, sepalWidth: 3.2, petalLength: 5.1, petalWidth: 2.0, species: "virginica" },
  { sepalLength: 6.4, sepalWidth: 2.7, petalLength: 5.3, petalWidth: 1.9, species: "virginica" },
  { sepalLength: 6.8, sepalWidth: 3.0, petalLength: 5.5, petalWidth: 2.1, species: "virginica" },
  { sepalLength: 5.7, sepalWidth: 2.5, petalLength: 5.0, petalWidth: 2.0, species: "virginica" },
  { sepalLength: 5.8, sepalWidth: 2.8, petalLength: 5.1, petalWidth: 2.4, species: "virginica" },
  { sepalLength: 6.4, sepalWidth: 3.2, petalLength: 5.3, petalWidth: 2.3, species: "virginica" },
  { sepalLength: 6.5, sepalWidth: 3.0, petalLength: 5.5, petalWidth: 1.8, species: "virginica" },
  { sepalLength: 7.7, sepalWidth: 3.8, petalLength: 6.7, petalWidth: 2.2, species: "virginica" },
  { sepalLength: 7.7, sepalWidth: 2.6, petalLength: 6.9, petalWidth: 2.3, species: "virginica" },
  { sepalLength: 6.0, sepalWidth: 2.2, petalLength: 5.0, petalWidth: 1.5, species: "virginica" },
]

const fields = ["sepalLength", "sepalWidth", "petalLength", "petalWidth"]

const fieldLabels = {
  sepalLength: "Sepal Length",
  sepalWidth: "Sepal Width",
  petalLength: "Petal Length",
  petalWidth: "Petal Width",
}

// ---------------------------------------------------------------------------
// Props definition for PropTable
// ---------------------------------------------------------------------------

const splomProps = [
  { name: "data", type: "array", required: true, default: null, description: "Array of data objects. Each object should contain numeric fields for plotting and optionally a categorical field for coloring." },
  { name: "fields", type: "string[]", required: true, default: null, description: "Array of field names (keys in each data object) to include in the matrix. Determines which numeric dimensions are plotted." },
  { name: "fieldLabels", type: "Record<string, string>", required: false, default: "{}", description: "Optional mapping from field names to display labels. Used in diagonal cells and axis labels." },
  { name: "colorBy", type: "string | function", required: false, default: null, description: "Field name or accessor function to determine point color. When set, each unique value gets a distinct color." },
  { name: "colorScheme", type: "string | string[]", required: false, default: '"category10"', description: "Color scheme name (e.g. \"category10\", \"tableau10\") or array of color strings." },
  { name: "cellSize", type: "number", required: false, default: "150", description: "Size of each cell in the matrix (width and height in pixels)." },
  { name: "cellGap", type: "number", required: false, default: "4", description: "Gap between cells in pixels." },
  { name: "pointRadius", type: "number", required: false, default: "2", description: "Radius of each point in pixels." },
  { name: "pointOpacity", type: "number", required: false, default: "0.5", description: "Default opacity for data points." },
  { name: "diagonal", type: '"histogram" | "density" | "label"', required: false, default: '"histogram"', description: "What to display on the diagonal cells. \"histogram\" shows a distribution histogram, \"density\" shows a density curve, \"label\" shows just the field name." },
  { name: "histogramBins", type: "number", required: false, default: "20", description: "Number of bins for diagonal histograms." },
  { name: "brushMode", type: '"crossfilter" | "intersect" | false', required: false, default: '"crossfilter"', description: "Brush interaction mode. \"crossfilter\" excludes the brushed cell from its own filter. \"intersect\" requires matching all brushed regions. false disables brushing." },
  { name: "hoverMode", type: "boolean", required: false, default: "true", description: "When true, hovering a point in one cell cross-highlights the same datum in every other cell." },
  { name: "unselectedOpacity", type: "number", required: false, default: "0.1", description: "Opacity applied to points that do not match the current brush or hover selection." },
  { name: "showGrid", type: "boolean", required: false, default: "false", description: "Show grid lines inside each scatterplot cell." },
  { name: "tooltip", type: "object | function", required: false, default: null, description: "Tooltip configuration or render function passed to each cell." },
  { name: "showLegend", type: "boolean", required: false, default: "true (when colorBy)", description: "Show a color legend above the matrix. Defaults to true when colorBy is set." },
  { name: "width", type: "number", required: false, default: null, description: "Overall width constraint. If not specified, the matrix sizes itself based on cellSize and field count." },
  { name: "height", type: "number", required: false, default: null, description: "Overall height constraint. If not specified, the matrix sizes itself based on cellSize and field count." },
  { name: "className", type: "string", required: false, default: null, description: "CSS class name applied to the outermost container." },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ScatterplotMatrixPage() {
  return (
    <PageLayout
      title="Scatterplot Matrix"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "XY Charts", path: "/charts" },
        { label: "Scatterplot Matrix", path: "/charts/scatterplot-matrix" },
      ]}
      prevPage={{ title: "Heatmap", path: "/charts/heatmap" }}
      nextPage={{ title: "Bar Chart", path: "/charts/bar-chart" }}
    >
      <ComponentMeta
        componentName="ScatterplotMatrix"
        importStatement='import { ScatterplotMatrix } from "semiotic"'
        tier="charts"
        wraps="XYFrame"
        wrapsPath="/frames/xy-frame"
        related={[
          { name: "Scatterplot", path: "/charts/scatterplot" },
          { name: "Heatmap", path: "/charts/heatmap" },
          { name: "XYFrame", path: "/frames/xy-frame" },
          { name: "Interaction", path: "/features/interaction" },
        ]}
      />

      <p>
        A Scatterplot Matrix (SPLOM) renders an N-by-N grid of scatterplots for
        every pairwise combination of the specified numeric fields. It is the
        standard tool for exploring correlations and clusters across multiple
        dimensions simultaneously. Diagonal cells show per-field histograms, and
        two built-in interaction modes -- hover cross-highlighting and crossfilter
        brushing -- let you probe the data interactively. Color-encode a
        categorical variable with <code>colorBy</code> to reveal group structure.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Start */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="quick-start">Quick Start</h2>

      <p>
        At minimum, provide <code>data</code> and <code>fields</code>. The
        component builds the full matrix of pairwise scatterplots automatically.
      </p>

      <LiveExample
        frameProps={{
          data: irisData,
          fields: fields,
          colorBy: "species",
          cellSize: 140,
        }}
        type={ScatterplotMatrix}
        startHidden={false}
        overrideProps={{
          data: `[
  { sepalLength: 5.1, sepalWidth: 3.5, petalLength: 1.4, petalWidth: 0.2, species: "setosa" },
  { sepalLength: 7.0, sepalWidth: 3.2, petalLength: 4.7, petalWidth: 1.4, species: "versicolor" },
  { sepalLength: 6.3, sepalWidth: 3.3, petalLength: 6.0, petalWidth: 2.5, species: "virginica" },
  // ...60 data points
]`,
          fields: '["sepalLength", "sepalWidth", "petalLength", "petalWidth"]',
          colorBy: '"species"',
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Examples */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="examples">Examples</h2>

      <h3 id="hover-interaction">Hover Interaction</h3>
      <p>
        With <code>hoverMode</code> enabled (the default), hovering a point in
        any cell cross-highlights the same data point in every other cell. The
        hovered point is drawn larger with a dark stroke so you can track a
        single observation across all dimensions. Non-matching points are
        slightly dimmed.
      </p>

      <LiveExample
        frameProps={{
          data: irisData,
          fields: fields,
          fieldLabels: fieldLabels,
          colorBy: "species",
          cellSize: 140,
          hoverMode: true,
          pointRadius: 3,
          pointOpacity: 0.6,
        }}
        type={ScatterplotMatrix}
        overrideProps={{
          data: "irisData // ~60 points with species",
          fields: '["sepalLength", "sepalWidth", "petalLength", "petalWidth"]',
          fieldLabels: '{ sepalLength: "Sepal Length", ... }',
          colorBy: '"species"',
          hoverMode: "true",
        }}
        hiddenProps={{}}
      />

      <h3 id="brush-interaction">Brush Interaction</h3>
      <p>
        Drag to brush a rectangular region in any cell. In{" "}
        <code>crossfilter</code> mode (the default), all points outside the
        brushed range are dimmed across the entire matrix -- except in the
        brushed cell itself, which remains fully visible so you can adjust the
        selection. The diagonal histograms update to reflect the brushed subset.
      </p>

      <LiveExample
        frameProps={{
          data: irisData,
          fields: fields,
          colorBy: "species",
          cellSize: 140,
          hoverMode: false,
          brushMode: "crossfilter",
          unselectedOpacity: 0.08,
        }}
        type={ScatterplotMatrix}
        overrideProps={{
          data: "irisData // ~60 points with species",
          fields: '["sepalLength", "sepalWidth", "petalLength", "petalWidth"]',
          colorBy: '"species"',
          hoverMode: "false",
          brushMode: '"crossfilter"',
          unselectedOpacity: "0.08",
        }}
        hiddenProps={{}}
      />

      <h3 id="color-and-labels">Color & Labels</h3>
      <p>
        Use <code>colorBy</code> to map a categorical field to color, and{" "}
        <code>fieldLabels</code> to provide human-readable axis labels in the
        diagonal cells and row/column headers.
      </p>

      <LiveExample
        frameProps={{
          data: irisData,
          fields: fields,
          fieldLabels: fieldLabels,
          colorBy: "species",
          colorScheme: ["#e41a1c", "#377eb8", "#4daf4a"],
          cellSize: 150,
          diagonal: "histogram",
          histogramBins: 15,
          showLegend: true,
        }}
        type={ScatterplotMatrix}
        overrideProps={{
          data: "irisData // ~60 points with species",
          fields: '["sepalLength", "sepalWidth", "petalLength", "petalWidth"]',
          fieldLabels: `{
  sepalLength: "Sepal Length",
  sepalWidth: "Sepal Width",
  petalLength: "Petal Length",
  petalWidth: "Petal Width"
}`,
          colorBy: '"species"',
          colorScheme: '["#e41a1c", "#377eb8", "#4daf4a"]',
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Props */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="props">Props</h2>

      <PropTable componentName="ScatterplotMatrix" props={splomProps} />

      {/* ----------------------------------------------------------------- */}
      {/* Related */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/charts/scatterplot">Scatterplot</Link> — single x-y
          scatterplot for two-variable analysis
        </li>
        <li>
          <Link to="/charts/heatmap">Heatmap</Link> — for dense data, aggregate
          into color-encoded grid cells
        </li>
        <li>
          <Link to="/charts/bubble-chart">BubbleChart</Link> — scatterplot with
          size encoding for a third numeric variable
        </li>
        <li>
          <Link to="/features/interaction">Interaction</Link> — brushing, hover,
          and linked selection across charts
        </li>
        <li>
          <Link to="/frames/xy-frame">XYFrame</Link> — the underlying Frame
          powering each cell in the matrix
        </li>
      </ul>
    </PageLayout>
  )
}
