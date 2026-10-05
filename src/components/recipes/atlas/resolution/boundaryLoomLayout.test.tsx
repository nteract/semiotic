import { describe, expect, it } from "vitest"
import { flagship } from "../../../../../scripts/network-resolution/fixtures"
import {
  DARK_THEME,
  LIGHT_THEME,
  HIGH_CONTRAST_THEME,
  resolveThemeSemanticColors
} from "../../../store/themeCore"
import { renderChartWithEvidence } from "../../../server/renderToStaticSVG"
import { resolutionChartProps } from "./chartProps"
import { defaultResolutionView } from "./project"
import type { ResolutionAppearance } from "./appearance"

const resolution = flagship()
function draw(
  ordinal: number,
  collapseGroups = false,
  appearance?: ResolutionAppearance,
  activeTheme = LIGHT_THEME
) {
  const props = resolutionChartProps(
    {
      resolution,
      appearance,
      view: {
        ...defaultResolutionView(resolution, "boundary-loom"),
        collapseGroups,
        pageIds: resolution.pages.slice(0, ordinal + 1).map((p) => p.id)
      }
    },
    "boundary-loom"
  )
  return {
    props,
    scene: props.layout({
      nodes: [],
      edges: [],
      dimensions: {
        width: 1000,
        height: 640,
        plot: { x: 0, y: 0, width: 1000, height: 640 }
      },
      config: props.layoutConfig,
      theme: {
        semantic: resolveThemeSemanticColors(activeTheme)!,
        categorical: activeTheme.colors.categorical
      },
      resolveColor: () => "unused"
    })
  }
}

describe("Boundary Loom edge ownership colors", () => {
  it.each([false, true])(
    "colors every edge mark by current ownership (collapsed=%s)",
    (collapsed) => {
      for (const [ordinal, page] of resolution.pages.entries()) {
        const { scene, props } = draw(ordinal, collapsed)
        const marks = [...scene.sceneEdges!, ...scene.sceneNodes!].filter(
          (mark) => ["edge", "endpoint"].includes(mark.datum!.resolutionRole)
        )
        for (const edge of props.layoutConfig.projection.edges) {
          const internal =
            page.nodeOwner[edge.source] === page.nodeOwner[edge.targetNode]
          const ink = internal
            ? LIGHT_THEME.colors.secondary
            : LIGHT_THEME.colors.primary
          const edgeMarks = marks.filter((mark) =>
            mark.datum!.edgeIds.includes(edge.label)
          )
          expect(edgeMarks.length).toBeGreaterThan(0)
          for (const mark of edgeMarks) {
            expect(mark.style.stroke).toBe(ink)
            if (mark.type === "circle") expect(mark.style.fill).toBe(ink)
            expect(mark.datum!.connectionType).toBe(
              internal ? "internal" : "boundary"
            )
            expect(mark.datum!.description).toContain(
              `page ${ordinal}: ${internal ? "intra-group" : "inter-group"}`
            )
          }
        }
        // A true source self-loop is intra-group even on the original page.
        expect(
          marks.find((m) => m.datum!.edgeIds[0] === "e18")!.datum!
            .connectionType
        ).toBe("internal")
      }
      const before = draw(0, collapsed).scene.sceneEdges!.find(
        (e) => e.datum!.edgeIds?.[0] === "e02"
      )!
      const after = draw(1, collapsed).scene.sceneEdges!.find(
        (e) => e.datum!.edgeIds?.[0] === "e02"
      )!
      expect(before.style.stroke).not.toBe(after.style.stroke)
      const afterHistory = draw(1, collapsed).scene.sceneNodes!.filter(
        (n) =>
          n.datum!.edgeIds?.[0] === "e02" &&
          n.datum!.resolutionRole.startsWith("history")
      )
      expect(afterHistory.map((n) => n.datum!.connectionType)).toEqual([
        "boundary",
        "internal"
      ])
    }
  )

  it.each([LIGHT_THEME, DARK_THEME, HIGH_CONTRAST_THEME])(
    "inherits distinct theme colors and preserves explicit colors in SVG and selection",
    (theme) => {
      const themed = draw(3, false, undefined, theme)
      const lines = themed.scene.sceneEdges!.filter(
        (e) => e.datum!.resolutionRole === "edge"
      )
      expect(new Set(lines.map((e) => e.style.stroke))).toEqual(
        new Set([theme.colors.primary, theme.colors.secondary])
      )
      const edgeColors = { internal: "#b07aa1", boundary: "#4e79a7" }
      const { props, scene } = draw(3, false, { edgeColors }, theme)
      for (const edge of scene.sceneEdges!.filter(
        (e) => e.datum!.resolutionRole === "edge"
      )) {
        const color =
          edgeColors[edge.datum!.connectionType as keyof typeof edgeColors]
        expect(edge.style.stroke).toBe(color)
        expect(
          scene.restyleEdge!(edge, { isActive: true, predicate: () => false })!
            .stroke
        ).toBe(color)
      }
      for (const kind of ["internal", "boundary"] as const) {
        expect(
          scene.sceneEdges!.find((e) => e.id === `legend:${kind}`)!.style.stroke
        ).toBe(edgeColors[kind])
      }
      const { svg, evidence } = renderChartWithEvidence("NetworkCustomChart", {
        ...props,
        theme
      })
      expect(evidence.empty).toBe(false)
      expect(svg).toContain(`stroke="${edgeColors.internal}"`)
      expect(svg).toContain(`stroke="${edgeColors.boundary}"`)
      expect(svg).toContain("Intra-group")
      expect(svg).toContain("Inter-group")
    }
  )
})
