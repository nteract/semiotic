/**
 * SSR/CSR parity fixtures for network `perspective`: one per projection
 * behavior (billboards, ground bands, extrusion, ground ellipses, projected
 * ribbons, ground labels), the flagship infrastructure diagram with zone
 * plates, orthogonal ground routes and isometric pictograms, and the in-repo
 * layout recipes whose decorations follow the projection.
 */
import * as React from "react"
import { HOSTS, LINKS, PALETTE } from "../docs/src/pages/examples/data/isometricInfrastructureData.js"
import {
  cellSize,
  infrastructureLayout,
  infrastructurePerspective
} from "../docs/src/pages/examples/data/isometricInfrastructureScene.js"

const services = [
  { id: "gateway", tier: 2, group: "edge" },
  { id: "auth", tier: 1, group: "app" },
  { id: "orders", tier: 1, group: "app" },
  { id: "search", tier: 1, group: "app" },
  { id: "orders-db", tier: 0, group: "data" },
  { id: "users-db", tier: 0, group: "data" },
  { id: "index", tier: 0, group: "data" }
]
const calls = [
  { source: "gateway", target: "auth" }, { source: "gateway", target: "orders" },
  { source: "gateway", target: "search" }, { source: "auth", target: "users-db" },
  { source: "orders", target: "orders-db" }, { source: "search", target: "index" }
]
const flows = [
  { source: "Coal", target: "Electricity", value: 30 }, { source: "Gas", target: "Electricity", value: 22 },
  { source: "Gas", target: "Heat", value: 14 }, { source: "Solar", target: "Electricity", value: 12 },
  { source: "Electricity", target: "Homes", value: 34 }, { source: "Electricity", target: "Industry", value: 30 },
  { source: "Heat", target: "Homes", value: 14 }
]
const org = {
  name: "Platform",
  children: [
    { name: "Data", children: [{ name: "Ingest", value: 12 }, { name: "Warehouse", value: 18 }, { name: "Quality", value: 6 }] },
    { name: "Product", children: [{ name: "Web", value: 16 }, { name: "Mobile", value: 10 }] },
    { name: "Infra", children: [{ name: "Compute", value: 14 }, { name: "Network", value: 8 }, { name: "Security", value: 9 }] }
  ]
}
const hierarchy = { data: org, childrenAccessor: "children", nodeIdAccessor: "name" }

export interface NetworkPerspectiveParityCase {
  id: string
  title: string
  component: string
  props: Record<string, unknown>
  comparison?: "structural"
}

const lineageNodes = [
  { id: "orders", label: "Orders", x: 0, y: -0.75, partition: "topic-source", semantic: "source", subtopologyId: "ingest" },
  { id: "validate", label: "Validate", x: 1, y: -0.75, partition: "processor", semantic: "filter", subtopologyId: "ingest" },
  { id: "customers", label: "Customers", x: 0, y: 0.75, partition: "topic-source", semantic: "source", subtopologyId: "enrich" },
  { id: "join", label: "Join", x: 1, y: 0.75, partition: "processor", semantic: "join-this", subtopologyId: "enrich" },
  { id: "aggregate", label: "Aggregate", x: 2, y: 0.45, partition: "processor", semantic: "aggregate", subtopologyId: "enrich" },
  { id: "publish", label: "Publish", x: 2, y: -0.75, partition: "processor", semantic: "sink", subtopologyId: "output" },
  { id: "warehouse", label: "Warehouse", x: 3, y: -0.75, partition: "topic-sink", semantic: "sink", subtopologyId: "output" }
]
const lineageEdges = [
  { source: "orders", target: "validate" }, { source: "customers", target: "join" },
  { source: "validate", target: "aggregate" }, { source: "join", target: "aggregate" },
  { source: "aggregate", target: "publish" }, { source: "publish", target: "warehouse" }
]
const flowchartNodes = [
  { id: "start", layer: 0, row: 0, label: "Request", shape: "stadium" },
  { id: "auth", layer: 1, row: 0, label: "Signed in?", shape: "diamond" },
  { id: "login", layer: 2, row: 1, label: "Log in", shape: "subroutine" },
  { id: "load", layer: 2, row: 0, label: "Load cart", shape: "rect" },
  { id: "db", layer: 3, row: 0, label: "Orders DB", shape: "cylinder" }
]
const flowchartEdges = [
  { source: "start", target: "auth" }, { source: "auth", target: "load", label: "yes" },
  { source: "auth", target: "login", label: "no" }, { source: "login", target: "load" },
  { source: "load", target: "db" }
]
const satellites = [
  { id: "s1", region: "US", orbit: "LEO", mass: 260, category: "Comms", klass: "Civil" },
  { id: "s2", region: "US", orbit: "LEO", mass: 900, category: "Imaging", klass: "Defense" },
  { id: "s3", region: "US", orbit: "GEO", mass: 3800, category: "Comms", klass: "Civil" },
  { id: "s4", region: "US", orbit: "LEO", mass: 180, category: "Research", klass: "Civil" },
  { id: "s5", region: "EU", orbit: "LEO", mass: 420, category: "Research", klass: "Civil" },
  { id: "s6", region: "EU", orbit: "GEO", mass: 2600, category: "Comms", klass: "Civil", uk: true },
  { id: "s7", region: "EU", orbit: "MEO", mass: 1100, category: "Navigation", klass: "Defense" },
  { id: "s8", region: "Asia", orbit: "MEO", mass: 1500, category: "Navigation", klass: "Defense" },
  { id: "s9", region: "Asia", orbit: "LEO", mass: 320, category: "Imaging", klass: "Civil" },
  { id: "s10", region: "Asia", orbit: "GEO", mass: 3100, category: "Comms", klass: "Defense" }
]
const net = (p: string, links: Array<[string, string]>) => ({
  nodes: [...new Set(links.flat())].map((id) => ({ id: `${p}${id}` })),
  edges: links.map(([a, b]) => ({ source: `${p}${a}`, target: `${p}${b}` }))
})
const ensemble = [
  net("d1", [["a", "b"], ["a", "c"], ["b", "d"], ["c", "d"]]),
  net("d2", [["a", "b"], ["a", "c"], ["b", "d"], ["c", "d"]]),
  net("k1", [["a", "b"], ["b", "c"]]),
  net("c1", [["a", "b"], ["a", "c"]]),
  net("c2", [["a", "b"], ["a", "c"]])
]
const stations = [
  { id: "north", label: "North", color: "#d1495b" },
  { id: "harbor", label: "Harbor", color: "#277da1" },
  { id: "market", label: "Market" },
  { id: "central", label: "Central", transfer: true },
  { id: "park", label: "Park" },
  { id: "airport", label: "Airport" }
]
const tracks = [
  { source: "north", target: "market", line: "red", color: "#d1495b" },
  { source: "harbor", target: "market", line: "blue", color: "#277da1" },
  { source: "market", target: "central", line: "red", color: "#d1495b" },
  { source: "market", target: "central", line: "blue", color: "#277da1" },
  { source: "central", target: "park", line: "red", color: "#d1495b" },
  { source: "central", target: "airport", line: "blue", color: "#277da1" }
]
const teams = ["Web", "API", "Jobs", "Data"].map((id) => ({ id }))
const handoffs = [
  { source: "Web", target: "API", value: 9 }, { source: "API", target: "Jobs", value: 5 },
  { source: "API", target: "Data", value: 7 }, { source: "Jobs", target: "Data", value: 4 },
  { source: "Data", target: "Web", value: 3 }
]

function recipeLayout(recipes: Record<string, unknown>, name: string) {
  const layout = recipes[name]
  if (typeof layout !== "function") throw new Error(`Perspective parity fixture requires ${name}`)
  return layout
}

export function makeNetworkPerspectiveParityCases(
  recipes: Record<string, unknown> = {}
): NetworkPerspectiveParityCase[] {
  const infraWidth = 640
  const infraHeight = 420
  const custom = {
    nodeIDAccessor: "id",
    sourceAccessor: "source",
    targetAccessor: "target",
    width: 480,
    height: 320,
    margin: { top: 16, right: 16, bottom: 16, left: 16 }
  }
  const recipeCases: NetworkPerspectiveParityCase[] = [
    {
      id: "perspective-recipe-lineage-hulls",
      title: "lineageDagLayout — ground hulls, lifted arrows, standing node cards",
      component: "NetworkCustomChart",
      props: {
        ...custom,
        nodes: lineageNodes,
        edges: lineageEdges,
        layout: recipeLayout(recipes, "lineageDagLayout"),
        layoutConfig: {
          layerCount: 4, maxLayerSize: 2, nodeWidth: 92, nodeHeight: 36, lod: "compact",
          hullGroupAccessor: "subtopologyId", hullFillOpacity: 0.16, hullStrokeOpacity: 0.7,
          hullColors: { ingest: "#0f766e", enrich: "#7c3aed", output: "#c2410c" },
          hullLabel: (group: string) => `Sub-topology ${group}`
        },
        perspective: "isometric"
      }
    },
    {
      id: "perspective-recipe-mermaid",
      title: "mermaidDagLayout — solid shaped pieces under a pixel perspective",
      component: "NetworkCustomChart",
      props: {
        ...custom,
        nodes: flowchartNodes,
        edges: flowchartEdges,
        layout: recipeLayout(recipes, "mermaidDagLayout"),
        layoutConfig: {
          direction: "LR", nodeWidth: 92, nodeHeight: 40,
          nodeFill: "#e8eef7", nodeStroke: "#5b6b82", textColor: "#1f2a37", edgeColor: "#5b6b82", accentColor: "#c2410c"
        },
        perspective: "pixel"
      }
    },
    {
      id: "perspective-recipe-packed-cluster",
      title: "packedClusterMatrix — tokens with icons, ground enclosures, standing headers",
      component: "NetworkCustomChart",
      props: {
        ...custom,
        nodes: satellites,
        edges: [],
        layout: recipeLayout(recipes, "packedClusterMatrix"),
        layoutConfig: {
          columnAccessor: "region", rowAccessor: "orbit", sizeAccessor: "mass", colorAccessor: "category",
          iconAccessor: "klass", iconMap: { Defense: "triangle" }, markerAccessor: "uk",
          columnOrder: ["US", "EU", "Asia"], rowOrder: ["LEO", "MEO", "GEO"],
          enclosureColor: "#5b6b82", headerColor: "#1f2a37", labelColor: "#5b6b82"
        },
        perspective: "isometric"
      }
    },
    {
      id: "perspective-recipe-net-ensemble",
      title: "netEnsembleLayout — ground bands, standing headers, flat legend",
      component: "NetworkCustomChart",
      props: {
        ...custom,
        nodes: ensemble.flatMap((n) => n.nodes),
        edges: ensemble.flatMap((n) => n.edges),
        layout: recipeLayout(recipes, "netEnsembleLayout"),
        layoutConfig: {},
        perspective: "dimetric"
      }
    },
    {
      id: "perspective-recipe-transit",
      title: "transitDiagramLayout — standing custom stations and anchored labels",
      component: "NetworkCustomChart",
      props: {
        ...custom,
        nodes: stations,
        edges: tracks,
        layout: recipeLayout(recipes, "transitDiagramLayout"),
        layoutConfig: {
          renderStation: ({ station, x, y, radius }: { station: { transfer?: boolean }; x: number; y: number; radius: number }) =>
            React.createElement("rect", {
              x: x - radius - 2, y: y - radius - 2, width: 2 * radius + 4, height: 2 * radius + 4, rx: station.transfer ? radius + 2 : 2,
              fill: station.transfer ? "#6d4c91" : "#315a75", stroke: "#fff", strokeWidth: 1.5
            })
        },
        perspective: "military"
      }
    },
    {
      id: "perspective-recipe-adjacency-flow",
      title: "adjacencyFlowLayout — ground matrix grid, arrows inside lifted routes",
      component: "NetworkCustomChart",
      props: {
        ...custom,
        nodes: teams,
        edges: handoffs,
        layout: recipeLayout(recipes, "adjacencyFlowLayout"),
        layoutConfig: {},
        perspective: "isometric"
      }
    }
  ]
  return [
    {
      id: "perspective-force-isometric-elevation",
      title: "ForceDirectedGraph — isometric, lifted by tier",
      component: "ForceDirectedGraph",
      // Browser and server force settles can rotate an equivalent layout.
      comparison: "structural",
      props: {
        nodes: services,
        edges: calls,
        colorBy: "group",
        nodeSize: 9,
        iterations: 200,
        showLabels: true,
        width: 460,
        height: 320,
        perspective: { type: "isometric", elevation: "tier", elevationScale: 18, ground: { grid: { step: 24 } } }
      }
    },
    {
      id: "perspective-sankey-isometric",
      title: "SankeyDiagram — isometric ground bands",
      component: "SankeyDiagram",
      props: { edges: flows, showLabels: true, width: 480, height: 300, perspective: "isometric" }
    },
    {
      id: "perspective-treemap-extrude",
      title: "Treemap — extruded leaves on a ground grid",
      component: "Treemap",
      props: {
        ...hierarchy,
        valueAccessor: "value",
        showLabels: true,
        width: 460,
        height: 320,
        perspective: { type: "isometric", marks: "extrude", extrude: "value", ground: { grid: { step: 20 } } }
      }
    },
    {
      id: "perspective-circlepack-pixel",
      title: "CirclePack — 2:1 pixel ground ellipses",
      component: "CirclePack",
      props: { ...hierarchy, valueAccessor: "value", width: 460, height: 320, perspective: "pixel" }
    },
    {
      id: "perspective-chord-dimetric",
      title: "ChordDiagram — dimetric ribbons and arcs",
      component: "ChordDiagram",
      props: { edges: flows, showLabels: true, width: 440, height: 320, perspective: "dimetric" }
    },
    {
      id: "perspective-tree-military",
      title: "TreeDiagram — military plan-oblique, upright anchored labels",
      component: "TreeDiagram",
      props: { ...hierarchy, width: 460, height: 320, perspective: "military" }
    },
    {
      id: "perspective-infrastructure",
      title: "NetworkCustomChart — isometric infrastructure",
      component: "NetworkCustomChart",
      props: {
        nodes: HOSTS,
        edges: LINKS,
        layout: infrastructureLayout,
        layoutConfig: {},
        perspective: infrastructurePerspective({ view: "isometric", cell: cellSize(infraWidth - 20, infraHeight - 20) }),
        width: infraWidth,
        height: infraHeight,
        margin: { top: 10, right: 10, bottom: 10, left: 10 },
        frameProps: { background: PALETTE.background },
        title: "Production footprint"
      }
    },
    ...(Object.keys(recipes).length ? recipeCases : [])
  ]
}
