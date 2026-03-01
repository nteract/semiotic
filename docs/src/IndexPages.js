import React from "react"
import { Link } from "react-router-dom"

export function GuidesIndex() {
  return (
    <div className="margin-bottom">
      <div className="subpages">
        <div className="sub-header">XYFrame</div>

        <PageLink
          href="/guides/line-chart"
          title="Line Charts"
          thumbnail={new URL("../public/assets/img/line-chart.png", import.meta.url)}
        />
        <PageLink
          href="/guides/area-chart"
          title="Area Charts"
          thumbnail={new URL("../public/assets/img/area-chart.png", import.meta.url)}
        />
        <PageLink
          href="/guides/scatterplot"
          title="Scatterplots"
          thumbnail={new URL("../public/assets/img/scatterplot.png", import.meta.url)}
        />
        <PageLink
          href="/guides/xy-summaries"
          title="XY Summaries"
          thumbnail={new URL("../public/assets/img/xy-summary.png", import.meta.url)}
        />
        <PageLink
          href="/guides/xy-brushes"
          title="XY Brushes"
          thumbnail={new URL("../public/assets/img/xy-brush.png", import.meta.url)}
        />

        <div className="sub-header">OrdinalFrame</div>

        <PageLink
          href="/guides/bar-chart"
          title="Bar Charts"
          thumbnail={new URL("../public/assets/img/bar-chart.png", import.meta.url)}
        />
        <PageLink
          href="/guides/pie-chart"
          title="Pie Charts"
          thumbnail={new URL("../public/assets/img/pie-chart.png", import.meta.url)}
        />
        <PageLink
          href="/guides/ordinal-summaries"
          title="Ordinal Summaries"
          thumbnail={new URL("../public/assets/img/or-summary.png", import.meta.url)}
        />
        <PageLink
          href="/guides/ordinal-brushes"
          title="Ordinal Brushes"
          thumbnail={new URL("../public/assets/img/or-brush.png", import.meta.url)}
        />

        <div className="sub-header">NetworkFrame</div>

        <PageLink
          href="/guides/force-layouts"
          title="Force Layouts"
          thumbnail={new URL("../public/assets/img/force.png", import.meta.url)}
        />
        <PageLink
          href="/guides/path-diagrams"
          title="Path Diagrams"
          thumbnail={new URL("../public/assets/img/path.png", import.meta.url)}
        />
        <PageLink
          href="/guides/hierarchical"
          title="Hierarchical Diagrams"
          thumbnail={new URL("../public/assets/img/hierarchy.png", import.meta.url)}
        />

        <div className="sub-header">Higher-Order Components</div>

        <PageLink
          href="/guides/xy-charts-hoc"
          title="XY Charts"
          thumbnail={new URL("../public/assets/img/scatterplot.png", import.meta.url)}
        />
        <PageLink
          href="/guides/ordinal-charts-hoc"
          title="Ordinal Charts"
          thumbnail={new URL("../public/assets/img/bar-chart.png", import.meta.url)}
        />
        <PageLink
          href="/guides/network-charts-hoc"
          title="Network Charts"
          thumbnail={new URL("../public/assets/img/force.png", import.meta.url)}
        />

        <div className="sub-header">RealtimeFrame</div>

        <PageLink
          href="/guides/realtime-frame"
          title="RealtimeFrame"
          thumbnail={new URL("../public/assets/img/canvas-interaction.png", import.meta.url)}
        />

        <div className="sub-header">All Frames</div>

        <PageLink
          href="/guides/axis"
          title="Axis"
          thumbnail={new URL("../public/assets/img/axis-settings.png", import.meta.url)}
        />
        <PageLink
          href="/guides/annotations"
          title="Annotations"
          thumbnail={new URL("../public/assets/img/annotations.png", import.meta.url)}
        />
        <PageLink
          href="/guides/tooltips"
          title="Annotations - Tooltips"
          thumbnail={new URL("../public/assets/img/tooltips.png", import.meta.url)}
        />
        <PageLink
          href="/guides/highlighting"
          title="Annotations - Highlighting"
          thumbnail={new URL("../public/assets/img/highlight.png", import.meta.url)}
        />
        <PageLink
          href="/guides/accessibility"
          title="Accessibility"
          thumbnail={new URL("../public/assets/img/accessibility.png", import.meta.url)}
        />
        <PageLink
          href="/guides/small-multiples"
          title="Small Multiples"
          thumbnail={new URL("../public/assets/img/facet.png", import.meta.url)}
        />
        <PageLink
          href="/guides/canvas-rendering"
          title="Canvas Rendering"
          thumbnail={new URL("../public/assets/img/canvas-interaction.png", import.meta.url)}
        />
        <PageLink
          href="/guides/sparklines"
          title="Sparklines"
          thumbnail={new URL("../public/assets/img/sparkline.png", import.meta.url)}
        />
        <PageLink
          href="/guides/sketchy-painty-patterns"
          title="Using Sketchy / Painty / Patterns"
          thumbnail={new URL("../public/assets/img/pattern.png", import.meta.url)}
        />
        <PageLink
          href="/guides/foreground-background-svg"
          title="Using Foreground / Background SVG"
          thumbnail={new URL("../public/assets/img/layers.png", import.meta.url)}
        />
      </div>
    </div>
  )
}

export function ExamplesIndex() {
  return (
    <div className="margin-bottom">
      <div className="subpages">
        <div className="sub-header">XYFrame</div>

        <PageLink
          href="/cookbook/candlestick-chart"
          title="Candlestick Chart"
          thumbnail={new URL("../public/assets/img/candlestick.png", import.meta.url)}
        />
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

        <div className="sub-header">OrdinalFrame</div>

        <PageLink
          href="/cookbook/bar-line-chart"
          title="Bar &amp; Line Chart"
          thumbnail={new URL("../public/assets/img/bar-line.png", import.meta.url)}
        />
        <PageLink
          href="/cookbook/bar-to-parallel-coordinates"
          title="Bar to Parallel Coordinates"
          thumbnail={new URL("../public/assets/img/bar-to-parallel.png", import.meta.url)}
        />
        <PageLink
          href="/cookbook/waterfall-chart"
          title="Waterfall Chart"
          thumbnail={new URL("../public/assets/img/waterfall.png", import.meta.url)}
        />
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

        <div className="sub-header">NetworkFrame</div>

        <PageLink
          href="/cookbook/matrix"
          title="Adjacency Matrix"
          thumbnail={new URL("../public/assets/img/matrix.png", import.meta.url)}
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
      </div>
    </div>
  )
}

export function ApiIndex() {
  return (
    <div className="margin-bottom">
      <div className="subpages">
        <div className="sub-header">Main Components</div>

        <PageLink
          href="/api/xyframe"
          title="XYFrame"
          thumbnail={new URL("../public/assets/img/scatterplot.png", import.meta.url)}
        />
        <PageLink
          href="/api/ordinalframe"
          title="OrdinalFrame"
          thumbnail={new URL("../public/assets/img/bar-chart.png", import.meta.url)}
        />
        <PageLink
          href="/api/networkframe"
          title="NetworkFrame"
          thumbnail={new URL("../public/assets/img/force.png", import.meta.url)}
        />
        <PageLink
          href="/api/responsiveframe"
          title="ResponsiveFrame"
          thumbnail={new URL("../public/assets/img/responsive.png", import.meta.url)}
        />
        <PageLink
          href="/api/sparkFrame"
          title="SparkFrame"
          thumbnail={new URL("../public/assets/img/sparkline.png", import.meta.url)}
        />
        <PageLink
          href="/api/facetcontroller"
          title="FacetController"
          thumbnail={new URL("../public/assets/img/facet.png", import.meta.url)}
        />

        <div className="sub-header">Sub-Components</div>

        <PageLink
          href="/api/mark"
          title="Mark"
          thumbnail={new URL("../public/assets/img/mark.png", import.meta.url)}
        />
        <PageLink
          href="/api/dividedline"
          title="DividedLine"
          thumbnail={new URL("../public/assets/img/divided-line.png", import.meta.url)}
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
          <img src={thumbnail} />
        </div>
      </Link>
    </div>
  )
}
