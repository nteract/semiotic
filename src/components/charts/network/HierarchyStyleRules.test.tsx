import * as React from "react"
import { render } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { StreamNetworkFrameProps } from "../../stream/networkTypes"
import { TooltipProvider } from "../../store/TooltipStore"
import { CirclePack } from "./CirclePack"
import { OrbitDiagram } from "./OrbitDiagram"
import { TreeDiagram } from "./TreeDiagram"
import { Treemap } from "./Treemap"

const capturedFrames: StreamNetworkFrameProps[] = []

vi.mock("../../stream/StreamNetworkFrame", () => ({
  default: React.forwardRef((props: StreamNetworkFrameProps, _ref) => {
    capturedFrames.push(props)
    return <div data-testid="stream-network-frame" />
  })
}))

const hierarchy = {
  name: "Portfolio",
  value: 1,
  status: "normal",
  children: [
    { name: "Alpha", value: 20, status: "alert" },
    { name: "Beta", value: 5, status: "normal" }
  ]
}

describe("hierarchy styleRules", () => {
  beforeEach(() => {
    capturedFrames.length = 0
  })

  it("styles authored nodes in every hierarchy HOC", () => {
    const styleRules = [{
      when: { field: "status", eq: "alert" as const },
      style: { fill: "#ff00aa", stroke: "#330022" }
    }]

    render(
      <TooltipProvider>
        <TreeDiagram data={hierarchy} styleRules={styleRules} />
        <Treemap data={hierarchy} styleRules={styleRules} />
        <CirclePack data={hierarchy} styleRules={styleRules} />
        <OrbitDiagram data={hierarchy} animated={false} styleRules={styleRules} />
      </TooltipProvider>
    )

    for (const frame of capturedFrames) {
      const style = typeof frame.nodeStyle === "function"
        ? frame.nodeStyle({ depth: 1, data: hierarchy.children[0] })
        : frame.nodeStyle
      expect(style).toMatchObject({ fill: "#ff00aa", stroke: "#330022" })
    }
  })

  it("uses valueAccessor for fieldless thresholds and keeps authored overrides final", () => {
    render(
      <TooltipProvider>
        <TreeDiagram
          data={hierarchy}
          valueAccessor="value"
          styleRules={[{ when: { gt: 10 }, style: { fill: "#rule" } }]}
        />
        <Treemap
          data={hierarchy}
          valueAccessor="value"
          styleRules={[{ when: { gt: 10 }, style: { fill: "#rule" } }]}
          nodeStyle={() => ({ fill: "#node-style" })}
        />
      </TooltipProvider>
    )

    const treeStyle = asNodeStyle(capturedFrames[0])({
      depth: 1,
      data: hierarchy.children[0]
    })
    const treemapStyle = asNodeStyle(capturedFrames[1])({
      depth: 1,
      data: hierarchy.children[0]
    })
    expect(treeStyle).toMatchObject({ fill: "#rule" })
    expect(treemapStyle).toMatchObject({ fill: "#node-style" })
  })
})

function asNodeStyle(frame: StreamNetworkFrameProps) {
  if (typeof frame.nodeStyle !== "function") {
    return () => frame.nodeStyle ?? {}
  }
  return frame.nodeStyle
}
