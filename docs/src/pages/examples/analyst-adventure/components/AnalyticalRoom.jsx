import React, { useCallback, useEffect, useMemo } from "react"
import { ChartContainer } from "semiotic"
import {
  AccessibleNavTree,
  buildReaderGrounding,
  suggestCharts,
  useChartInterrogation,
  useNavigationSync,
} from "semiotic/ai"
import {
  auditAccessibility,
  buildNavigationTree,
  describeChart,
  diagnoseConfig,
} from "semiotic/utils"
import {
  adventureDiagnosticProps,
  adventureSuggestionInput,
} from "../analyticalHeuristics"

const QUESTION_OPTIONS = [
  "What should I compare?",
  "What could be misleading?",
  "Describe the strongest anomaly.",
  "What denominator matters?",
  "What would falsify the current theory?",
]

const FALLBACK_HINTS = {
  "executive-suite": {
    compare:
      "Compare when each position was displayed with when its sensor actually observed it. Two clocks are present.",
    misleading:
      "A dramatic destination can still be stale. Inspect the cache-age field before trusting the roof.",
    anomaly:
      "One point combines a large floor change with the oldest observation time in the disappearance window.",
    denominator:
      "Time is the exposure here: ask how many minutes separate observation from display.",
    falsify:
      "A contemporaneous elevator observation on the roof would defeat the replay explanation.",
  },
  "records-catacombs": {
    compare:
      "Compare cancellations only after putting each department over its own headcount.",
    misleading:
      "The longest bar describes volume, not risk per employee.",
    anomaly:
      "The smallest department changes rank most sharply when COUNT becomes RATE.",
    denominator:
      "Headcount is the exposure. Keep it attached to every cancellation total.",
    falsify:
      "A larger Corporate Archaeology headcount would weaken the apparent rate anomaly.",
  },
  "map-room": {
    compare:
      "Read every segment as source → target. The display label names an endpoint, not necessarily an origin.",
    misleading:
      "A service can display the last named stop even while packets originated elsewhere.",
    anomaly:
      "Trace the highlighted credential route backward until no earlier incoming segment remains.",
    denominator:
      "Packet count sets line width; it does not determine which end sent the packets.",
    falsify:
      "A route beginning at the bunker rather than ending there would support the bunker theory.",
  },
  "server-cathedral": {
    compare:
      "Balance what enters and leaves each node. One destination receives more confidence than the legitimate forecasts create.",
    misleading:
      "Degree is not guilt. Follow units and provenance rather than the busiest-looking node.",
    anomaly:
      "Add the three forecast sources, then compare that sum with the projector's incoming total.",
    denominator:
      "The conserved quantity is confidence units: 100 legitimate units should remain 100.",
    falsify:
      "A documented ten-unit source upstream of DeckStore would close the lineage gap.",
  },
  "forecast-vault": {
    compare:
      "Compare the stable bin totals before interacting with an individual body.",
    misleading:
      "Motion is atmosphere; the settled projection is the analytical result.",
    anomaly:
      "One gold body does not reach any result bin because its lineage gate is unresolved.",
    denominator:
      "All thirty forecast scenarios belong in the settled total; Mort is a separate intervention token.",
    falsify:
      "Completing Mort's lineage would let the gold token pass the manual override sensor.",
  },
}

function hintKind(question) {
  const normalized = question.toLowerCase()
  if (normalized.includes("compare")) return "compare"
  if (normalized.includes("misleading")) return "misleading"
  if (normalized.includes("anomaly")) return "anomaly"
  if (normalized.includes("denominator")) return "denominator"
  return "falsify"
}

function semanticAnnotation(annotation) {
  if (!annotation || typeof annotation !== "object") return annotation
  const { content: _content, ...rest } = annotation
  return rest
}

function hasDatumNode(node) {
  if (node?.role === "datum") return true
  return (node?.children ?? []).some(hasDatumNode)
}

function defaultDatumLabel(datum, index) {
  const name =
    datum?.label ??
    datum?.name ??
    datum?.department ??
    datum?.source ??
    datum?.id ??
    `row ${index + 1}`
  const detail = [
    datum?.target ? `to ${datum.target}` : null,
    Number.isFinite(datum?.value) ? `value ${datum.value}` : null,
    Number.isFinite(datum?.packets) ? `${datum.packets} packets` : null,
  ]
    .filter(Boolean)
    .join(", ")
  return detail ? `${name}, ${detail}` : String(name)
}

function augmentNavigationTree(tree, rows, labelForDatum) {
  if (!tree || hasDatumNode(tree) || rows.length === 0) return tree
  const dataBranch = {
    id: "adventure-data",
    role: "series",
    level: 2,
    label: `Data records: ${rows.length} inspectable items.`,
    children: rows.slice(0, 120).map((datum, index) => ({
      id: `adventure-datum-${datum?.id ?? index}`,
      role: "datum",
      level: 3,
      label: labelForDatum(datum, index),
      datum,
    })),
  }
  return { ...tree, children: [dataBranch, ...(tree.children ?? [])] }
}

function safeAnalysis(componentName, diagnosticComponentName, props, rows, intent) {
  let description = props.description ?? props.summary ?? "Chart description unavailable."
  let grounding
  let suggestions
  let diagnostics
  let audit

  try {
    description = describeChart(componentName, props).text
  } catch {
    // The room's authored summary remains available when a heuristic cannot profile it.
  }
  try {
    grounding = buildReaderGrounding(componentName, props, { maxLeaves: 80 })
  } catch {
    grounding = null
  }
  try {
    suggestions = suggestCharts(rows, {
      intent,
      maxResults: 3,
      rawInput: adventureSuggestionInput(componentName, props),
    })
  } catch {
    suggestions = []
  }
  try {
    diagnostics = diagnoseConfig(
      diagnosticComponentName,
      adventureDiagnosticProps(diagnosticComponentName, props, rows),
    )
  } catch {
    diagnostics = { ok: true, diagnoses: [] }
  }
  try {
    audit = auditAccessibility(componentName, props, {
      inChartContainer: true,
      describe: true,
      navigable: true,
    })
  } catch {
    audit = { ok: true, findings: [] }
  }

  return { description, grounding, suggestions, diagnostics, audit }
}

/**
 * Shared analytical surface for every room. It deliberately owns reader and
 * interrogation support, while the room keeps frame-specific chart code.
 */
export default function AnalyticalRoom({
  room,
  componentName,
  diagnosticComponentName = componentName,
  chartProps,
  data,
  annotations = [],
  hintAnnotation,
  intent,
  summary,
  chartHeight = 340,
  labelForDatum = defaultDatumLabel,
  hintRequestToken = 0,
  hintsRemaining = true,
  onHintUsed,
  onInspect,
  onAnalyticsReady,
  onActivateAnnotation,
  renderChart,
}) {
  const semanticAnnotations = useMemo(
    () => annotations.map(semanticAnnotation),
    [annotations],
  )
  const readerProps = useMemo(
    () => ({
      ...chartProps,
      data: chartProps.data ?? data,
      annotations: semanticAnnotations,
      accessibleTable: true,
      title: chartProps.title ?? room.title,
      description: chartProps.description ?? room.subtitle,
      summary,
    }),
    [chartProps, data, room.subtitle, room.title, semanticAnnotations, summary],
  )
  const analysis = useMemo(
    () => safeAnalysis(componentName, diagnosticComponentName, readerProps, data, intent),
    [componentName, data, diagnosticComponentName, intent, readerProps],
  )
  const tree = useMemo(() => {
    let base
    try {
      base = buildNavigationTree(componentName, readerProps, { maxLeaves: 120 })
    } catch {
      base = {
        id: "root",
        role: "chart",
        level: 1,
        label: `${room.title}. ${summary}`,
        children: [],
      }
    }
    return augmentNavigationTree(base, data, labelForDatum)
  }, [componentName, data, labelForDatum, readerProps, room.title, summary])
  const navigation = useNavigationSync({
    tree,
    chartId: `analyst-adventure-${room.id}`,
    matchFields: ["id"],
    annotations: semanticAnnotations,
  })

  const resolver = useCallback(
    async (question) => {
      const kind = hintKind(question)
      const scripted = Array.isArray(room.hintScript)
        ? room.hintScript.find(
            (candidate) =>
              candidate.id === kind ||
              candidate.kind === kind ||
              candidate.question === question ||
              candidate.prompt === question,
          )
        : null
      const answer =
        scripted?.response ??
        scripted?.text ??
        scripted?.hint ??
        FALLBACK_HINTS[room.id]?.[kind] ??
        "Inspect the chart's accessible rows and compare the encoded fields before choosing."
      const proposed = hintAnnotation
        ? [
            {
              ...hintAnnotation,
              id: `hint-${room.id}-${kind}`,
              stableId: `hint-${room.id}-${kind}`,
              label: `ZORKBOT-2000 proposed clue: ${answer}`,
              provenance: {
                author: "ZORKBOT-2000",
                authorKind: "agent",
                source: "ai",
                confidence: 0.68,
                stableId: `hint-${room.id}-${kind}`,
              },
              lifecycle: { status: "proposed", anchor: "semantic" },
            },
          ]
        : []
      return { answer, annotations: proposed }
    },
    [hintAnnotation, room.hintScript, room.id],
  )

  const interrogation = useChartInterrogation({
    data,
    onQuery: resolver,
    // Keep widget content in the rendered annotation collection. Reader
    // grounding receives the serializable copy above, while the chart needs
    // the original React control so secret annotations remain real buttons.
    initialAnnotations: annotations,
    componentName,
    props: readerProps,
    includeProfile: true,
    includeSuggestions: true,
    suggestionsIntent: intent,
    suggestionsMax: 3,
    includeGrounding: { maxLeaves: 80 },
  })

  const askInterrogation = interrogation.ask
  const interrogationLoading = interrogation.loading
  const ask = useCallback(
    (question) => {
      if (!hintsRemaining || interrogationLoading) return
      onHintUsed?.(room.id, question)
      void askInterrogation(question)
    },
    [askInterrogation, hintsRemaining, interrogationLoading, onHintUsed, room.id],
  )

  useEffect(() => {
    if (hintRequestToken > 0) ask(QUESTION_OPTIONS[1])
  }, [ask, hintRequestToken])

  const analyticsGrounding = analysis.grounding?.text ?? analysis.description
  const publishedAnalyticsRef = React.useRef(null)
  useEffect(() => {
    const previous = publishedAnalyticsRef.current
    if (
      previous?.roomId === room.id &&
      previous?.title === room.title &&
      previous?.rows === data &&
      previous?.description === analysis.description &&
      previous?.grounding === analyticsGrounding
    ) {
      return
    }
    const payload = {
      roomId: room.id,
      title: room.title,
      rows: data,
      description: analysis.description,
      grounding: analyticsGrounding,
    }
    publishedAnalyticsRef.current = payload
    onAnalyticsReady?.(payload)
  }, [analysis.description, analyticsGrounding, data, onAnalyticsReady, room.id, room.title])

  const onTreeActive = useCallback(
    (node) => {
      navigation.onActiveChange(node)
    },
    [navigation],
  )

  const onChartObservation = useCallback(
    (event) => {
      if (!event || event.type === "hover-end" || event.type === "click-end") return
      const datum = event.datum?.data ?? event.datum ?? event.data
      const datumId = datum?.id ?? event.bodyId
      if (!datumId) return
      onInspect?.(String(datumId), event.inputType ?? "pointer")
    },
    [onInspect],
  )

  const onChartAnnotationActivate = useCallback(
    (event) => {
      if (!event?.annotationId) return
      onActivateAnnotation?.(event.annotationId, event)
    },
    [onActivateAnnotation],
  )

  const mergedAnnotations = interrogation.annotations

  return (
    <div className="analyst-adventure__analytics">
      <ChartContainer
        className="analyst-adventure__chart-container"
        title={room.title}
        subtitle={summary}
        height={chartHeight}
        status="static"
        chartConfig={{ component: componentName, props: readerProps }}
        describe
        actions={{ dataSummary: true, fullscreen: true }}
        mobile={{ breakpoint: 520, summary: "after" }}
      >
        {renderChart({
          annotations: mergedAnnotations,
          onInspect,
          onObservation: onChartObservation,
          onAnnotationActivate: onChartAnnotationActivate,
          selection: navigation.selection,
        })}
      </ChartContainer>

      <div className="analyst-adventure__reader-tools">
        <details>
          <summary>ACCESSIBILITY CONSOLE</summary>
          <p className="analyst-adventure__generated-description">{analysis.description}</p>
          <AccessibleNavTree
            tree={tree}
            visible
            chartId={`analyst-adventure-${room.id}`}
            activeId={navigation.activeId}
            onActiveChange={onTreeActive}
            onObservation={onChartObservation}
            onAnnotationActivate={onChartAnnotationActivate}
            label={`${room.title} structured chart navigation`}
          />
          {annotations.some(
            (annotation) => annotation.type === "widget" && annotation.interactive !== false,
          ) ? (
            <div className="analyst-adventure__annotation-index" aria-label="Chart annotation controls">
              <span>ANNOTATIONS</span>
              {annotations
                .filter(
                  (annotation) =>
                    annotation.type === "widget" && annotation.interactive !== false,
                )
                .map((annotation) => (
                  <button
                    key={annotation.id ?? annotation.stableId}
                    type="button"
                    onClick={() => onActivateAnnotation?.(annotation.id ?? annotation.stableId)}
                  >
                    {annotation.navigationLabel ?? annotation.label ?? "Chart annotation"}
                  </button>
                ))}
            </div>
          ) : null}
        </details>

        <details className="analyst-adventure__zorkbot">
          <summary>ZORKBOT-2000 · LOCAL HINT TERMINAL</summary>
          <p>Deterministic local resolver. No network or API key.</p>
          <div className="analyst-adventure__hint-grid">
            {QUESTION_OPTIONS.map((question) => (
              <button
                key={question}
                type="button"
                disabled={!hintsRemaining || interrogation.loading}
                onClick={() => ask(question)}
              >
                {question}
              </button>
            ))}
          </div>
          <div className="analyst-adventure__chat-log" aria-live="polite">
            {interrogation.history.length === 0 ? (
              <p>ZORKBOT: ASK A QUESTION. I WILL REDUCE THE SEARCH SPACE, NOT SOLVE IT.</p>
            ) : (
              interrogation.history.map((message, index) => (
                <p key={`${message.role}-${index}`} data-role={message.role}>
                  <strong>{message.role === "user" ? "ANALYST" : "ZORKBOT"}:</strong>{" "}
                  {message.text}
                </p>
              ))
            )}
          </div>
        </details>

        <details className="analyst-adventure__developer-inspector">
          <summary>WHY THIS CHART? · DEVELOPER INSPECTOR</summary>
          <dl>
            <div>
              <dt>Declared frame</dt>
              <dd>{room.frameFamily}</dd>
            </div>
            {diagnosticComponentName !== componentName ? (
              <div>
                <dt>Heuristic recipe</dt>
                <dd>{diagnosticComponentName}</dd>
              </div>
            ) : null}
            <div>
              <dt>Reader grounding</dt>
              <dd>{analysis.grounding?.intent?.sentence ?? "Communicative act inferred from the chart family."}</dd>
            </div>
            <div>
              <dt>Diagnostics</dt>
              <dd>
                {analysis.diagnostics.ok
                  ? "No fatal configuration diagnosis."
                  : `${analysis.diagnostics.diagnoses.length} finding(s); inspect the source fixture.`}
              </dd>
            </div>
            <div>
              <dt>Accessibility audit</dt>
              <dd>
                {analysis.audit.ok
                  ? "Static audit passes."
                  : `${analysis.audit.findings?.filter((finding) => finding.status === "fail").length ?? 0} failed check(s).`}
              </dd>
            </div>
          </dl>
          <ol>
            {analysis.suggestions.map((suggestion, index) => (
              <li key={`${suggestion.component}-${suggestion.variant?.id ?? "default"}-${index}`}>
                {suggestion.displayName ?? suggestion.component} · {Math.round(suggestion.score * 100) / 100}
              </li>
            ))}
          </ol>
        </details>
      </div>
    </div>
  )
}
