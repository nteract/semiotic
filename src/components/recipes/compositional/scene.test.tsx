import * as React from "react"
import { fireEvent, render } from "@testing-library/react"
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest"
import { fixture } from "./testFixtures"
import { routeCompositionalGraph } from "./solve"
import { emitCompositionalScene } from "./scene"
import { compositionalEndpointKey } from "./identity"
import type { EndpointRef } from "./types"
import StreamNetworkFrame from "../../stream/StreamNetworkFrame"
import { findNearestNetworkNode } from "../../stream/NetworkCanvasHitTester"
import { buildNetworkTableModel } from "../../stream/networkAccessibleDataTableModel"
import { setupCanvasMock } from "../../../test-utils/canvasMock"

describe.each(["composite", "exploded", "wires"] as const)(
  "%s scene interfaces",
  (mode) => {
    beforeEach(() => setupCanvasMock())
    afterEach(() => vi.restoreAllMocks())

    it("emits one row target per interface and navigates owners before their rows", () => {
      const r = fixture()
      r.view = { ...r.view, nodes: r.view.nodes.map((n) => ({ ...n, mode })) }
      r.options = { ...r.options, routing: "terminals" }
      const solved = routeCompositionalGraph(r)
      const scene = emitCompositionalScene({
        prepared: r.prepared,
        solved,
        showParts: true
      })
      const targets = scene.sceneNodes!
      const refs = targets.map((n) => n.datum?.semantic as EndpointRef)
      expect(targets).toHaveLength(8)
      expect(new Set(refs.map(compositionalEndpointKey)).size).toBe(8)
      expect(targets.filter((n) => !n.navParentId).map((n) => n.id)).toEqual([
        "A",
        "B"
      ])
      for (const row of targets.filter((n) => n.navParentId)) {
        const ref = row.datum?.semantic as EndpointRef
        expect(row.navParentId).toBe(ref.nodeId)
        if (row.type !== "rect") throw new Error("Expected a row rectangle")
        const hit = findNearestNetworkNode(
          targets,
          scene.sceneEdges ?? [],
          row.x + row.w / 2,
          row.y + row.h / 2
        )
        expect(hit?.datum?.semantic).toEqual(ref)
      }
      expect(
        buildNetworkTableModel(targets, scene.sceneEdges ?? []).nodeRows
      ).toHaveLength(8)
      const observed = vi.fn()
      const { container } = render(
        <StreamNetworkFrame
          size={[400, 180]}
          nodes={[...r.prepared.graph.nodes]}
          edges={[...r.prepared.graph.edges]}
          chartType="force"
          animate={false}
          customNetworkLayout={() => scene}
          onObservation={observed}
          tooltipContent={(hover) => {
            const ref = hover.data?.semantic as EndpointRef
            return ref.endpoint.kind === "part"
              ? `${ref.nodeId}/${ref.endpoint.partId}`
              : ref.nodeId
          }}
        />
      )
      const frame = container.querySelector<HTMLElement>(
        ".stream-network-frame"
      )!
      for (const [key, label] of [
        ["Home", "A"],
        ["ArrowRight", "B"],
        ["Home", "A"],
        ["Enter", "A/a"],
        ["ArrowDown", "A/b"],
        ["Escape", "A"]
      ]) {
        fireEvent.keyDown(frame, { key })
        expect(
          container.querySelector(".stream-network-tooltip")?.textContent
        ).toBe(label)
        expect(observed.mock.calls.at(-1)![0].datum.semantic.nodeId).toBe(
          label[0]
        )
      }
    })
  }
)

it("groups exploded targets under engine-owned display IDs even without part overlays", () => {
  const r = fixture()
  r.view = {
    ...r.view,
    nodes: r.view.nodes.map((n) => ({ ...n, mode: "exploded" }))
  }
  r.options = { ...r.options, routing: "terminals" }
  const initial = routeCompositionalGraph(r)
  const solved = {
    ...initial,
    nodes: initial.nodes.map((n) => ({ ...n, id: `display:${n.id}` })),
    edges: initial.edges.map((e) => ({
      ...e,
      source: {
        ...e.source,
        displayNodeId: `display:${e.source.displayNodeId}`
      },
      target: {
        ...e.target,
        displayNodeId: `display:${e.target.displayNodeId}`
      }
    }))
  }
  const nodes = emitCompositionalScene({
    prepared: r.prepared,
    solved,
    showParts: false
  }).sceneNodes!
  expect(nodes).toHaveLength(8)
  expect(nodes.filter((n) => !n.navParentId).map((n) => n.id)).toEqual([
    "display:A",
    "display:B"
  ])
  for (const row of nodes.filter((n) => n.navParentId)) {
    const ref = row.datum?.semantic as EndpointRef
    expect(row.navParentId).toBe(`display:${ref.nodeId}`)
    if (ref.endpoint.kind !== "part") throw new Error("Expected a part target")
    expect(row.label).toBe(ref.endpoint.partId)
    expect(row.datum?.id).toBe(ref.endpoint.partId)
  }
})
