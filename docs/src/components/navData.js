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
          { title: "Stacked Area Chart", path: "/charts/stacked-area-chart" },
          { title: "Scatterplot", path: "/charts/scatterplot" },
          { title: "Bubble Chart", path: "/charts/bubble-chart" },
          { title: "Heatmap", path: "/charts/heatmap" },
        ],
      },
      {
        title: "Categorical",
        category: "categorical",
        children: [
          { title: "Bar Chart", path: "/charts/bar-chart" },
          { title: "Stacked Bar Chart", path: "/charts/stacked-bar-chart" },
          { title: "Swarm Plot", path: "/charts/swarm-plot" },
          { title: "Box Plot", path: "/charts/box-plot" },
          { title: "Dot Plot", path: "/charts/dot-plot" },
        ],
      },
      {
        title: "Network",
        category: "network",
        children: [
          { title: "Force Directed Graph", path: "/charts/force-directed-graph" },
          { title: "Chord Diagram", path: "/charts/chord-diagram" },
          { title: "Sankey Diagram", path: "/charts/sankey-diagram" },
          { title: "Tree Diagram", path: "/charts/tree-diagram" },
        ],
      },
      {
        title: "Realtime",
        category: "realtime",
        children: [
          { title: "Realtime Line Chart", path: "/charts/realtime-line-chart" },
          { title: "Realtime Bar Chart", path: "/charts/realtime-bar-chart" },
          { title: "Realtime Swarm Chart", path: "/charts/realtime-swarm-chart" },
          { title: "Realtime Waterfall Chart", path: "/charts/realtime-waterfall-chart" },
        ],
      },
    ],
  },
  {
    title: "Frames",
    path: "/frames",
    tier: "frames",
    children: [
      { title: "XY Frame", path: "/frames/xy-frame" },
      { title: "Ordinal Frame", path: "/frames/ordinal-frame" },
      { title: "Network Frame", path: "/frames/network-frame" },
      { title: "Realtime Frame", path: "/frames/realtime-frame" },
    ],
  },
  {
    title: "Features",
    path: "/features",
    children: [
      { title: "Axes", path: "/features/axes" },
      { title: "Annotations", path: "/features/annotations" },
      { title: "Tooltips", path: "/features/tooltips" },
      { title: "Interaction", path: "/features/interaction" },
      { title: "Responsive", path: "/features/responsive" },
      { title: "Accessibility", path: "/features/accessibility" },
      { title: "Canvas Rendering", path: "/features/canvas-rendering" },
      { title: "Sparklines", path: "/features/sparklines" },
      { title: "Small Multiples", path: "/features/small-multiples" },
      { title: "Styling", path: "/features/styling" },
      { title: "Legends", path: "/features/legends" },
    ],
  },
  {
    title: "Cookbook",
    path: "/cookbook",
    children: [
      { title: "Candlestick Chart", path: "/cookbook/candlestick-chart" },
      { title: "Homerun Map", path: "/cookbook/homerun-map" },
      { title: "Canvas Interaction", path: "/cookbook/canvas-interaction" },
      { title: "Uncertainty Visualization", path: "/cookbook/uncertainty-visualization" },
      { title: "Marginal Graphics", path: "/cookbook/marginal-graphics" },
      { title: "Bar & Line Chart", path: "/cookbook/bar-line-chart" },
      { title: "Bar to Parallel Coordinates", path: "/cookbook/bar-to-parallel-coordinates" },
      { title: "Waterfall Chart", path: "/cookbook/waterfall-chart" },
      { title: "Slope Chart", path: "/cookbook/slope-chart" },
      { title: "Marimekko Chart", path: "/cookbook/marimekko-chart" },
      { title: "Swarm Plot", path: "/cookbook/swarm-plot" },
      { title: "Ridgeline Plot", path: "/cookbook/ridgeline-plot" },
      { title: "Dot Plot", path: "/cookbook/dot-plot" },
      { title: "Timeline", path: "/cookbook/timeline" },
      { title: "Radar Plot", path: "/cookbook/radar-plot" },
      { title: "Isotype Chart", path: "/cookbook/isotype-chart" },
      { title: "Matrix", path: "/cookbook/matrix" },
    ],
  },
  {
    title: "API Reference",
    path: "/api",
    children: [
      { title: "Charts", path: "/api/charts" },
      { title: "XYFrame", path: "/api/xyframe" },
      { title: "OrdinalFrame", path: "/api/ordinalframe" },
      { title: "NetworkFrame", path: "/api/networkframe" },
      { title: "RealtimeFrame", path: "/api/realtime-frame" },
      { title: "Utilities", path: "/api/utilities" },
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
      const found = getBreadcrumbs(path, item.children, [...parents, { title: item.title, path: item.path }])
      if (found) return found
    }
  }
  return null
}

// Helper: get prev/next page for navigation
export function getPrevNext(path) {
  const flat = flattenNav().filter(item => item.path !== "/" && item.path)
  const index = flat.findIndex(item => item.path === path)
  return {
    prev: index > 0 ? flat[index - 1] : null,
    next: index < flat.length - 1 ? flat[index + 1] : null,
  }
}
