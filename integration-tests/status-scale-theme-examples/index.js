// Status-aware + scale theme matrix for Phase A milestone 3.
//
// Three new plumbing paths get visual-regression coverage here:
//   • Waterfall positive/negative bars → themeSemantic.success / .danger
//   • Heatmap colorScheme → theme.colors.sequential
//   • LikertChart diverging scheme → theme.colors.diverging
//
// Each rendered with NO explicit color prop so the fallback path fires.
// Light vs dark pairs diverge where the theme declares different status
// colors or different scale scheme names — before milestone 3 these
// would have been identical (hardcoded palettes regardless of theme).

import * as Semiotic from "../../dist/semiotic.module.min.js"
import React from "react"
import { createRoot } from "react-dom/client"

const {
  RealtimeWaterfallChart,
  Heatmap,
  LikertChart,
  ThemeProvider,
} = Semiotic

// ── Deterministic data ─────────────────────────────────────────────────────

// Waterfall — 4 quarterly deltas alternating positive/negative so both
// themeSemantic.success and themeSemantic.danger fire in one render.
const waterfallData = [
  { x: 0, y: 120 },
  { x: 1, y: -40 },
  { x: 2, y: 80 },
  { x: 3, y: -30 },
  { x: 4, y: 60 },
]

// Heatmap — 4×4 grid with explicit values. Theme's sequential scheme
// name drives the color ramp (LIGHT: "blues", DARK: "blues" in the base
// preset — we'll pick a theme preset where sequential differs).
const heatmapData = Array.from({ length: 16 }, (_, i) => ({
  xBin: i % 4,
  yBin: Math.floor(i / 4),
  value: ((i * 13) % 37) + 5,
}))

// Likert — 5-level survey with 4 categories.
const likertLevels = ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"]
const likertData = [
  { category: "Clarity",       level: "Strongly Disagree", count: 3 },
  { category: "Clarity",       level: "Disagree",          count: 7 },
  { category: "Clarity",       level: "Neutral",           count: 12 },
  { category: "Clarity",       level: "Agree",             count: 22 },
  { category: "Clarity",       level: "Strongly Agree",    count: 18 },
  { category: "Difficulty",    level: "Strongly Disagree", count: 10 },
  { category: "Difficulty",    level: "Disagree",          count: 20 },
  { category: "Difficulty",    level: "Neutral",           count: 15 },
  { category: "Difficulty",    level: "Agree",             count: 8 },
  { category: "Difficulty",    level: "Strongly Agree",    count: 4 },
  { category: "Relevance",     level: "Strongly Disagree", count: 2 },
  { category: "Relevance",     level: "Disagree",          count: 5 },
  { category: "Relevance",     level: "Neutral",           count: 10 },
  { category: "Relevance",     level: "Agree",             count: 28 },
  { category: "Relevance",     level: "Strongly Agree",    count: 22 },
]

const TestCase = ({ title, testId, children }) =>
  React.createElement(
    "div",
    { className: "test-case", "data-testid": testId },
    React.createElement("h2", null, title),
    children
  )

function ThemedCase({ testIdPrefix, themeName, children }) {
  return React.createElement(
    ThemeProvider,
    { theme: themeName },
    React.createElement(
      TestCase,
      { title: `${testIdPrefix} — ${themeName}`, testId: `${testIdPrefix}-${themeName}` },
      children
    )
  )
}

function App() {
  const waterfallProps = {
    data: waterfallData,
    timeAccessor: "x",
    valueAccessor: "y",
    width: 420,
    height: 220,
    windowSize: waterfallData.length,
    showLegend: false,
  }
  const heatmapProps = {
    data: heatmapData,
    xAccessor: "xBin",
    yAccessor: "yBin",
    valueAccessor: "value",
    width: 420,
    height: 220,
    showLegend: false,
    tooltip: false,
  }
  const likertProps = {
    data: likertData,
    categoryAccessor: "category",
    levelAccessor: "level",
    countAccessor: "count",
    levels: likertLevels,
    width: 420,
    height: 220,
    showLegend: false,
    tooltip: false,
  }

  return React.createElement(
    "div",
    null,
    // ── Waterfall: themeSemantic.success / .danger ────────────────────────
    React.createElement(
      ThemedCase,
      { testIdPrefix: "waterfall", themeName: "light" },
      React.createElement(RealtimeWaterfallChart, waterfallProps)
    ),
    React.createElement(
      ThemedCase,
      { testIdPrefix: "waterfall", themeName: "dark" },
      React.createElement(RealtimeWaterfallChart, waterfallProps)
    ),

    // ── Heatmap: themeSequential ──────────────────────────────────────────
    // Pair "tufte" (sequential: "oranges") with "bi-tool" (sequential: "blues")
    // so the two snapshots visibly differ in scheme.
    React.createElement(
      ThemedCase,
      { testIdPrefix: "heatmap", themeName: "tufte" },
      React.createElement(Heatmap, heatmapProps)
    ),
    React.createElement(
      ThemedCase,
      { testIdPrefix: "heatmap", themeName: "bi-tool" },
      React.createElement(Heatmap, heatmapProps)
    ),

    // ── Likert: themeDiverging ────────────────────────────────────────────
    // Both presets declare diverging: "RdBu" — so what we're confirming is
    // that the RdBu scheme IS reached via the theme path (replacing the
    // former Carbon hardcoded palette). Visual delta from pre-milestone-3.
    React.createElement(
      ThemedCase,
      { testIdPrefix: "likert", themeName: "light" },
      React.createElement(LikertChart, likertProps)
    ),
    React.createElement(
      ThemedCase,
      { testIdPrefix: "likert", themeName: "dark" },
      React.createElement(LikertChart, likertProps)
    )
  )
}

const root = createRoot(document.getElementById("root"))
root.render(React.createElement(App))
