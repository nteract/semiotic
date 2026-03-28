import React, { useState, useRef, useEffect } from "react"
import { LikertChart } from "semiotic"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"
import PropTable from "../../components/PropTable"
import StreamingToggle from "../../components/StreamingToggle"
import StreamingDemo from "../../components/StreamingDemo"

// ── Carbon diverging palettes ───────────────────────────────────────────

const CARBON_5_DIVERGING = ["#da1e28", "#ff8389", "#a8a8a8", "#4589ff", "#0043ce"]
const CARBON_4_DIVERGING = ["#da1e28", "#ff8389", "#4589ff", "#0043ce"]
const CARBON_7_DIVERGING = ["#750e13", "#da1e28", "#ff8389", "#a8a8a8", "#4589ff", "#0043ce", "#001d6c"]

// ── Sample data: 5-point Likert (raw responses) ────────────────────────

const FIVE_POINT_LEVELS = [
  "Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"
]

const rawResponseData = [
  // Product quality
  ...Array.from({ length: 8 }, () => ({ question: "Product quality", score: 5 })),
  ...Array.from({ length: 15 }, () => ({ question: "Product quality", score: 4 })),
  ...Array.from({ length: 10 }, () => ({ question: "Product quality", score: 3 })),
  ...Array.from({ length: 5 }, () => ({ question: "Product quality", score: 2 })),
  ...Array.from({ length: 2 }, () => ({ question: "Product quality", score: 1 })),
  // Customer support
  ...Array.from({ length: 3 }, () => ({ question: "Customer support", score: 5 })),
  ...Array.from({ length: 8 }, () => ({ question: "Customer support", score: 4 })),
  ...Array.from({ length: 12 }, () => ({ question: "Customer support", score: 3 })),
  ...Array.from({ length: 10 }, () => ({ question: "Customer support", score: 2 })),
  ...Array.from({ length: 7 }, () => ({ question: "Customer support", score: 1 })),
  // Ease of use
  ...Array.from({ length: 12 }, () => ({ question: "Ease of use", score: 5 })),
  ...Array.from({ length: 18 }, () => ({ question: "Ease of use", score: 4 })),
  ...Array.from({ length: 5 }, () => ({ question: "Ease of use", score: 3 })),
  ...Array.from({ length: 3 }, () => ({ question: "Ease of use", score: 2 })),
  ...Array.from({ length: 2 }, () => ({ question: "Ease of use", score: 1 })),
  // Value for money
  ...Array.from({ length: 5 }, () => ({ question: "Value for money", score: 5 })),
  ...Array.from({ length: 10 }, () => ({ question: "Value for money", score: 4 })),
  ...Array.from({ length: 8 }, () => ({ question: "Value for money", score: 3 })),
  ...Array.from({ length: 12 }, () => ({ question: "Value for money", score: 2 })),
  ...Array.from({ length: 5 }, () => ({ question: "Value for money", score: 1 })),
  // Would recommend
  ...Array.from({ length: 14 }, () => ({ question: "Would recommend", score: 5 })),
  ...Array.from({ length: 16 }, () => ({ question: "Would recommend", score: 4 })),
  ...Array.from({ length: 6 }, () => ({ question: "Would recommend", score: 3 })),
  ...Array.from({ length: 3 }, () => ({ question: "Would recommend", score: 2 })),
  ...Array.from({ length: 1 }, () => ({ question: "Would recommend", score: 1 })),
]

// ── Sample data: 4-point Likert (pre-aggregated, no neutral) ───────────

const FOUR_POINT_LEVELS = ["Strongly Disagree", "Disagree", "Agree", "Strongly Agree"]

const preAggData = [
  { question: "The UI is intuitive", level: "Strongly Disagree", count: 5 },
  { question: "The UI is intuitive", level: "Disagree", count: 12 },
  { question: "The UI is intuitive", level: "Agree", count: 28 },
  { question: "The UI is intuitive", level: "Strongly Agree", count: 15 },

  { question: "Docs are helpful", level: "Strongly Disagree", count: 8 },
  { question: "Docs are helpful", level: "Disagree", count: 18 },
  { question: "Docs are helpful", level: "Agree", count: 22 },
  { question: "Docs are helpful", level: "Strongly Agree", count: 12 },

  { question: "Performance is good", level: "Strongly Disagree", count: 2 },
  { question: "Performance is good", level: "Disagree", count: 6 },
  { question: "Performance is good", level: "Agree", count: 30 },
  { question: "Performance is good", level: "Strongly Agree", count: 22 },

  { question: "Pricing is fair", level: "Strongly Disagree", count: 14 },
  { question: "Pricing is fair", level: "Disagree", count: 20 },
  { question: "Pricing is fair", level: "Agree", count: 16 },
  { question: "Pricing is fair", level: "Strongly Agree", count: 10 },
]

// ── Sample data: 7-point Likert ────────────────────────────────────────

const SEVEN_POINT_LEVELS = [
  "Very Strongly Disagree", "Strongly Disagree", "Disagree",
  "Neutral",
  "Agree", "Strongly Agree", "Very Strongly Agree",
]

const sevenPointData = [
  { question: "Overall satisfaction", level: "Very Strongly Disagree", count: 2 },
  { question: "Overall satisfaction", level: "Strongly Disagree", count: 5 },
  { question: "Overall satisfaction", level: "Disagree", count: 8 },
  { question: "Overall satisfaction", level: "Neutral", count: 15 },
  { question: "Overall satisfaction", level: "Agree", count: 25 },
  { question: "Overall satisfaction", level: "Strongly Agree", count: 30 },
  { question: "Overall satisfaction", level: "Very Strongly Agree", count: 15 },

  { question: "Likelihood to return", level: "Very Strongly Disagree", count: 4 },
  { question: "Likelihood to return", level: "Strongly Disagree", count: 7 },
  { question: "Likelihood to return", level: "Disagree", count: 12 },
  { question: "Likelihood to return", level: "Neutral", count: 18 },
  { question: "Likelihood to return", level: "Agree", count: 20 },
  { question: "Likelihood to return", level: "Strongly Agree", count: 25 },
  { question: "Likelihood to return", level: "Very Strongly Agree", count: 14 },

  { question: "Value perception", level: "Very Strongly Disagree", count: 6 },
  { question: "Value perception", level: "Strongly Disagree", count: 10 },
  { question: "Value perception", level: "Disagree", count: 15 },
  { question: "Value perception", level: "Neutral", count: 20 },
  { question: "Value perception", level: "Agree", count: 22 },
  { question: "Value perception", level: "Strongly Agree", count: 18 },
  { question: "Value perception", level: "Very Strongly Agree", count: 9 },
]

// ── Streaming demo ─────────────────────────────────────────────────────

const questions = ["Product quality", "Customer support", "Ease of use", "Value for money", "Would recommend"]

const streamingLikertCode = `import { useRef, useEffect } from "react"
import { LikertChart } from "semiotic"

function StreamingLikertDemo() {
  const ref = useRef()

  useEffect(() => {
    const id = setInterval(() => {
      if (!ref.current) return
      ref.current.pushMany([
        { question: questions[Math.floor(Math.random() * 5)], score: Math.floor(Math.random() * 5) + 1 },
        { question: questions[Math.floor(Math.random() * 5)], score: Math.floor(Math.random() * 5) + 1 },
        { question: questions[Math.floor(Math.random() * 5)], score: Math.floor(Math.random() * 5) + 1 },
      ])
    }, 800)
    return () => clearInterval(id)
  }, [])

  return (
    <LikertChart
      ref={ref}
      categoryAccessor="question"
      valueAccessor="score"
      levels={levels}
      colorScheme={divergingColors}
      showLegend
      legendPosition="bottom"
      tooltip
    />
  )
}`

function StreamingLikertDemo({ width }) {
  const ref = useRef()
  const [count, setCount] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      if (!ref.current) return
      const batch = []
      for (let i = 0; i < 3; i++) {
        batch.push({
          question: questions[Math.floor(Math.random() * questions.length)],
          score: Math.floor(Math.random() * 5) + 1,
        })
      }
      ref.current.pushMany(batch)
      setCount((c) => c + 3)
    }, 800)
    return () => clearInterval(id)
  }, [])

  return (
    <div>
      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>
        Responses received: {count}
      </div>
      <LikertChart
        ref={ref}
        categoryAccessor="question"
        valueAccessor="score"
        levels={FIVE_POINT_LEVELS}
        orientation="horizontal"
        colorScheme={CARBON_5_DIVERGING}
        title="Live Survey Responses"
        width={width}
        height={300}
        showLegend
        legendPosition="bottom"
        tooltip
      />
    </div>
  )
}

// ── Props ───────────────────────────────────────────────────────────────

const likertProps = [
  { name: "data", type: "object[]", required: true, default: null, description: "Array of raw response or pre-aggregated data objects." },
  { name: "categoryAccessor", type: "string | function", required: false, default: '"question"', description: "Question/item field. The ordinal axis." },
  { name: "valueAccessor", type: "string | function", required: false, default: '"score"', description: "Integer score field (raw response mode). Scores are 1-based: 1 → levels[0], 2 → levels[1], etc." },
  { name: "levelAccessor", type: "string | function", required: false, default: null, description: "Level name field (pre-aggregated mode). Each value must match an entry in levels." },
  { name: "countAccessor", type: "string | function", required: false, default: '"count"', description: "Count/frequency field (pre-aggregated mode)." },
  { name: "levels", type: "string[]", required: true, default: null, description: "Ordered response labels, most negative to most positive. Odd count → center is neutral. Even → clean negative/positive split." },
  { name: "orientation", type: '"horizontal" | "vertical"', required: false, default: '"horizontal"', description: "Horizontal: diverging bar chart centered at 0%. Vertical: stacked 100% bar chart." },
  { name: "colorScheme", type: "string[]", required: false, default: "auto diverging", description: "One color per level. Should match levels.length. Defaults to a Carbon-inspired red → gray → blue diverging palette." },
  { name: "barPadding", type: "number", required: false, default: "20", description: "Padding between category bars in pixels." },
]

// ── Page ────────────────────────────────────────────────────────────────

export default function LikertChartPage() {
  const [variant, setVariant] = useState("diverging5")

  return (
    <PageLayout
      title="Likert Chart"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "Likert Chart", path: "/charts/likert-chart" },
      ]}
      prevPage={{ title: "Stacked Bar Chart", path: "/charts/stacked-bar-chart" }}
      nextPage={{ title: "Grouped Bar Chart", path: "/charts/grouped-bar-chart" }}
    >
      <p>
        Visualize Likert scale survey data as diverging bar charts (horizontal)
        or stacked 100% bar charts (vertical). Supports raw integer scores,
        pre-aggregated counts, and any scale size (3-point to 7-point and beyond).
      </p>

      {/* ================================================================= */}
      {/* Quick Start: Horizontal Diverging */}
      {/* ================================================================= */}
      <h2 id="quick-start">Quick Start — Diverging (Horizontal)</h2>

      <p>
        The default horizontal orientation creates a diverging bar chart.
        "Strongly Disagree" and "Disagree" extend left, "Agree" and
        "Strongly Agree" extend right, and "Neutral" is centered on the
        axis — split equally across both sides. Data is raw integer scores
        (1–5) that the chart aggregates automatically.
      </p>

      <StreamingToggle
        staticContent={
          <>
            <LikertChart
              data={rawResponseData}
              categoryAccessor="question"
              valueAccessor="score"
              levels={FIVE_POINT_LEVELS}
              orientation="horizontal"
              colorScheme={CARBON_5_DIVERGING}
              title="Customer Satisfaction Survey"
              responsiveWidth
              height={300}
              showLegend
              legendPosition="bottom"
              tooltip
            />
            <CodeBlock
              code={`import { LikertChart } from "semiotic"

const levels = [
  "Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"
]

// Raw responses — each row is one respondent's score (1–5)
const data = [
  { question: "Product quality", score: 5 },
  { question: "Product quality", score: 4 },
  { question: "Customer support", score: 2 },
  // ...
]

// Diverging palette: red → neutral → blue
const divergingColors = ["#da1e28", "#ff8389", "#a8a8a8", "#4589ff", "#0043ce"]

<LikertChart
  data={data}
  categoryAccessor="question"
  valueAccessor="score"      // Integer score → mapped to levels by index
  levels={levels}
  orientation="horizontal"   // Diverging bar chart (default)
  colorScheme={divergingColors}
  title="Customer Satisfaction Survey"
  showLegend
  legendPosition="bottom"
  tooltip
/>`}
              language="jsx"
            />
          </>
        }
        streamingContent={
          <StreamingDemo
            renderChart={(w) => <StreamingLikertDemo width={w} />}
            code={streamingLikertCode}
          />
        }
      />

      {/* ================================================================= */}
      {/* Vertical Stacked */}
      {/* ================================================================= */}
      <h2 id="vertical">Stacked 100% (Vertical)</h2>

      <p>
        Set <code>orientation="vertical"</code> for a normalized stacked
        bar chart where each bar totals 100%. Useful when comparing the
        proportion of each level across questions without directional
        emphasis.
      </p>

      <LikertChart
        data={rawResponseData}
        categoryAccessor="question"
        valueAccessor="score"
        levels={FIVE_POINT_LEVELS}
        orientation="vertical"
        colorScheme={CARBON_5_DIVERGING}
        title="Customer Satisfaction (Stacked)"
        responsiveWidth
        height={350}
        showLegend
        legendPosition="bottom"
        tooltip
      />

      <CodeBlock
        code={`<LikertChart
  data={data}
  categoryAccessor="question"
  valueAccessor="score"
  levels={levels}
  orientation="vertical"     // Stacked 100% bar chart
  colorScheme={divergingColors}
  title="Customer Satisfaction (Stacked)"
  showLegend
  legendPosition="bottom"
/>`}
        language="jsx"
      />

      {/* ================================================================= */}
      {/* Scale Variants */}
      {/* ================================================================= */}
      <h2 id="variants">Scale Variants</h2>

      <div style={{
        background: "var(--surface-1, #f8f8f8)",
        border: "1px solid var(--surface-3, #e0e0e0)",
        borderRadius: 8,
        padding: "12px 16px",
        marginBottom: 16,
        fontSize: 13,
      }}>
        <strong>Convention:</strong> The <code>levels</code> array defines the
        semantic order from most negative to most positive. The diverging layout
        assigns polarity by position — the first half is "negative" (extends
        left), the second half is "positive" (extends right), and the center
        entry (if odd) is "neutral" (centered on the axis). If your data
        doesn't follow this low-to-high ordering convention, the chart will
        misrepresent which responses are positive vs. negative.
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { key: "diverging5", label: "5-Point" },
          { key: "even4", label: "4-Point (No Neutral)" },
          { key: "seven", label: "7-Point" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setVariant(key)}
            style={{
              padding: "6px 14px",
              border: `2px solid ${variant === key ? "var(--accent, #6366f1)" : "var(--surface-3, #ccc)"}`,
              borderRadius: 6,
              background: variant === key ? "var(--accent, #6366f1)" : "transparent",
              color: variant === key ? "#fff" : "var(--text-primary, #333)",
              cursor: "pointer",
              fontWeight: variant === key ? 600 : 400,
              fontSize: 13,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {variant === "diverging5" && (
        <LikertChart
          data={rawResponseData}
          categoryAccessor="question"
          valueAccessor="score"
          levels={FIVE_POINT_LEVELS}
          orientation="horizontal"
          colorScheme={CARBON_5_DIVERGING}
          title="5-Point Scale (Odd — Neutral Centered)"
          responsiveWidth
          height={300}
          showLegend
          legendPosition="bottom"
          tooltip
        />
      )}

      {variant === "even4" && (
        <div>
          <p>
            With an even number of levels, there is no neutral center — the
            axis splits cleanly between the negative and positive halves.
            This example uses pre-aggregated data with{" "}
            <code>levelAccessor</code> and <code>countAccessor</code>.
          </p>

          <LikertChart
            data={preAggData}
            categoryAccessor="question"
            levelAccessor="level"
            countAccessor="count"
            levels={FOUR_POINT_LEVELS}
            orientation="horizontal"
            colorScheme={CARBON_4_DIVERGING}
            title="4-Point Scale (Even — No Neutral)"
            responsiveWidth
            height={260}
            showLegend
            legendPosition="bottom"
            tooltip
          />

          <CodeBlock
            code={`const FOUR_POINT_LEVELS = [
  "Strongly Disagree", "Disagree", "Agree", "Strongly Agree"
]

// Pre-aggregated data
const data = [
  { question: "The UI is intuitive", level: "Strongly Disagree", count: 5 },
  { question: "The UI is intuitive", level: "Disagree", count: 12 },
  { question: "The UI is intuitive", level: "Agree", count: 28 },
  { question: "The UI is intuitive", level: "Strongly Agree", count: 15 },
]

// Even count: 4 colors, no neutral gray
const colors = ["#da1e28", "#ff8389", "#4589ff", "#0043ce"]

<LikertChart
  data={data}
  categoryAccessor="question"
  levelAccessor="level"
  countAccessor="count"
  levels={FOUR_POINT_LEVELS}
  colorScheme={colors}
/>`}
            language="jsx"
          />
        </div>
      )}

      {variant === "seven" && (
        <div>
          <p>
            The chart dynamically handles any scale size. With 7 levels, the
            4th entry ("Neutral") is centered, and 3 negative + 3 positive
            levels extend outward.
          </p>

          <LikertChart
            data={sevenPointData}
            categoryAccessor="question"
            levelAccessor="level"
            countAccessor="count"
            levels={SEVEN_POINT_LEVELS}
            orientation="horizontal"
            colorScheme={CARBON_7_DIVERGING}
            title="7-Point Scale"
            responsiveWidth
            height={240}
            showLegend
            legendPosition="bottom"
            tooltip
          />

          <CodeBlock
            code={`const SEVEN_POINT_LEVELS = [
  "Very Strongly Disagree", "Strongly Disagree", "Disagree",
  "Neutral",
  "Agree", "Strongly Agree", "Very Strongly Agree",
]

// 7 colors: deep red → red → pink → gray → light blue → blue → deep blue
const colors = [
  "#750e13", "#da1e28", "#ff8389",
  "#a8a8a8",
  "#4589ff", "#0043ce", "#001d6c"
]

<LikertChart
  data={data}
  levels={SEVEN_POINT_LEVELS}
  colorScheme={colors}
/>`}
            language="jsx"
          />
        </div>
      )}

      {/* ================================================================= */}
      {/* Data Format Reference */}
      {/* ================================================================= */}
      <h2 id="data-formats">Data Formats</h2>

      <h3>Raw responses (integer scores)</h3>
      <p>
        Each row is one respondent's answer. Set <code>valueAccessor</code>{" "}
        to the score field. Scores are 1-based — score 1 maps to{" "}
        <code>levels[0]</code>, score 2 to <code>levels[1]</code>, etc.
        The chart aggregates counts per question per level automatically.
      </p>

      <CodeBlock
        code={`// Raw responses — the chart aggregates internally
const data = [
  { question: "Q1", score: 4 },  // score 4 → levels[3] = "Agree"
  { question: "Q1", score: 5 },  // score 5 → levels[4] = "Strongly Agree"
  { question: "Q2", score: 2 },  // score 2 → levels[1] = "Disagree"
]

<LikertChart
  data={data}
  categoryAccessor="question"
  valueAccessor="score"
  levels={["Str. Disagree", "Disagree", "Neutral", "Agree", "Str. Agree"]}
/>`}
        language="jsx"
      />

      <h3>Pre-aggregated (question + level + count)</h3>
      <p>
        Each row is a (question, level, count) triple. Set{" "}
        <code>levelAccessor</code> and <code>countAccessor</code>. Each{" "}
        <code>level</code> value must match an entry in the{" "}
        <code>levels</code> array.
      </p>

      <CodeBlock
        code={`const data = [
  { question: "Q1", level: "Strongly Agree", count: 45 },
  { question: "Q1", level: "Agree", count: 30 },
  { question: "Q1", level: "Neutral", count: 10 },
  { question: "Q1", level: "Disagree", count: 12 },
  { question: "Q1", level: "Strongly Disagree", count: 3 },
]

<LikertChart
  data={data}
  categoryAccessor="question"
  levelAccessor="level"
  countAccessor="count"
  levels={["Str. Disagree", "Disagree", "Neutral", "Agree", "Str. Agree"]}
/>`}
        language="jsx"
      />

      {/* ================================================================= */}
      {/* Props Reference */}
      {/* ================================================================= */}
      <h2 id="props">Props</h2>

      <PropTable componentName="LikertChart" props={likertProps} />

      <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
        Plus all common HOC props:{" "}
        <code>title</code>, <code>width</code>, <code>height</code>,{" "}
        <code>margin</code>, <code>enableHover</code>, <code>tooltip</code>,{" "}
        <code>showLegend</code>, <code>legendPosition</code>,{" "}
        <code>legendInteraction</code>, <code>showGrid</code>,{" "}
        <code>annotations</code>, <code>frameProps</code>,{" "}
        <code>selection</code>, <code>linkedHover</code>,{" "}
        <code>onObservation</code>, <code>responsiveWidth</code>.
      </p>
    </PageLayout>
  )
}
