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
}

const controlsRow = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  margin: "12px 0 16px",
}

const buttonStyle = {
  padding: "6px 12px",
  borderRadius: 999,
  border: "1px solid var(--surface-3)",
  background: "var(--background)",
  color: "var(--text)",
  fontSize: 12,
  cursor: "pointer",
  fontWeight: 600,
}

const buttonActiveStyle = {
  ...buttonStyle,
  background: "var(--accent)",
  color: "white",
  borderColor: "var(--accent)",
}

const transcriptStyle = {
  background: "var(--surface-2)",
  borderRadius: 8,
  padding: 12,
  fontSize: 13,
  lineHeight: 1.5,
  minHeight: 80,
  marginTop: 12,
}

const userBubble = {
  display: "inline-block",
  background: "var(--accent)",
  color: "white",
  padding: "6px 12px",
  borderRadius: "12px 12px 2px 12px",
  marginBottom: 8,
  maxWidth: "85%",
}

const aiBubble = {
  display: "inline-block",
  background: "var(--surface-3)",
  color: "var(--text)",
  padding: "6px 12px",
  borderRadius: "12px 12px 12px 2px",
  marginBottom: 8,
  maxWidth: "85%",
  whiteSpace: "pre-wrap",
}

const aiSide = { display: "flex", justifyContent: "flex-start" }
const userSide = { display: "flex", justifyContent: "flex-end" }

// ─── The multimodal-response demo ─────────────────────────────────────────
// Synthetic dataset — 12 months of revenue + visits, with two visible
// anomalies (a late-spring spike, an autumn dip) and an obvious trend.
const SALES_DATA = [
  { month: 1,  revenue: 1100, visits: 8200,  label: "Jan" },
  { month: 2,  revenue: 1180, visits: 8700,  label: "Feb" },
  { month: 3,  revenue: 1320, visits: 9500,  label: "Mar" },
  { month: 4,  revenue: 1450, visits: 10100, label: "Apr" },
  { month: 5,  revenue: 2200, visits: 14000, label: "May" }, // promo spike
  { month: 6,  revenue: 1610, visits: 11200, label: "Jun" },
  { month: 7,  revenue: 1720, visits: 11800, label: "Jul" },
  { month: 8,  revenue: 1830, visits: 12400, label: "Aug" },
  { month: 9,  revenue: 1950, visits: 13100, label: "Sep" },
  { month: 10, revenue: 1380, visits: 9600,  label: "Oct" }, // outage dip
  { month: 11, revenue: 2080, visits: 13600, label: "Nov" },
  { month: 12, revenue: 2240, visits: 14400, label: "Dec" },
]

// Five pre-baked questions, each with the text answer AND the chart
// annotations the response renders. A real LLM-backed version would
// generate both; this demo is a stand-in to show the round trip.
const CANNED_RESPONSES = {
  "When did revenue peak?": {
    text: "Revenue peaked at $2,240 in December — the year's high point.",
    annotations: [
      { type: "callout", month: 12, revenue: 2240, label: "Peak: $2,240", dx: -40, dy: -30 },
    ],
  },
  "Were there any unusual months?": {
    text:
      "Two stand out: May ($2,200) was a promotion-driven spike well above the underlying trend, and October ($1,380) is the inverse — a sharp dip below where the trend was tracking. Both deserve a closer look.",
    annotations: [
      { type: "callout", month: 5, revenue: 2200, label: "May spike", dx: 30, dy: -30 },
      { type: "callout", month: 10, revenue: 1380, label: "Oct dip", dx: -30, dy: 30 },
    ],
  },
  "What's the overall trend?": {
    text:
      "Revenue is on a steady upward trend across the year, climbing from $1,100 in January to $2,240 in December — roughly doubling. Removing the May spike and October dip, the trend line is almost monotonic.",
    annotations: [
      { type: "y-threshold", value: 1670, label: "Year average", color: "var(--accent)" },
      { type: "trend", lineBy: "all", color: "var(--semiotic-info)", label: "Trend" },
    ],
  },
  "Which months were below average?": {
    text:
      "Six months sat below the $1,670 yearly average: January through April, June (just barely), and October. The first half of the year was the slower stretch.",
    annotations: [
      { type: "y-threshold", value: 1670, label: "Average ($1,670)", color: "var(--text-secondary)" },
      { type: "band", y0: 0, y1: 1670, color: "rgba(94,234,212,0.06)" },
    ],
  },
  "Compare May and December.": {
    text:
      "December ($2,240) edged out May ($2,200) by just $40 — but they're qualitatively different. May was a one-month promotion spike; December is the natural endpoint of a sustained climb. The same revenue, two different stories.",
    annotations: [
      { type: "callout", month: 5, revenue: 2200, label: "May $2,200 (promo)", dx: 30, dy: -30 },
      { type: "callout", month: 12, revenue: 2240, label: "Dec $2,240 (trend)", dx: -50, dy: -30 },
    ],
  },
}

function MultimodalDemo() {
  const [askedQuestions, setAskedQuestions] = useState([])

  const annotations = useMemo(() => {
    return askedQuestions.flatMap((q) => CANNED_RESPONSES[q]?.annotations ?? [])
  }, [askedQuestions])

  const ask = (q) => {
    setAskedQuestions((prev) => (prev.includes(q) ? prev : [...prev, q]))
  }

  const reset = () => setAskedQuestions([])

  return (
    <div style={chartFrame}>
      <LineChart
        data={SALES_DATA}
        xAccessor="month"
        yAccessor="revenue"
        title="Monthly Revenue"
        showPoints
        annotations={annotations}
        width={800}
        height={300}
        responsiveWidth
        margin={{ top: 30, right: 50, bottom: 40, left: 60 }}
      />
      <div style={controlsRow}>
        {Object.keys(CANNED_RESPONSES).map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => ask(q)}
            style={askedQuestions.includes(q) ? buttonActiveStyle : buttonStyle}
          >
            {q}
          </button>
        ))}
        {askedQuestions.length > 0 && (
          <button
            type="button"
            onClick={reset}
            style={{ ...buttonStyle, opacity: 0.7 }}
            title="Clear the transcript and the chart annotations"
          >
            Reset
          </button>
        )}
      </div>
      <div style={transcriptStyle}>
        {askedQuestions.length === 0 && (
          <div style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>
            Click any question above. The text answer appears here; the visual answer appears on the
            chart simultaneously. Stack multiple questions to see the annotations compose.
          </div>
        )}
        {askedQuestions.map((q, i) => (
          <div key={`${q}-${i}`}>
            <div style={userSide}>
              <div style={userBubble}>{q}</div>
            </div>
            <div style={aiSide}>
              <div style={aiBubble}>{CANNED_RESPONSES[q].text}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Body() {
  return (
    <>
      <p>
        Modern LLMs are interfaces, not just text generators. When an assistant answers a question
        about data, the answer can — and increasingly should — include <em>visual artifacts</em>:
        highlights on the chart the user is looking at, regions of interest, threshold lines,
        sub-selections, even a different chart entirely. We've been optimizing chat interfaces for
        text output for two years. Charts give us a parallel output channel that's underused.
      </p>

      <h2 id="text-is-half-the-answer">Text is half the answer</h2>
      <p>
        The dominant LLM response pattern is a wall of prose. Even when the question is{" "}
        <em>"where's the peak in this chart?"</em> the answer comes back as a paragraph: "The peak
        appears to be around month 12 at approximately $2,240, which represents a notable
        increase from..." — and the reader's eye has to leave the chart, parse the paragraph, find
        the relevant month, look back at the chart, and locate the point.
      </p>
      <p>
        Every step of that loop is friction. The peak <em>is in the chart</em>. The model has
        access to the chart's data. It can answer "where's the peak?" by drawing a circle around
        the peak, with the prose as supporting detail.
      </p>

      <h2 id="the-loop">Demo: ask, see the chart respond</h2>
      <p>
        This is a canned version of the round trip. Each question button below pretends to ask a
        small local LLM; the model's response is a <code>&#123; text, annotations &#125;</code>{" "}
        object. The text goes into the transcript; the annotations land on the chart. You can
        stack questions to see how multiple annotations compose.
      </p>
      <MultimodalDemo />
      <p>
        Click <em>Were there any unusual months?</em> first — that's the canonical version of
        the example. The text names May and October as outliers; the chart simultaneously gets
        callouts on those two points. Reading the text confirms what the chart already showed.
        Reading the chart confirms what the text says. The two channels reinforce instead of
        duplicating.
      </p>

      <h2 id="why-this-works">Why this works, and why it doesn't break the chat metaphor</h2>
      <p>
        The chat surface stays familiar — there's a question and an answer in a transcript. What's
        new is that the answer has <em>two faces</em>:
      </p>
      <ul>
        <li>
          <strong>Text</strong> in the transcript, for the parts that need words: nuance,
          comparison, context, the "why" behind a value.
        </li>
        <li>
          <strong>Annotations</strong> on the chart, for the parts that need pixels:{" "}
          <em>where</em> the peak is, <em>which</em> months are below average, <em>which two</em>{" "}
          observations the question is about.
        </li>
      </ul>
      <p>
        The split is not arbitrary. Some claims compress better as text ("revenue doubled");
        others compress better as space ("here's the threshold and here are the six months below
        it"). When the model gets to choose, the answer fits the question's natural shape.
      </p>

      <h2 id="the-contract">The contract</h2>
      <p>
        Concretely, this is what an LLM-backed answer looks like with a chart library that can
        render annotations:
      </p>
      <pre style={chartFrame}>
{`async function onQuery(question, context) {
  const response = await callYourLLM({
    question,
    chartSummary: context.summary,   // min/max/mean/median per field
    chartData:    context.data,      // raw rows
    intent:       inferIntent(question)?.intent,
  })
  return {
    answer: response.text,
    annotations: response.highlights,  // [{type: "callout", month: 5, revenue: 2200, label: "..."}, ...]
  }
}`}
      </pre>
      <p>
        The LLM is asked for two things and returns two things. The text is rendered in the chat
        transcript like any other LLM response; the annotations are passed through to the
        chart's <code>annotations</code> prop. No extra plumbing — both already exist as
        first-class chart concepts (callouts, thresholds, bands, trend lines, region highlights).
      </p>

      <h2 id="vocabulary">A small annotation vocabulary the model can use</h2>
      <p>
        The chart library defines the vocabulary; the LLM picks from it. A useful starting set:
      </p>
      <ul>
        <li>
          <code>callout</code> — point a label at a specific observation. Use for{" "}
          <em>"this is the peak"</em>, <em>"this is the outlier"</em>.
        </li>
        <li>
          <code>y-threshold</code> / <code>x-threshold</code> — a horizontal or vertical
          reference line. Use for <em>"the average is here"</em>, <em>"before this date</em>".
        </li>
        <li>
          <code>band</code> — a shaded region between two values. Use for <em>"below target"</em>,{" "}
          <em>"within tolerance"</em>.
        </li>
        <li>
          <code>trend</code> / <code>envelope</code> — a statistical overlay. Use for{" "}
          <em>"if we remove these outliers, the trend is..."</em>.
        </li>
        <li>
          <code>enclose</code> / <code>rect-enclose</code> — wrap a set of observations in a hull
          or rectangle. Use for <em>"these three points form a cluster"</em>.
        </li>
      </ul>
      <p>
        Each is JSON-serializable. The LLM doesn't draw pixels — it emits structured intent and
        the chart library handles the geometry. That's the right division of labor: language
        models are good at saying <em>which</em> observations matter and <em>why</em>; chart
        runtimes are good at converting that into pixels.
      </p>

      <h2 id="not-just-annotations">Beyond annotations — the broader pattern</h2>
      <p>
        Annotations are the entry point. Once you accept that LLM responses can have a visual
        face, the pattern extends:
      </p>
      <ul>
        <li>
          <strong>Selection responses.</strong> "Show me only the Q3 data" — the model returns a
          filter the chart applies. Same brushing surface used by humans.
        </li>
        <li>
          <strong>Chart-type swaps.</strong> "This isn't the right chart for that question" — the
          model returns a new <code>&#123; component, props &#125;</code> spec the runtime mounts
          in place of the current chart. The Semiotic capability layer can power this: the model
          consults <code>suggestCharts</code> and picks the best alternative.
        </li>
        <li>
          <strong>Linked follow-ups.</strong> "What about by region?" — the model returns a
          companion chart that gets rendered alongside the current one, with its hover state
          linked to the first.
        </li>
        <li>
          <strong>Audience-calibrated responses.</strong> The same question to the same data
          could return a BoxPlot for a data-science audience and a BarChart for an executive — the
          model reads the audience profile and adjusts. (See{" "}
          <Link to="/intelligence/suggestions">Chart Suggestions</Link> for how that calibration
          works.)
        </li>
      </ul>
      <p>
        All of these are extensions of the same idea: the chart library is an output channel.
        LLMs that ignore it are leaving the most expressive part of the surface dark.
      </p>

      <h2 id="risks">What to watch out for</h2>
      <p>
        Multimodal output isn't free of failure modes. Three to watch:
      </p>
      <ul>
        <li>
          <strong>Hallucinated annotations.</strong> A model that's wrong about the peak's
          location is now <em>visibly</em> wrong, with a callout pointing at the wrong dot. The
          fix is upstream: give the model the data summary and statistical context, not just the
          chart props, so its claims are grounded.
        </li>
        <li>
          <strong>Annotation clutter.</strong> A model that surfaces an annotation for every
          question accumulates noise. Either give the model a reset signal or accept that the
          chart needs a "clear annotations" affordance in the chat UI.
        </li>
        <li>
          <strong>Mode confusion.</strong> Users will eventually ask follow-up questions about
          the annotations themselves ("why did you highlight October?"). The chat history needs
          to include the annotations alongside the text so the next turn has full context.
        </li>
      </ul>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/intelligence/interrogation">Interrogation</Link> — the{" "}
          <code>useChartInterrogation</code> hook that ships this pattern as a first-class
          surface. The annotation-return contract is exactly what powers the demo above.
        </li>
        <li>
          <Link to="/features/annotations">Annotations</Link> — the chart-library side of the
          vocabulary: every annotation type the LLM can emit.
        </li>
        <li>
          <Link to="/intelligence/suggestions">Chart Suggestions</Link> — what powers the
          chart-type-swap response mode mentioned above.
        </li>
      </ul>
    </>
  )
}

export default {
  slug: "multimodal-response",
  title: "Multimodal response: chart as output channel",
  subtitle:
    "Text is half the answer. The other half — callouts, thresholds, bands, selections — lives on the chart, and LLMs already know how to ask for it.",
  author: "Elijah Meeks",
  date: "2026-05-24",
  tags: ["case-study"],
  excerpt:
    "Modern LLM assistants treat text as the only output channel. When the question is about a chart, charts give us a parallel surface — callouts, threshold lines, bands, selections — that's both more honest and easier to read. Drafted exploration of what multimodal response means in practice.",
  draft: true,
  component: Body,
}
