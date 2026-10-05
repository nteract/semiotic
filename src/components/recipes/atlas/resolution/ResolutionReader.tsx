"use client"
import { useCallback, useEffect, useMemo, useState } from "react"
import type { Datum } from "../../../charts/shared/datumTypes"
import {
  resolutionHoverPredicate,
  type ResolutionLayoutSelection
} from "./appearance"
import { NetworkCustomChart } from "../../../charts/custom/NetworkCustomChart"
import { useSelection } from "../../../store/useSelection"
import {
  resolutionChartProps,
  readerProjection,
  type ResolutionChartProps
} from "./chartProps"
import { ComponentCutaway } from "./ComponentCutaway"
import { explainGroup, expandSourceSet } from "./queries"
import { getEdgeAlternative } from "./witnesses"
import { resolutionSelectionFields } from "./selection"
import type { CanonicalSelection, SemanticTarget } from "./types"

/** Shared frame and evidence inspector for the two experimental readers. */
export function ResolutionReader(
  props: ResolutionChartProps & { mode: "resolution-atlas" | "boundary-loom" }
) {
  const {
    resolution,
    mode,
    pageId,
    view,
    width,
    onObservation: observe
  } = props
  const [localPage, setLocalPage] = useState<number | null>(null)
  const activeOrdinal = Math.min(
    localPage ?? resolution.pages.length - 1,
    resolution.pages.length - 1
  )
  const activePageId =
    pageId ?? (view ? undefined : resolution.pages[activeOrdinal].id)
  const projection = useMemo(
    () =>
      readerProjection({ resolution, pageId: activePageId, view, width }, mode),
    [resolution, activePageId, view, width, mode]
  )
  const chartProps = useMemo(
    () => resolutionChartProps(props, mode, projection),
    [props, mode, projection]
  )
  const [picked, setPicked] = useState<{
    selection: CanonicalSelection
    target: SemanticTarget
  } | null>(null)
  const [memberCursor, setMemberCursor] = useState(0)
  const { selectPoints, clear, isActive, predicate } = useSelection({
    name: props.selection?.name ?? "network-resolution"
  })
  const [hover, setHover] = useState<{
    datum: Datum
    projection: typeof projection
  } | null>(null)
  const recordHover = useCallback(
    (datum: Datum | null) => {
      setHover((previous) => {
        if (
          props.hoverHighlight === false ||
          datum?.resolutionRole !== "component"
        )
          return previous ? null : previous
        if (
          previous?.datum.id === datum.id &&
          previous?.projection === projection
        )
          return previous
        return { datum, projection }
      })
    },
    [projection, props.hoverHighlight]
  )
  const onObservation = useCallback<
    NonNullable<ResolutionChartProps["onObservation"]>
  >(
    (event) => {
      if (event.type === "hover") recordHover(event.datum)
      else if (event.type === "hover-end") recordHover(null)
      observe?.(event)
    },
    [recordHover, observe]
  )
  const layoutSelection = useMemo<ResolutionLayoutSelection>(() => {
    const selected = props.selection ? { isActive, predicate } : null
    return {
      isActive: selected?.isActive ?? false,
      // A new predicate identity signals a restyle when the local hover changes.
      predicate: (datum) => selected?.predicate(datum) ?? true,
      resolutionHover:
        props.hoverHighlight !== false && hover?.projection === projection
          ? resolutionHoverPredicate(hover.datum)
          : undefined
    }
  }, [
    props.selection,
    isActive,
    predicate,
    props.hoverHighlight,
    hover,
    projection
  ])
  const frameProps = useMemo(
    () => ({
      ...props.frameProps,
      layoutSelection,
      ...(props.frameProps?.customHoverBehavior && {
        customHoverBehavior: ((datum, context) => {
          recordHover(datum ? (datum.data ?? datum) : null)
          props.frameProps!.customHoverBehavior!(datum, context)
        }) as NonNullable<
          ResolutionChartProps["frameProps"]
        >["customHoverBehavior"]
      })
    }),
    [props.frameProps, layoutSelection, recordHover]
  )
  useEffect(() => {
    if (!props.selected || !props.selection) return
    const fields = resolutionSelectionFields(resolution, props.selected)
    if (fields) selectPoints(fields)
    else clear()
  }, [props.selected, props.selection, resolution, selectPoints, clear])
  const select = (selection: CanonicalSelection, target: SemanticTarget) => {
    if (selection.analysisRevision !== resolution.analysisRevision) return
    setPicked({ selection, target })
    setMemberCursor(0)
    const fields = resolutionSelectionFields(resolution, selection)
    if (fields && props.selection) selectPoints(fields)
    props.onSelect?.(selection, target)
  }
  const stale =
    picked && picked.selection.analysisRevision !== resolution.analysisRevision
  const target = stale ? null : picked?.target
  const groupTarget = target?.kind === "group" ? target : null
  const explanation = useMemo(
    () =>
      groupTarget
        ? explainGroup(resolution, groupTarget.pageId, groupTarget.groupId)
            .value
        : null,
    [resolution, groupTarget]
  )
  const alternative = useMemo(
    () =>
      target?.kind === "original-edge"
        ? getEdgeAlternative(resolution, target.edgeId)
        : null,
    [resolution, target]
  )
  const members = explanation
    ? expandSourceSet(
        resolution,
        explanation.group.sourceNodes,
        memberCursor,
        50
      ).value
    : null
  const selectedPage = projection.pages.at(-1)!
  return (
    <section
      aria-label={chartProps.title}
      data-resolution-revision={resolution.analysisRevision}
    >
      {!view && !pageId && (
        <nav aria-label="Representation pages">
          <button
            type="button"
            disabled={activeOrdinal === 0}
            onClick={() => setLocalPage(activeOrdinal - 1)}
          >
            Previous representation
          </button>{" "}
          <span>
            Page {activeOrdinal}: {resolution.pages[activeOrdinal].label}
          </span>{" "}
          <button
            type="button"
            disabled={activeOrdinal === resolution.pages.length - 1}
            onClick={() => setLocalPage(activeOrdinal + 1)}
          >
            Next representation
          </button>
        </nav>
      )}
      <NetworkCustomChart
        {...chartProps}
        frameProps={frameProps}
        onObservation={onObservation}
        onClick={(datum) => {
          const selection = datum?.canonicalSelection as
            CanonicalSelection | undefined
          const target = datum?.semanticTarget as SemanticTarget | undefined
          if (selection && target) select(selection, target)
        }}
      />
      <p>{projection.caption}</p>
      <p>
        {projection.edgeCoverageByPage
          .map(
            (coverage, i) =>
              `Page ${projection.pages[i].ordinal}: ${coverage.literalEdgeIds.length} literal edges, ${coverage.componentEdgeIds.length} represented inside components, ${coverage.omittedEdgeIds.length} omitted from this projection.`
          )
          .join(" ")}
      </p>
      {props.frameProps?.viewTransform && (
        <p>
          Pan and zoom can clip projected marks; the table retains every
          projected edge record.
        </p>
      )}
      <p>
        {mode === "resolution-atlas"
          ? "Contiguous member rows form one component rectangle, including across sections. Gaps occupied by other components split that rectangle into connected parts. Gray lines between pages indicate membership; directed graph edges remain inside each page."
          : "Every column is one original edge. ● marks its source and a chevron its target; intermediate rail crossings are not endpoints. Filled history cells mean internal ownership."}
      </p>
      {stale && (
        <p role="status">
          The selection belongs to an earlier revision and is stale.
        </p>
      )}
      {explanation && members && (
        <aside aria-label="Group explanation">
          <h3>{explanation.group.label}</h3>
          <p>
            {explanation.group.kind}; {members.total} original members. Internal
            cycle rank: {explanation.group.internalCycleRank}.
          </p>
          {explanation.events.map((event) => (
            <p key={event.id}>
              {event.action}: {event.reason}
            </p>
          ))}
          <p>Members: {members.ids.join(", ")}</p>
          {memberCursor > 0 && (
            <button
              type="button"
              onClick={() => setMemberCursor(Math.max(0, memberCursor - 50))}
            >
              Previous members
            </button>
          )}
          {members.nextCursor !== null && (
            <button
              type="button"
              onClick={() => setMemberCursor(members.nextCursor!)}
            >
              Next members
            </button>
          )}
          <ComponentCutaway
            key={`${groupTarget!.pageId}:${groupTarget!.groupId}`}
            resolution={resolution}
            pageId={groupTarget!.pageId}
            groupId={groupTarget!.groupId}
            width={Math.min(props.width ?? 480, 600)}
            appearance={props.appearance}
          />
        </aside>
      )}
      {alternative && (
        <aside aria-label="Edge witness">
          <h3>Direct relation: {alternative.value.originalEdgeId}</h3>
          <p>
            {alternative.value.verdict === "yes"
              ? `Alternative structural path: ${alternative.value.witness!.nodeIds.join(" → ")}; source edges ${alternative.value.witness!.edgeIds.join(", ")}`
              : alternative.value.verdict === "no"
                ? "No alternative in the exhaustively searched admitted graph."
                : `Unknown: ${alternative.coverage.reason}`}
          </p>
          <p>{alternative.limitations.join(" ")}</p>
        </aside>
      )}
      {props.accessibleTable !== false && (
        <details>
          <summary>Source ownership and edge history table</summary>
          <table>
            <caption>
              Displayed original edge records and their derived ownership
              history
            </caption>
            <thead>
              <tr>
                <th>Edge</th>
                <th>Source</th>
                <th>Target</th>
                <th>First internal page</th>
                <th>Owner history</th>
                <th>Reading</th>
                <th>Inspect</th>
              </tr>
            </thead>
            <tbody>
              {projection.edges.map((edge) => (
                <tr key={edge.id}>
                  <td>{edge.label}</td>
                  <td>{edge.source}</td>
                  <td>{edge.targetNode}</td>
                  <td>{edge.history.firstInternalPage ?? "Still boundary"}</td>
                  <td>
                    {edge.history.owners
                      .map(
                        (owner, i) =>
                          `${i}: ${owner.sourceOwner === owner.targetOwner ? "internal" : "boundary"}`
                      )
                      .join("; ")}
                  </td>
                  <td>
                    {edge.subdued
                      ? "Indirect structural path also exists"
                      : "Literal relation"}
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => select(edge.selection, edge.target)}
                    >
                      Inspect {edge.label}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <table>
            <caption>
              Displayed ownership blocks on page {selectedPage.ordinal}
            </caption>
            <thead>
              <tr>
                <th>Block</th>
                <th>Original members</th>
                <th>Internal edges</th>
                <th>Boundary edges</th>
                <th>Inspect</th>
              </tr>
            </thead>
            <tbody>
              {projection.groups
                .filter((g) => g.pageId === selectedPage.id)
                .map((group) => (
                  <tr key={group.id}>
                    <td>{group.label}</td>
                    <td>{group.nodeIds.length}</td>
                    <td>{group.internalEdges}</td>
                    <td>{group.boundaryEdges}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() =>
                          select(group.selection, {
                            kind: "group",
                            pageId: group.pageId,
                            groupId: group.groupId
                          })
                        }
                      >
                        Inspect {group.label}
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </details>
      )}
    </section>
  )
}
