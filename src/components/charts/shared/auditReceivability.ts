import type { Datum } from "./datumTypes"
import type {
  A11yFinding,
  A11yPrinciple,
  A11yStatus,
  AuditAccessibilityOptions
} from "./auditAccessibility"
import { hasDeclaredHatchFill } from "./auditAccessibilityStyles"
import {
  PART_TO_WHOLE_CHARTS as PART_TO_WHOLE,
  HIERARCHY_CHARTS as HIERARCHY,
  VALUE_CHARTS as VALUE,
  PHYSICS_MOTION_CHARTS as PHYSICS
} from "./chartFamilySets"
import { isKnownChartComponent } from "./knownChartComponents"
import { getChartRecipe } from "../../ai/chartRecipeRegistry"
import { assessAccessibilityText } from "./auditAccessibilityText"

interface ReceivabilityContext {
  component: string
  props: Datum
  isValue: boolean
  tableEnabled: boolean
  hasDescription: boolean
  hasSummary: boolean
  known: boolean
  builtIn: A11yStatus
  builtInNote: string
  navigable: boolean
  isHierarchy: boolean
}

export function checkVisualContent(
  f: A11yFinding[],
  { isValue, tableEnabled, hasDescription, hasSummary }: ReceivabilityContext
): void {
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
}

export function checkColorChannels(
  f: A11yFinding[],
  { props }: ReceivabilityContext
): void {
  if (props.colorBy != null) {
    // A redundant channel beyond color: direct labels, or — for XY series — the
    // series' own position. We can only see explicit label opt-ins here.
    const hasDirectLabel =
      props.directLabel === true || props.showLabels === true
    const hasAuthoredTexture = hasDeclaredHatchFill(props)
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
            message: hasAuthoredTexture
              ? "Categories use colorBy and this config authors a HatchFill through styleRules, but a static audit cannot prove those rules give every category a distinct non-color cue. Semiotic does not automatically assign per-category textures."
              : "Categories are encoded by color (colorBy) with no declared redundant channel. Semiotic supports author-supplied HatchFill patterns through styleRules, but this config has no statically visible HatchFill descriptor and there is no automatic per-category texture assignment.",
            fix: hasAuthoredTexture
              ? "Verify every category remains distinguishable with color removed; add direct labels where hatching is incomplete, keep categories ≤ ~7, and use a CVD-safe palette."
              : "Add direct labels (directLabel on LineChart/AreaChart, showLabels on network/hierarchy) or category-targeted styleRules with distinct HatchFill descriptors; keep categories ≤ ~7 and use a CVD-safe palette."
          })
    })
  }
}

export function checkDataTable(
  f: A11yFinding[],
  { isValue, tableEnabled }: ReceivabilityContext
): void {
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
}

export function checkNavigableStructure(
  f: A11yFinding[],
  { navigable, isHierarchy, builtIn, builtInNote, known }: ReceivabilityContext
): void {
  f.push({
    id: "compromising.navigable-structure",
    principle: "compromising",
    heuristic:
      "Information cannot be navigated according to narrative or structure",
    critical: false,
    ...(navigable
      ? isHierarchy
        ? {
            status: "pass" as A11yStatus,
            message:
              "ChartContainer's navigable option mounts a structured navigation tree, including hierarchy/network branches and their data items."
          }
        : {
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
}

export function checkDataDensity(
  f: A11yFinding[],
  { component, props }: ReceivabilityContext
): void {
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
}

export function checkNumberReadability(
  f: A11yFinding[],
  { props }: ReceivabilityContext
): void {
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
}

export function checkSkippableNavigation(
  f: A11yFinding[],
  { isValue, tableEnabled }: ReceivabilityContext
): void {
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
}

/** Reuse the full audit checks needed for nonvisual ranking without retaining unrelated checks. */
export function auditReceivability(
  component: string,
  props: Datum,
  options: AuditAccessibilityOptions = {}
): A11yFinding[] {
  const recipe = getChartRecipe(component),
    isValue = VALUE.has(component),
    known =
      isKnownChartComponent(component) || !!recipe || PHYSICS.has(component),
    tableEnabled = props.accessibleTable !== false && !isValue,
    navigable = options.navigable === true,
    isHierarchy = HIERARCHY.has(component),
    builtIn: A11yStatus = known ? "pass" : "manual",
    builtInNote = known
      ? ""
      : ` (unrecognized component "${component}" — verify manually that the built-in applies)`
  const { hasDescription, hasSummary } = assessAccessibilityText(
    component,
    props,
    recipe?.frameFamily
  )
  const f: A11yFinding[] = []
  const context = {
    component,
    props,
    isValue,
    tableEnabled,
    hasDescription,
    hasSummary,
    known,
    builtIn,
    builtInNote,
    navigable,
    isHierarchy
  }
  checkVisualContent(f, context)
  checkColorChannels(f, context)
  checkDataTable(f, context)
  checkNavigableStructure(f, context)
  checkDataDensity(f, context)
  checkNumberReadability(f, context)
  checkSkippableNavigation(f, context)
  return f
}
