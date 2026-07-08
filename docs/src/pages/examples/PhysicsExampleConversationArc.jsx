import React, { useCallback, useMemo } from "react"
import { useConversationArc } from "semiotic/ai"
import "./PhysicsExampleConversationArc.css"

export function usePhysicsExampleConversationArc({ sessionId, arcId, component, chartId }) {
  const { history, enabled, sessionId: activeSessionId, record, clear } = useConversationArc({
    sessionId,
  })

  const arcEvents = useMemo(
    () => history.filter((event) => event.arcId === arcId),
    [arcId, history],
  )
  const latest = arcEvents[arcEvents.length - 1] ?? null
  const counts = useMemo(
    () =>
      arcEvents.reduce(
        (acc, event) => {
          acc[event.type] = (acc[event.type] ?? 0) + 1
          return acc
        },
        {},
      ),
    [arcEvents],
  )

  const recordRendered = useCallback(
    (meta = {}) =>
      record({
        type: "chart-rendered",
        component,
        chartId,
        arcId,
        meta,
      }),
    [arcId, chartId, component, record],
  )

  const recordEdit = useCallback(
    (changedProps, meta = {}) =>
      record({
        type: "chart-edited",
        component,
        chartId,
        arcId,
        changedProps: Array.isArray(changedProps) ? changedProps : [changedProps],
        meta,
      }),
    [arcId, chartId, component, record],
  )

  return {
    activeSessionId,
    enabled,
    events: arcEvents,
    latest,
    renderedCount: counts["chart-rendered"] ?? 0,
    editCount: counts["chart-edited"] ?? 0,
    recordRendered,
    recordEdit,
    clear,
  }
}

export function PhysicsArcStatus({ arc, label = "Conversation Arc" }) {
  const latestProps =
    arc.latest?.type === "chart-edited" && arc.latest.changedProps?.length
      ? arc.latest.changedProps.join(", ")
      : arc.latest?.type

  return (
    <div className="physics-arc-status" aria-live="polite">
      <div className="physics-arc-status__topline">
        <span>{label}</span>
        <button type="button" onClick={arc.clear}>
          Clear
        </button>
      </div>
      <div className="physics-arc-status__counts">
        <div>
          <strong>{arc.events.length}</strong>
          <span>events</span>
        </div>
        <div>
          <strong>{arc.editCount}</strong>
          <span>edits</span>
        </div>
        <div>
          <strong>{arc.renderedCount}</strong>
          <span>renders</span>
        </div>
      </div>
      <div className="physics-arc-status__latest">
        <span>{arc.enabled ? "enabled" : "disabled"}</span>
        <strong>{latestProps ?? "no events yet"}</strong>
      </div>
    </div>
  )
}
