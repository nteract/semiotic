import React from "react"
import { Link } from "react-router-dom"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import RecipeLayout from "../../components/RecipeLayout"
import ComponentMeta from "../../components/ComponentMeta"
import CodeBlock from "../../components/CodeBlock"
import {
  USDotGrid,
  USCircleGrid,
  USSquareCartogram,
  WorldDotGrid,
  WorldCircleGrid,
} from "../../examples/recipes/GeographicGridMaps"
import { CENSUS_SOURCE } from "../../examples/recipes/data/geographicGridData"

const dotCode = `import {
  GeoCustomChart,
  geographicDotGridLayout,
  resolveReferenceGeography,
} from "semiotic/geo"

const land = await resolveReferenceGeography("world-110m")

<GeoCustomChart
  areas={land}
  projection="equalEarth"
  layout={geographicDotGridLayout}
  layoutConfig={{
    columns: 104,
    radiusRatio: 0.23,
    shape: "circle",
    featureFilter: feature => String(feature.id) !== "010",
    fillAccessor: d => d.latitude > 0 ? "#85ede1" : "#3bb9c5",
  }}
  accessibleTable={false}
  description="World land sampled onto a regular projected lattice."
/>`

const stateCode = `import { GeoCustomChart, geographicGridLayout } from "semiotic/geo"

<GeoCustomChart
  points={states}
  xAccessor="gridColumn"
  yAccessor="gridRow"
  layout={geographicGridLayout}
  layoutConfig={{
    source: "points",
    rowAccessor: "gridRow",
    columnAccessor: "gridColumn",
    idAccessor: "abbr",
    labelAccessor: "abbr",
    categoryAccessor: "region",
    shape: "circle", // or "square" / "hexagon"
  }}
  colorScheme={regionColors}
  enableHover
  tooltip
/>`

const worldCode = `import {
  GeoCustomChart,
  geographicGridLayout,
  resolveReferenceGeography,
} from "semiotic/geo"

const countries = await resolveReferenceGeography("world-110m")

<GeoCustomChart
  areas={countries}
  projection="equalEarth"
  layout={geographicGridLayout}
  layoutConfig={{
    source: "areas",
    columns: 24,
    occupancy: 0.66,
    shape: "circle",
    labelAccessor: d => d.name.slice(0, 3).toUpperCase(),
  }}
  enableHover
  tooltip
/>`

export default function GeographicGridMapsPage() {
  const [width, hostRef] = useResponsiveWidth(300, 820)
  const chartWidth = Math.max(300, width)
  const usHeight = Math.round(chartWidth * 0.58)

  return (
    <RecipeLayout
      title="Geographic Grid Maps"
      breadcrumbs={[
        { label: "Recipes", path: "/recipes" },
        { label: "Geographic Grid Maps", path: "/recipes/geographic-grid-maps" },
      ]}
      prevPage={{ title: "Streaming Migration Map", path: "/recipes/streaming-migration-map" }}
      nextPage={{ title: "Rosling Bubble Chart", path: "/recipes/rosling-bubble-chart" }}
      dependencies={["semiotic/geo", "react"]}
      fullSourceCode={`${dotCode}\n\n${stateCode}\n\n${worldCode}`}
    >
      <ComponentMeta
        componentName="geographicDotGridLayout"
        importStatement='import { GeoCustomChart, geographicDotGridLayout, geographicGridLayout } from "semiotic/geo"'
        tier="recipes"
        wraps="GeoCustomChart"
        wrapsPath="/custom-charts/layouts"
        related={[
          { name: "GeoCustomChart", path: "/custom-charts/layouts" },
          { name: "ChoroplethMap", path: "/charts/choropleth-map" },
          { name: "DistanceCartogram", path: "/charts/distance-cartogram" },
        ]}
      />

      <p>
        “Gridified geography” describes two useful but very different moves.
        A <strong>dot field</strong> samples a projected land silhouette onto a
        dense lattice, retaining one dot for every cell center inside the mask.
        A <strong>tile cartogram</strong> gives each named place one equal cell.
        Semiotic now provides a reusable layout for each approach.
      </p>

      <div
        style={{
          padding: "12px 16px",
          margin: "20px 0 32px",
          borderLeft: "4px solid var(--accent)",
          background: "var(--surface-1)",
        }}
      >
        <strong>Choose the claim:</strong> a dot field preserves the projected
        land silhouette but tiny islands may disappear at coarse densities. A
        tile cartogram preserves named units but intentionally loses exact
        boundary, distance, and land area.
      </div>

      <div ref={hostRef}>
        <h2 id="usa-dot-grid">USA as a geographic dot field</h2>
        <p>
          This is the sampled-mask technique: Semiotic fits the U.S. geometry
          with an Albers USA projection, lays a screen-space grid across it,
          inverts every cell center, and emits a dot only when that location is
          inside the land polygon.
        </p>
        <USDotGrid width={chartWidth} height={usHeight} />

        <h2 id="world-dot-grid">The world as a geographic dot field</h2>
        <p>
          Increasing <code>columns</code> raises the sampling density while
          <code>radiusRatio</code> controls how much of each cell the dot
          occupies. The geometry remains a regular Equal Earth lattice rather
          than a random point cloud. This is the map-sampling family popularized
          in lightweight dotted-globe treatments such as{" "}
          <a href="https://cobe.vercel.app/" target="_blank" rel="noopener noreferrer">
            COBE
          </a>
          , rendered here as a projection-aware Semiotic scene.
        </p>
        <WorldDotGrid
          width={chartWidth}
          height={Math.round(chartWidth * 0.52)}
        />
        <CodeBlock code={dotCode} language="jsx" />

        <h2 id="equal-place-cartograms">Equal-place cartograms</h2>
        <p>
          The original recipes remain useful when the task is to give each
          state or country one mark rather than to rasterize its land.
        </p>

        <h2 id="usa-circle-grid">USA as gridified circles</h2>
        <p>
          Fifty circles shift attention from land area to state identity. The
          authored table keeps a recognizable west-to-east / north-to-south
          silhouette; Census region supplies color.
        </p>
        <USCircleGrid width={chartWidth} height={usHeight} />

        <h2 id="usa-square-cartogram">USA as a square cartogram</h2>
        <p>
          Changing only <code>shape</code> produces the familiar tile-grid
          cartogram. The same IDs, labels, palette, tooltip, and accessibility
          projection carry across representations.
        </p>
        <USSquareCartogram width={chartWidth} height={usHeight} />
        <CodeBlock code={stateCode} language="jsx" />

        <h2 id="world-circle-grid">The world as gridified circles</h2>
        <p>
          This version starts with Natural Earth polygons instead of an authored
          table. Semiotic calculates each projected centroid, allocates a
          collision-free cell, and leaves deliberate whitespace so the result
          still reads as a world rather than a filled rectangle.
        </p>
        <WorldCircleGrid
          width={chartWidth}
          height={Math.round(chartWidth * 0.52)}
        />
        <CodeBlock code={worldCode} language="jsx" />
      </div>

      <h2 id="layout-contract">Layout contract</h2>
      <table>
        <thead>
          <tr>
            <th>Task</th>
            <th>Configuration</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Projected land dot field</td>
            <td>
              <code>geographicDotGridLayout</code> + polygon <code>areas</code>
            </td>
          </tr>
          <tr>
            <td>Dot-field resolution</td>
            <td>
              Set <code>columns</code> or a pixel <code>cellSize</code>
            </td>
          </tr>
          <tr>
            <td>Dot-to-cell proportion</td>
            <td><code>radiusRatio</code> from <code>0.05</code> to <code>0.5</code></td>
          </tr>
          <tr>
            <td>Known tile cartogram</td>
            <td><code>rowAccessor</code> + <code>columnAccessor</code></td>
          </tr>
          <tr>
            <td>Automatic point grid</td>
            <td><code>source="points"</code> + longitude/latitude accessors</td>
          </tr>
          <tr>
            <td>Automatic area grid</td>
            <td><code>source="areas"</code>; projected centroids are gridified</td>
          </tr>
          <tr>
            <td>Equal geographic units</td>
            <td>Omit <code>sizeAccessor</code></td>
          </tr>
          <tr>
            <td>Value cartogram</td>
            <td>
              Set <code>sizeAccessor</code>; mark area follows the value through
              square-root scaling
            </td>
          </tr>
          <tr>
            <td>Visual grammar</td>
            <td><code>shape="circle" | "square" | "hexagon"</code></td>
          </tr>
        </tbody>
      </table>

      <h2 id="data-note">Data note</h2>
      <p>
        The U.S. table combines an authored schematic placement with fixed{" "}
        <a href={CENSUS_SOURCE} target="_blank" rel="noopener noreferrer">
          2020 Census resident population
        </a>
        . The world examples use bundled Natural Earth geometry either as a
        land mask for lattice sampling or for country identity and centroid
        placement.
      </p>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/examples/equal-places-atlas">The Equal Places Atlas</Link>
          {" "}— a high-touch exploration of sampled land and equal-place grids
        </li>
        <li>
          <Link to="/charts/distance-cartogram">Distance Cartogram</Link>
          {" "}— distort distance rather than area
        </li>
        <li>
          <Link to="/custom-charts/layouts">Custom layouts</Link>
          {" "}— author reusable scene geometry
        </li>
      </ul>
    </RecipeLayout>
  )
}
