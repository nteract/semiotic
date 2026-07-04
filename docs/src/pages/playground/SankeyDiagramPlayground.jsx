import React from "react"
import { SankeyDiagram } from "semiotic"
import PlaygroundLayout from "../../components/PlaygroundLayout"

// ---------------------------------------------------------------------------
// Control schema
// ---------------------------------------------------------------------------

const controls = [
  { name: "orientation", type: "select", label: "Orientation", group: "Layout",
    default: "horizontal", options: ["horizontal", "vertical"] },
  { name: "nodeAlign", type: "select", label: "Node Alignment", group: "Layout",
    default: "justify", options: ["justify", "left", "right", "center"] },
  { name: "nodeWidth", type: "number", label: "Node Width", group: "Nodes",
    default: 15, min: 5, max: 40, step: 1 },
  { name: "nodePaddingRatio", type: "number", label: "Node Padding", group: "Nodes",
    default: 0.05, min: 0.01, max: 0.2, step: 0.01 },
  { name: "showLabels", type: "boolean", label: "Show Labels", group: "Nodes",
    default: true },
  { name: "edgeOpacity", type: "number", label: "Edge Opacity", group: "Edges",
    default: 0.5, min: 0.1, max: 1, step: 0.05 },
  { name: "enableHover", type: "boolean", label: "Enable Hover", group: "Interaction",
    default: true },
]

// ---------------------------------------------------------------------------
// Datasets
// ---------------------------------------------------------------------------

// Dataset 1: Company revenue breakdown (income statement style)
const revenueEdges = [
  // Revenue splits
  { source: "Revenue", target: "Cost of Goods Sold", value: 42 },
  { source: "Revenue", target: "Gross Profit", value: 58 },
  // Gross Profit splits
  { source: "Gross Profit", target: "R&D", value: 14 },
  { source: "Gross Profit", target: "Sales & Marketing", value: 12 },
  { source: "Gross Profit", target: "General & Admin", value: 6 },
  { source: "Gross Profit", target: "Operating Income", value: 26 },
  // Operating Income splits
  { source: "Operating Income", target: "Taxes", value: 5 },
  { source: "Operating Income", target: "Interest", value: 2 },
  { source: "Operating Income", target: "Net Income", value: 19 },
  // Net Income splits
  { source: "Net Income", target: "Dividends", value: 7 },
  { source: "Net Income", target: "Retained Earnings", value: 12 },
]

const revenueNodes = [
  { id: "Revenue", category: "income" },
  { id: "Cost of Goods Sold", category: "expense" },
  { id: "Gross Profit", category: "income" },
  { id: "R&D", category: "expense" },
  { id: "Sales & Marketing", category: "expense" },
  { id: "General & Admin", category: "expense" },
  { id: "Operating Income", category: "income" },
  { id: "Taxes", category: "expense" },
  { id: "Interest", category: "expense" },
  { id: "Net Income", category: "income" },
  { id: "Dividends", category: "distribution" },
  { id: "Retained Earnings", category: "distribution" },
]

// Dataset 2: Energy flow (source → conversion → end use)
const energyEdges = [
  // Sources → Conversion
  { source: "Solar", target: "Electricity", value: 30 },
  { source: "Wind", target: "Electricity", value: 25 },
  { source: "Natural Gas", target: "Electricity", value: 20 },
  { source: "Natural Gas", target: "Heating", value: 15 },
  { source: "Coal", target: "Electricity", value: 10 },
  // Conversion → End Use
  { source: "Electricity", target: "Residential", value: 35 },
  { source: "Electricity", target: "Commercial", value: 30 },
  { source: "Electricity", target: "Industrial", value: 15 },
  { source: "Electricity", target: "Losses", value: 5 },
  { source: "Heating", target: "Residential", value: 10 },
  { source: "Heating", target: "Commercial", value: 5 },
]

// Dataset 3: User funnel (acquisition → activation → retention)
const funnelEdges = [
  // Acquisition
  { source: "Organic Search", target: "Landing Page", value: 5000 },
  { source: "Paid Ads", target: "Landing Page", value: 3000 },
  { source: "Social Media", target: "Landing Page", value: 2000 },
  { source: "Referrals", target: "Landing Page", value: 1500 },
  // Activation
  { source: "Landing Page", target: "Sign Up", value: 4600 },
  { source: "Landing Page", target: "Bounce", value: 6900 },
  // Retention
  { source: "Sign Up", target: "Active (30d)", value: 2800 },
  { source: "Sign Up", target: "Churned", value: 1800 },
  // Monetization
  { source: "Active (30d)", target: "Free Tier", value: 1800 },
  { source: "Active (30d)", target: "Paid Plan", value: 1000 },
]

const datasets = [
  {
    label: "Revenue Breakdown (Income Statement)",
    nodes: revenueNodes,
    edges: revenueEdges,
    colorBy: "category",
    codeString: `// nodes
[
  { id: "Revenue", category: "income" },
  { id: "Cost of Goods Sold", category: "expense" },
  { id: "Gross Profit", category: "income" },
  // ...12 nodes
]
// edges
[
  { source: "Revenue", target: "Cost of Goods Sold", value: 42 },
  { source: "Revenue", target: "Gross Profit", value: 58 },
  // ...11 edges
]`,
  },
  {
    label: "Energy Flow (Source → Use)",
    nodes: null,
    edges: energyEdges,
    colorBy: null,
    codeString: `[
  { source: "Solar", target: "Electricity", value: 30 },
  { source: "Wind", target: "Electricity", value: 25 },
  { source: "Natural Gas", target: "Electricity", value: 20 },
  // ...11 edges
]`,
  },
  {
    label: "User Funnel (Acquisition → Revenue)",
    nodes: null,
    edges: funnelEdges,
    colorBy: null,
    codeString: `[
  { source: "Organic Search", target: "Landing Page", value: 5000 },
  { source: "Paid Ads", target: "Landing Page", value: 3000 },
  // ...10 edges
]`,
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SankeyDiagramPlayground() {
  return (
    <PlaygroundLayout
      title="Sankey Diagram Playground"
      breadcrumbs={[
        { label: "Playground", path: "/playground" },
        { label: "Sankey Diagram", path: "/playground/sankey-diagram" },
      ]}
      prevPage={{ title: "Force Directed Graph Playground", path: "/playground/force-directed-graph" }}
      nextPage={{ title: "Streaming Sankey Playground", path: "/playground/streaming-sankey" }}
      chartComponent={SankeyDiagram}
      componentName="SankeyDiagram"
      controls={controls}
      datasets={datasets}
      dataProps={(ds) => {
        const props = {
          edges: ds.edges,
          height: 500,
        }
        if (ds.nodes) props.nodes = ds.nodes
        if (ds.colorBy) props.colorBy = ds.colorBy
        return props
      }}
    >
      <p>
        Experiment with SankeyDiagram props in real time. Sankey diagrams
        visualize flow and magnitude — perfect for income statements, energy
        budgets, and user funnels. Adjust the controls and copy the generated code.
      </p>
    </PlaygroundLayout>
  )
}
