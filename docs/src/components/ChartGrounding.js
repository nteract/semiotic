import React from "react"
import { Link } from "react-router-dom"
import { getCapability, profileData } from "semiotic/ai"
import { buildReaderGrounding, auditAccessibility } from "semiotic/utils"
import chartGroundingFixtures from "./chartGroundingFixtures"

/**
 * Per-chart "grounding" panel — the reader-side complement to a capability
 * descriptor, rendered live from a representative config:
 *
 *   • Communicative act (the L4 "this is a … chart" sentence) — what the chart
 *     is FOR, not just what it shows.
 *   • A layered L1–L3 description (the same describeChart text a screen reader
 *     or an agent would receive).
 *   • What the chart type asks of / hides from the reader (capability caveats).
 *   • A live accessibility read (auditAccessibility) — audited with describe:true
 *     because this panel itself provides the description.
 *
 * Everything is computed from `component` + `props` via the shipped intelligence
 * APIs, so the page can't drift from the library. The whole thing is wrapped in
 * a try/catch: grounding is additive, and must never break a chart page.
 */
export default function ChartGrounding({ component, props }) {
  // Pages may pass an explicit config; otherwise fall back to the shared
  // representative fixture for this component so a page only needs
  // `<ChartGrounding component="X" />`.
  const resolvedProps = props ?? chartGroundingFixtures[component] ?? {}
  let grounding
  let audit
  let caveats = []
  try {
    const capability = getCapability(component)
    grounding = buildReaderGrounding(component, resolvedProps, { capability })
    const auditProps = {
      ...resolvedProps,
      description: resolvedProps.description ?? grounding.description.text,
    }
    audit = auditAccessibility(component, auditProps, { describe: true })
    if (capability?.caveats) {
      const profile = profileData(resolvedProps.data || resolvedProps.nodes || [])
      caveats = capability.caveats(profile) || []
    }
  } catch {
    return null // never break the page on a grounding failure
  }
  if (!grounding) return null

  const { levels } = grounding.description
  // Lead with the verdict, not a defect count: warnings are advisories, and
  // audit.ok === true means every *critical* heuristic passed.
  const advisories = audit ? audit.summary.warnings : 0
  const advisoryText = `${advisories} advisor${advisories === 1 ? "y" : "ies"}`
  const a11y = audit
    ? audit.ok
      ? { tone: "ok", text: advisories === 0 ? "Passes accessibility" : `Passes a11y · ${advisoryText}` }
      : { tone: "warn", text: `${audit.summary.fails} to fix · ${advisoryText}` }
    : null

  // Tooltip: the specific findings behind the badge count, so hovering tells
  // you *what* the warnings are. Click still goes to the full audit page.
  const a11yFindings = audit
    ? audit.findings.filter((f) => f.status === "fail" || f.status === "warn")
    : []
  const a11yTitle = a11yFindings.length
    ? "Accessibility audit — hover for findings, click for the full report:\n" +
      a11yFindings
        .slice(0, 10)
        .map((f) => `${f.status === "fail" ? "✗" : "⚠"} ${f.heuristic}`)
        .join("\n") +
      (a11yFindings.length > 10 ? `\n…and ${a11yFindings.length - 10} more` : "")
    : "No accessibility issues found — click for the full audit."

  return (
    <aside className="chart-grounding" style={styles.panel} aria-label={`${component} at a glance`}>
      <div style={styles.headerRow}>
        <span style={styles.kicker}>At a glance</span>
        {a11y && (
          <Link
            to="/accessibility/audit"
            title={a11yTitle}
            style={{ ...styles.badge, ...(a11y.tone === "ok" ? styles.badgeOk : styles.badgeWarn) }}
          >
            ♿ {a11y.text}
          </Link>
        )}
      </div>

      {grounding.intent && <p style={styles.act}>{grounding.intent.sentence}</p>}

      {levels.l1 && (
        <p style={styles.desc}>
          {levels.l1}
          {levels.l2 ? ` ${levels.l2}` : ""}
          {levels.l3 ? ` ${levels.l3}` : ""}
        </p>
      )}

      {caveats.length > 0 && (
        <p style={styles.caveats}>
          <strong>Asks of the reader:</strong> {caveats.join("; ")}
        </p>
      )}

      <p style={styles.footer}>
        Generated live via <code>describeChart</code> + <code>auditAccessibility</code>.
        {" "}Not sure this is the right chart? <Link to="/choose">Choose a Chart</Link>.
      </p>
    </aside>
  )
}

const styles = {
  panel: {
    background: "var(--surface-1)",
    border: "1px solid var(--surface-3)",
    borderLeft: "3px solid var(--accent)",
    borderRadius: 8,
    padding: "12px 16px",
    margin: "16px 0 24px",
  },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 },
  kicker: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-secondary)" },
  badge: { fontSize: 12, fontWeight: 600, textDecoration: "none", padding: "2px 8px", borderRadius: 12 },
  badgeOk: { background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)" },
  badgeWarn: { background: "var(--surface-3)", color: "var(--text-secondary)" },
  act: { margin: "8px 0 0", fontWeight: 600, fontSize: 15, lineHeight: 1.4 },
  desc: { margin: "6px 0 0", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 },
  caveats: { margin: "8px 0 0", fontSize: 13, color: "var(--text-secondary)" },
  footer: { margin: "10px 0 0", fontSize: 12, color: "var(--text-secondary)" },
}
