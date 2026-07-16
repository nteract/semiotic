import type { Datum } from "./datumTypes"
/**
 * auditAccessibility — a static accessibility audit for Semiotic chart
 * configurations, organized by Frank Elavsky's Chartability framework
 * (POUR-CAF): https://chartability.github.io/POUR-CAF/
 *
 * This grades a `(component, props)` config the same way `diagnoseConfig`
 * does — no DOM, no live assistive-technology. That means it can only check
 * what's derivable from props/data/theme. Two honest consequences:
 *
 *   1. Many criticals PASS "by construction" because every Semiotic HOC ships
 *      keyboard navigation, a shape-adaptive focus ring, a skip link, a
 *      screen-reader data table (accessibleTable, default on), reduced-motion
 *      + forced-colors handling, and shareable state (toConfig/toURL). The
 *      audit credits these so authors see what they already get for free.
 *
 *   2. Several heuristics CANNOT be settled statically (does the rendered chart
 *      actually pass NVDA + Firefox? is the live color contrast ≥ 3:1 once the
 *      theme resolves?). Those are reported as `status: "manual"` with the
 *      Chartability test to run by hand, rather than a false "pass".
 *
 * Chartability is explicitly NOT a pass/fail certification — "you cannot pass
 * Chartability 100%." This audit is a triage aid: it surfaces the author-
 * actionable gaps and routes everything else to the right manual test.
 */

import { VALIDATION_MAP } from "./validateProps"
import { contrastRatio } from "./colorContrast"
import {
  annotationDrawsConnector,
  annotationType,
  isNoteAnnotation
} from "./annotationTypes"
import {
  CONTINUOUS_MOTION_CHARTS as CONTINUOUS_MOTION,
  DUAL_AXIS_CHARTS as DUAL_AXIS,
  GEO_CHARTS as GEO,
  HIERARCHY_CHARTS as HIERARCHY,
  PART_TO_WHOLE_CHARTS as PART_TO_WHOLE,
  PHYSICS_MOTION_CHARTS as PHYSICS,
  PHYSICS_SETTLED_CHARTS as PHYSICS_SETTLED,
  POINT_TARGET_RADIUS_PROP,
  REALTIME_CHARTS as REALTIME,
  VALUE_CHARTS as VALUE,
  XY_WITH_AXES_CHARTS as XY_WITH_AXES,
} from "./chartFamilySets"
import { getChartRecipe } from "../../ai/chartRecipeRegistry"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type A11yPrinciple =
  | "perceivable"
  | "operable"
  | "understandable"
  | "robust"
  | "compromising"
  | "assistive"
  | "flexible"

/**
 * - `pass`  — satisfied (by config or by Semiotic's built-ins)
 * - `fail`  — a problem we can prove from the config
 * - `warn`  — a likely problem or a default worth revisiting
 * - `manual`— can't be settled statically; run the named Chartability test
 * - `not-applicable` — heuristic doesn't apply to this chart
 */
export type A11yStatus = "pass" | "fail" | "warn" | "manual" | "not-applicable"

export interface A11yFinding {
  /** Stable id, `principle.heuristic-slug` (e.g. "perceivable.low-contrast"). */
  id: string
  principle: A11yPrinciple
  /** The Chartability heuristic name, verbatim. */
  heuristic: string
  /** Chartability flags 14 of 50 heuristics as critical. */
  critical: boolean
  status: A11yStatus
  message: string
  /** How to fix or, for `manual`, the test to run. */
  fix?: string
}

export interface AccessibilityAuditResult {
  component: string
  /** No critical heuristic is in a `fail` state. (warn/manual don't break this.) */
  ok: boolean
  summary: {
    criticalsPassed: number
    /** Critical heuristics actually evaluated (excludes not-applicable). */
    criticalsEvaluated: number
    fails: number
    warnings: number
    manual: number
    passes: number
  }
  findings: A11yFinding[]
  /** Always points back to the source framework. */
  reference: string
}

export interface AuditAccessibilityOptions {
  /**
   * Whether the chart is wrapped in a ChartContainer (or otherwise exposes a
   * data-download / copy-config affordance). Lets the audit credit the
   * "downloadable table" and "shareable state" heuristics. ChartContainer is
   * the opt-in layer for full-accessibility chrome (title, caption,
   * description), so several heuristics soften their remediation toward it.
   * Default false.
   */
  inChartContainer?: boolean
  /**
   * Whether ChartContainer's `describe` option (auto-generated L1–L3 description
   * via describeChart) is enabled. Lets the "features described" heuristic pass.
   * Default false.
   */
  describe?: boolean
  /**
   * Whether ChartContainer's `navigable` option (a structured, screen-reader-
   * navigable tree via buildNavigationTree/AccessibleNavTree) is enabled. Lets
   * the "navigable structure" heuristic pass — including for hierarchy charts.
   * Default false.
   */
  navigable?: boolean
}

// The Wong colorblind-safe palette Semiotic ships (COLOR_BLIND_SAFE_CATEGORICAL,
// mirrored here as a literal so the audit stays a light, dependency-free pure
// function). Used to upgrade the CVD heuristic from "manual" to "pass" when a
// config opts into it.
const CVD_SAFE_PALETTE = new Set([
  "#0072b2",
  "#e69f00",
  "#009e73",
  "#cc79a7",
  "#56b4e9",
  "#d55e00",
  "#f0e442",
  "#000000"
])

const REFERENCE =
  "Chartability (POUR-CAF) — https://chartability.github.io/POUR-CAF/. Not a pass/fail cert; pair with manual screen-reader testing (NVDA+Firefox, JAWS+Chrome, VoiceOver+Safari)."

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0
}

function annotationConfidence(a: Datum): number | null {
  const c = a?.provenance?.confidence
  return typeof c === "number" && Number.isFinite(c) ? c : null
}

function annotationHasHierarchySignal(a: Datum): boolean {
  return (
    a?.emphasis === "primary" ||
    a?.emphasis === "secondary" ||
    annotationConfidence(a) != null
  )
}

/** Rough Flesch–Kincaid grade level for a blob of description text. */
function fleschKincaidGrade(text: string): number | null {
  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0 || sentences.length === 0) return null
  let syllables = 0
  for (const w of words) syllables += countSyllables(w)
  return (
    0.39 * (words.length / sentences.length) +
    11.8 * (syllables / words.length) -
    15.59
  )
}

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "")
  if (!w) return 0
  if (w.length <= 3) return 1
  const trimmed = w
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "")
    .replace(/^y/, "")
  const groups = trimmed.match(/[aeiouy]{1,2}/g)
  return groups ? groups.length : 1
}

/** Does this config wire up any pointer-driven interaction? */
function isInteractive(props: Datum): boolean {
  return (
    props.tooltip !== false ||
    props.onClick != null ||
    props.brush != null ||
    props.onBrush != null ||
    props.selection != null ||
    props.linkedHover != null ||
    props.linkedBrush != null
  )
}

function physicsOptions(props: Datum): Datum {
  return props.physics && typeof props.physics === "object"
    ? (props.physics as Datum)
    : {}
}

function hasPauseControl(props: Datum): boolean {
  const physics = physicsOptions(props)
  const controls =
    props.controls && typeof props.controls === "object"
      ? (props.controls as Datum)
      : {}
  return (
    props.pauseControl === true ||
    physics.pauseControl === true ||
    controls.pause === true ||
    typeof controls.pause === "function"
  )
}

function hasSettledProjection(props: Datum): boolean {
  const physics = physicsOptions(props)
  return props.settledProjection === true || physics.settledProjection === true
}

function hasReducedMotionSettle(props: Datum): boolean {
  const physics = physicsOptions(props)
  return (
    props.reducedMotionSettle === true ||
    props.reducedMotion === "settle" ||
    physics.reducedMotionSettle === true ||
    physics.reducedMotion === "settle"
  )
}

/** Perceivable → "Low contrast" (critical). Reuses diagnoseConfig's WCAG math.
 *  Can only check explicit hex colors in `colorScheme`; theme/CSS-var colors
 *  resolve at render time, so those return `manual`. */
function checkContrast(props: Datum): A11yFinding {
  const base = {
    id: "perceivable.low-contrast",
    principle: "perceivable" as A11yPrinciple,
    heuristic: "Low contrast",
    critical: true
  }
  const scheme = props.colorScheme
  // A non-hex background (theme token, CSS var, dark ThemeProvider) resolves at
  // render time — checking colorScheme against an assumed white would produce a
  // false pass/fail, so stay honest and defer to manual.
  const bgProp = typeof props.background === "string" ? props.background : null
  if (bgProp && !bgProp.startsWith("#")) {
    return {
      ...base,
      status: "manual",
      message: `Background "${bgProp}" isn't a hex literal (theme/CSS variable) — contrast can't be verified statically.`,
      fix: 'Pass a hex `background` (e.g. "#ffffff"/"#000000"), or verify contrast manually once the theme resolves.'
    }
  }
  const bg = bgProp ?? "#ffffff"

  if (!Array.isArray(scheme)) {
    return {
      ...base,
      status: "manual",
      message:
        "Mark colors come from the theme/CSS variables — contrast can't be verified statically.",
      fix: "Confirm geometries/large text have ≥ 3:1 and regular text ≥ 4.5:1 contrast against the background."
    }
  }

  const low: string[] = []
  let checked = 0
  for (const c of scheme) {
    if (typeof c !== "string" || !c.startsWith("#")) continue
    const r = contrastRatio(c, bg)
    if (r == null) continue
    checked++
    if (r < 3) low.push(`${c} (${r.toFixed(1)}:1)`)
  }
  if (checked === 0) {
    return {
      ...base,
      status: "manual",
      message: "colorScheme has no parseable hex colors to check.",
      fix: "Verify contrast manually for non-hex colors."
    }
  }
  if (low.length > 0) {
    return {
      ...base,
      status: "fail",
      message: `${low.length} color(s) fall below 3:1 contrast vs ${bg}: ${low.join(", ")}.`,
      fix: "Darken (light background) or lighten (dark background) those colors, or use COLOR_BLIND_SAFE_CATEGORICAL."
    }
  }
  return {
    ...base,
    status: "pass",
    message: `All ${checked} checked colorScheme color(s) meet ≥ 3:1 contrast vs ${bg}.`
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Audit a Semiotic chart configuration against the Chartability heuristics.
 * Pure, SSR-safe, no DOM. See module docstring for what static analysis can
 * and cannot determine.
 */
export function auditAccessibility(
  component: string,
  props: Datum,
  options: AuditAccessibilityOptions = {}
): AccessibilityAuditResult {
  const f: A11yFinding[] = []
  const recipe = getChartRecipe(component)
  const isPhysics = PHYSICS.has(component)
  const known = !!VALIDATION_MAP[component] || !!recipe || isPhysics
  const inContainer = options.inChartContainer === true
  const describes = options.describe === true
  const navigable = options.navigable === true

  const isValue = VALUE.has(component)
  const isHierarchy = HIERARCHY.has(component)
  const declaredProps = VALIDATION_MAP[component]?.props
  const supportsAccessibilityProp = (name: "title" | "description" | "summary") =>
    !!declaredProps?.[name]
  const unsupportedAccessibilityText = (["title", "description", "summary"] as const)
    .filter((name) => isNonEmptyString(props[name]) && !supportsAccessibilityProp(name))
  const tableEnabled = props.accessibleTable !== false && !isValue
  const hasTitle = supportsAccessibilityProp("title") && isNonEmptyString(props.title)
  const hasDescription = supportsAccessibilityProp("description") && isNonEmptyString(props.description)
  const hasSummary = supportsAccessibilityProp("summary") && isNonEmptyString(props.summary)
  const hasAnyText = hasTitle || hasDescription || hasSummary
  const interactive = isInteractive(props)
  const pauseControl = hasPauseControl(props)
  // StreamPhysicsFrame guarantees the settled-projection table and the
  // reduced-motion synchronous settle for its frame-based charts, so credit
  // those contracts by component (
  // is excluded). Pause control is not yet baked in and stays author-declared.
  const framePhysics = isPhysics
  const settledProjection =
    hasSettledProjection(props) || (PHYSICS_SETTLED.has(component) && tableEnabled)
  const reducedMotionSettle = hasReducedMotionSettle(props) || framePhysics
  const annotations = Array.isArray(props.annotations)
    ? (props.annotations as Datum[]).filter(
        (a): a is Datum => !!a && typeof a === "object"
      )
    : []

  // Tracks built-in passes that only hold for recognized Semiotic HOCs.
  const builtIn: A11yStatus = known ? "pass" : "manual"
  const builtInNote = known
    ? ""
    : ` (unrecognized component "${component}" — verify manually that the built-in applies)`

  if (unsupportedAccessibilityText.length > 0) {
    f.push({
      id: "understandable.unsupported-description-prop",
      principle: "understandable",
      heuristic: "Descriptive text is connected to the rendered chart",
      critical: true,
      status: "warn",
      message: `Useful ${unsupportedAccessibilityText.join(" and ")} text was supplied, but ${unsupportedAccessibilityText.length === 1 ? "that prop is" : "those props are"} not supported by ${component}'s declared chart API and cannot be credited as rendered accessibility text.`,
      fix: "Use the component's declared title, description, and summary props when available; for richer generated description or navigation, use ChartContainer with chartConfig plus describe and/or navigable.",
    })
  }

  // ── PERCEIVABLE ────────────────────────────────────────────────────────
  f.push(checkContrast(props))
  f.push({
    id: "perceivable.content-only-visual",
    principle: "perceivable",
    heuristic: "Content is only visual",
    critical: true,
    ...(isValue
      ? {
          status: "pass" as A11yStatus,
          message:
            "BigNumber renders its value as real text with an ARIA label — available without vision."
        }
      : tableEnabled
        ? {
            status: "pass" as A11yStatus,
            message:
              "A screen-reader data table + live region expose the data non-visually (accessibleTable is on)."
          }
        : hasDescription && hasSummary
          ? {
              status: "manual" as A11yStatus,
              message:
                "accessibleTable is off; a description + summary are present. Verify they convey everything the chart shows.",
              fix: "Re-enable accessibleTable, or confirm via screen reader that the text alternative is complete."
            }
          : {
              status: "fail" as A11yStatus,
              message:
                "accessibleTable is disabled and there's no full text alternative — the data is only available visually.",
              fix: "Remove accessibleTable={false}, or provide a complete description/summary plus a data table."
            })
  })
  f.push({
    id: "perceivable.small-text",
    principle: "perceivable",
    heuristic: "Small text size",
    critical: true,
    status: "pass",
    message:
      "Semiotic's default tick and axis-label fonts are 12px, meeting Chartability's 9pt/12px floor.",
    fix: "If a theme or override lowers --semiotic-tick-font-size below 12px, raise it back for low-vision audiences."
  })
  f.push({
    id: "perceivable.seizure-risk",
    principle: "perceivable",
    heuristic: "Visual presents seizure risk",
    critical: true,
    ...(props.pulse != null || CONTINUOUS_MOTION.has(component)
      ? {
          status: "manual" as A11yStatus,
          message:
            "Pulse/continuous animation is in use. Confirm nothing flashes more than 3×/sec, especially saturated red.",
          fix: "Avoid red flashes and rapid (>3 Hz) flicker; reduced-motion is auto-honored, but verify the default presentation."
        }
      : {
          status: "manual" as A11yStatus,
          message:
            "No flashing detected statically. Confirm no element flashes more than 3×/sec.",
          fix: "Manual check — most static charts pass trivially."
        })
  })
  if (props.colorBy != null) {
    // A redundant channel beyond color: direct labels, or — for XY series — the
    // series' own position. We can only see explicit label opt-ins here.
    const hasDirectLabel =
      props.directLabel === true || props.showLabels === true
    f.push({
      id: "perceivable.color-alone",
      principle: "perceivable",
      heuristic: "Color is used alone to communicate meaning",
      critical: false,
      ...(hasDirectLabel
        ? {
            status: "pass" as A11yStatus,
            message:
              "Categories are encoded by color (colorBy) and also directly labeled, so color isn't the only channel."
          }
        : {
            status: "warn" as A11yStatus,
            message:
              "Categories are encoded by color (colorBy) with no redundant channel — Semiotic does not yet ship texture/pattern fills.",
            fix: "Add direct labels (directLabel on LineChart/AreaChart, showLabels on network/hierarchy), keep categories ≤ ~7, and use a CVD-safe palette."
          })
    })

    const scheme = Array.isArray(props.colorScheme) ? props.colorScheme : null
    const schemeHexes = scheme
      ? scheme
          .filter(
            (c: unknown): c is string =>
              typeof c === "string" && c.startsWith("#")
          )
          .map((c) => c.toLowerCase())
      : []
    const usesSafePalette =
      schemeHexes.length > 0 &&
      schemeHexes.every((c) => CVD_SAFE_PALETTE.has(c))
    f.push({
      id: "perceivable.cvd-safe",
      principle: "perceivable",
      heuristic: "Not CVD-friendly",
      critical: false,
      ...(usesSafePalette
        ? {
            status: "pass" as A11yStatus,
            message: "colorScheme uses Semiotic's Wong colorblind-safe palette."
          }
        : {
            status: "manual" as A11yStatus,
            message:
              "Color encodes meaning; statically we can't confirm the palette is colorblind-safe.",
            fix: 'Use COLOR_BLIND_SAFE_CATEGORICAL from "semiotic", or test your scheme with Viz Palette / Chroma.'
          })
    })
    f.push({
      id: "flexible.textures-adjustable",
      principle: "flexible",
      heuristic: "Contrast and textures cannot be adjusted",
      critical: false,
      status: "warn",
      message:
        "There's no per-category texture/pattern channel to toggle as an alternative to color.",
      fix: "Until texture fills land, ensure the encoding survives color removal: direct labels + a CVD-safe palette. Contrast itself is themeable via CSS variables."
    })
  }

  // Annotation→target association (the "correspondence problem", Rahman et al.):
  // a note must tie to its target by more than color. Label/callout draw a
  // connector. A colored `text`/`widget` note, or a callout with its connector
  // disabled, ties to its target by color + position alone, which a color-blind
  // or non-visual reader can't follow. Statistical overlays, enclosures, and
  // reference lines are spatial encodings rather than correspondence notes, so
  // this note-specific heuristic does not audit them.
  {
    const anns = annotations.filter(isNoteAnnotation)
    if (anns.length > 0) {
      // M4 redundant-cue default: `autoPlaceAnnotations: { redundantCues: true }`
      // makes the renderer add a leader line to colored `text` notes, so they no
      // longer rely on color alone.
      const apa = props.autoPlaceAnnotations
      const redundantCues =
        typeof apa === "object" &&
        apa !== null &&
        (apa as Datum).redundantCues === true
      const cueless = anns.filter((a) => {
        if (typeof a.color !== "string") return false // not color-linked → not this problem
        const type = annotationType(a)
        // redundantCues gives colored `text` notes a leader line at render time.
        const drawsRedundantLeader = redundantCues && type === "text"
        // Any of these is a non-color cue → the association is redundant.
        return !(annotationDrawsConnector(a) || drawsRedundantLeader)
      })
      f.push({
        id: "perceivable.annotation-association",
        principle: "perceivable",
        heuristic: "Color is used alone to communicate meaning",
        critical: false,
        ...(cueless.length === 0
          ? {
              status: "pass" as A11yStatus,
              message:
                "No annotation relies on color alone to indicate its target — wherever color is used, a connector, enclosure, or reference-line cue is present too."
            }
          : {
              status: "warn" as A11yStatus,
              message: `${cueless.length} of ${anns.length} annotation(s) carry a color but no connector, enclosure, or reference-line cue, so a color-blind or non-visual reader can't tie them to their target (the correspondence problem).`,
              fix: "Add a connector (the label/callout default), place the note adjacent to its target, enclose the target, or enable autoPlaceAnnotations: { redundantCues: true } to give colored text notes a leader line — don't rely on color matching alone."
            })
      })
    }
  }

  // ── OPERABLE ───────────────────────────────────────────────────────────
  // Keyboard parity (critical): does the chart work with a keyboard at all?
  // Every recognized HOC ships arrow/Home/End/PageUp-Down/Enter navigation, so
  // it's not single-modality. (Mouse-only *complex actions* like brushing are a
  // separate, non-critical heuristic below.)
  f.push({
    id: "operable.single-input-modality",
    principle: "operable",
    heuristic: "Interaction modality only has one input type",
    critical: true,
    ...(known
      ? {
          status: "pass" as A11yStatus,
          message:
            "Built-in keyboard navigation (arrows/Home/End/PageUp-Down/Enter) mirrors mouse hover."
        }
      : {
          status: "manual" as A11yStatus,
          message: `Can't confirm keyboard support for "${component}".`,
          fix: "Verify Tab + arrow-key operation."
        })
  })
  // Complex actions (brush / zoom / filter / gesture) need a standard UI
  // alternative — distinct from basic keyboard parity.
  {
    const complex: string[] = []
    if (props.brush != null || props.onBrush != null) complex.push("brushing")
    if (props.zoomable === true) complex.push("zoom/pan")
    if (
      props.legendInteraction === "isolate" ||
      props.legendInteraction === "highlight"
    )
      complex.push("legend filtering")
    if (complex.length > 0) {
      f.push({
        id: "operable.complex-action-alternatives",
        principle: "operable",
        heuristic: "Complex actions have no alternatives",
        critical: false,
        status: "warn",
        message: `Mouse-driven ${complex.join(", ")} ${complex.length > 1 ? "have" : "has"} no built-in keyboard/standard-UI equivalent.`,
        fix: "Pair the complex interaction with a standard control (range inputs for a brush, buttons for zoom, a checkbox list for legend filtering) operable by keyboard and screen reader."
      })
    }
  }
  // Target size: small interactive marks are hard to hit (24px min).
  {
    const radiusProp = POINT_TARGET_RADIUS_PROP[component]
    if (radiusProp && interactive) {
      const r = props[radiusProp]
      if (typeof r === "number" && r > 0 && r * 2 < 24) {
        f.push({
          id: "operable.target-size",
          principle: "operable",
          heuristic: "Target pointer interaction size is too small",
          critical: false,
          status: "warn",
          message: `${radiusProp}=${r} gives a ~${r * 2}px hit target, below the 24×24px minimum for pointer interaction.`,
          fix: "Increase the radius, or rely on the chart's hoverRadius / keyboard navigation as the alternative for precise selection."
        })
      }
    }
  }
  // Tab stops: Semiotic's single-tab-stop + arrow-key model is the recommended
  // pattern for dense charts (vs. a tab stop per datum). Credit it.
  f.push({
    id: "operable.tab-stops",
    principle: "operable",
    heuristic: "Inappropriate tab stops",
    critical: false,
    status: builtIn,
    message: `The chart takes a single tab stop and navigates data with arrow keys${builtInNote} — the recommended pattern for dense charts (no per-datum tab stops to wade through).`
  })
  f.push({
    id: "operable.interaction-cues",
    principle: "operable",
    heuristic: "No interaction cues or instructions",
    critical: true,
    ...(!interactive
      ? {
          status: "not-applicable" as A11yStatus,
          message: "No interactive behavior detected."
        }
      : hasSummary || hasDescription
        ? {
            status: "manual" as A11yStatus,
            message:
              "Chart is interactive and has descriptive text. Confirm that text explains how to interact (keyboard + pointer).",
            fix: 'State the interaction model in summary, e.g. "Use arrow keys to move between points."'
          }
        : {
            status: "warn" as A11yStatus,
            message: "Chart is interactive but nothing explains how to use it.",
            fix: "Describe the interaction in a summary or nearby text (keyboard navigation, what hover/click reveals)."
          })
  })
  f.push({
    id: "operable.controls-override-at",
    principle: "operable",
    heuristic: "Controls override AT controls",
    critical: true,
    status: builtIn,
    message: `Keyboard handlers fire only while the chart has focus, so they don't hijack page/app screen-reader shortcuts${builtInNote}.`
  })
  f.push({
    id: "operable.focus-indicator",
    principle: "operable",
    heuristic: "Keyboard focus indicator missing, obscured, or low contrast",
    critical: false,
    status: builtIn,
    message: `A shape-adaptive focus ring (var(--semiotic-focus)) marks the focused element${builtInNote}.`,
    fix: known
      ? "Ensure --semiotic-focus keeps ≥ 3:1 contrast against your background."
      : undefined
  })

  // ── UNDERSTANDABLE ─────────────────────────────────────────────────────
  f.push({
    id: "understandable.title-summary-caption",
    principle: "understandable",
    heuristic: "No title, summary, or caption",
    critical: true,
    ...(hasAnyText
      ? {
          status: "pass" as A11yStatus,
          message: `Provided: ${[hasTitle && "title", hasDescription && "description", hasSummary && "summary"].filter(Boolean).join(", ")}.`
        }
      : inContainer
        ? {
            status: "manual" as A11yStatus,
            message:
              "No title/description/summary on the chart. If the wrapping ChartContainer supplies a title/subtitle, this is covered at that layer — verify it does.",
            fix: "Give the ChartContainer a title (and optionally enable describe), or set title/description/summary on the chart."
          }
        : {
            status: "fail" as A11yStatus,
            message:
              "No title, description, or summary — the screen reader falls back to a generic label.",
            fix: "Add title/description/summary on the chart, or wrap it in a ChartContainer (the opt-in layer for title/caption/description chrome)."
          })
  })
  f.push({
    id: "understandable.explain-purpose",
    principle: "understandable",
    heuristic: "No explanation for purpose or for how to read",
    critical: true,
    ...(hasDescription || hasSummary
      ? {
          status: "pass" as A11yStatus,
          message:
            "A description/summary is available to explain purpose and how to read the chart."
        }
      : describes
        ? {
            status: "manual" as A11yStatus,
            message:
              "ChartContainer's describe option explains how to read the chart (type, stats, trend). Confirm the domain purpose — why this chart exists — is also conveyed (title/subtitle).",
            fix: "Give the ChartContainer a title/subtitle stating the purpose; describe() covers the how-to-read half."
          }
        : hasTitle
          ? {
              status: "warn" as A11yStatus,
              message:
                "Only a title is set — a label, not an explanation of purpose or how to read the chart.",
              fix: "Add a summary, or enable ChartContainer's describe option for an auto-generated how-to-read description."
            }
          : {
              status: "fail" as A11yStatus,
              message:
                "Nothing explains the chart's purpose or how to read it.",
              fix: "Add a summary/description, or wrap in a ChartContainer with a title and the describe option (the opt-in full-accessibility layer)."
            })
  })
  {
    const text = [props.description, props.summary]
      .filter(isNonEmptyString)
      .join(". ")
    const grade = text ? fleschKincaidGrade(text) : null
    f.push({
      id: "understandable.reading-level",
      principle: "understandable",
      heuristic: "Reading level inappropriate",
      critical: true,
      ...(grade == null
        ? {
            status: "not-applicable" as A11yStatus,
            message: "No description/summary text to grade."
          }
        : grade > 9
          ? {
              status: "warn" as A11yStatus,
              message: `Description/summary reads at ~grade ${grade.toFixed(0)}; Chartability targets grade 9 or lower.`,
              fix: "Shorten sentences and prefer common words."
            }
          : {
              status: "pass" as A11yStatus,
              message: `Description/summary reads at ~grade ${Math.max(0, Math.round(grade))} (≤ 9).`
            })
    })
  }
  if (XY_WITH_AXES.has(component)) {
    const hasX = isNonEmptyString(props.xLabel)
    const hasY = isNonEmptyString(props.yLabel)
    f.push({
      id: "understandable.axis-labels",
      principle: "understandable",
      heuristic: "Axis labels are unclear or missing",
      critical: false,
      ...(hasX && hasY
        ? {
            status: "pass" as A11yStatus,
            message: "Both axes are labeled (xLabel, yLabel)."
          }
        : {
            status: "warn" as A11yStatus,
            message: `Missing axis label: ${[!hasX && "xLabel", !hasY && "yLabel"].filter(Boolean).join(", ")}. Ticks alone may not name the variable.`,
            fix: "Set xLabel and yLabel to name each axis's variable and units."
          })
    })
  }
  if (DUAL_AXIS.has(component)) {
    f.push({
      id: "understandable.information-complexity",
      principle: "understandable",
      heuristic: "Information complexity is inappropriate",
      critical: false,
      status: "warn",
      message:
        "Dual-axis chart: two y-scales are hard to read accurately and notoriously easy to misinterpret (the crossover point is arbitrary).",
      fix: "Confirm the second axis is necessary; consider two aligned charts (small multiples) or indexing both series to a common baseline. Label each axis and its series unambiguously."
    })
  }
  if (annotations.length > 1) {
    const hierarchyCount = annotations.filter(
      annotationHasHierarchySignal
    ).length
    const missing = annotations.length - hierarchyCount
    f.push({
      id: "understandable.annotation-hierarchy",
      principle: "understandable",
      heuristic: "Information complexity is inappropriate",
      critical: false,
      ...(hierarchyCount === annotations.length
        ? {
            status: "pass" as A11yStatus,
            message: `All ${annotations.length} annotation(s) declare hierarchy through emphasis or provenance confidence, so the renderer can resolve reading order and visual priority.`
          }
        : hierarchyCount === 0
          ? {
              status: "warn" as A11yStatus,
              message: `${annotations.length} annotations are present with no emphasis or provenance confidence; readers may not know which note is primary.`,
              fix: 'Mark the main annotation with emphasis="primary", set supporting notes to emphasis="secondary", or provide provenance.confidence so Semiotic can infer order.'
            }
          : {
              status: "warn" as A11yStatus,
              message: `${missing} of ${annotations.length} annotation(s) have no emphasis or provenance confidence; readers may not know which note is primary among the unordered notes.`,
              fix: "Set emphasis on each annotation (primary/secondary), or provide provenance.confidence on all annotations so Semiotic can infer order."
            })
    })
  }
  {
    const hasUncertainty =
      props.forecast != null ||
      props.anomaly != null ||
      props.band != null ||
      props.regression != null
    if (hasUncertainty) {
      f.push({
        id: "understandable.uncertainty",
        principle: "understandable",
        heuristic: "Statistical uncertainty isn't clearly communicated",
        critical: false,
        status: "manual",
        message:
          "The chart shows a forecast/regression/band/anomaly overlay. Confirm the uncertainty it represents is explained in text, not just drawn.",
        fix: "State the confidence interval / method in the summary, and label the band so it isn't mistaken for data."
      })
    }
  }
  if (props.animate != null && props.animate !== false) {
    f.push({
      id: "understandable.changes-followable",
      principle: "understandable",
      heuristic: "Changes are not easy to follow",
      critical: false,
      status: builtIn,
      message: `Transitions animate with object constancy and data changes are mirrored to the live region${builtInNote}.`,
      fix: known
        ? "Keep transition durations in the 250ms–2s range so changes are followable but not slow."
        : undefined
    })
  }

  // ── ROBUST ─────────────────────────────────────────────────────────────
  f.push({
    id: "robust.conforms-to-standards",
    principle: "robust",
    heuristic: "Does not conform to standards",
    critical: false,
    status: "manual",
    message:
      "WCAG 2.1 / Section 508 conformance can't be settled from config alone.",
    fix: "Run an automated checker (axe) on the rendered output and test with real assistive tech."
  })
  f.push({
    id: "robust.semantically-valid",
    principle: "robust",
    heuristic: "Semantically invalid",
    critical: false,
    status: "manual",
    message:
      "Whether interactive elements expose correct roles/names is a render-time, screen-reader question.",
    fix: "Verify with a screen reader that buttons read as buttons, the chart as an image/group, etc."
  })
  f.push({
    id: "robust.fragile-technology-support",
    principle: "robust",
    heuristic: "Fragile technology support",
    critical: false,
    status: builtIn,
    message: `Charts render on canvas with an SVG overlay and render to SVG in SSR, so access isn't tied to one rendering path${builtInNote}.`,
    fix: known
      ? "Still test across NVDA+Firefox, JAWS+Chrome, and VoiceOver+Safari — AT support varies."
      : undefined
  })

  // ── COMPROMISING ───────────────────────────────────────────────────────
  f.push({
    id: "compromising.table",
    principle: "compromising",
    heuristic: "No table",
    critical: true,
    ...(isValue
      ? {
          status: "not-applicable" as A11yStatus,
          message: "Single-value display — a table isn't meaningful."
        }
      : tableEnabled
        ? {
            status: "pass" as A11yStatus,
            message:
              "A human-readable data table is provided (accessibleTable)."
          }
        : {
            status: "fail" as A11yStatus,
            message:
              "accessibleTable is disabled — no human-readable table of the underlying data.",
            fix: "Remove accessibleTable={false} (unless title/summary/annotations already convey all the data)."
          })
  })
  if (!isValue) {
    f.push({
      id: "compromising.table-static",
      principle: "compromising",
      heuristic: "Table/data is static",
      critical: false,
      ...(inContainer
        ? {
            status: "manual" as A11yStatus,
            message:
              "Rendered in a ChartContainer. If a data-download action is enabled, the data is exportable.",
            fix: "Enable the ChartContainer data-download action so users can save the underlying data (keep it opt-in)."
          }
        : {
            status: "warn" as A11yStatus,
            message:
              "The data table is read-only — not downloadable, sortable, or filterable.",
            fix: "Wrap the chart in a ChartContainer and enable its data-download action (opt-in, so deployments can withhold it where export isn't allowed)."
          })
    })
  }
  f.push({
    id: "compromising.shareable-state",
    principle: "compromising",
    heuristic: "State is not easy to share and reproduce",
    critical: false,
    status: known ? "pass" : "manual",
    message: `Chart state serializes via toConfig/toURL/copyConfig${known ? "" : builtInNote}.`,
    fix: known
      ? "Expose it to users via the ChartContainer copyConfig action or a shareable URL."
      : undefined
  })
  f.push({
    id: "compromising.navigable-structure",
    principle: "compromising",
    heuristic:
      "Information cannot be navigated according to narrative or structure",
    critical: false,
    ...(navigable
      ? {
          status: "pass" as A11yStatus,
          message:
            "ChartContainer's navigable option mounts a structured tree (chart → axes/series → data points) that screen readers can traverse."
        }
      : isHierarchy
        ? {
            status: "warn" as A11yStatus,
            message:
              "Hierarchical chart: built-in keyboard navigation is largely flat — it doesn't descend the tree structure.",
            fix: "Enable ChartContainer's navigable option for a structured navigation tree, or lean on the data table and a summary that conveys the hierarchy."
          }
        : {
            status: builtIn,
            message: `Keyboard navigation steps through points and switches series/groups${builtInNote}.`,
            fix: known
              ? "For deeper structure (axis → series → datum), enable ChartContainer's navigable option."
              : undefined
          })
  })

  // ── ASSISTIVE ──────────────────────────────────────────────────────────
  {
    const data = Array.isArray(props.data) ? props.data : null
    const nodes = Array.isArray(props.nodes) ? props.nodes : null
    const base = {
      id: "assistive.data-density",
      principle: "assistive" as A11yPrinciple,
      heuristic: "Data density is inappropriate",
      critical: true
    }
    let density: A11yFinding
    if (PART_TO_WHOLE.has(component) && data && data.length > 7) {
      density = {
        ...base,
        status: "warn",
        message: `${data.length} slices in a part-to-whole chart. Chartability suggests ≤ 5 categories; many thin slices are hard to perceive and to describe.`,
        fix: 'Group small slices into an "Other" category, or switch to a ranked bar chart.'
      }
    } else if (nodes && nodes.length > 200) {
      density = {
        ...base,
        status: "warn",
        message: `${nodes.length} nodes. A network this size is hard to navigate non-visually node by node.`,
        fix: "Provide a summary of structure (clusters, hubs, components) and consider filtering or aggregating the graph."
      }
    } else if (data && data.length > 5000) {
      density = {
        ...base,
        status: "warn",
        message: `${data.length} data points. Canvas renders this fine, but the non-visual table/navigation become unwieldy.`,
        fix: "Aggregate or bin for the accessible representation, or expose summary statistics rather than every row."
      }
    } else if (data) {
      density = {
        ...base,
        status: "pass",
        message: `${data.length} data points — a reasonable density for non-visual consumption.`
      }
    } else if (nodes) {
      density = {
        ...base,
        status: "pass",
        message: `${nodes.length} nodes — a reasonable density for non-visual consumption.`
      }
    } else {
      density = {
        ...base,
        status: "manual",
        message:
          "Data not provided inline (push mode); verify density at runtime."
      }
    }
    f.push(density)
  }
  // Human-readable numbers: large magnitudes need formatting (6.5b, not 6500000000).
  {
    const data = Array.isArray(props.data) ? props.data : null
    const hasFormatter = [
      "valueFormat",
      "yFormat",
      "xFormat",
      "tickFormat",
      "format"
    ].some(
      (k) => typeof props[k] === "function" || typeof props[k] === "string"
    )
    let hasLargeNumbers = false
    if (data && !hasFormatter) {
      for (const row of data.slice(0, 50)) {
        if (!row || typeof row !== "object") continue
        for (const v of Object.values(row as Record<string, unknown>)) {
          if (
            typeof v === "number" &&
            Number.isFinite(v) &&
            Math.abs(v) >= 100000
          ) {
            hasLargeNumbers = true
            break
          }
        }
        if (hasLargeNumbers) break
      }
    }
    if (hasLargeNumbers) {
      f.push({
        id: "assistive.human-readable-numbers",
        principle: "assistive",
        heuristic: "Data in text is not human-readable",
        critical: false,
        status: "warn",
        message:
          'Data includes large numbers (≥ 100,000) and no value/tick formatter — screen readers will read every digit (e.g. "six hundred fifty thousand…").',
        fix: 'Pass valueFormat / yFormat (e.g. a compact formatter so 6,500,000 reads as "6.5M"); the formatter flows to ticks, tooltips, and the data table.'
      })
    }
  }
  f.push({
    id: "assistive.features-described",
    principle: "assistive",
    heuristic: "Visually apparent features and relationships are not described",
    critical: false,
    ...(describes
      ? {
          status: "pass" as A11yStatus,
          message:
            "ChartContainer's describe option auto-generates an L1–L3 description (chart type, statistics, and trend) via describeChart()."
        }
      : hasSummary
        ? {
            status: "manual" as A11yStatus,
            message:
              "A summary is present. Confirm it describes trends, extrema, clusters, and outliers — not just what the chart is.",
            fix: "Cover the L2/L3 content blind readers value most: direction of trend, peak/trough, notable outliers."
          }
        : {
            status: "warn" as A11yStatus,
            message:
              "No text describes the visually apparent trends, extrema, or outliers.",
            fix: "Enable ChartContainer's describe option (auto-generates via describeChart()), or write a summary covering the key trend and notable points."
          })
  })
  f.push({
    id: "assistive.skippable-navigation",
    principle: "assistive",
    heuristic: "Navigation and interaction is tedious",
    critical: true,
    ...(isValue
      ? {
          status: "not-applicable" as A11yStatus,
          message: "Single value — nothing to skip."
        }
      : tableEnabled
        ? {
            status: "pass" as A11yStatus,
            message:
              'A "Skip to data table" link lets screen-reader users bypass point-by-point navigation.'
          }
        : {
            status: "warn" as A11yStatus,
            message:
              "accessibleTable is off, removing the skip-to-table affordance.",
            fix: "Keep accessibleTable enabled so users can skip past dense point navigation."
          })
  })

  // ── FLEXIBLE ───────────────────────────────────────────────────────────
  f.push({
    id: "flexible.user-style-respected",
    principle: "flexible",
    heuristic: "User style change not respected",
    critical: true,
    status: builtIn,
    message: `Styling flows through CSS custom properties and honors forced-colors mode, so user/user-agent style changes cascade in${builtInNote}.`,
    fix: known
      ? "Avoid hardcoding colors via frameProps style fns that bypass theme variables."
      : undefined
  })
  f.push({
    id: "flexible.reduced-motion",
    principle: "flexible",
    heuristic: "Long animations cannot be controlled",
    critical: false,
    ...(CONTINUOUS_MOTION.has(component) || REALTIME.has(component)
      ? pauseControl
        ? {
            status: "pass" as A11yStatus,
            message: `${component} animates continuously and declares an in-chart pause/stop control.`
          }
        : {
            status: "warn" as A11yStatus,
            message: `${component} animates continuously. prefers-reduced-motion is auto-honored, but there's no in-chart pause/stop control for users who don't set that preference.`,
            fix: "Offer a pause/stop control for looping/streaming motion (Chartability requires it for animation > 2s)."
          }
      : {
          status: builtIn,
          message: `prefers-reduced-motion is auto-detected; transitions fast-forward and looping animation stops${builtInNote}.`
        })
  })
  if (isPhysics) {
    f.push({
      id: "flexible.sim-pause-control",
      principle: "flexible",
      heuristic: "Long animations cannot be controlled",
      critical: false,
      ...(pauseControl
        ? {
            status: "pass" as A11yStatus,
            message:
              "Physics simulation exposes a pause/stop control for users who need to stop motion."
          }
        : {
            status: "warn" as A11yStatus,
            message: "Physics simulation has no declared pause/stop control.",
            fix: "Provide a visible pause control and set physics.pauseControl=true (or pauseControl=true) so the contract is auditable."
          })
    })
    f.push({
      id: "flexible.settled-projection",
      principle: "flexible",
      heuristic: "User style change not respected",
      critical: false,
      ...(settledProjection
        ? {
            status: "pass" as A11yStatus,
            message:
              "A settled-projection table is declared, so non-visual readers get aggregate chart semantics instead of trajectories."
          }
        : {
            status: "warn" as A11yStatus,
            message:
              "Physics chart does not declare a settled projection for its accessible table.",
            fix: "Provide aggregate rows from the settled projection and set physics.settledProjection=true."
          })
    })
    f.push({
      id: "flexible.reduced-motion-settle",
      principle: "flexible",
      heuristic: "Long animations cannot be controlled",
      critical: false,
      ...(reducedMotionSettle
        ? {
            status: "pass" as A11yStatus,
            message:
              "Reduced-motion mode settles the simulation to a static chart state instead of freezing bodies mid-flight."
          }
        : {
            status: "warn" as A11yStatus,
            message:
              "Physics chart does not declare reduced-motion synchronous settle behavior.",
            fix: "In reduced motion, run the world to its settled projection and paint once; set physics.reducedMotionSettle=true."
          })
    })
  }
  {
    const reflows =
      props.responsiveWidth === true || props.responsiveHeight === true
    const geoZoom = GEO.has(component) && props.zoomable === true
    f.push({
      id: "flexible.zoom-reflow",
      principle: "flexible",
      heuristic: "Zoom and reflow are not supported",
      critical: false,
      ...(reflows
        ? {
            status: "pass" as A11yStatus,
            message: `Chart reflows to its container (${[props.responsiveWidth === true && "responsiveWidth", props.responsiveHeight === true && "responsiveHeight"].filter(Boolean).join(", ")}), so page zoom doesn't clip it.`
          }
        : geoZoom
          ? {
              status: "pass" as A11yStatus,
              message: "Geo chart is zoomable/pannable."
            }
          : {
              status: "manual" as A11yStatus,
              message:
                "Fixed width/height — verify the chart survives browser zoom and reflow without clipping or loss of function.",
              fix: "Use responsiveWidth/responsiveHeight so the chart reflows to its container."
            })
    })
  }

  if (recipe) {
    const colorOnly = recipe.encodings?.some(
      (encoding) =>
        encoding.channel === "color" &&
        (!encoding.redundantWith || encoding.redundantWith.length === 0)
    )
    if (colorOnly) {
      f.push({
        id: "perceivable.recipe-color-alone",
        principle: "perceivable",
        heuristic: "Color is used alone to communicate meaning",
        critical: false,
        status: "warn",
        message: `${recipe.name} declares a color encoding without a redundant cue.`,
        fix: "Add shape, label, position, texture, or a textual category summary to the recipe encoding."
      })
    }
    if (
      recipe.accessibility.description === "required" &&
      !isNonEmptyString(props.description)
    ) {
      f.push({
        id: "understandable.recipe-description",
        principle: "understandable",
        heuristic: "Features are not described",
        critical: false,
        status: "fail",
        message: `${recipe.name} requires a recipe-aware description, but none is attached.`,
        fix: "Call describeChart with recipeId/recipe metadata and attach the returned text as description."
      })
    }
    if (recipe.accessibility.fallbackTable && props.accessibleTable === false) {
      f.push({
        id: "compromising.recipe-fallback",
        principle: "compromising",
        heuristic: "No data table is provided",
        critical: true,
        status: "fail",
        message: `${recipe.name} requires a fallback table, but accessibleTable is disabled.`,
        fix: "Enable accessibleTable and preserve recipe-declared table fields on scene nodes."
      })
    }
  }

  // ── Tally ──────────────────────────────────────────────────────────────
  const evaluated = f.filter((x) => x.status !== "not-applicable")
  const criticals = evaluated.filter((x) => x.critical)
  const summary = {
    criticalsPassed: criticals.filter((x) => x.status === "pass").length,
    criticalsEvaluated: criticals.length,
    fails: f.filter((x) => x.status === "fail").length,
    warnings: f.filter((x) => x.status === "warn").length,
    manual: f.filter((x) => x.status === "manual").length,
    passes: f.filter((x) => x.status === "pass").length
  }
  const ok = !criticals.some((x) => x.status === "fail")

  return { component, ok, summary, findings: f, reference: REFERENCE }
}

/**
 * Distil an audit result into terse caveat strings — the author-actionable
 * `fail` and `warn` findings, one line each. Lets the recommender (and an AI
 * agent) read *receivability* caveats ("8 slices is too many," "color-only
 * encoding") from the same channel as the perceptual caveats a capability
 * descriptor already declares, instead of two disconnected surfaces.
 *
 * Pure. Pair with {@link auditAccessibility}:
 * ```ts
 * const caveats = accessibilityCaveats(auditAccessibility("PieChart", props))
 * ```
 *
 * @param onlyCritical When true, restrict to critical heuristics (the 14 that
 *   Chartability flags). Default false — include all fail/warn findings.
 */
export function accessibilityCaveats(
  result: AccessibilityAuditResult,
  { onlyCritical = false }: { onlyCritical?: boolean } = {}
): string[] {
  const out: string[] = []
  for (const f of result.findings) {
    if (f.status !== "fail" && f.status !== "warn") continue
    if (onlyCritical && !f.critical) continue
    out.push(f.message)
  }
  return out
}

// ---------------------------------------------------------------------------
// Formatting (shared by CLI + MCP so their output stays identical)
// ---------------------------------------------------------------------------

const STATUS_ICON: Record<A11yStatus, string> = {
  pass: "✓",
  fail: "✗",
  warn: "⚠",
  manual: "○",
  "not-applicable": "·"
}

const PRINCIPLE_ORDER: A11yPrinciple[] = [
  "perceivable",
  "operable",
  "understandable",
  "robust",
  "compromising",
  "assistive",
  "flexible"
]

/** Render an audit result as a human-readable report (used by --audit-a11y + MCP). */
export function formatAccessibilityAudit(
  result: AccessibilityAuditResult
): string {
  const lines: string[] = []
  const s = result.summary
  const verdict = result.ok
    ? `${s.criticalsPassed}/${s.criticalsEvaluated} critical heuristics pass`
    : `${s.fails} blocking failure(s) — ${s.criticalsPassed}/${s.criticalsEvaluated} critical heuristics pass`
  lines.push(
    `${result.ok ? "✓" : "✗"} ${result.component}: accessibility audit (Chartability POUR-CAF)`
  )
  lines.push(
    `  ${verdict} · ${s.warnings} warning(s) · ${s.manual} to verify manually`
  )

  for (const principle of PRINCIPLE_ORDER) {
    const group = result.findings.filter(
      (x) => x.principle === principle && x.status !== "not-applicable"
    )
    if (group.length === 0) continue
    lines.push("")
    lines.push(`  ${principle.toUpperCase()}`)
    for (const x of group) {
      const crit = x.critical ? " [critical]" : ""
      lines.push(`    ${STATUS_ICON[x.status]} ${x.id}${crit}: ${x.message}`)
      if (
        x.fix &&
        (x.status === "fail" || x.status === "warn" || x.status === "manual")
      ) {
        lines.push(`        → ${x.fix}`)
      }
    }
  }
  lines.push("")
  lines.push(`  Ref: ${result.reference}`)
  return lines.join("\n")
}
