import React, { useState } from "react"
import { LineChart, useChartInterrogation } from "semiotic/ai"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
const salesData = [
  ...[1200, 2100, 1800, 3200, 2800, 4500].map((revenue, i) => ({
    month: i + 1,
    monthLabel: MONTHS[i],
    revenue,
    category: "Software",
  })),
  ...[800, 1200, 1500, 1100, 1900, 2200].map((revenue, i) => ({
    month: i + 1,
    monthLabel: MONTHS[i],
    revenue,
    category: "Hardware",
  })),
]
const monthFormat = (m) => MONTHS[m - 1] ?? ""

// Stand-in for a real LLM call. In production this would POST to your AI endpoint
// with the user's question and `context.summary`. The shape of the return value is
// the contract: `{ answer, annotations }`.
async function simulatedQuery(query, context) {
  await new Promise((r) => setTimeout(r, 500))
  const q = query.toLowerCase()
  const rev = context.summary.fields.revenue
  if (q.includes("peak") || q.includes("highest")) {
    return {
      answer: `The peak revenue was $${rev?.max?.toLocaleString()} in June, driven by Software.`,
      annotations: [{ type: "callout", month: 6, revenue: 4500, label: "Peak" }],
    }
  }
  if (q.includes("software")) {
    return {
      answer: "Software more than tripled from Jan to Jun — a strong upward trend.",
      annotations: [{ type: "trend", lineBy: "Software", label: "Software trend" }],
    }
  }
  if (q.includes("hardware")) {
    return {
      answer: "Hardware grew steadily, peaking at $2,200 in June.",
      annotations: [{ type: "callout", month: 6, revenue: 2200, label: "Hardware peak" }],
    }
  }
  return {
    answer: `Across ${context.summary.rowCount} rows, mean revenue is $${rev?.mean?.toFixed(0)}. Try asking about the peak, software, or hardware.`,
    annotations: [],
  }
}

function ChatPanel({ history, loading, onAsk, placeholder }) {
  const [input, setInput] = useState("")
  const submit = (e) => {
    e.preventDefault()
    onAsk(input)
    setInput("")
  }
  return (
    <div style={{
      border: "1px solid var(--surface-3)",
      borderRadius: 12,
      padding: 16,
      background: "var(--surface-1)",
    }}>
      <div style={{
        maxHeight: 180,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        marginBottom: 12,
        fontSize: 14,
      }}>
        {history.length === 0 && (
          <div style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>
            Ask about trends, outliers, or specific data points.
          </div>
        )}
        {history.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === "user" ? "flex-end" : "flex-start",
            background: m.role === "user" ? "var(--accent)" : "var(--surface-2)",
            color: m.role === "user" ? "white" : "var(--text)",
            padding: "6px 12px",
            borderRadius: 14,
            maxWidth: "85%",
          }}>{m.text}</div>
        ))}
        {loading && <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>Analyzing…</div>}
      </div>
      <form onSubmit={submit} style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          disabled={loading}
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: 16,
            border: "1px solid var(--surface-3)",
            background: "var(--background)",
            color: "var(--text)",
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{
            padding: "0 16px",
            borderRadius: 16,
            background: "var(--accent)",
            color: "white",
            border: "none",
            cursor: loading ? "default" : "pointer",
            opacity: loading || !input.trim() ? 0.6 : 1,
          }}
        >Ask</button>
      </form>
    </div>
  )
}

function InterrogationDemo() {
  const { ask, history, annotations, loading } = useChartInterrogation({
    data: salesData,
    onQuery: simulatedQuery,
    componentName: "LineChart",
    props: { xAccessor: "month", yAccessor: "revenue", lineBy: "category" },
  })
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <LineChart
        data={salesData}
        xAccessor="month"
        yAccessor="revenue"
        lineBy="category"
        colorBy="category"
        showPoints
        title="Monthly Revenue by Category"
        xFormat={monthFormat}
        frameProps={{ axes: [{ orient: "bottom", tickValues: [1, 2, 3, 4, 5, 6] }, { orient: "left" }] }}
        annotations={annotations}
      />
      <ChatPanel
        history={history}
        loading={loading}
        onAsk={ask}
        placeholder="e.g. 'Where is the peak?' or 'Tell me about software'"
      />
    </div>
  )
}

export default function InterrogationPage() {
  return (
    <PageLayout
      title="Conversational Interrogation"
      breadcrumbs={[
        { label: "Intelligence", path: "/intelligence" },
        { label: "Interrogation", path: "/intelligence/interrogation" },
      ]}
      prevPage={{ title: "Chart Suggestions", path: "/intelligence/suggestions" }}
      nextPage={{ title: "Serialization", path: "/intelligence/serialization" }}
    >
      <p>
        Semiotic ships a headless hook, <code>useChartInterrogation</code>, that lets users
        ask natural-language questions about a chart. It pairs an LLM-friendly{" "}
        <strong>statistical summary</strong> of your data with a contract for{" "}
        <strong>visual highlighting</strong>: your AI returns annotations, the chart renders them.
      </p>

      <p>
        The hook owns no UI. You bring your own chat surface — input box, transcript, panel,
        whatever fits your product. The demo below is ~70 lines of plain React for context.
      </p>

      <h2>Interactive Demo</h2>
      <p>
        The demo uses a canned <code>onQuery</code> in place of a real LLM. Try{" "}
        <em>"where is the peak?"</em>, <em>"tell me about software"</em>, or{" "}
        <em>"hardware growth"</em>.
      </p>

      <div style={{ marginTop: 24, marginBottom: 24 }}>
        <InterrogationDemo />
      </div>

      <h2>How it works</h2>
      <ol>
        <li><strong>Summarize</strong>: <code>useChartInterrogation</code> runs <code>summarizeData</code> on your data — min, max, mean, median, top categorical values, date ranges.</li>
        <li><strong>Ask</strong>: Your <code>onQuery</code> receives the question plus the summary and any props you passed. Call your LLM, return <code>{`{ answer, annotations }`}</code>.</li>
        <li><strong>Render</strong>: The hook merges your initial annotations with the AI's response and exposes the combined array — wire it to the chart's <code>annotations</code> prop.</li>
      </ol>

      <h2>Implementation</h2>
      <CodeBlock language="jsx">
{`import { LineChart, useChartInterrogation } from "semiotic/ai"

function InterrogatableChart({ data }) {
  const { ask, history, annotations, loading } = useChartInterrogation({
    data,
    componentName: "LineChart",
    props: { xAccessor: "month", yAccessor: "revenue" },
    onQuery: async (query, context) => {
      const res = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ query, summary: context.summary }),
      }).then((r) => r.json())
      return { answer: res.text, annotations: res.highlights }
    },
  })

  return (
    <>
      <LineChart data={data} xAccessor="month" yAccessor="revenue" annotations={annotations} />
      <YourChatUI history={history} loading={loading} onAsk={ask} />
    </>
  )
}`}
      </CodeBlock>

      <h2>The statistical summary</h2>
      <p>
        <code>context.summary</code> is the payload to send to an LLM. It's compact, typed, and
        avoids shipping raw rows:
      </p>
      <CodeBlock language="json">
{`{
  "rowCount": 12,
  "fields": {
    "revenue": {
      "type": "numeric",
      "min": 800,
      "max": 4500,
      "mean": 2025,
      "median": 1850
    },
    "category": {
      "type": "categorical",
      "distinctCount": 2,
      "topValues": [
        { "value": "Software", "count": 6 },
        { "value": "Hardware", "count": 6 }
      ]
    }
  }
}`}
      </CodeBlock>

      <p>
        Use <code>summarizeData</code> directly if you want the summary without the hook —
        for server-side prompting, batch jobs, or the <code>interrogateChart</code> MCP tool.
      </p>
    </PageLayout>
  )
}
