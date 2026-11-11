import React from "react"
import { Link } from "react-router-dom"

export function ExamplesIndex() {
  return (
    <div className="margin-bottom">
      <div className="subpages">
        <div className="sub-header">StreamXYFrame</div>

        <PageLink
          href="/cookbook/homerun-map"
          title="Homerun Map"
          thumbnail={new URL("../public/assets/img/baseball.png", import.meta.url)}
        />
        <PageLink
          href="/cookbook/canvas-interaction"
          title="Canvas Interaction"
          thumbnail={new URL("../public/assets/img/canvas-interaction.png", import.meta.url)}
        />
        <PageLink
          href="/cookbook/uncertainty-visualization"
          title="Uncertainty Visualization"
          thumbnail={new URL("../public/assets/img/uncertainty-visualization.png", import.meta.url)}
        />
        <PageLink
          href="/cookbook/marginal-graphics"
          title="Marginal Graphics"
          thumbnail={new URL("../public/assets/img/marginal-graphics.png", import.meta.url)}
        />

        <div className="sub-header">StreamOrdinalFrame</div>

        <PageLink
          href="/cookbook/slope-chart"
          title="Slope Chart"
          thumbnail={new URL("../public/assets/img/slope.png", import.meta.url)}
        />
        <PageLink
          href="/cookbook/marimekko-chart"
          title="Marimekko Chart"
          thumbnail={new URL("../public/assets/img/marimekko.png", import.meta.url)}
        />
        <PageLink
          href="/cookbook/swarm-plot"
          title="Swarm Plot"
          thumbnail={new URL("../public/assets/img/swarm.png", import.meta.url)}
        />
        <PageLink
          href="/cookbook/ridgeline-plot"
          title="Ridgeline Plot"
          thumbnail={new URL("../public/assets/img/ridgeline.png", import.meta.url)}
        />
        <PageLink
          href="/cookbook/dot-plot"
          title="Dot Plot"
          thumbnail={new URL("../public/assets/img/dot.png", import.meta.url)}
        />
        <PageLink
          href="/cookbook/timeline"
          title="Timeline"
          thumbnail={new URL("../public/assets/img/timeline.png", import.meta.url)}
        />
        <PageLink
          href="/cookbook/radar-plot"
          title="Radar Plot"
          thumbnail={new URL("../public/assets/img/radar.png", import.meta.url)}
        />
        <PageLink
          href="/cookbook/isotype-chart"
          title="Isotype Chart"
          thumbnail={new URL("../public/assets/img/isotype.png", import.meta.url)}
        />
      </div>
    </div>
  )
}

export function RecipesIndex() {
  return (
    <div className="margin-bottom">
      <div className="subpages">
        <div className="sub-header">Dashboard Panels</div>

        <PageLink
          href="/recipes/kpi-card-sparkline"
          title="KPI Card + Sparkline"
          thumbnail={new URL("../public/assets/img/sparkline.png", import.meta.url)}
        />
        <PageLink
          href="/recipes/time-series-brush"
          title="Time Series with Brush"
          thumbnail={new URL("../public/assets/img/xy-brush.png", import.meta.url)}
        />
        <PageLink
          href="/recipes/network-explorer"
          title="Network Explorer"
          thumbnail={new URL("../public/assets/img/force.png", import.meta.url)}
        />
        <PageLink
          href="/recipes/kstreams"
          title="Kafka Streams"
          thumbnail={new URL("../public/assets/img/force.png", import.meta.url)}
        />

        <div className="sub-header">Streaming Visualization</div>

        <PageLink
          href="/recipes/streaming-migration-map"
          title="Streaming Migration Map"
          thumbnail={new URL("../public/assets/img/force.png", import.meta.url)}
        />
        <PageLink
          href="/recipes/geographic-grid-maps"
          title="Geographic Grid Maps"
          thumbnail={new URL("../public/assets/img/custom-layout.png", import.meta.url)}
        />

        <div className="sub-header">Narrative Visualization</div>

        <PageLink
          href="/recipes/rosling-bubble-chart"
          title="Rosling Bubble Chart"
          thumbnail={new URL("../public/assets/img/scatterplot.png", import.meta.url)}
        />
        <PageLink
          href="/recipes/satellites-in-space"
          title="Satellites in Space"
          thumbnail={new URL("../public/assets/img/scatterplot.png", import.meta.url)}
        />
        <PageLink
          href="/recipes/net-ensemble"
          title="Net Ensemble"
          thumbnail={new URL("../public/assets/img/force.png", import.meta.url)}
        />
        <PageLink
          href="/recipes/adjacency-flow"
          title="Adjacency Flow"
          thumbnail={new URL("../public/assets/img/custom-layout.png", import.meta.url)}
        />
        <PageLink
          href="/recipes/transit-diagram"
          title="Transit Diagram"
          thumbnail={new URL("../public/assets/img/custom-layout.png", import.meta.url)}
        />
        <PageLink
          href="/recipes/word-trails"
          title="Word Trails"
          thumbnail={new URL("../public/assets/img/path.png", import.meta.url)}
        />

        <div className="sub-header">Dashboards</div>

        <PageLink
          href="/recipes/benchmark-dashboard"
          title="Benchmark Dashboard"
          thumbnail={new URL("../public/assets/img/bar-chart.png", import.meta.url)}
        />
      </div>
    </div>
  )
}

export function PlaygroundIndex() {
  return (
    <div className="margin-bottom">
      <p>
        Interactively explore Semiotic's chart components. Adjust props via controls and see changes
        in real time with auto-generated code.
      </p>
      <div className="subpages">
        <PageLink
          href="/playground/line-chart"
          title="Line Chart"
          thumbnail={new URL("../public/assets/img/line-chart.png", import.meta.url)}
        />
        <PageLink
          href="/playground/bar-chart"
          title="Bar Chart"
          thumbnail={new URL("../public/assets/img/bar-chart.png", import.meta.url)}
        />
        <PageLink
          href="/playground/scatterplot"
          title="Scatterplot"
          thumbnail={new URL("../public/assets/img/scatterplot.png", import.meta.url)}
        />
        <PageLink
          href="/playground/force-directed-graph"
          title="Force Directed Graph"
          thumbnail={new URL("../public/assets/img/force.png", import.meta.url)}
        />
        <PageLink
          href="/playground/sankey-diagram"
          title="Sankey Diagram"
          thumbnail={new URL("../public/assets/img/link.png", import.meta.url)}
        />
        <PageLink
          href="/playground/streaming-sankey"
          title="Streaming Sankey"
          thumbnail={new URL("../public/assets/img/link.png", import.meta.url)}
        />
        <PageLink
          href="/playground/realtime-line-chart"
          title="Realtime Line / Waterfall"
          thumbnail={new URL("../public/assets/img/sparkline.png", import.meta.url)}
        />
        <PageLink
          href="/playground/realtime-bar-chart"
          title="Realtime Bar / Swarm"
          thumbnail={new URL("../public/assets/img/bar-chart.png", import.meta.url)}
        />
        <PageLink
          href="/playground/connected-scatterplot"
          title="Connected Scatterplot"
          thumbnail={new URL("../public/assets/img/path.png", import.meta.url)}
        />
        <PageLink
          href="/playground/bubble-chart"
          title="Bubble Chart"
          thumbnail={new URL("../public/assets/img/scatterplot.png", import.meta.url)}
        />
        <PageLink
          href="/playground/stacked-area-chart"
          title="Stacked Area Chart"
          thumbnail={new URL("../public/assets/img/area-chart.png", import.meta.url)}
        />
        <PageLink
          href="/playground/donut-chart"
          title="Donut Chart"
          thumbnail={new URL("../public/assets/img/pie-chart.png", import.meta.url)}
        />
        <PageLink
          href="/playground/treemap"
          title="Treemap"
          thumbnail={new URL("../public/assets/img/hierarchy.png", import.meta.url)}
        />
        <PageLink
          href="/playground/circle-pack"
          title="Circle Pack"
          thumbnail={new URL("../public/assets/img/hierarchy.png", import.meta.url)}
        />
        <PageLink
          href="/playground/orbit-diagram"
          title="Orbit Diagram"
          thumbnail={new URL("../public/assets/img/hierarchy.png", import.meta.url)}
        />
        <PageLink
          href="/playground/choropleth-map"
          title="Choropleth Map"
          thumbnail={new URL("../public/assets/img/custom-layout.png", import.meta.url)}
        />
        <PageLink
          href="/playground/distance-cartogram"
          title="Distance Cartogram"
          thumbnail={new URL("../public/assets/img/custom-layout.png", import.meta.url)}
        />
        <PageLink
          href="/playground/statistical-annotations"
          title="Statistical Annotations"
          thumbnail={new URL("../public/assets/img/annotations.png", import.meta.url)}
        />
        <PageLink
          href="/playground/forecast"
          title="Forecast"
          thumbnail={new URL("../public/assets/img/uncertainty-visualization.png", import.meta.url)}
        />
        <PageLink
          href="/playground/animation"
          title="Animation"
          thumbnail={new URL("../public/assets/img/bar-chart.png", import.meta.url)}
        />
      </div>
    </div>
  )
}

export function ApiIndex() {
  return (
    <div className="margin-bottom">
      <div className="subpages">
        <div className="sub-header">Reference</div>

        <PageLink
          href="/api/charts"
          title="Chart Components"
          thumbnail={new URL("../public/assets/img/line-chart.png", import.meta.url)}
        />
        <PageLink
          href="/api/typedoc"
          title="TypeScript API Reference"
          thumbnail={new URL("../public/assets/img/mark.png", import.meta.url)}
        />

        <div className="sub-header">Frames</div>

        <PageLink
          href="/frames/xy-frame"
          title="StreamXYFrame"
          thumbnail={new URL("../public/assets/img/scatterplot.png", import.meta.url)}
        />
        <PageLink
          href="/frames/ordinal-frame"
          title="StreamOrdinalFrame"
          thumbnail={new URL("../public/assets/img/bar-chart.png", import.meta.url)}
        />
        <PageLink
          href="/frames/network-frame"
          title="StreamNetworkFrame"
          thumbnail={new URL("../public/assets/img/force.png", import.meta.url)}
        />
        <PageLink
          href="/frames/geo-frame"
          title="StreamGeoFrame"
          thumbnail={new URL("../public/assets/img/custom-layout.png", import.meta.url)}
        />
        <PageLink
          href="/frames/physics-frame"
          title="StreamPhysicsFrame"
          thumbnail={new URL("../public/assets/img/swarm.png", import.meta.url)}
        />
      </div>
    </div>
  )
}

function PageLink({ href, title, thumbnail }) {
  return (
    <div>
      <Link to={href}>
        <p>{title}</p>
        <div className="page-image">
          <img src={thumbnail} alt={title} />
        </div>
      </Link>
    </div>
  )
}
