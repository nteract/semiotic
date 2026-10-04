import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import type { NetworkLayoutContext } from "../../../stream/networkCustomLayout"
import { NetworkPipelineStore } from "../../../stream/NetworkPipelineStore"
import { flagship } from "../../../../../scripts/network-resolution/fixtures"
import {
  ThemeProvider,
  DARK_THEME,
  LIGHT_THEME,
  HIGH_CONTRAST_THEME
} from "../../../ThemeProvider"
import { resolveThemeSemanticColors } from "../../../store/themeCore"
import { getSelectionProvenance } from "../../../store/selectionProvenance"
import { renderChartWithEvidence } from "../../../server/renderToStaticSVG"
import {
  restyleNetworkCustomScene,
  snapshotNetworkCustomStyles
} from "../../../stream/networkCustomRestyle"
import { resolutionChartProps } from "./chartProps"
import {
  resolutionAppearance,
  resolutionHoverPredicate,
  type ResolutionAppearance,
  type ResolutionLayoutSelection
} from "./appearance"
import { defaultResolutionView } from "./project"
import { ResolutionAtlasChart } from "./ResolutionAtlasChart"
import { BoundaryLoomChart } from "./BoundaryLoomChart"
import { ComponentCutaway } from "./ComponentCutaway"
import { componentCutawayLayout } from "./componentCutawayLayout"
import { projectComponentCutaway } from "./ports"
import { NodeResolutionStrip, EdgeWitnessGlyph } from "./ResolutionGlyphs"

const resolution = flagship()
const palette = ["#deebf7", "#9ecae1", "#4292c6", "#2171b5", "#084594"]
const view = defaultResolutionView(resolution, "resolution-atlas")
const theme = {
  semantic: resolveThemeSemanticColors(LIGHT_THEME)!,
  categorical: LIGHT_THEME.colors.categorical,
  sequential: "blues"
}
function scene(
  appearance: ResolutionAppearance = { generationColors: palette },
  pageIds = resolution.pages.map((p) => p.id)
) {
  const props = resolutionChartProps(
    { resolution, appearance, view: { ...view, pageIds } },
    "resolution-atlas"
  )
  return props.layout({
    nodes: [],
    edges: [],
    dimensions: {
      width: 1000,
      height: 640,
      plot: { x: 0, y: 0, width: 1000, height: 640 }
    },
    config: props.layoutConfig,
    theme,
    resolveColor: () => "unused"
  })
}

describe("Network Resolution appearance and lineage hover", () => {
  it("uses the frame restyle channel without rebuilding layout or node geometry", () => {
    const props = resolutionChartProps(
      { resolution, appearance: { generationColors: palette } },
      "resolution-atlas"
    )
    const layout = vi.fn((ctx: NetworkLayoutContext) =>
      props.layout({ ...ctx, config: props.layoutConfig })
    )
    const store = new NetworkPipelineStore({
      chartType: "force",
      customNetworkLayout: layout,
      layoutConfig: props.layoutConfig
    })
    store.ingestBounded(props.nodes, [], [1000, 640])
    store.buildScene([1000, 640])
    const nodes = store.sceneNodes
    const hovered = nodes.find((n) => n.datum!.resolutionRole === "component")!
    const selection: ResolutionLayoutSelection = {
      isActive: false,
      predicate: () => true,
      resolutionHover: resolutionHoverPredicate(hovered.datum)
    }
    store.updateConfig({ layoutSelection: selection })
    store.buildScene([1000, 640])
    expect(layout).toHaveBeenCalledTimes(1)
    expect(store.sceneNodes).toBe(nodes)
    expect(hovered.style.fill).toBe(palette[hovered.datum!.generation])
    store.updateConfig({ layoutSelection: null })
    store.buildScene([1000, 640])
    expect(layout).toHaveBeenCalledTimes(1)
    expect(hovered.style.fill).toBe(LIGHT_THEME.colors.surface)
  })
  it("matches original membership in both directions without propagating through later unions", () => {
    const layout = scene()
    const components = layout.sceneNodes!.filter(
      (n) => n.datum!.resolutionRole === "component"
    )
    for (const generation of [0, 1, 3]) {
      const hovered = components.find(
        (n) =>
          n.datum!.generation === generation && n.datum!.nodeIds.includes("a1")
      )!
      const hover = resolutionHoverPredicate(hovered.datum!)!
      const selection: ResolutionLayoutSelection = {
        isActive: false,
        predicate: () => true,
        resolutionHover: hover
      }
      const matches = components.filter((n) => hover(n.datum!))
      expect(new Set(matches.map((n) => n.datum!.generation)).size).toBe(5)
      for (const node of components) {
        const overlaps = node.datum!.nodeIds.some((id: string) =>
          hovered.datum!.nodeIds.includes(id)
        )
        expect(hover(node.datum!)).toBe(overlaps)
        expect(layout.restyle!(node, selection)!.fill).toBe(
          overlaps
            ? palette[node.datum!.generation]
            : LIGHT_THEME.colors.surface
        )
        expect(getSelectionProvenance(node.datum!)).toEqual(
          expect.arrayContaining(
            node.datum!.nodeIds.map((nodeId: string) => ({ nodeId }))
          )
        )
      }
      if (generation === 0) {
        expect(
          hover(
            components.find(
              (n) => n.datum!.generation === 0 && n.datum!.nodeIds.includes("f")
            )!.datum!
          )
        ).toBe(false)
      }
      expect(hover({ ...hovered.datum!, analysisRevision: "stale" })).toBe(
        false
      )
    }
    expect(
      resolutionHoverPredicate(
        layout.sceneNodes!.find(
          (n) => n.datum!.resolutionRole === "cycleInternal"
        )!.datum!
      )
    ).toBeUndefined()
    expect(
      resolutionHoverPredicate(
        layout.sceneEdges!.find((n) => n.datum!.resolutionRole === "edge")!
          .datum!
      )
    ).toBeUndefined()
  })

  it("restores fills and preserves subdued edge opacity and geometry after repeated hover/selection", () => {
    const layout = scene()
    const nodes = layout.sceneNodes!,
      edges = layout.sceneEdges!
    const originalNodes = structuredClone(
      nodes.map((n) => ({ id: n.id, style: n.style }))
    )
    const originalEdges = structuredClone(
      edges.map((e) => ({ id: e.id, style: e.style }))
    )
    const baseStyles = snapshotNetworkCustomStyles(nodes, edges)
    const node = nodes.find((n) => n.datum!.resolutionRole === "component")!
    for (let i = 0; i < 3; i++) {
      restyleNetworkCustomScene({
        nodes,
        edges,
        baseStyles,
        restyle: layout.restyle,
        restyleEdge: layout.restyleEdge,
        selection: {
          isActive: true,
          predicate: () => false,
          resolutionHover: resolutionHoverPredicate(node.datum!)
        } as ResolutionLayoutSelection
      })
      expect(
        edges.find(
          (e) =>
            originalEdges.find((o) => o.id === e.id)?.style.opacity === 0.45
        )!.style.opacity
      ).toBeCloseTo(0.45 * 0.15)
      restyleNetworkCustomScene({
        nodes,
        edges,
        baseStyles,
        restyle: layout.restyle,
        restyleEdge: layout.restyleEdge,
        selection: null
      })
    }
    expect(nodes.map((n) => ({ id: n.id, style: n.style }))).toEqual(
      originalNodes.map((n) => ({ ...n, style: { ...n.style, opacity: 1 } }))
    )
    expect(edges.map((e) => ({ id: e.id, style: e.style }))).toEqual(
      originalEdges
    )
  })

  it("uses absolute generations for palettes, follows the theme scheme, and applies style callbacks last", () => {
    const layout = scene(
      {
        generationColors: palette,
        styles: { component: (c) => ({ strokeWidth: c.highlighted ? 4 : 1 }) }
      },
      resolution.pages.slice(3).map((p) => p.id)
    )
    const node = layout.sceneNodes!.find(
      (n) => n.datum!.resolutionRole === "component"
    )!
    const selection: ResolutionLayoutSelection = {
      isActive: false,
      predicate: () => true,
      resolutionHover: resolutionHoverPredicate(node.datum!)
    }
    expect(layout.restyle!(node, selection)).toMatchObject({
      fill: palette[3],
      strokeWidth: 4
    })
    const named = resolutionAppearance(
      { ...theme, sequential: "purples" },
      {},
      5
    )
    expect(named.generationColor(3)).toBe(
      resolutionAppearance(
        theme,
        { generationColors: "purples" },
        5
      ).generationColor(3)
    )
    expect(named.generationColor(3)).not.toBe(
      resolutionAppearance(theme, {}, 5).generationColor(3)
    )
    expect(
      resolutionAppearance(
        theme,
        { generationColors: ["red"] },
        5
      ).generationColor(4)
    ).toBe("red")
    expect(
      resolutionAppearance(
        theme,
        { generationColors: (n) => palette[n] },
        5
      ).generationColor(3)
    ).toBe(palette[3])
  })

  it.each([
    ["light", LIGHT_THEME],
    ["dark", DARK_THEME],
    ["high-contrast", HIGH_CONTRAST_THEME]
  ] as const)(
    "themes every reader and glyph in React and SVG: %s",
    (name, activeTheme) => {
      const cutaway = {
        resolution,
        pageId: resolution.pages[3].id,
        groupId: resolution.pages[3].nodeOwner.a1
      }
      const charts = [
        {
          live: <ResolutionAtlasChart resolution={resolution} />,
          props: resolutionChartProps({ resolution }, "resolution-atlas")
        },
        {
          live: <BoundaryLoomChart resolution={resolution} />,
          props: resolutionChartProps({ resolution }, "boundary-loom")
        },
        {
          live: <ComponentCutaway {...cutaway} />,
          props: {
            nodes: [{ id: "seed" }],
            edges: [],
            layout: componentCutawayLayout,
            layoutConfig: {
              cutaway: projectComponentCutaway(
                resolution,
                cutaway.pageId,
                cutaway.groupId
              )
            },
            width: 480,
            height: 280
          }
        }
      ]
      for (const chart of charts) {
        const { svg, evidence } = renderChartWithEvidence(
          "NetworkCustomChart",
          { ...chart.props, theme: name }
        )
        expect(evidence.empty).toBe(false)
        for (const markup of [
          svg,
          renderToStaticMarkup(
            <ThemeProvider theme={name}>{chart.live}</ThemeProvider>
          )
        ]) {
          expect(markup).toContain(`fill="${activeTheme.colors.text}"`)
          expect(markup).toContain(`fill="${activeTheme.colors.surface}"`)
        }
      }
      for (const glyph of [
        <NodeResolutionStrip key="node" resolution={resolution} nodeId="a1" />,
        <EdgeWitnessGlyph key="edge" resolution={resolution} edgeId="e17" />
      ]) {
        const markup = renderToStaticMarkup(
          <ThemeProvider theme={name}>{glyph}</ThemeProvider>
        )
        expect(markup).toContain(`fill="${activeTheme.colors.text}"`)
        expect(markup).toContain(`stroke="${activeTheme.colors.primary}"`)
      }
    }
  )
})
