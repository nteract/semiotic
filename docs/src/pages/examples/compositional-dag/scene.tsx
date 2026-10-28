import * as React from "react"
import { networkEdgeHitTarget, networkHitTarget, TooltipRoot } from "semiotic/network"
import type { NetworkCustomLayout } from "semiotic/network"
import { compositionalPath } from "semiotic/recipes/core"
import type { SolvedCompositionalLayout } from "semiotic/recipes/core"
import { colors, describeEndpoint, edges, fieldLabels, ownerLabels } from "./model"

interface Config {
  solved: SolvedCompositionalLayout
  showRows: boolean
  summary: boolean
  selectedEdge: string
  activeEdges: readonly string[]
}

/** Paint, pick and label the accepted geometry; this callback never solves. */
export const layout: NetworkCustomLayout<Config> = ({ config }) => {
  const { solved, showRows, summary, selectedEdge, activeEdges } = config
  const parts = solved.nodes
    .flatMap((node) => {
      if (node.semantic.endpoint.kind === "part")
        return [
          {
            key: node.id,
            owner: node.semantic.nodeId,
            partId: node.semantic.endpoint.partId,
            rect: node.rect,
          },
        ]
      return (node.parts ?? []).map((part) => ({
        key: `${node.id}:${part.partId}`,
        owner: node.semantic.nodeId,
        partId: part.partId,
        rect: { ...part.rect, x: node.rect.x + part.rect.x, y: node.rect.y + part.rect.y },
      }))
    })
    .filter(
      (part, i, all) =>
        all.findIndex((p) => p.owner === part.owner && p.partId === part.partId) === i,
    )
  const owners = solved.nodes.filter((n) => n.semantic.endpoint.kind === "node")
  const paths = solved.edges.map((route) => ({
    route,
    pathD: route.sections.map(compositionalPath).join(" "),
  }))
  return {
    sceneNodes: [
      ...owners.map((n) =>
        networkHitTarget({
          id: n.id,
          datum: { id: n.semantic.nodeId, label: ownerLabels[n.semantic.nodeId] },
          x: n.rect.x,
          y: n.rect.y,
          width: n.rect.width,
          height: n.rect.height,
        }),
      ),
      ...(!summary
        ? parts.map((p) =>
            ({ ...networkHitTarget({
              id: p.key,
              datum: {
                id: p.key,
                label: describeEndpoint(p.owner, p.partId),
                nodeId: p.owner,
                partId: p.partId,
              },
              x: p.rect.x,
              y: p.rect.y,
              width: p.rect.width,
              height: p.rect.height,
            }), navParentId: p.owner }),
          )
        : []),
    ],
    sceneEdges: paths.map(({ route, pathD }) =>
      networkEdgeHitTarget({
        id: route.edgeId,
        pathD,
        datum: edges.find((e) => e.id === route.edgeId)!,
      }),
    ),
    overlays: (
      <g className="compositional-scene" pointerEvents="none">
        {owners.map((n) => (
          <g key={n.id}>
            <rect
              className="compositional-owner"
              x={n.rect.x}
              y={n.rect.y}
              width={n.rect.width}
              height={n.rect.height}
              rx={9}
            />
            <text className="compositional-owner-label" x={n.rect.x + 14} y={n.rect.y + 26}>
              {ownerLabels[n.semantic.nodeId]}
            </text>
            {summary && (
              <text className="compositional-summary-label" x={n.rect.x + 14} y={n.rect.y + 105}>
                3 exposed interfaces
              </text>
            )}
          </g>
        ))}
        {showRows &&
          !summary &&
          parts.map((p) => (
            <g key={p.key} data-part={`${p.owner}:${p.partId}`}>
              <rect
                className="compositional-row"
                x={p.rect.x}
                y={p.rect.y}
                width={p.rect.width}
                height={p.rect.height}
                rx={4}
                stroke={colors[p.partId]}
              />
              <text
                className="compositional-row-label"
                x={p.rect.x + 12}
                y={p.rect.y + p.rect.height / 2 + 4}
              >
                {fieldLabels[p.partId]}
              </text>
            </g>
          ))}
        {paths.map(({ route, pathD }) => {
          const part = route.source.semantic.endpoint
          const color = part.kind === "part" ? colors[part.partId] : "currentColor"
          const active = activeEdges.includes(route.edgeId) || selectedEdge === route.edgeId
          return (
            <g key={route.edgeId} opacity={activeEdges.length && !active ? 0.25 : 1}>
              <path
                data-wire={route.edgeId}
                data-active={active}
                d={pathD}
                fill="none"
                stroke={color}
                strokeWidth={selectedEdge === route.edgeId ? 3.5 : 2}
                strokeDasharray={summary ? "5 4" : undefined}
              />
              {[route.source, route.target].map((terminal, i) => (
                <circle key={i} cx={terminal.anchor.x} cy={terminal.anchor.y} r={3} fill={color} />
              ))}
            </g>
          )
        })}
      </g>
    ),
  }
}

export function tooltip(datum: Record<string, unknown>) {
  const edge = edges.find((e) => e.id === datum.id)
  return (
    <TooltipRoot role="tooltip" style={{ maxWidth: 280 }}>
      <strong>{edge?.id ?? String(datum.label ?? datum.id)}</strong>
      {edge ? (
        <>
          <div>
            {describeEndpoint(
              edge.source,
              edge.sourceEndpoint?.kind === "part" ? edge.sourceEndpoint.partId : undefined,
              edge.sourceEndpoint?.portId,
            )}
          </div>
          <div>
            →{" "}
            {describeEndpoint(
              edge.target,
              edge.targetEndpoint?.kind === "part" ? edge.targetEndpoint.partId : undefined,
              edge.targetEndpoint?.portId,
            )}
          </div>
        </>
      ) : null}
      <div>Illustrative dependency · precision unknown</div>
    </TooltipRoot>
  )
}
