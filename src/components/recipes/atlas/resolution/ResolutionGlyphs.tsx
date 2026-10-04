"use client"
import { useTheme } from "../../../ThemeProvider"
import { resolveThemeSemanticColors } from "../../../store/themeCore"
import { resolutionAppearance, type ResolutionAppearance } from "./appearance"
import { projectEdgeWitnessGlyph, projectNodeResolutionStrip } from "./glyphs"
import type { PreparedNetworkResolution } from "./types"

/** Compact static/browser owner strip; the text preserves the whole meaning without color. */
export function NodeResolutionStrip({
  resolution,
  nodeId,
  width = 240,
  appearance
}: {
  resolution: PreparedNetworkResolution
  nodeId: string
  width?: number
  appearance?: ResolutionAppearance
}) {
  const theme = useTheme()
  const visual = resolutionAppearance(
    {
      semantic: resolveThemeSemanticColors(theme)!,
      categorical: theme.colors.categorical,
      sequential: theme.colors.sequential
    },
    appearance,
    resolution.pages.length
  )
  const projection = projectNodeResolutionStrip(resolution, nodeId).value
  return (
    <figure
      style={{
        margin: 0,
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily
      }}
      aria-label={`Ownership of ${nodeId}`}
    >
      <svg
        width={width}
        height={30}
        role="img"
        aria-label={`${nodeId} owner history`}
      >
        <title>
          {projection.pages
            .map(
              (page) =>
                `Page ${page.ordinal}: ${page.label}; owner boundary edges ${page.ownerBoundaryEdges}`
            )
            .join(". ")}
        </title>
        {projection.pages.map((page, i) => (
          <g key={page.pageId}>
            <rect
              x={(i * width) / projection.pages.length + 1}
              y={1}
              width={width / projection.pages.length - 2}
              height={26}
              {...(visual.style(
                {
                  datum: { nodeId, pageId: page.pageId },
                  role: "component",
                  generation: page.ordinal,
                  highlighted: false,
                  selected: true
                },
                { fill: visual.colors.surface, stroke: visual.colors.primary }
              ) as React.SVGProps<SVGRectElement>)}
            />
            <text
              x={((i + 0.5) * width) / projection.pages.length}
              y={18}
              textAnchor="middle"
              fontSize={10}
              fill={visual.colors.text}
              {...appearance?.labelStyle}
            >
              p{page.ordinal}
              {i > 0 && projection.pages[i - 1].groupId !== page.groupId
                ? " ↦"
                : ""}
            </text>
          </g>
        ))}
      </svg>
      <figcaption>
        {nodeId}:{" "}
        {projection.pages
          .map(
            (page) =>
              `p${page.ordinal} ${page.label} (${page.ownerBoundaryEdges} owner boundary edges)`
          )
          .join(" → ")}
      </figcaption>
    </figure>
  )
}

/** The direct source relation and one bounded, replayable alternative. */
export function EdgeWitnessGlyph({
  resolution,
  edgeId,
  appearance
}: {
  resolution: PreparedNetworkResolution
  edgeId: string
  appearance?: ResolutionAppearance
}) {
  const theme = useTheme()
  const visual = resolutionAppearance(
    {
      semantic: resolveThemeSemanticColors(theme)!,
      categorical: theme.colors.categorical,
      sequential: theme.colors.sequential
    },
    appearance
  )
  const projection = projectEdgeWitnessGlyph(resolution, edgeId).value
  return (
    <figure
      style={{
        margin: 0,
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily
      }}
      aria-label={`Witness for ${edgeId}`}
    >
      <svg
        width={120}
        height={45}
        role="img"
        aria-label="Direct relation above; alternative structural path below"
      >
        <path
          d={`M5,10 H110 L104,6 M110,10 L104,14${projection.alternative.value.verdict === "yes" ? " M5,10 V34 H110 V10" : ""}`}
          fill="none"
          {...(visual.style(
            {
              datum: { edgeId },
              role: "edge",
              highlighted: false,
              selected: true
            },
            { stroke: visual.colors.primary, strokeWidth: 1.5 }
          ) as React.SVGProps<SVGPathElement>)}
        />
        <text
          x={60}
          y={30}
          textAnchor="middle"
          fontSize={12}
          fill={visual.colors.text}
          {...appearance?.labelStyle}
        >
          {projection.alternative.value.verdict === "yes"
            ? `${projection.alternative.value.witness!.edgeIds.length} edges`
            : projection.alternative.value.verdict === "no"
              ? "absent"
              : "?"}
        </text>
      </svg>
      <figcaption>
        Direct relation {edgeId}: {projection.direct.source} →{" "}
        {projection.direct.target}. Alternative structural path:{" "}
        {projection.alternative.value.verdict === "yes"
          ? projection.alternative.value.witness!.nodeIds.join(" → ")
          : projection.alternative.value.verdict === "no"
            ? "absent in the admitted graph"
            : `unknown (${projection.alternative.coverage.reason})`}
        .
      </figcaption>
    </figure>
  )
}
