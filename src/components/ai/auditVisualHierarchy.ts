import { contrastRatio } from "../charts/shared/colorContrast"
import {
  colorEvidenceToHex,
  compositeColorEvidence,
  parseColorEvidence
} from "./colorEvidence"

export type VisualHierarchyStatus = "pass" | "warn" | "manual"

export interface VisualHierarchyInput {
  /** The chart field's resolved solid background color. */
  readonly backgroundColor: string
  /** Resolved colors used by the primary data marks. */
  readonly dataColors: ReadonlyArray<string>
  /** Resolved color used by grids, guides, or other reference scaffolding. */
  readonly scaffoldColor: string
  /** Scaffold opacity before compositing over the background. Default 1. */
  readonly scaffoldOpacity?: number
  /** Minimum mark/scaffold contrast ratio. Default 2. */
  readonly minimumHierarchyRatio?: number
  /** Lowest useful scaffold/background contrast. Default 1.1. */
  readonly minimumScaffoldContrast?: number
  /** Highest subordinate scaffold/background contrast. Default 2. */
  readonly maximumScaffoldContrast?: number
}

export interface VisualHierarchyFinding {
  readonly code:
    "SCAFFOLD_DOMINANCE" | "SCAFFOLD_VISIBILITY" | "VISUAL_HIERARCHY_MANUAL"
  readonly status: VisualHierarchyStatus
  readonly message: string
  readonly fix?: string
}

export interface VisualHierarchyAuditResult {
  readonly ok: boolean
  readonly status: VisualHierarchyStatus
  readonly finding: VisualHierarchyFinding
  readonly evidence?: {
    readonly weakestDataContrast: number
    readonly scaffoldContrast: number
    readonly hierarchyRatio: number
  }
  readonly method: "mark-to-scaffold-contrast"
}

function composite(
  foreground: string,
  background: string,
  opacity: number
): string | null {
  const fg = parseColorEvidence(foreground)
  const bg = parseColorEvidence(background)
  if (!fg || !bg) return null
  const composited = compositeColorEvidence(
    { ...fg, a: fg.a * Math.min(1, Math.max(0, opacity)) },
    bg
  )
  return composited ? colorEvidenceToHex(composited) : null
}

/**
 * Audit one intentionally narrow presentation boundary: primary data marks
 * should lead and reference scaffolding should recede.
 *
 * This is deliberately not a universal beauty score. Aesthetic preferences
 * vary, but research supports bounding grids to a visible-yet-unobtrusive
 * range rather than claiming an ideal style:
 * https://www.tableau.com/research/publications/whisper-dont-scream-grids-and-transparency
 *
 * The guardrail combines familiar non-text contrast (data marks >= 3:1) with
 * a conservative scaffold ceiling (<= 2:1) and requires the marks to carry at
 * least twice the scaffold's contrast. These are Semiotic lint boundaries,
 * not thresholds reported verbatim by that study.
 */
export function auditVisualHierarchy(
  input: VisualHierarchyInput
): VisualHierarchyAuditResult {
  const background = parseColorEvidence(input.backgroundColor)
  const opaqueBackground = background ? colorEvidenceToHex(background) : null
  const scaffoldComposite = composite(
    input.scaffoldColor,
    input.backgroundColor,
    input.scaffoldOpacity ?? 1
  )
  const scaffoldContrast =
    scaffoldComposite && opaqueBackground
      ? contrastRatio(scaffoldComposite, opaqueBackground)
      : null
  const dataContrasts = input.dataColors
    .map((color) => composite(color, input.backgroundColor, 1))
    .map((color) =>
      color && opaqueBackground ? contrastRatio(color, opaqueBackground) : null
    )
    .filter((value): value is number => value !== null)

  if (
    scaffoldContrast === null ||
    dataContrasts.length !== input.dataColors.length ||
    dataContrasts.length === 0
  ) {
    return {
      ok: true,
      status: "manual",
      method: "mark-to-scaffold-contrast",
      finding: {
        code: "VISUAL_HIERARCHY_MANUAL",
        status: "manual",
        message:
          "Visual hierarchy could not be computed from the supplied colors.",
        fix: "Resolve CSS variables, gradients, or named colors to solid colors and run the audit again."
      }
    }
  }

  const weakestDataContrast = Math.min(...dataContrasts)
  const hierarchyRatio = weakestDataContrast / scaffoldContrast
  const evidence = { weakestDataContrast, scaffoldContrast, hierarchyRatio }
  const minimumScaffoldContrast = Math.max(
    1,
    input.minimumScaffoldContrast ?? 1.1
  )
  const maximumScaffoldContrast = Math.max(
    minimumScaffoldContrast,
    input.maximumScaffoldContrast ?? 2
  )
  const minimumHierarchyRatio = Math.max(1, input.minimumHierarchyRatio ?? 2)
  if (scaffoldContrast < minimumScaffoldContrast) {
    return {
      ok: false,
      status: "warn",
      method: "mark-to-scaffold-contrast",
      evidence,
      finding: {
        code: "SCAFFOLD_VISIBILITY",
        status: "warn",
        message: "Reference scaffolding may be too faint to remain useful.",
        fix: "Increase grid or guide contrast while keeping it below the primary data marks."
      }
    }
  }
  const passes =
    weakestDataContrast >= 3 &&
    scaffoldContrast <= maximumScaffoldContrast &&
    hierarchyRatio >= minimumHierarchyRatio

  if (!passes) {
    return {
      ok: false,
      status: "warn",
      method: "mark-to-scaffold-contrast",
      evidence,
      finding: {
        code: "SCAFFOLD_DOMINANCE",
        status: "warn",
        message: "Reference scaffolding competes with the primary data marks.",
        fix: "Increase mark contrast or lighten grid and guide colors until marks have at least twice the scaffold contrast."
      }
    }
  }

  return {
    ok: true,
    status: "pass",
    method: "mark-to-scaffold-contrast",
    evidence,
    finding: {
      code: "SCAFFOLD_DOMINANCE",
      status: "pass",
      message:
        "Primary data marks lead while reference scaffolding remains visible and subordinate."
    }
  }
}
