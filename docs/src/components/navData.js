const navData = [
  {
    title: "Home",
    path: "/",
  },
  {
    title: "Getting Started",
    path: "/getting-started",
  },
  {
    title: "Migrating to v3",
    path: "/migration",
  },
  {
    title: "Choose a Chart",
    path: "/choose",
  },
  {
    title: "Charts",
    path: "/charts",
    tier: "charts",
    children: [
      {
        title: "XY Charts",
        category: "xy",
        children: [
          { title: "Line Chart", path: "/charts/line-chart" },
          { title: "Area Chart", path: "/charts/area-chart" },
          { title: "Difference Chart", path: "/charts/difference-chart" },
          { title: "Stacked Area Chart", path: "/charts/stacked-area-chart" },
          { title: "Scatterplot", path: "/charts/scatterplot" },
          { title: "Connected Scatterplot", path: "/charts/connected-scatterplot" },
          { title: "Bubble Chart", path: "/charts/bubble-chart" },
          { title: "Heatmap", path: "/charts/heatmap" },
          { title: "Scatterplot Matrix", path: "/charts/scatterplot-matrix" },
          { title: "Quadrant Chart", path: "/charts/quadrant-chart" },
          { title: "Multi-Axis Line Chart", path: "/charts/multi-axis-line-chart" },
          { title: "Realtime Line Chart", path: "/charts/realtime-line-chart" },
          { title: "Realtime Swarm Chart", path: "/charts/realtime-swarm-chart" },
          { title: "Realtime Waterfall Chart", path: "/charts/realtime-waterfall-chart" },
          { title: "Realtime Heatmap", path: "/charts/realtime-heatmap" },
          { title: "Realtime Histogram", path: "/charts/realtime-histogram" },
          { title: "Candlestick Chart", path: "/charts/candlestick-chart" },
        ],
      },
      {
        title: "Categorical",
        category: "categorical",
        children: [
          { title: "Bar Chart", path: "/charts/bar-chart" },
          { title: "Stacked Bar Chart", path: "/charts/stacked-bar-chart" },
          { title: "Likert Chart", path: "/charts/likert-chart" },
          { title: "Swarm Plot", path: "/charts/swarm-plot" },
          { title: "Box Plot", path: "/charts/box-plot" },
          { title: "Histogram", path: "/charts/histogram" },
          { title: "Violin Plot", path: "/charts/violin-plot" },
          { title: "Dot Plot", path: "/charts/dot-plot" },
          { title: "Pie Chart", path: "/charts/pie-chart" },
          { title: "Donut Chart", path: "/charts/donut-chart" },
          { title: "Gauge Chart", path: "/charts/gauge-chart" },
          { title: "Grouped Bar Chart", path: "/charts/grouped-bar-chart" },
          { title: "Funnel Chart", path: "/charts/funnel-chart" },
          { title: "Swimlane Chart", path: "/charts/swimlane-chart" },
        ],
      },
      {
        title: "Network",
        category: "network",
        children: [
          { title: "Force Directed Graph", path: "/charts/force-directed-graph" },
          { title: "Chord Diagram", path: "/charts/chord-diagram" },
          { title: "Sankey Diagram", path: "/charts/sankey-diagram" },
          { title: "Process Sankey", path: "/charts/process-sankey" },
          { title: "Tree Diagram", path: "/charts/tree-diagram" },
          { title: "Treemap", path: "/charts/treemap" },
          { title: "Circle Pack", path: "/charts/circle-pack" },
          { title: "Orbit Diagram", path: "/charts/orbit-diagram" },
        ],
      },
      {
        title: "Geo",
        category: "geo",
        children: [
          { title: "Choropleth Map", path: "/charts/choropleth-map" },
          { title: "Proportional Symbol Map", path: "/charts/proportional-symbol-map" },
          { title: "Flow Map", path: "/charts/flow-map" },
          { title: "Distance Cartogram", path: "/charts/distance-cartogram" },
          { title: "Tile Maps", path: "/charts/tile-map" },
        ],
      },
      {
        title: "Physics",
        category: "physics",
        children: [
          { title: "Galton Board Chart", path: "/charts/galton-board-chart" },
          { title: "Event Drop Chart", path: "/charts/event-drop-chart" },
          { title: "Physics Pile Chart", path: "/charts/physics-pile-chart" },
          { title: "Collision Swarm Chart", path: "/charts/collision-swarm-chart" },
          { title: "Physical Flow Chart", path: "/charts/physical-flow-chart" },
          { title: "Process Flow Chart", path: "/charts/process-flow-chart" },
          { title: "Gauntlet Chart", path: "/charts/gauntlet-chart" },
          { title: "Physics Custom Chart", path: "/charts/physics-custom-chart" },
        ],
      },
      {
        title: "Value",
        category: "value",
        children: [{ title: "Big Number", path: "/charts/big-number" }],
      },
    ],
  },
  {
    title: "Frames",
    path: "/frames",
    tier: "frames",
    children: [
      { title: "StreamXYFrame", path: "/frames/xy-frame" },
      { title: "StreamOrdinalFrame", path: "/frames/ordinal-frame" },
      { title: "StreamNetworkFrame", path: "/frames/network-frame" },
      { title: "StreamGeoFrame", path: "/frames/geo-frame" },
      { title: "StreamPhysicsFrame", path: "/frames/physics-frame" },
    ],
  },
  {
    title: "Features",
    path: "/features",
    children: [
      { title: "Axes", path: "/features/axes" },
      { title: "Tooltips", path: "/features/tooltips" },
      { title: "Interaction", path: "/features/interaction" },
      { title: "Visualization Controls", path: "/features/controls" },
      { title: "Responsive", path: "/features/responsive" },
      { title: "Composition", path: "/features/composition" },
      { title: "Linked Charts", path: "/features/linked-charts" },
      { title: "Legends", path: "/features/legends" },
      { title: "Style Rules & Labels", path: "/features/style-rules" },
      { title: "Realtime Encoding", path: "/features/realtime-encoding" },
      { title: "Motion Encodings", path: "/features/motion-encodings" },
      { title: "Physics Encoding", path: "/features/physics-encoding" },
      { title: "Streaming Aggregation", path: "/features/streaming-aggregation" },
      { title: "Chart Container", path: "/features/chart-container" },
      { title: "Chart States", path: "/features/chart-states" },
      { title: "Chart Modes", path: "/features/chart-modes" },
      { title: "Streaming System Model", path: "/features/streaming-system-model" },
      { title: "Performance", path: "/features/performance" },
      { title: "Push API", path: "/features/push-api" },
      { title: "When Physics?", path: "/features/when-physics" },
      { title: "Physics process guide", path: "/features/physics-process-guide" },
    ],
  },
  {
    title: "Mobile",
    path: "/features/mobile-visualization",
    children: [
      { title: "Mobile Visualization", path: "/features/mobile-visualization" },
      { title: "Mobile Standard Controls", path: "/features/mobile/controls" },
      { title: "Mobile Recipes & Transforms", path: "/features/mobile/recipes" },
    ],
  },
  {
    title: "Examples",
    path: "/examples",
    children: [
      { title: "The Insight Forge", path: "/examples/insight-forge" },
      { title: "The Stakeholder Journey", path: "/examples/stakeholder-journey" },
      { title: "Merge Pressure", path: "/examples/merge-pressure" },
      { title: "Not in MY Backyard", path: "/examples/not-in-my-backyard" },
      { title: "Brushable Weather Rings", path: "/examples/climate-radial-weather" },
      { title: "Lake Travis, in Signs", path: "/examples/lake-travis-isotype" },
      {
        title: "Nathan's Hot Dog Contest, Four Ways",
        path: "/examples/hot-dog-contest-variations",
      },
      { title: "The Buildings Behind AI", path: "/examples/data-centers-isotype" },
      { title: "The Grid Is the Real AI Infrastructure", path: "/examples/the-grid" },
      { title: "Creative Gravity of America", path: "/examples/creative-contours" },
      {
        title: "Sometimes it's better to be discrete",
        path: "/examples/sometimes-better-discrete",
      },
      { title: "Where You Draw the Line", path: "/examples/where-you-draw-the-line" },
      { title: "U.S. War Timeline", path: "/examples/us-war-timeline" },
      { title: "Art Movement Genealogy", path: "/examples/art-movement-genealogy" },
      { title: "Isometric City Landmarks", path: "/examples/paris-isometric-landmarks" },
      { title: "Wikipedia Realtime", path: "/examples/wikipedia-realtime" },
      { title: "Local Government Explorer", path: "/examples/local-government-explorer" },
      { title: "The Long Way Around", path: "/examples/port-congestion-replay" },
      { title: "The Scroll You're Telling", path: "/examples/scroll-youre-telling" },
      { title: "What the Machine Sees", path: "/examples/what-the-machine-sees" },
      { title: "The Living System of Semiotic", path: "/examples/semiotic-architecture" },
      { title: "Point Climate Anomaly", path: "/examples/climate-anomaly" },
      { title: "The Gestalt of Data Visualization", path: "/examples/gestalt-principles" },
      { title: "Drawing Networks", path: "/examples/network-visualization" },
      { title: "Map of the Oregon Trail", path: "/examples/oregon-trail" },
    ],
  },
  {
    title: "Custom Charts",
    path: "/custom-charts",
    children: [
      { title: "Overview", path: "/custom-charts/overview" },
      { title: "Intelligence", path: "/custom-charts/intelligence" },
      { title: "Custom Layouts", path: "/custom-charts/custom-layouts" },
      { title: "Glyph Marks", path: "/custom-charts/glyph-marks" },
      { title: "Recipe Decoration Kit", path: "/custom-charts/recipe-kit" },
      { title: "Examples", path: "/custom-charts/examples" },
    ],
  },
  {
    title: "Accessibility",
    path: "/accessibility",
    children: [
      { title: "Overview", path: "/accessibility/overview" },
      { title: "Chartability Audit", path: "/accessibility/audit" },
      { title: "Chart Descriptions", path: "/accessibility/descriptions" },
      { title: "Structured Navigation", path: "/accessibility/navigation" },
      { title: "Anchoring Complex Charts", path: "/accessibility/anchoring-complex-charts" },
    ],
  },
  {
    title: "Annotations",
    path: "/annotations",
    children: [
      { title: "Overview", path: "/annotations/overview" },
      { title: "Design Guidance", path: "/annotations/design-guidance" },
      { title: "Advanced Annotations", path: "/annotations/advanced" },
      { title: "Provenance & Lifecycle", path: "/annotations/provenance-lifecycle" },
    ],
  },
  {
    title: "Intelligence",
    path: "/intelligence",
    children: [
      { title: "Observation Hooks", path: "/intelligence/observation-hooks" },
      { title: "Capability Matrix", path: "/intelligence/capabilities" },
      { title: "Chart Suggestions", path: "/intelligence/suggestions" },
      { title: "Scale-Aware Suggestions", path: "/intelligence/scale" },
      { title: "Interrogation", path: "/intelligence/interrogation" },
      { title: "Agent-Reader Grounding", path: "/intelligence/reader-grounding" },
      { title: "Experimental Data Pitfalls Bridge", path: "/intelligence/data-pitfalls" },
      { title: "Conversation Arc", path: "/intelligence/conversation-arc" },
      { title: "Temporal Lifecycle", path: "/intelligence/temporal-lifecycle" },
      { title: "Serialization", path: "/intelligence/serialization" },
      { title: "Variant Discovery", path: "/intelligence/variant-discovery" },
      { title: "Capability Authoring", path: "/intelligence/capability-authoring" },
      { title: "Audience Profiles", path: "/intelligence/audience-profiles" },
      { title: "CLI & MCP", path: "/intelligence/cli-mcp" },
    ],
  },
  {
    title: "Interoperability",
    path: "/interoperability",
    children: [
      { title: "Overview", path: "/interoperability/overview" },
      { title: "Portability Spec", path: "/interoperability/portability-spec" },
      { title: "Vega-Lite", path: "/interoperability/vega-lite" },
      { title: "Observable Plot", path: "/interoperability/observable-plot" },
      { title: "Flint Chart", path: "/interoperability/flint-chart" },
      { title: "Mermaid", path: "/interoperability/mermaid" },
      { title: "GoFish DisplayList", path: "/interoperability/gofish" },
      { title: "Apache Arrow", path: "/interoperability/arrow" },
      { title: "Data-Truth Bridge", path: "/interoperability/data-quality-bridge" },
      { title: "Generative-UI Trust Layer", path: "/interoperability/generative-ui" },
    ],
  },
  {
    title: "Theming",
    path: "/theming",
    children: [
      { title: "Styling", path: "/theming/styling" },
      { title: "Theme Provider", path: "/theming/theme-provider" },
      { title: "Semantic Colors", path: "/theming/semantic-colors" },
      { title: "Theme Explorer", path: "/theming/theme-explorer" },
    ],
  },
  {
    title: "Cookbook",
    path: "/cookbook",
    children: [
      { title: "Homerun Map", path: "/cookbook/homerun-map" },
      { title: "Canvas Interaction", path: "/cookbook/canvas-interaction" },
      { title: "Uncertainty Visualization", path: "/cookbook/uncertainty-visualization" },
      { title: "Marginal Graphics", path: "/cookbook/marginal-graphics" },
      { title: "Slope Chart", path: "/cookbook/slope-chart" },
      { title: "Marimekko Chart", path: "/cookbook/marimekko-chart" },
      { title: "Swarm Plot", path: "/cookbook/swarm-plot" },
      { title: "Ridgeline Plot", path: "/cookbook/ridgeline-plot" },
      { title: "Dot Plot", path: "/cookbook/dot-plot" },
      { title: "Timeline", path: "/cookbook/timeline" },
      { title: "Radar Plot", path: "/cookbook/radar-plot" },
      { title: "Isotype Chart", path: "/cookbook/isotype-chart" },
    ],
  },
  {
    title: "Recipes",
    path: "/recipes",
    children: [
      { title: "KPI Card + Sparkline", path: "/recipes/kpi-card-sparkline" },
      { title: "Time Series with Brush", path: "/recipes/time-series-brush" },
      { title: "Network Explorer", path: "/recipes/network-explorer" },
      { title: "Kafka Streams", path: "/recipes/kstreams" },
      { title: "Benchmark Dashboard", path: "/recipes/benchmark-dashboard" },
      { title: "Streaming Migration Map", path: "/recipes/streaming-migration-map" },
      { title: "Rosling Bubble Chart", path: "/recipes/rosling-bubble-chart" },
      { title: "Satellites in Space", path: "/recipes/satellites-in-space" },
    ],
  },
  {
    title: "Playground",
    path: "/playground",
    children: [
      { title: "Line Chart", path: "/playground/line-chart" },
      { title: "Bar Chart", path: "/playground/bar-chart" },
      { title: "Scatterplot", path: "/playground/scatterplot" },
      { title: "Connected Scatterplot", path: "/playground/connected-scatterplot" },
      { title: "Force Directed Graph", path: "/playground/force-directed-graph" },
      { title: "Sankey Diagram", path: "/playground/sankey-diagram" },
      { title: "Streaming Sankey", path: "/playground/streaming-sankey" },
      { title: "Realtime Line / Waterfall", path: "/playground/realtime-line-chart" },
      { title: "Realtime Bar / Swarm", path: "/playground/realtime-bar-chart" },
      { title: "Bubble Chart", path: "/playground/bubble-chart" },
      { title: "Stacked Area Chart", path: "/playground/stacked-area-chart" },
      { title: "Donut Chart", path: "/playground/donut-chart" },
      { title: "Treemap", path: "/playground/treemap" },
      { title: "Circle Pack", path: "/playground/circle-pack" },
      { title: "Orbit Diagram", path: "/playground/orbit-diagram" },
      { title: "Statistical Annotations", path: "/playground/statistical-annotations" },
      { title: "Forecast & Anomaly", path: "/playground/forecast" },
      { title: "Choropleth Map", path: "/playground/choropleth-map" },
      { title: "Distance Cartogram", path: "/playground/distance-cartogram" },
      { title: "Animation", path: "/playground/animation" },
    ],
  },
  {
    title: "Server Rendering",
    path: "/using-ssr",
    children: [
      { title: "SSR Gallery", path: "/ssr-gallery" },
      { title: "Render Studio", path: "/server/studio" },
      { title: "Chart Clinic (Beta)", path: "/server/chart-clinic" },
      { title: "Theme Showcase", path: "/server/themes" },
      { title: "Dashboard Gallery", path: "/server/dashboards" },
      { title: "Email Preview", path: "/server/email" },
      { title: "Export & Embed", path: "/server/export" },
    ],
  },
  {
    title: "API Reference",
    path: "/api",
    children: [
      { title: "Charts", path: "/api/charts" },
      { title: "TypeDoc API", path: "/api/typedoc" },
    ],
  },
]

export default navData

// Helper: flatten the tree into a flat array of { title, path, tier? } for route generation and prev/next nav
export function flattenNav(items = navData) {
  const result = []
  for (const item of items) {
    if (item.path) {
      result.push({ title: item.title, path: item.path, tier: item.tier })
    }
    if (item.children) {
      result.push(...flattenNav(item.children))
    }
  }
  return result
}

// Helper: find breadcrumbs for a given path
export function getBreadcrumbs(path, items = navData, parents = []) {
  for (const item of items) {
    if (item.path === path) {
      return [...parents, { title: item.title, path: item.path }]
    }
    if (item.children) {
      const found = getBreadcrumbs(path, item.children, [
        ...parents,
        { title: item.title, path: item.path },
      ])
      if (found) return found
    }
  }
  return null
}

// Helper: get prev/next page for navigation
export function getPrevNext(path) {
  const flat = flattenNav().filter((item) => item.path !== "/" && item.path)
  const index = flat.findIndex((item) => item.path === path)
  return {
    prev: index > 0 ? flat[index - 1] : null,
    next: index < flat.length - 1 ? flat[index + 1] : null,
  }
}
