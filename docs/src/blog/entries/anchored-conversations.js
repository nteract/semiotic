import React, { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { LineChart } from "semiotic"

// ─── Shared blog styling ──────────────────────────────────────────────────
const chartFrame = {
  background: "var(--surface-1)",
  borderRadius: 8,
  padding: 16,
  border: "1px solid var(--surface-3)",
  overflow: "hidden",
  margin: "20px 0",
  position: "relative",
}

const chatPanel = {
  background: "var(--surface-2)",
  borderRadius: 8,
  padding: 12,
  marginTop: 12,
  fontSize: 13,
  lineHeight: 1.5,
  minHeight: 100,
}

const userBubble = {
  display: "inline-block",
  background: "var(--accent)",
  color: "white",
  padding: "6px 12px",
  borderRadius: "12px 12px 2px 12px",
  marginBottom: 6,
  maxWidth: "85%",
}

const aiBubble = {
  display: "inline-block",
  background: "var(--surface-3)",
  color: "var(--text)",
  padding: "6px 12px",
  borderRadius: "12px 12px 12px 2px",
  marginBottom: 6,
  maxWidth: "85%",
  whiteSpace: "pre-wrap",
}

const inputRow = { display: "flex", gap: 6, marginTop: 10 }
const inputStyle = {
  flex: 1,
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid var(--surface-3)",
  background: "var(--background)",
  color: "var(--text)",
  fontSize: 13,
}

const buttonStyle = {
  padding: "6px 14px",
  borderRadius: 6,
  border: "none",
  background: "var(--accent)",
  color: "white",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
}

const focusBadge = {
  display: "inline-block",
  background: "rgba(94,234,212,0.15)",
  color: "var(--accent)",
  padding: "2px 8px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.04em",
  marginLeft: 8,
}

// ─── Demo data ────────────────────────────────────────────────────────────
const SALES_DATA = [
  { month: 1,  revenue: 1100, label: "Jan" },
  { month: 2,  revenue: 1180, label: "Feb" },
  { month: 3,  revenue: 1320, label: "Mar" },
  { month: 4,  revenue: 1450, label: "Apr" },
  { month: 5,  revenue: 2200, label: "May" },
  { month: 6,  revenue: 1610, label: "Jun" },
  { month: 7,  revenue: 1720, label: "Jul" },
  { month: 8,  revenue: 1830, label: "Aug" },
  { month: 9,  revenue: 1950, label: "Sep" },
  { month: 10, revenue: 1380, label: "Oct" },
  { month: 11, revenue: 2080, label: "Nov" },
  { month: 12, revenue: 2240, label: "Dec" },
]

// Canned LLM stand-in. A real implementation calls a model with:
//   { question, focus.datum, summary, profile }
// and the model returns the same shape.
function cannedAnchoredResponder(question, focus) {
  const q = question.toLowerCase()
  // No focus: encourage the user to point at something
  if (!focus) {
    return {
      text: "Hover or click a point on the chart first — I'll answer about that specific point.",
      annotation: null,
    }
  }
  const { month, revenue, label } = focus.datum
  // Specific known-shape questions get rich answers anchored to the point.
  if (q.includes("why") || q.includes("explain")) {
    if (month === 5) {
      return {
        text: `May's $2,200 was driven by a spring promotion — it's well above the smooth trend the rest of the year follows. Removing it, the trajectory is almost monotonic.`,
        annotation: {
          type: "callout",
          month,
          revenue,
          label: "Promo-driven spike",
          note: "Spring 2024 product launch + 15% sitewide discount. Not repeatable; treat as one-off in forecasts.",
          dx: 30,
          dy: -30,
        },
      }
    }
    if (month === 10) {
      return {
        text: `October's $1,380 is the year's dip — a four-day outage at the start of the month is the likely cause. The Nov/Dec recovery suggests no lasting impact.`,
        annotation: {
          type: "callout",
          month,
          revenue,
          label: "Outage week",
          note: "Oct 2–5 platform outage. Recovered by mid-month; Nov/Dec returned to trend.",
          dx: -30,
          dy: 30,
        },
      }
    }
    return {
      text: `${label} (${revenue}) sits ${revenue > 1670 ? "above" : "below"} the year's $1,670 average. Without a known incident here, this looks like ordinary variance.`,
      annotation: {
        type: "callout",
        month,
        revenue,
        label: `${label}: ${revenue > 1670 ? "above avg" : "below avg"}`,
        note: `${revenue > 1670 ? "+" : ""}${revenue - 1670} vs. $1,670 average.`,
      },
    }
  }
  if (q.includes("compare")) {
    return {
      text: `${label} ($${revenue}) compared to the year average of $1,670: a difference of ${revenue > 1670 ? "+" : ""}$${revenue - 1670}. Among ${SALES_DATA.length} months, ${SALES_DATA.filter((d) => d.revenue > revenue).length} were higher and ${SALES_DATA.filter((d) => d.revenue < revenue).length} were lower.`,
      annotation: {
        type: "callout",
        month,
        revenue,
        label: `${label}`,
        note: `Rank: ${SALES_DATA.slice().sort((a, b) => b.revenue - a.revenue).findIndex((d) => d.month === month) + 1} of ${SALES_DATA.length}.`,
      },
    }
  }
  // Default: small, factual answer about the focused point
  return {
    text: `${label}: revenue $${revenue}. ${revenue > 1670 ? "Above" : "Below"} the $1,670 yearly average.`,
    annotation: {
      type: "callout",
      month,
      revenue,
      label,
      note: `${revenue > 1670 ? "Above" : "Below"} average month.`,
    },
  }
}

// ─── Comment marker overlay ──────────────────────────────────────────────
// Renders interactive markers on top of the chart for AI-anchored comments.
// Reads annotation entries that carry a `note` field (the AI's narrative
// rationale) and renders a hoverable dot positioned at the same x/y as the
// callout. This is the reusable pattern the post documents — copy it into
// your own consumer code.
function CommentOverlay({ annotations, scales }) {
  const [openId, setOpenId] = useState(null)
  if (!annotations || !scales) return null
  const comments = annotations.filter((a) => a.note)
  return (
    <>
      {comments.map((c, i) => {
        const key = `${c.month}-${i}`
        const x = scales.x(c.month)
        const y = scales.y(c.revenue)
        return (
          <div
            key={key}
            style={{
              position: "absolute",
              left: x - 8,
              top: y - 8,
              width: 16,
              height: 16,
              borderRadius: 999,
              background: "rgba(94,234,212,0.4)",
              border: "2px solid var(--accent)",
              cursor: "pointer",
              zIndex: 2,
            }}
            onClick={() => setOpenId(openId === key ? null : key)}
            title="AI comment"
          />
        )
      })}
      {openId &&
        comments.map((c, i) => {
          const key = `${c.month}-${i}`
          if (key !== openId) return null
          const x = scales.x(c.month)
          const y = scales.y(c.revenue)
          return (
            <div
              key={`note-${key}`}
              style={{
                position: "absolute",
                left: x + 14,
                top: y - 20,
                width: 240,
                background: "var(--background)",
                border: "1px solid var(--accent)",
                borderRadius: 8,
                padding: 10,
                fontSize: 12,
                lineHeight: 1.4,
                boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
                zIndex: 3,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", marginBottom: 4 }}>
                AI note · {c.label || `month ${c.month}`}
              </div>
              <div style={{ color: "var(--text)" }}>{c.note}</div>
              <button
                onClick={() => setOpenId(null)}
                style={{
                  marginTop: 6,
                  border: "none",
                  background: "var(--surface-3)",
                  color: "var(--text)",
                  padding: "3px 8px",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 11,
                }}
              >
                Close
              </button>
            </div>
          )
        })}
    </>
  )
}

function AnchoredDemo() {
  const [focusIndex, setFocusIndex] = useState(null)
  const [transcript, setTranscript] = useState([])
  const [annotations, setAnnotations] = useState([])
  const [input, setInput] = useState("Why is this point so different?")

  const focus = focusIndex == null ? null : {
    datum: SALES_DATA[focusIndex],
    source: "click",
  }

  // The chart's internal linear scales mapped to the rendered pixel
  // dimensions. In production code this comes from the chart's ref
  // (`chart.current.getScales()`); here we hardcode them to keep the demo
  // self-contained.
  const PLOT = { left: 60, right: 30, top: 30, bottom: 40, width: 600, height: 280 }
  const scales = useMemo(() => {
    const innerW = PLOT.width - PLOT.left - PLOT.right
    const innerH = PLOT.height - PLOT.top - PLOT.bottom
    return {
      x: (m) => PLOT.left + ((m - 1) / 11) * innerW,
      y: (r) => PLOT.top + innerH - ((r - 800) / (2400 - 800)) * innerH,
    }
  }, [])

  const handleClick = (datum) => {
    const idx = SALES_DATA.findIndex((d) => d.month === datum.month)
    setFocusIndex(idx === focusIndex ? null : idx)
  }

  const send = () => {
    if (!input.trim()) return
    const userText = input
    const { text, annotation } = cannedAnchoredResponder(userText, focus)
    setTranscript((t) => [...t, { role: "user", text: userText }, { role: "assistant", text }])
    if (annotation) {
      setAnnotations((a) => {
        // Replace any existing annotation for the same datum so re-asking
        // about the same point updates the marker rather than stacking.
        const keep = a.filter(
          (x) => !(x.month === annotation.month && x.revenue === annotation.revenue),
        )
        return [...keep, annotation]
      })
    }
    setInput("")
  }

  const reset = () => {
    setFocusIndex(null)
    setTranscript([])
    setAnnotations([])
  }

  // Highlight ring on the currently focused point
  const focusRing = focusIndex == null
    ? null
    : (() => {
        const datum = SALES_DATA[focusIndex]
        const x = scales.x(datum.month)
        const y = scales.y(datum.revenue)
        return (
          <div
            style={{
              position: "absolute",
              left: x - 14,
              top: y - 14,
              width: 28,
              height: 28,
              borderRadius: 999,
              border: "2px dashed var(--accent)",
              pointerEvents: "none",
              zIndex: 1,
              animation: "pulse 1.6s ease-in-out infinite",
            }}
          />
        )
      })()

  return (
    <div style={chartFrame}>
      <div style={{ position: "relative", width: PLOT.width, maxWidth: "100%" }}>
        <LineChart
          data={SALES_DATA}
          xAccessor="month"
          yAccessor="revenue"
          title="Monthly Revenue"
          showPoints
          pointRadius={5}
          width={PLOT.width}
          height={PLOT.height}
          responsiveWidth={false}
          margin={{ top: PLOT.top, right: PLOT.right, bottom: PLOT.bottom, left: PLOT.left }}
          onClick={handleClick}
          annotations={annotations}
        />
        {focusRing}
        <CommentOverlay annotations={annotations} scales={scales} />
      </div>

      <div style={chatPanel}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <strong style={{ fontSize: 12, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Anchored conversation
          </strong>
          {focus ? (
            <span style={focusBadge}>
              focused: {focus.datum.label} (${focus.datum.revenue})
            </span>
          ) : (
            <span style={{ ...focusBadge, background: "var(--surface-3)", color: "var(--text-secondary)" }}>
              no focus — click a point
            </span>
          )}
        </div>
        {transcript.length === 0 && (
          <div style={{ color: "var(--text-secondary)", fontStyle: "italic", fontSize: 12 }}>
            Click a chart point to focus on it, then ask a question. The answer comes back
            both as text here AND as a clickable AI note anchored to that point.
          </div>
        )}
        {transcript.map((m, i) => (
          <div
            key={i}
            style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}
          >
            <div style={m.role === "user" ? userBubble : aiBubble}>{m.text}</div>
          </div>
        ))}
        <div style={inputRow}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder='Try: "Why is this so high?", "Compare this to the average"'
            style={inputStyle}
          />
          <button type="button" onClick={send} style={buttonStyle}>
            Ask
          </button>
          {(transcript.length > 0 || annotations.length > 0) && (
            <button
              type="button"
              onClick={reset}
              style={{ ...buttonStyle, background: "var(--surface-3)", color: "var(--text)" }}
            >
              Reset
            </button>
          )}
        </div>
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.2); }
        }
      `}</style>
    </div>
  )
}

function Body() {
  return (
    <>
      <p>
        The most common AI-on-a-chart pattern today is "ask the chart" — type a question, get a
        paragraph back. It works, but it's lossy in both directions: the user has to verbalize
        which point they care about, and the AI has to verbalize where the answer applies. Both
        steps lose the spatial information that's already on screen. There's a better shape:
        let the user <em>point</em> at a data point, and let the AI <em>annotate</em> the
        answer back onto it. A two-way anchored conversation.
      </p>

      <h2 id="the-loop">The loop in three frames</h2>
      <ol>
        <li>
          <strong>User hovers or clicks a data point.</strong> The chart fires an observation
          event; we capture which datum the user is looking at and pass it into the chat as the
          "focus."
        </li>
        <li>
          <strong>User asks a question.</strong> The LLM receives both the question AND the
          focused datum. The prompt is "answer this question about <em>this specific row</em>"
          — not "about the chart in general."
        </li>
        <li>
          <strong>AI responds in two channels.</strong> Text in the transcript, anchored note
          back on the chart at the same point. Future hover over that point shows the AI's
          rationale; future questions in the same conversation can reference earlier comments.
        </li>
      </ol>

      <h2 id="demo">Try it</h2>
      <p>
        Click any month's data point to focus on it. The dashed ring marks the focus; the chat
        shows what's currently selected. Ask a question — the AI's answer arrives as a text
        bubble AND a small turquoise dot on the chart. Click the dot to see the AI's anchored
        note. Stack questions to build up a multi-point conversation.
      </p>
      <AnchoredDemo />
      <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
        The interesting moves: click <em>May</em> and ask <em>"why is this so high?"</em> — the
        AI cites the spring promotion. Click <em>October</em> and ask <em>"why is this so low?"</em>
        — it cites the outage. Both rationales then live on the chart as clickable notes that
        survive the rest of the conversation. The chart accumulates institutional knowledge
        about itself.
      </p>

      <h2 id="why-this-matters">Why anchoring matters</h2>
      <p>
        Three things change once the conversation has a spatial anchor:
      </p>
      <ul>
        <li>
          <strong>Pronouns work.</strong> "Why is <em>this</em> one higher?" becomes a
          well-formed question instead of a guessing game. The LLM doesn't have to triangulate
          from prose what point you meant.
        </li>
        <li>
          <strong>Comparisons get cheap.</strong> Click two points in succession and ask "what
          changed between these?" — the AI compares them directly because both are explicit in
          the context.
        </li>
        <li>
          <strong>Answers persist where they're useful.</strong> The AI's rationale lives next
          to the point it explains. When someone else looks at this chart next week, they
          hover over October's dip and the explanation is right there — no re-asking, no
          re-discovering. Charts become accumulating notebooks of why-the-data-looks-this-way.
        </li>
      </ul>

      <h2 id="building-it">Building it</h2>
      <p>
        Semiotic ships the two primitives this needs: <code>useChartInterrogation</code> for the
        conversation, <code>useChartFocus</code> for the point-of-interest signal. Wiring them
        together is one component:
      </p>
      <pre style={chartFrame}>
{`import { LineChart, ObservationProvider } from "semiotic"
import { useChartFocus, useChartInterrogation } from "semiotic/ai"

function AnchoredChart({ data }) {
  // useChartFocus subscribes to the chart's observation store and returns
  // the latest hover/click as { datum, x, y, source }. Returns null when
  // the user has moved away or hasn't engaged yet.
  const focus = useChartFocus({ chartId: "sales" })

  const { ask, history, annotations } = useChartInterrogation({
    data,
    focus,                              // ← context.focus inside onQuery
    onQuery: async (question, ctx) => {
      // ctx.focus.datum is the row the user is asking about
      const response = await yourLLMCall({
        question,
        focus:   ctx.focus,
        summary: ctx.summary,
      })
      return {
        answer: response.text,
        // Return annotations with a \`note\` field — your overlay renders
        // them as clickable AI-anchored comments on the chart.
        annotations: response.highlights,
      }
    },
  })

  return (
    <ObservationProvider>
      <LineChart
        data={data}
        chartId="sales"
        xAccessor="month"
        yAccessor="revenue"
        annotations={annotations}
        onObservation={() => {}}        // any handler enables the store
      />
      <YourChatUI history={history} onAsk={ask} focus={focus} />
    </ObservationProvider>
  )
}`}
      </pre>
      <p>
        The <code>useChartFocus</code> hook is opinionated about what counts as focus —
        hover, click, and selection by default; <code>hover-end</code> and <code>click-end</code>{" "}
        clear it. For a sticky-focus UI where hover doesn't count, pass{" "}
        <code>{`{ types: ["click", "click-end"] }`}</code> and only clicks update the AI's
        reference point.
      </p>

      <h2 id="anchored-comments">The other direction: AI comments anchored back</h2>
      <p>
        The interrogation hook already returns annotations to the chart's standard{" "}
        <code>annotations</code> prop. The new piece is what those annotations can carry — not
        just a label, but a <em>note</em>. An annotation like:
      </p>
      <pre style={chartFrame}>
{`{
  type: "callout",
  month: 5,
  revenue: 2200,
  label: "Promo-driven spike",
  note: "Spring 2024 product launch + 15% sitewide discount. Not repeatable; treat as one-off in forecasts."
}`}
      </pre>
      <p>
        The chart renders the callout natively. A small overlay (~30 lines, copyable from this
        page) finds annotations with a <code>note</code> field and renders a clickable marker
        that reveals the note on demand. The rationale lives on the chart; the rationale
        doesn't crowd the chart unless someone asks for it.
      </p>
      <p>
        This is exactly the pattern{" "}
        <Link to="/features/advanced-annotations">Advanced Annotations</Link> demonstrates with
        the human-authored comment threads — the same UI shape, but populated by an LLM
        instead of typed by a teammate. The chart doesn't care where the comments came from.
      </p>

      <h2 id="where-to-use-it">Where to use this</h2>
      <ul>
        <li>
          <strong>Operations dashboards.</strong> An on-call engineer hovers over an anomaly
          spike, asks "what happened here?" — the AI consults a runbook + incident history +
          deploy log and leaves an anchored note. Next time someone sees the spike, the note
          is already there.
        </li>
        <li>
          <strong>Financial models.</strong> An analyst clicks a forecast point that looks
          surprising, asks "why does the model show this?" — the AI walks through which inputs
          drove this value most, leaves a note explaining the dominant terms.
        </li>
        <li>
          <strong>Scientific exploration.</strong> A researcher clicks an outlier observation,
          asks "is this an artifact?" — the AI references the run log, the calibration
          history, similar past observations, and leaves a note classifying it.
        </li>
        <li>
          <strong>Customer support / sales review.</strong> A rep hovers over a usage dip for a
          specific account, asks "what's going on with this customer?" — the AI consults the
          CRM history and leaves an anchored explanation that the next rep also sees.
        </li>
      </ul>
      <p>
        The pattern across all four: <em>the chart is the primary surface, the AI is a
        teammate annotating it.</em> Not a chat window that happens to talk about charts; a
        chart that accumulates explanations.
      </p>

      <h2 id="failure-modes">Failure modes worth thinking about</h2>
      <ul>
        <li>
          <strong>Stale notes.</strong> Yesterday's AI explanation may be wrong today. Treat
          annotated notes as ephemeral by default — easy to dismiss, optionally
          time-stamped. A note that hasn't been refreshed in 30 days probably shouldn't be
          surfaced with full confidence.
        </li>
        <li>
          <strong>Anchoring drift.</strong> If the dataset gets re-aggregated (weekly to
          monthly), the annotation's coordinates may no longer match anything meaningful. Tie
          notes to a stable identity (datum.id, a deterministic hash of the row), not pixel
          coordinates — the chart re-positions them on data shape changes.
        </li>
        <li>
          <strong>Authority confusion.</strong> Human comments and AI comments need visual
          differentiation. The convention this post uses — turquoise for AI, default for
          human — is one option; an <code>author</code> field on each annotation is the more
          rigorous one. The audience needs to know which voice they're reading.
        </li>
      </ul>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/intelligence/interrogation">Interrogation</Link> — the{" "}
          <code>useChartInterrogation</code> hook and its <code>focus</code> option.
        </li>
        <li>
          <Link to="/intelligence/observation-hooks">Observation Hooks</Link> —{" "}
          <code>useChartObserver</code> and <code>useChartFocus</code>, the source of the
          focus signal.
        </li>
        <li>
          <Link to="/features/advanced-annotations">Advanced Annotations</Link> — the
          original comment-thread-on-a-data-point pattern this post extends to AI.
        </li>
        <li>
          <Link to="/blog/multimodal-response">Multimodal response: chart as output channel</Link>{" "}
          — the broader frame this fits into. Anchored conversation is one specific multimodal
          pattern.
        </li>
      </ul>
    </>
  )
}

export default {
  slug: "anchored-conversations",
  title: "Anchored conversations: when the AI knows which point you're asking about",
  subtitle:
    "Two-way point-anchored AI conversation: the user clicks, the AI answers about that specific point, and the answer lives on the chart as a clickable note.",
  author: "Elijah Meeks",
  date: "2026-05-24",
  tags: ["case-study"],
  excerpt:
    "Chat-with-chart works, but the user has to verbalize which point they care about and the AI has to verbalize where the answer applies — both steps lose the spatial information that's already on screen. Draft post on bidirectional point-anchored AI conversation, with useChartFocus + useChartInterrogation as the building blocks.",
  draft: true,
  component: Body,
}
