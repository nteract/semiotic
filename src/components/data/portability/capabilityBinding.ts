/**
 * Bind a library-neutral IDID capability descriptor to a Semiotic runtime
 * capability. A portable `intentScores` field is authoritative when present;
 * omission retains the host's ranking policy.
 *
 * The portable descriptor intentionally cannot contain executable `fits` or
 * `buildProps` functions. Treating it as a complete runtime capability would
 * therefore make every dataset appear to fit, which is precisely the kind of
 * plausible-but-unsafe recommendation the portability layer refuses to make.
 *
 * This binder overlays the descriptor's portable policy (rubric, intent
 * scores, variants, caveats, and mobile contract) onto a host-resolved
 * capability while retaining the host's executable data-fit, prop-building,
 * scale, quality, and numeric-contract logic.
 */
import type {
  ChartCapability,
  ChartDataProfile,
  ChartVariant,
} from "../../ai/chartCapabilityTypes"
import {
  IDID_SPEC_VERSION,
  validatePortableCapability,
  type PortableChartCapability,
  type PortableChartVariant,
  type PortableMobileCapability,
} from "./spec"
import type {
  PortabilityDiagnostic,
  PortabilityLoss,
  PortabilityProvenance,
  PortabilityStatus,
} from "./result"

/** Runtime capability plus the exact portable descriptor that shaped it. */
export interface BoundPortableChartCapability extends ChartCapability {
  readonly portableDescriptor: PortableChartCapability
}

/** Structured activation result; refused results never contain a capability. */
export interface PortableCapabilityBindingResult {
  status: PortabilityStatus
  capability?: BoundPortableChartCapability
  diagnostics: readonly PortabilityDiagnostic[]
  lossReport: readonly PortabilityLoss[]
  provenance: PortabilityProvenance
}

function bindingProvenance(
  descriptor: unknown,
): PortabilityProvenance {
  const value = descriptor as { specVersion?: unknown } | null
  return {
    adapter: "semiotic/idid-capability-binding",
    direction: "import",
    sourceFormat: "idid-chart-capability",
    targetFormat: "semiotic-chart-capability",
    specVersion:
      typeof value?.specVersion === "string"
        ? value.specVersion
        : IDID_SPEC_VERSION,
  }
}

function refused(
  descriptor: unknown,
  diagnostics: PortabilityDiagnostic[],
): PortableCapabilityBindingResult {
  return {
    status: "refused",
    diagnostics,
    lossReport: diagnostics.map(({ code, message, path }) => ({
      code,
      message,
      path,
    })),
    provenance: bindingProvenance(descriptor),
  }
}

function bindVariant(variant: PortableChartVariant): ChartVariant {
  return {
    key: variant.key,
    label: variant.label,
    props: { ...(variant.props ?? {}) },
    ...(variant.description !== undefined
      ? { description: variant.description }
      : {}),
    ...(variant.intentDeltas !== undefined
      ? { intentDeltas: { ...variant.intentDeltas } }
      : {}),
    ...(variant.rubricDeltas !== undefined
      ? { rubricDeltas: { ...variant.rubricDeltas } }
      : {}),
    ...(variant.caveats !== undefined
      ? { caveats: [...variant.caveats] }
      : {}),
    ...(variant.tags !== undefined ? { tags: [...variant.tags] } : {}),
  }
}

function bindMobile(
  mobile: PortableMobileCapability,
): NonNullable<ChartCapability["mobile"]> {
  const bound: NonNullable<ChartCapability["mobile"]> = {}
  if (mobile.strategy !== undefined) bound.strategy = mobile.strategy
  if (mobile.responsive !== undefined) bound.responsive = mobile.responsive
  if (mobile.supportsResponsiveLayout !== undefined) {
    bound.supportsResponsiveLayout = mobile.supportsResponsiveLayout
  }
  if (mobile.breakpoints !== undefined) {
    bound.breakpoints = [...mobile.breakpoints]
  }
  if (mobile.minViewportWidth !== undefined) {
    bound.minViewportWidth = mobile.minViewportWidth
  }
  if (mobile.maxMarks !== undefined) bound.maxMarks = mobile.maxMarks
  if (mobile.maxAnnotations !== undefined) {
    bound.maxAnnotations = mobile.maxAnnotations
  }
  if (mobile.minimumHitTarget !== undefined) {
    bound.minimumHitTarget = mobile.minimumHitTarget
  }
  if (mobile.summary !== undefined) bound.summary = mobile.summary
  if (mobile.interaction !== undefined) {
    const interaction: NonNullable<
      NonNullable<ChartCapability["mobile"]>["interaction"]
    > = {}
    if (mobile.interaction.primary !== undefined) {
      interaction.primary = mobile.interaction.primary
    }
    if (mobile.interaction.alternatives !== undefined) {
      interaction.alternatives = [...mobile.interaction.alternatives]
    }
    if (mobile.interaction.hoverFallback !== undefined) {
      interaction.hoverFallback = mobile.interaction.hoverFallback
    }
    if (mobile.interaction.targetSize !== undefined) {
      interaction.targetSize = mobile.interaction.targetSize
    }
    bound.interaction = interaction
  }
  if (mobile.labels !== undefined) bound.labels = { ...mobile.labels }
  if (mobile.custom !== undefined) bound.custom = { ...mobile.custom }
  return bound
}

function combinedCaveats(
  host: ChartCapability,
  portable: PortableChartCapability,
): ((profile: ChartDataProfile) => readonly string[]) | undefined {
  const portableCaveats = portable.caveats
    ? [...portable.caveats]
    : []
  if (!host.caveats && portableCaveats.length === 0) return undefined

  return (profile) => {
    const hostCaveats = host.caveats
      ? Array.from(host.caveats(profile))
      : []
    return [...new Set([...hostCaveats, ...portableCaveats])]
  }
}

/**
 * Activate a portable descriptor against an explicitly resolved host
 * capability.
 *
 * The component ids must match. The portable rubric/intent scores are
 * authoritative for ranking; portable variants replace host variants when the
 * field is present (an omitted variants field means no carried variants).
 * Host `fits`, `buildProps`, numeric contracts, scale/quality gates, and
 * dynamic caveats remain in force.
 */
export function bindPortableCapability(
  descriptor: unknown,
  host: ChartCapability | undefined,
): PortableCapabilityBindingResult {
  const validation = validatePortableCapability(descriptor)
  if (!validation.valid) {
    return refused(
      descriptor,
      validation.errors.map((message) => ({
        code: "INVALID_PORTABLE_CAPABILITY",
        severity: "error" as const,
        message,
      })),
    )
  }

  const portable = descriptor as PortableChartCapability
  if (!host) {
    return refused(descriptor, [{
      code: "HOST_CAPABILITY_NOT_FOUND",
      severity: "error",
      path: "/component",
      message:
        `No host capability is registered for "${portable.component}". ` +
        "Resolve or register the renderer's executable capability before binding portable metadata.",
    }])
  }
  if (portable.component !== host.component) {
    return refused(descriptor, [{
      code: "CAPABILITY_COMPONENT_MISMATCH",
      severity: "error",
      path: "/component",
      message:
        `Portable component "${portable.component}" cannot bind to host component ` +
        `"${host.component}".`,
    }])
  }

  const caveats = combinedCaveats(host, portable)
  const capability: BoundPortableChartCapability = {
    ...host,
    rubric: { ...portable.rubric },
    intentScores: portable.intentScores
      ? { ...portable.intentScores }
      : { ...host.intentScores },
    // The portable descriptor is the source of variant-level scoring policy.
    // Omission means the transported descriptor did not declare variants.
    variants: portable.variants?.map(bindVariant),
    ...(caveats ? { caveats } : { caveats: undefined }),
    ...(portable.mobile !== undefined
      ? { mobile: bindMobile(portable.mobile) }
      : {}),
    portableDescriptor: portable,
  }

  return {
    status: "success",
    capability,
    diagnostics: [],
    lossReport: [],
    provenance: bindingProvenance(descriptor),
  }
}
