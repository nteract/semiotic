import { auditVisualHierarchy, evaluateAesthetics, evaluateChart } from "semiotic/ai"
import { renderChartWithEvidence } from "semiotic/server"
import { LIGHT_THEME } from "semiotic/themes"

export const BENCHMARK_ROWS = Object.freeze([
  Object.freeze({ model: "Atlas", score: 98.4 }),
  Object.freeze({ model: "Beacon", score: 97.9 }),
  Object.freeze({ model: "Cipher", score: 97.5 }),
  Object.freeze({ model: "Drift", score: 96.8 }),
  Object.freeze({ model: "Ember", score: 96.2 }),
])

export const BAD_CHART_PROPS = Object.freeze({
  data: BENCHMARK_ROWS,
  categoryAccessor: "model",
  valueAccessor: "score",
  valueExtent: Object.freeze([96, 99]),
  colorScheme: Object.freeze(["#ffea00"]),
})

export const REPAIRED_CHART_PROPS = Object.freeze({
  data: BENCHMARK_ROWS,
  categoryAccessor: "model",
  valueAccessor: "score",
  valueExtent: Object.freeze([96, 99]),
  colorScheme: Object.freeze(["#173f5f"]),
  stroke: "#fbf7ed",
  strokeWidth: 3,
  opacity: 1,
  styleRules: Object.freeze([
    Object.freeze({
      id: "highlight-leader",
      when: Object.freeze({ gte: 98 }),
      style: Object.freeze({ fill: "#b43b2d", stroke: "#fbf7ed", strokeWidth: 3 }),
    }),
  ]),
  title: "A 2.2-point spread",
  description: "Five model scores positioned on an explicitly labeled 96-to-99 comparison window.",
  summary:
    "This dot plot magnifies a narrow score range using position rather than bar length. Atlas leads Ember by 2.2 points; all scores exceed 96.",
  valueLabel: "Score — comparison window 96 to 99",
  accessibleTable: true,
  dotRadius: 11,
  categoryPadding: 14,
  showGrid: true,
  frameProps: Object.freeze({ rTickValues: Object.freeze([96, 97, 98, 99]) }),
})

export const REPAIRED_CHART_COMPONENT = "DotPlot"

export const AUTOPSY_AESTHETIC_PROFILE = Object.freeze({
  name: "Forensic editorial desk",
  weights: Object.freeze({
    "mark-scaffold-hierarchy": 3,
    "palette-authorship": 2,
    "palette-economy": 1,
    "typographic-hierarchy": 1,
    "theme-coherence": 2,
    "editorial-emphasis": 2,
  }),
  rationales: Object.freeze({
    "mark-scaffold-hierarchy": "Evidence must lead; measuring apparatus must recede.",
    "palette-authorship": "Published work should carry an intentional visual identity.",
    "theme-coherence": "One chart should read as part of the same institutional voice.",
    "editorial-emphasis": "Emphasis is scarce and should express the claim hierarchy.",
  }),
  minimumScore: 70,
})

export const AUTOPSY_THEME = Object.freeze({
  ...LIGHT_THEME,
  colors: Object.freeze({
    ...LIGHT_THEME.colors,
    primary: "#173f5f",
    secondary: "#b43b2d",
    categorical: Object.freeze(["#173f5f", "#b43b2d", "#d2a94a", "#53676f"]),
    background: "#fbf7ed",
    surface: "#fbf7ed",
    text: "#173f5f",
    textSecondary: "#53676f",
    grid: "#d9d2c1",
    border: "#b7ad98",
    annotation: "#b43b2d",
  }),
  typography: Object.freeze({
    ...LIGHT_THEME.typography,
    fontFamily: "Inter, system-ui, sans-serif",
    titleSize: 18,
    titleFontSize: 18,
    titleFontFamily: "Georgia, serif",
    titleFontWeight: 900,
    labelSize: 12,
    tickSize: 11,
  }),
  aesthetics: AUTOPSY_AESTHETIC_PROFILE,
})

const renderEvidence = (component, props) => renderChartWithEvidence(component, props)

export function evaluateAutopsyChart(component, props) {
  return evaluateChart(component, props, undefined, {
    render: renderEvidence,
  })
}

export function evaluateAutopsyAesthetics(weights = AUTOPSY_AESTHETIC_PROFILE.weights) {
  return evaluateAesthetics(REPAIRED_CHART_COMPONENT, REPAIRED_CHART_PROPS, {
    theme: AUTOPSY_THEME,
    profile: { ...AUTOPSY_AESTHETIC_PROFILE, weights },
  })
}

export function buildAutopsyCase() {
  const suspect = evaluateAutopsyChart("BarChart", BAD_CHART_PROPS)
  const repaired = evaluateAutopsyChart(REPAIRED_CHART_COMPONENT, REPAIRED_CHART_PROPS)
  const presentation = auditVisualHierarchy({
    backgroundColor: "#fbf7ed",
    dataColors: ["#173f5f", "#b43b2d"],
    scaffoldColor: "#d9d2c1",
  })
  const aesthetics = evaluateAutopsyAesthetics()
  return {
    suspect,
    repaired,
    presentation,
    aesthetics,
    fixes: Object.freeze([
      Object.freeze({
        code: "NON_ZERO_BASELINE",
        before: "BarChart + valueExtent: [96, 99]",
        after: "DotPlot + labeled [96, 99] window",
        effect:
          "Uses position to compare the 2.2-point spread without pretending each score is a bar measured from 96.",
      }),
      Object.freeze({
        code: "LOW_COLOR_CONTRAST",
        before: "#ffea00 on white",
        after: "Ink-blue marks + one rust focal point",
        effect: "Makes the data legible, then spends emphasis only on the actual leader.",
      }),
      Object.freeze({
        code: "MISSING_DESCRIPTION",
        before: "No reader context",
        after: "Title, description, summary, and axis labels",
        effect: "Gives visual, non-visual, and agent readers the same claim boundary.",
      }),
      Object.freeze({
        code: "SCAFFOLD_DOMINANCE",
        before: "Steel-blue dots + heavy black reference lines",
        after: "High-contrast marks + warm, subordinate grid",
        effect: "Keeps the measuring apparatus visible without letting it become the subject.",
      }),
    ]),
  }
}
