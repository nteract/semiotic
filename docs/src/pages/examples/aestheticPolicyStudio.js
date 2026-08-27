import { evaluateAesthetics } from "semiotic/ai"
import { DEFAULT_AESTHETIC_PROFILE, LIGHT_THEME } from "semiotic/themes"

export const SERVICE_DATA = Object.freeze([
  Object.freeze({ service: "Benefits resolution", completion: 91 }),
  Object.freeze({ service: "Digital access", completion: 86 }),
  Object.freeze({ service: "Transit reliability", completion: 83 }),
  Object.freeze({ service: "Street response", completion: 78 }),
  Object.freeze({ service: "Permit turnaround", completion: 72 }),
])

const SHARED_COPY = Object.freeze({
  title: "On-target service completion",
  description: "Share of requests completed within each service's published target during Q2 2026.",
  summary:
    "Benefits resolution leads at 91%. Permit turnaround is lowest at 72%. All five services use the same Q2 snapshot and percentage scale.",
  categoryLabel: "Service",
  valueLabel: "Completed within target (%)",
  accessibleTable: true,
  showGrid: true,
})

export const DEFAULT_CASE = Object.freeze({
  id: "semiotic-default",
  label: "Semiotic balanced default",
  component: "DotPlot",
  theme: LIGHT_THEME,
  props: Object.freeze({
    ...SHARED_COPY,
    data: SERVICE_DATA,
    categoryAccessor: "service",
    valueAccessor: "completion",
    valueExtent: Object.freeze([0, 100]),
    margin: Object.freeze({ top: 50, right: 18, bottom: 62, left: 124 }),
    dotRadius: 8,
  }),
})

export const CIVIC_PROFILE = Object.freeze({
  name: "Northstar public standard",
  minimumScore: 78,
  weights: Object.freeze({
    "mark-scaffold-hierarchy": 5,
    "palette-authorship": 0.5,
    "palette-economy": 4,
    "typographic-hierarchy": 2,
    "theme-coherence": 4,
    "editorial-emphasis": 0,
  }),
  thresholds: Object.freeze({
    categoricalColorMax: 1,
    titleScaleRatio: 1.25,
  }),
  rationales: Object.freeze({
    "mark-scaffold-hierarchy":
      "Operational readers must find the measure before they notice the house style.",
    "palette-economy": "One metric gets one stable institutional color.",
    "theme-coherence": "Comparability across hundreds of reports is a governance requirement.",
    "editorial-emphasis":
      "Routine reporting should not manufacture a hero unless policy names one.",
  }),
})

export const CULTURE_PROFILE = Object.freeze({
  name: "Fieldnote editorial voice",
  minimumScore: 78,
  weights: Object.freeze({
    "mark-scaffold-hierarchy": 3,
    "palette-authorship": 5,
    "palette-economy": 0.5,
    "typographic-hierarchy": 4,
    "theme-coherence": 2,
    "editorial-emphasis": 5,
  }),
  thresholds: Object.freeze({
    categoricalColorMax: 5,
    titleScaleRatio: 1.75,
    emphasisRatioMin: 0.1,
    emphasisRatioMax: 0.3,
  }),
  rationales: Object.freeze({
    "mark-scaffold-hierarchy": "Expressive work still fails if the measuring apparatus wins.",
    "palette-authorship": "The publication's visual voice is part of reader recognition and trust.",
    "typographic-hierarchy": "A strong editorial headline establishes the intended reading order.",
    "editorial-emphasis":
      "A scarce accent should make the evidence-bearing lead visible immediately.",
  }),
})

export const CIVIC_THEME = Object.freeze({
  ...LIGHT_THEME,
  colors: {
    ...LIGHT_THEME.colors,
    primary: "#18324a",
    secondary: "#526979",
    categorical: ["#18324a"],
    background: "#f7f9fa",
    surface: "#f7f9fa",
    text: "#172b3a",
    textSecondary: "#536572",
    grid: "#cfd7dc",
    border: "#aebbc4",
    annotation: "#18324a",
  },
  typography: {
    ...LIGHT_THEME.typography,
    fontFamily: "Inter, system-ui, sans-serif",
    titleSize: 18,
    titleFontSize: 18,
    titleFontFamily: "Inter, system-ui, sans-serif",
    titleFontWeight: 700,
    labelSize: 12,
    tickSize: 11,
  },
  borderRadius: "2px",
  aesthetics: CIVIC_PROFILE,
})

export const CULTURE_THEME = Object.freeze({
  ...LIGHT_THEME,
  colors: {
    ...LIGHT_THEME.colors,
    primary: "#5b2b82",
    secondary: "#d4385a",
    categorical: ["#5b2b82", "#d4385a", "#ef9f3c"],
    background: "#fff8ee",
    surface: "#fff8ee",
    text: "#30183e",
    textSecondary: "#6f5a70",
    grid: "#ded0c4",
    border: "#bcaeaa",
    annotation: "#d4385a",
  },
  typography: {
    ...LIGHT_THEME.typography,
    fontFamily: "Inter, system-ui, sans-serif",
    titleSize: 24,
    titleFontSize: 24,
    titleFontFamily: "Georgia, serif",
    titleFontWeight: 900,
    labelSize: 12,
    tickSize: 11,
  },
  borderRadius: "14px",
  aesthetics: CULTURE_PROFILE,
})

export const AESTHETIC_CANDIDATES = Object.freeze([
  Object.freeze({
    id: "continuity-bar",
    label: "Continuity bar",
    component: "BarChart",
    theme: CIVIC_THEME,
    props: Object.freeze({
      ...SHARED_COPY,
      data: SERVICE_DATA,
      categoryAccessor: "service",
      valueAccessor: "completion",
      colorScheme: Object.freeze(["#18324a"]),
      stroke: "#f7f9fa",
      strokeWidth: 1,
    }),
    decision:
      "A zero-baseline bar chart and one durable color maximize routine comparability across a reporting estate.",
  }),
  Object.freeze({
    id: "editorial-dot",
    label: "Editorial dot plot",
    component: "DotPlot",
    theme: CULTURE_THEME,
    props: Object.freeze({
      ...SHARED_COPY,
      title: "Benefits lead",
      data: SERVICE_DATA,
      categoryAccessor: "service",
      valueAccessor: "completion",
      valueExtent: Object.freeze([60, 100]),
      margin: Object.freeze({ top: 58, right: 18, bottom: 64, left: 136 }),
      valueLabel: "Completed within target (%) — comparison window 60–100",
      colorScheme: Object.freeze(["#5b2b82"]),
      stroke: "#fff8ee",
      strokeWidth: 3,
      dotRadius: 11,
      categoryPadding: 14,
      styleRules: Object.freeze([
        Object.freeze({
          id: "lead-service",
          when: Object.freeze({ gte: 90 }),
          style: Object.freeze({ fill: "#d4385a", stroke: "#fff8ee", strokeWidth: 3 }),
        }),
      ]),
      frameProps: Object.freeze({ rTickValues: Object.freeze([60, 70, 80, 90, 100]) }),
    }),
    decision:
      "A labeled comparison window, stronger headline, and one scarce accent create an editorial reading without altering the evidence.",
  }),
])

export const ORGANIZATIONS = Object.freeze([
  Object.freeze({
    id: "northstar",
    shortName: "Northstar",
    sector: "Public systems",
    principle: "Consistency is a public interface.",
    profile: CIVIC_PROFILE,
  }),
  Object.freeze({
    id: "fieldnote",
    shortName: "Fieldnote",
    sector: "Editorial studio",
    principle: "Point of view is part of comprehension.",
    profile: CULTURE_PROFILE,
  }),
])

export const POLICY_INVARIANTS = Object.freeze([
  Object.freeze({
    id: "hierarchy",
    label: "Marks lead; grids recede",
    explanation:
      "Both outputs keep reference lines visible but subordinate and maintain at least twice as much contrast in the weakest data mark.",
  }),
  Object.freeze({
    id: "truth",
    label: "Encoding remains honest",
    explanation:
      "Bars retain a zero baseline. The tighter dot-plot domain is explicitly named as a comparison window rather than presented as magnitude from zero.",
  }),
  Object.freeze({
    id: "meaning",
    label: "Meaning survives style",
    explanation:
      "The data, title, description, summary, labels, and accessible table are identical or semantically equivalent in every output.",
  }),
])

function evaluateCandidate(profile, candidate) {
  return evaluateAesthetics(candidate.component, candidate.props, {
    theme: candidate.theme,
    profile,
  })
}

export function selectAestheticCandidate(profile) {
  const ranked = AESTHETIC_CANDIDATES.map((candidate) => ({
    candidate,
    report: evaluateCandidate(profile, candidate),
  })).sort((a, b) => (b.report.score ?? -1) - (a.report.score ?? -1))

  return Object.freeze({ selected: ranked[0], ranked: Object.freeze(ranked) })
}

export function buildAestheticPolicyShowcase() {
  return Object.freeze({
    defaultCase: Object.freeze({
      candidate: DEFAULT_CASE,
      report: evaluateAesthetics(DEFAULT_CASE.component, DEFAULT_CASE.props, {
        theme: DEFAULT_CASE.theme,
        profile: DEFAULT_AESTHETIC_PROFILE,
      }),
    }),
    organizations: Object.freeze(
      ORGANIZATIONS.map((organization) =>
        Object.freeze({
          ...organization,
          selection: selectAestheticCandidate(organization.profile),
        }),
      ),
    ),
    invariants: POLICY_INVARIANTS,
  })
}
