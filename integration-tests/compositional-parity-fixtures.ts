import * as React from "react"
import {
  compositionalDagLayout,
  compositionalLayoutOptions,
  prepareCompositionalGraph,
  routeCompositionalGraph
} from "semiotic/recipes/core"
import type {
  CompositionalGraph,
  CompositionalLayoutRequest,
  CompositionalNodePresentation,
  CompositionalSceneConfig
} from "semiotic/recipes/core"

const parts = ["account", "quantity", "price"]
const endpoint = (partId: string, portId: string) => ({
  kind: "part" as const,
  partId,
  portId
})
const graph: CompositionalGraph = {
  schemaVersion: "semiotic.compositional-graph.v0.1",
  graphId: "render-parity",
  revision: "1",
  nodes: ["source", "target"].map((id) => ({
    id,
    label: id,
    parts: parts.map((id) => ({
      id,
      ports: [
        { id: "in", direction: "in" },
        { id: "out", direction: "out" }
      ]
    }))
  })),
  edges: [...parts, "account-audit"].map((id) => ({
    id,
    source: "source",
    target: "target",
    sourceEndpoint: endpoint(id === "account-audit" ? "account" : id, "out"),
    targetEndpoint: endpoint(id === "account-audit" ? "account" : id, "in")
  }))
}

// Both environments resolve public package imports. JSON round trips model the
// graph/accepted-layout handoff between a server and its hydrated client.
export function makeCompositionalParityCases() {
  return ["fixed", "optimized", "wires", "exploded", "summary", "smooth"].map(
    (variant) => {
      const optimized = variant === "optimized" || variant === "exploded"
      const mode: CompositionalNodePresentation["mode"] =
        variant === "exploded" || variant === "summary" || variant === "wires"
          ? variant
          : "composite"
      const prepared = prepareCompositionalGraph(
        JSON.parse(JSON.stringify(graph))
      )
      const request: CompositionalLayoutRequest = {
        requestId: variant,
        prepared,
        view: {
          revision: variant,
          direction: "LR",
          nodes: graph.nodes.map((node, index) => ({
            nodeId: node.id,
            mode,
            footprint: "stable",
            partLayout: {
              kind: "rows",
              headerHeight: 30,
              padding: { top: 8, right: 8, bottom: 8, left: 8 },
              rowGap: 6,
              defaultRowHeight: 26,
              rowHeights: [{ partId: "quantity", height: 40 }],
              order: optimized
                ? {
                    mode: "optimize",
                    initialIds: index ? [...parts].reverse() : parts
                  }
                : { mode: "fixed", ids: index ? [...parts].reverse() : parts }
            }
          })),
          constraints: graph.nodes.map((node, index) => ({
            nodeId: node.id,
            position: { x: 20 + index * 250, y: 20 },
            pin: "both"
          })),
          boundaryExposures:
            mode === "summary"
              ? graph.nodes.flatMap((node) =>
                  parts.flatMap((id, index) =>
                    (["source", "target"] as const).map((use) => ({
                      id: `${node.id}:${id}:${use}`,
                      containerNodeId: node.id,
                      inner: {
                        nodeId: node.id,
                        endpoint: endpoint(id, use === "source" ? "out" : "in")
                      },
                      use,
                      binding: {
                        kind: "node-side" as const,
                        side:
                          use === "source"
                            ? ("east" as const)
                            : ("west" as const),
                        fraction: (45 + index * 40) / 168
                      }
                    }))
                  )
                )
              : undefined
        },
        geometry: {
          revision: "measured-rows",
          basis: "authored",
          nodes: graph.nodes.map((node) => ({
            nodeId: node.id,
            width: 140,
            height: 168,
            parts: []
          }))
        },
        options: compositionalLayoutOptions({
          mode: optimized ? "optimize" : "route-only",
          routing: variant === "smooth" ? "smooth" : "orthogonal",
          weights: { reorder: 0 }
        })
      }
      const solved = routeCompositionalGraph(request)
      if (solved.status === "infeasible")
        throw new Error(JSON.stringify(solved.diagnostics))
      const config: CompositionalSceneConfig = JSON.parse(
        JSON.stringify({
          prepared,
          solved,
          // Exploded proxies already emit their own rectangles.
          showParts: mode === "composite",
          nodeFill: "#edf2f7",
          partFill: "#c9dce8",
          edgeStroke: "#176b83"
        })
      )
      return {
        id: `compositional-${variant}`,
        variant,
        component: "NetworkCustomChart",
        request,
        solved,
        expectedNodeCount: mode === "summary" || mode === "wires" ? 2 : 8,
        props: {
          nodes: [...graph.nodes],
          // Only the configured accessor identifies input edges. Falling back
          // to `id` or owner-pair aggregation must fail the parity assertions.
          edges: graph.edges.map(({ id, ...edge }) => ({
            ...edge,
            wireId: id
          })),
          layout: compositionalDagLayout,
          layoutConfig: config,
          width: 500,
          height: 300,
          margin: { top: 40, right: 16, bottom: 20, left: 24 },
          title: "Compositional interfaces",
          description:
            "Three fields and an independent account audit connection",
          summary: "Two owners, six parts and four distinct connections",
          accessibleTable: true,
          animate: false,
          frameProps: {
            edgeIdentity: "id" as const,
            edgeIdAccessor: "wireId",
            viewTransform: { x: 6, y: 8, k: 1.05 }
          },
          tooltip: (datum: Record<string, unknown>) =>
            React.createElement(
              "div",
              { role: "tooltip" },
              `Interface ${String(datum.id)}`
            )
        }
      }
    }
  )
}
