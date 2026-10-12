import {
  VISUALIZATION_CONTROL_TYPES,
  type VisualizationControlDefinition,
} from "./controlContract"

export type ControlAuditStatus = "pass" | "warn" | "fail"

export interface ControlAuditFinding {
  id: string
  controlId?: string
  status: ControlAuditStatus
  message: string
  remediation?: string
}

export interface ControlAuditResult {
  ok: boolean
  findings: ControlAuditFinding[]
}

export interface AuditVisualizationControlsOptions {
  controls?: ReadonlyArray<VisualizationControlDefinition>
  minimumTargetSize?: number
  /** Mounted control or container. Adds measured target-size findings to the declarations. */
  element?: Element
}

function finding(
  id: string,
  controlId: string | undefined,
  status: ControlAuditStatus,
  message: string,
  remediation?: string,
): ControlAuditFinding {
  return { id, ...(controlId ? { controlId } : {}), status, message, ...(remediation ? { remediation } : {}) }
}

/**
 * Audit portable control declarations without requiring a mounted chart. It
 * verifies the invariants an agent or recipe serializer can actually inspect:
 * semantic type, controlled-state target, keyboard path, value text, and
 * minimum declared target size. Supply element to also measure the mounted
 * interactive targets; declaration-only passes do not verify rendered sizes.
 */
export function auditVisualizationControls({
  controls = [],
  minimumTargetSize = 24,
  element,
}: AuditVisualizationControlsOptions): ControlAuditResult {
  const findings: ControlAuditFinding[] = []
  const seenIds = new Set<string>()

  for (const control of controls) {
    const controlId = control?.id
    const prefix = `controls.${controlId || "unknown"}`
    const domain = control?.domain
    const hasDomain = Array.isArray(domain) &&
      domain.length === 2 &&
      Number.isFinite(domain[0]) &&
      Number.isFinite(domain[1]) &&
      domain[0] < domain[1]
    const validType = VISUALIZATION_CONTROL_TYPES.includes(control?.type)
    const hasTarget = typeof control?.target === "string" && control.target.trim().length > 0
    const hasKeyboard = ["slider", "buttons", "native-range"].includes(control?.keyboard ?? "")
    const targetSize = control?.minimumTargetSize

    findings.push(finding(
      `${prefix}.semantic-type`,
      controlId,
      validType ? "pass" : "fail",
      validType
        ? `Control uses the semantic type "${control.type}".`
        : "Control has no recognized semantic type.",
      "Use one of VISUALIZATION_CONTROL_TYPES.",
    ))
    findings.push(finding(
      `${prefix}.state-binding`,
      controlId,
      hasTarget ? "pass" : "fail",
      hasTarget
        ? `Control is bound to "${control.target}".`
        : "Control has no declarative state binding.",
      "Declare the controlled state key with target.",
    ))
    findings.push(finding(
      `${prefix}.domain`,
      controlId,
      hasDomain ? "pass" : "fail",
      hasDomain ? "Control has a finite ordered value domain." : "Control has no finite ordered value domain.",
      "Declare domain as [minimum, maximum].",
    ))
    findings.push(finding(
      `${prefix}.keyboard`,
      controlId,
      hasKeyboard ? "pass" : "fail",
      hasKeyboard
        ? `Control declares a ${control.keyboard} keyboard path.`
        : "Control does not declare a keyboard path.",
      "Declare slider, buttons, or native-range keyboard interaction.",
    ))
    findings.push(finding(
      `${prefix}.value-text`,
      controlId,
      typeof control?.valueText === "string" && control.valueText.trim().length > 0 ? "pass" : "fail",
      typeof control?.valueText === "string" && control.valueText.trim().length > 0
        ? "Control declares human-readable value text."
        : "Control does not declare human-readable value text.",
      "Provide valueText, typically with a {value} placeholder.",
    ))
    findings.push(finding(
      `${prefix}.target-size`,
      controlId,
      typeof targetSize === "number" && targetSize >= minimumTargetSize ? "pass" : "fail",
      typeof targetSize === "number" && targetSize >= minimumTargetSize
        ? `Control declares a ${targetSize}px target.`
        : `Control target is below the ${minimumTargetSize}px minimum or undeclared.`,
      `Declare minimumTargetSize of at least ${minimumTargetSize}.`,
    ))
    if (control?.step != null) {
      findings.push(finding(
        `${prefix}.step`,
        controlId,
        Number.isFinite(control.step) && control.step > 0 ? "pass" : "fail",
        Number.isFinite(control.step) && control.step > 0
          ? "Control has a positive quantization step."
          : "Control step must be a positive finite number.",
        "Use a positive finite step.",
      ))
    }
    if (control?.observations?.length) {
      findings.push(finding(
        `${prefix}.observations`,
        controlId,
        control.observations.includes("control-change") ? "pass" : "warn",
        control.observations.includes("control-change")
          ? "Control declares control-change observation coverage."
          : "Control declares observations but omits control-change.",
        "Include control-change so observable state changes are represented.",
      ))
    }
    if (!controlId || seenIds.has(controlId)) {
      findings.push(finding(
        `${prefix}.identity`,
        controlId,
        "fail",
        controlId ? "Control id is duplicated." : "Control id is missing.",
        "Use a unique stable control id.",
      ))
    }
    if (controlId) seenIds.add(controlId)
  }

  if (element) {
    const selector = '[role="slider"],button,input,select,[role="button"]'
    const targets = [
      ...(element.matches(selector) ? [element] : []),
      ...element.querySelectorAll(selector)
    ]
    let measured = 0
    for (const target of targets) {
      if (
        target.closest('[hidden],[aria-hidden="true"]') ||
        target.matches(':disabled,[aria-disabled="true"]')
      )
        continue
      const owner = target.closest(
        "[data-viz-control-id],[data-viz-control],[data-sentence-filter-key]"
      )
      const controlId =
        owner?.getAttribute("data-viz-control-id") ??
        owner?.getAttribute("data-sentence-filter-key") ??
        undefined
      const { width, height } = target.getBoundingClientRect()
      const measurable =
        Number.isFinite(width) &&
        Number.isFinite(height) &&
        width > 0 &&
        height > 0
      const meetsMinimum =
        measurable && width >= minimumTargetSize && height >= minimumTargetSize
      findings.push(
        finding(
          `controls.${controlId ?? "mounted"}.measured-target-size.${measured++}`,
          controlId,
          measurable ? (meetsMinimum ? "pass" : "fail") : "warn",
          measurable
            ? `Mounted target measures ${width}px × ${height}px; minimum is ${minimumTargetSize}px on both axes.`
            : "Mounted target has no measurable layout box.",
          measurable
            ? `Size the interactive target to at least ${minimumTargetSize}px on both axes.`
            : "Audit after the control is visible and layout is complete."
        )
      )
    }
    if (measured === 0) {
      findings.push(
        finding(
          "controls.mounted-targets",
          undefined,
          "warn",
          "No enabled interactive targets were found in the mounted element."
        )
      )
    }
  }

  return {
    ok: findings.every((entry) => entry.status !== "fail"),
    findings,
  }
}
