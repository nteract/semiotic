import React, { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { profileData, suggestCharts, suggestStretchCharts } from "semiotic/ai"
import PageLayout from "../components/PageLayout"
import navData, { flattenNav } from "../components/navData"
import { suggestReshapes } from "../components/reshapeSuggestions"

// ---------------------------------------------------------------------------
// Sample datasets — a few shapes so the recommendation reasoning is visible.
// ---------------------------------------------------------------------------

const DATASETS = {
  "sales-by-region": {
    label: "Sales by region (categorical)",
    data: [
      { region: "AMER", value: 42 },
      { region: "EMEA", value: 33 },
      { region: "APAC", value: 51 },
      { region: "LATAM", value: 18 },
    ],
  },
  "monthly-revenue": {
    label: "Monthly revenue (time series)",
    data: Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      revenue: 100 + i * 12 + Math.round(Math.sin(i) * 20),
    })),
  },
  "height-weight": {
    label: "Height vs. weight (paired numeric)",
    data: [
      { height: 160, weight: 55 }, { height: 165, weight: 62 },
      { height: 170, weight: 68 }, { height: 175, weight: 75 },
      { height: 180, weight: 82 }, { height: 168, weight: 64 },
      { height: 172, weight: 70 }, { height: 178, weight: 78 },
    ],
  },
  "market-share": {
    label: "Market share — 8 vendors (part-to-whole)",
    data: Array.from({ length: 8 }, (_, i) => ({ vendor: `Vendor ${i + 1}`, share: 24 - i * 2 })),
  },
  // Flat but *relational* shapes — single tables that don't directly fit a
  // flow/temporal/funnel chart, but could be reshaped into one. These drive the
  // "Reshape to unlock" rail.
  "user-flow": {
    label: "User flow — from → to (relational pairs)",
    data: [
      { from: "Search", to: "Sign-up", users: 5000 },
      { from: "Ads", to: "Sign-up", users: 3000 },
      { from: "Sign-up", to: "Activated", users: 4600 },
      { from: "Sign-up", to: "Bounced", users: 3400 },
      { from: "Activated", to: "Paid", users: 1800 },
      { from: "Activated", to: "Churned", users: 2800 },
    ],
  },
  "incident-events": {
    label: "Incident events — service, owner, week (event log)",
    data: [
      { service: "API", owner: "SRE", week: 1, minutes: 42 },
      { service: "API", owner: "Platform", week: 2, minutes: 18 },
      { service: "Database", owner: "SRE", week: 2, minutes: 75 },
      { service: "Cache", owner: "Platform", week: 3, minutes: 12 },
      { service: "Database", owner: "Data", week: 3, minutes: 51 },
    ],
  },
  "signup-funnel": {
    label: "Signup funnel — step, users (stages)",
    data: [
      { step: "Visited", users: 10000 },
      { step: "Signed up", users: 4600 },
      { step: "Activated", users: 2800 },
      { step: "Paid", users: 1000 },
    ],
  },
}

const INTENTS = [
  "trend", "compare-series", "compare-categories", "rank", "part-to-whole",
  "distribution", "correlation", "flow", "hierarchy", "geo",
  "outlier-detection", "composition-over-time", "change-detection",
]

// Audience presets — the org-owned reader model. Each carries explicit
// familiarity + a growth target with a rationale (governance: the reason is
// shown, not hidden).
const AUDIENCES = {
  none: { label: "No audience (neutral ranking)", profile: null },
  executive: {
    label: "Executive review",
    profile: {
      name: "Executive review",
      familiarity: { BarChart: 5, LineChart: 5, PieChart: 5, BoxPlot: 2, Heatmap: 2, ViolinPlot: 1 },
      targets: { Heatmap: { direction: "increase", weight: 1, reason: "leadership should recognize recurring hotspots" } },
      exposureLevel: 1,
    },
  },
  oncall: {
    label: "On-call engineer",
    profile: {
      name: "On-call engineer",
      familiarity: { LineChart: 5, BarChart: 5, Heatmap: 4, BoxPlot: 3, ViolinPlot: 3 },
      targets: { BoxPlot: { direction: "increase", weight: 2, reason: "duration distributions matter more than averages" } },
      exposureLevel: 1,
    },
  },
}

// Map a component name to its chart page, but only link when a page exists.
const CHART_PATHS = new Set(
  flattenNav(navData).map((i) => i.path).filter((p) => /^\/charts\/[a-z0-9-]+$/.test(p)),
)
const kebab = (name) => name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()
function chartPath(component) {
  const p = `/charts/${kebab(component)}`
  return CHART_PATHS.has(p) ? p : null
}

// ---------------------------------------------------------------------------

export default function ChooseChartPage() {
  const [datasetKey, setDatasetKey] = useState("sales-by-region")
  const [intent, setIntent] = useState("")
  const [audienceKey, setAudienceKey] = useState("none")

  const dataset = DATASETS[datasetKey]
  const audience = AUDIENCES[audienceKey].profile

  const { profile, suggestions, stretch, reshapes } = useMemo(() => {
    const data = dataset.data
    const prof = profileData(data)
    const opts = { maxResults: 6, includeVariants: false }
    if (intent) opts.intent = intent
    if (audience) opts.audience = audience
    const ranked = suggestCharts(data, opts)
    return {
      profile: prof,
      suggestions: ranked,
      stretch: audience ? suggestStretchCharts(data, { ...(intent ? { intent } : {}), audience }) : [],
      // Generative layer: charts the flat data doesn't directly fit but could be
      // reshaped into — excluding any already directly recommended.
      reshapes: suggestReshapes(prof, { exclude: new Set(ranked.map((s) => s.component)) }),
    }
  }, [dataset, intent, audience])

  return (
    <PageLayout
      title="Choose a Chart"
      breadcrumbs={[{ label: "Choose a Chart", path: "/choose" }]}
      nextPage={{ title: "Charts", path: "/charts/line-chart" }}
    >
      <p>
        Arrive with data and intent, not a component name. This picker profiles a
        dataset and ranks the catalog by <em>fit and communicative act</em> using
        the same engine that powers <Link to="/intelligence/suggestions">suggestCharts</Link>{" "}
        and the <Link to="/intelligence/cli-mcp">MCP tools</Link> — and it shows
        the reasoning, so the recommendation is inspectable, not a black box.
        Pick an <Link to="/intelligence/audience-profiles">audience</Link> to see
        the ranking shift for who's reading.
      </p>

      {/* Controls */}
      <div style={styles.controls}>
        <label style={styles.field}>
          <span style={styles.labelText}>Data shape</span>
          <select style={styles.select} value={datasetKey} onChange={(e) => setDatasetKey(e.target.value)}>
            {Object.entries(DATASETS).map(([k, d]) => <option key={k} value={k}>{d.label}</option>)}
          </select>
        </label>
        <label style={styles.field}>
          <span style={styles.labelText}>Intent</span>
          <select style={styles.select} value={intent} onChange={(e) => setIntent(e.target.value)}>
            <option value="">Any</option>
            {INTENTS.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </label>
        <label style={styles.field}>
          <span style={styles.labelText}>Audience</span>
          <select style={styles.select} value={audienceKey} onChange={(e) => setAudienceKey(e.target.value)}>
            {Object.entries(AUDIENCES).map(([k, a]) => <option key={k} value={k}>{a.label}</option>)}
          </select>
        </label>
      </div>

      <p style={styles.profileLine}>
        Profiled <strong>{profile.rowCount}</strong> rows ·{" "}
        {profile.primary.x && <>x: <code>{profile.primary.x}</code> · </>}
        {profile.primary.y && <>y: <code>{profile.primary.y}</code> · </>}
        {profile.primary.category && <>category: <code>{profile.primary.category}</code> · </>}
        {profile.categoryCount != null && <>{profile.categoryCount} categories</>}
      </p>

      {/* Active audience (inspectable + governed) */}
      {audience && (
        <div style={styles.audiencePanel}>
          <strong>Active audience: {audience.name}</strong>
          <div style={styles.audienceMeta}>
            Familiarity and growth targets below bias the ranking; every bias is
            shown in a suggestion's reasons, so the policy is inspectable and
            contestable — never a hidden default.
          </div>
          {audience.targets && (
            <ul style={styles.targetList}>
              {Object.entries(audience.targets).map(([chart, t]) => (
                <li key={chart}>
                  <code>{chart}</code> — {t.direction} (weight {t.weight ?? 1})
                  {t.reason && <>: <em>{t.reason}</em></>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Ranked suggestions */}
      <h2 id="ranked">Recommended charts</h2>
      <div style={styles.cards}>
        {suggestions.map((s, i) => {
          const path = chartPath(s.component)
          return (
            <div key={`${s.component}-${i}`} style={styles.card}>
              <div style={styles.cardHead}>
                <span style={styles.rank}>{i + 1}</span>
                <span style={styles.componentName}>
                  {path ? <Link to={path}>{s.component}</Link> : s.component}
                </span>
                <span style={styles.score}>{s.score.toFixed(1)}/5</span>
              </div>
              <div style={styles.cardMeta}>
                {s.family} · <code>{s.importPath}</code>
              </div>
              {s.reasons.length > 0 && (
                <ul style={styles.reasons}>
                  {s.reasons.slice(0, 3).map((r, j) => <li key={j}>{r}</li>)}
                </ul>
              )}
              {s.caveats.length > 0 && (
                <div style={styles.caveats}>
                  <strong>Watch out:</strong> {s.caveats.join("; ")}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Stretch picks */}
      {stretch.length > 0 && (
        <>
          <h2 id="stretch">Stretch picks</h2>
          <p>
            Unfamiliar-but-relevant charts that grow this audience's literacy —
            shown alongside the familiar picks, with the rationale and the
            familiarity that qualified them, so the trade-off is explicit.
          </p>
          <div style={styles.cards}>
            {stretch.map((st, i) => {
              const path = chartPath(st.suggestion.component)
              return (
                <div key={`${st.suggestion.component}-${i}`} style={{ ...styles.card, ...styles.stretchCard }}>
                  <div style={styles.cardHead}>
                    <span style={styles.componentName}>
                      {path ? <Link to={path}>{st.suggestion.component}</Link> : st.suggestion.component}
                    </span>
                    <span style={styles.stretchBadge}>stretch · familiarity {st.familiarity}</span>
                  </div>
                  <div style={styles.cardMeta}>{st.rationale}</div>
                  {st.replacing && <div style={styles.cardMeta}>Could replace <code>{st.replacing}</code> for this intent.</div>}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Reshape to unlock — the generative / distinctive rail */}
      {reshapes.length > 0 && (
        <>
          <h2 id="reshape">Reshape to unlock</h2>
          <p>
            Direct recommendations only cover charts your data <em>already</em>{" "}
            fits. But a flat table can often be reshaped into something more
            powerful — these are the distinctive charts Semiotic draws that your
            data could become, with the transform that unlocks each.
          </p>
          <div style={styles.cards}>
            {reshapes.map((r, i) => {
              const path = chartPath(r.component)
              return (
                <div key={`${r.component}-${i}`} style={{ ...styles.card, ...styles.reshapeCard }}>
                  <div style={styles.cardHead}>
                    <span style={styles.componentName}>
                      {path ? <Link to={path}>{r.component}</Link> : r.component}
                    </span>
                    <span style={styles.reshapeBadge}>{r.family}</span>
                  </div>
                  <div style={styles.reshapeTransform}>↻ {r.transform}</div>
                  <div style={styles.cardMeta}>{r.why}</div>
                </div>
              )
            })}
          </div>
        </>
      )}

      <p style={{ marginTop: 24 }}>
        Related: <Link to="/intelligence/suggestions">Chart Suggestions</Link> ·{" "}
        <Link to="/intelligence/audience-profiles">Audience Profiles</Link> ·{" "}
        <Link to="/intelligence/capability-authoring">Capability Authoring</Link>{" "}
        · <Link to="/intelligence/variant-discovery">Variant Discovery &amp; Repair</Link>
      </p>
    </PageLayout>
  )
}

const styles = {
  controls: { display: "flex", flexWrap: "wrap", gap: 16, margin: "16px 0" },
  field: { display: "flex", flexDirection: "column", gap: 4 },
  labelText: { fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" },
  select: {
    background: "var(--surface-1)", color: "var(--text-primary)",
    border: "1px solid var(--surface-3)", borderRadius: 6, padding: "6px 10px",
    fontSize: 14, fontFamily: "var(--font-code)", minWidth: 220,
  },
  profileLine: { fontSize: 13, color: "var(--text-secondary)" },
  audiencePanel: {
    background: "var(--surface-1)", border: "1px solid var(--surface-3)",
    borderRadius: 8, padding: "12px 16px", margin: "12px 0",
  },
  audienceMeta: { fontSize: 13, color: "var(--text-secondary)", marginTop: 4 },
  targetList: { margin: "8px 0 0", fontSize: 13 },
  cards: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginTop: 12 },
  card: {
    background: "var(--surface-1)", border: "1px solid var(--surface-3)",
    borderRadius: 8, padding: "12px 14px",
  },
  stretchCard: { borderColor: "var(--accent)" },
  cardHead: { display: "flex", alignItems: "center", gap: 8 },
  rank: {
    background: "var(--surface-3)", borderRadius: "50%", width: 22, height: 22,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    fontSize: 12, fontWeight: 700, flexShrink: 0,
  },
  componentName: { fontWeight: 600, fontSize: 15, flex: 1 },
  score: { fontFamily: "var(--font-code)", fontSize: 13, color: "var(--accent)" },
  stretchBadge: { fontSize: 11, color: "var(--accent)", fontWeight: 600 },
  cardMeta: { fontSize: 12, color: "var(--text-secondary)", marginTop: 4 },
  reasons: { margin: "8px 0 0", paddingLeft: 18, fontSize: 13 },
  caveats: { fontSize: 12, color: "var(--text-secondary)", marginTop: 8 },
  reshapeCard: { borderLeft: "3px solid var(--accent)" },
  reshapeBadge: { fontSize: 11, color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em" },
  reshapeTransform: { fontSize: 13, marginTop: 6, fontFamily: "var(--font-code)", color: "var(--text-primary)" },
}
