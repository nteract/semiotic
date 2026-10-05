"use client"
import { useMemo, useState } from "react"
import { NetworkCustomChart } from "../../../charts/custom/NetworkCustomChart"
import { projectComponentCutaway } from "./ports"
import { componentCutawayLayout } from "./componentCutawayLayout"
import type { Basis, PreparedNetworkResolution } from "./types"
import type { ResolutionAppearance } from "./appearance"

export interface ComponentCutawayProps {
  resolution: PreparedNetworkResolution
  pageId: string
  groupId: string
  /** Initial reading; changing this prop resets the query and port page. */
  basis?: Basis
  width?: number
  height?: number
  title?: string
  accessibleTable?: boolean
  appearance?: ResolutionAppearance
}

/** Original connections and bounded endpoint support, embeddable without either reader. */
export function ComponentCutaway(props: ComponentCutawayProps) {
  return (
    <CutawayReading
      key={`${props.resolution.analysisRevision}:${props.pageId}:${props.groupId}:${props.basis ?? "structural"}`}
      {...props}
    />
  )
}

function CutawayReading({
  resolution,
  pageId,
  groupId,
  basis: initialBasis = "structural",
  width = 480,
  height,
  title = "Component Cutaway",
  accessibleTable = true,
  appearance
}: ComponentCutawayProps) {
  const [basis, setBasis] = useState<Basis>(initialBasis)
  const [offset, setOffset] = useState(0)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const cutaway = useMemo(
    () =>
      projectComponentCutaway(resolution, pageId, groupId, { basis, offset }),
    [resolution, pageId, groupId, basis, offset]
  )
  const selected = cutaway.value.cells[selectedIndex] ?? cutaway.value.cells[0]
  const context = cutaway.value.context
  const nodes = useMemo(
    () => context.nodes.map((node) => ({ id: node.id })),
    [context]
  )
  const group = resolution.groups.find((g) => g.id === groupId)!
  const portPages = cutaway.value.pageCount
  const matrixHeight =
    cutaway.value.cells.length > 1 ? 75 + cutaway.value.ingress.length * 36 : 80
  const drawingHeight =
    height ??
    Math.max(300, 120 + Math.ceil(context.nodes.length / 3) * 36 + matrixHeight)
  const changePage = (next: number) => {
    setOffset(next)
    setSelectedIndex(0)
  }
  return (
    <section aria-label={title}>
      <h3>
        {title}: {group.label}
      </h3>
      <label>
        Path evidence{" "}
        <select
          aria-label="Path evidence"
          value={basis}
          onChange={(event) => {
            setBasis(event.target.value as Basis)
            changePage(0)
          }}
        >
          <option value="structural">Structural paths</option>
          <option value="observed">Observed journeys</option>
        </select>
      </label>
      <p>
        {basis === "observed"
          ? "One contiguous occurrence including exterior predecessor and successor."
          : "Directed paths inside the induced original component."}{" "}
        Some supported pairs do not imply every boundary connection continues.
      </p>
      {nodes.length > 0 && (
        <NetworkCustomChart
          nodes={nodes}
          edges={[]}
          layout={componentCutawayLayout}
          layoutConfig={{ cutaway, appearance, selectedPair: selected?.query }}
          width={width}
          height={drawingHeight}
          margin={{ top: 8, bottom: 8, left: 8, right: 8 }}
          title={title}
          description="Entry-to-exit support, using actual boundary endpoints."
          summary={`${cutaway.value.supportedPairs} supported pairs / ${cutaway.value.queriedPairs} queried / ${cutaway.value.totalPairs} total`}
          accessibleTable={false}
          animate={false}
          tooltip={(datum) => <div>{String(datum.description)}</div>}
          onClick={(datum) => {
            const target = datum?.semanticTarget as
              { query?: { ingressId: string; egressId: string } } | undefined
            const index = cutaway.value.cells.findIndex(
              (c) =>
                c.query.ingressId === target?.query?.ingressId &&
                c.query.egressId === target.query.egressId
            )
            if (index >= 0) setSelectedIndex(index)
          }}
        />
      )}
      {!selected && <p>No entry-to-exit pairs on this port page.</p>}
      <p>
        The box encloses the original component. Arrows show actual edge
        direction. Selected entry and exit nodes have thick borders; thick paths
        show supporting evidence.
        {selected?.result.verdict === "yes" &&
          selected.result.witness.kind === "observed-segment" &&
          selected.result.witness.edgeIdentity === "ambiguous" &&
          " This journey identifies nodes, but cannot identify which parallel edge records it used."}
      </p>
      {(context.nodes.length < context.totalNodes ||
        context.edges.length < context.totalEdges) && (
        <p>
          Drawing limited to {context.nodes.length} of {context.totalNodes}{" "}
          nodes and {context.edges.length} of {context.totalEdges} connections.
          Support queries use the full component within the analysis limits; the
          drawing may omit part of a witness.
        </p>
      )}
      <p>
        {context.nodeCount} component nodes. {cutaway.value.supportedPairs}{" "}
        supported / {cutaway.value.queriedPairs} queried /{" "}
        {cutaway.value.totalPairs} total pairs. Internal cycle rank:{" "}
        {group.internalCycleRank}.
      </p>
      {portPages > 1 && (
        <p>
          <button
            type="button"
            disabled={offset === 0}
            onClick={() => changePage(Math.max(0, offset - 1))}
          >
            Previous ports
          </button>{" "}
          <button
            type="button"
            disabled={offset + 1 >= portPages}
            onClick={() => changePage(offset + 1)}
          >
            Next ports
          </button>
        </p>
      )}
      {accessibleTable && (
        <table>
          <caption>
            Entry-to-exit support. A yes applies to at least one matching
            connection on each boundary.
          </caption>
          <thead>
            <tr>
              <th>Entry</th>
              <th>Exit</th>
              <th>Support</th>
              <th>Evidence</th>
            </tr>
          </thead>
          <tbody>
            {cutaway.value.cells.map((cell, i) => (
              <tr key={i}>
                <td>
                  {
                    cutaway.value.ingress.find(
                      (p) => p.id === cell.query.ingressId
                    )!.internalNodeId
                  }
                </td>
                <td>
                  {
                    cutaway.value.egress.find(
                      (p) => p.id === cell.query.egressId
                    )!.internalNodeId
                  }
                </td>
                <td>{cell.result.verdict}</td>
                <td>
                  <button
                    type="button"
                    aria-pressed={cell === selected}
                    onClick={() => setSelectedIndex(i)}
                  >
                    Inspect {cell.result.verdict}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {selected && (
        <div role="status">
          <strong>
            {basis === "structural" ? "Structural" : "Observed"}:{" "}
            {selected.result.verdict}.
          </strong>{" "}
          {selected.result.verdict === "yes"
            ? `${selected.result.witness.nodeIds.join(" → ")}${selected.result.witness.kind === "observed-segment" ? `; occurrence ${selected.result.witness.occurrenceId}; offsets ${selected.result.witness.startOffset}–${selected.result.witness.endOffset}; edge identity ${selected.result.witness.edgeIdentity}` : `; edges ${selected.result.witness.edgeIds.join(", ")}`}`
            : selected.result.verdict === "no"
              ? basis === "structural"
                ? "No directed path connects this entry to this exit inside the component. All internal connections were searched."
                : "No admitted journey connects this entry to this exit with both boundary connections. All admitted journeys were searched."
              : `Unknown: ${selected.result.coverage.reason}`}
          {selected.result.verdict === "no" && (
            <details>
              <summary>Query scope</summary>
              <code style={{ overflowWrap: "anywhere" }}>
                {selected.result.exhaustedScopeRef}
              </code>
            </details>
          )}
        </div>
      )}
    </section>
  )
}
