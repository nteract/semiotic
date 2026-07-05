/**
 * Responsive visualization rule grammar.
 *
 * This is deliberately chart-semantic, not CSS. A rule says "when this chart
 * slot is narrow, transform the chart props this way" so agents, recipes,
 * audits, and future HOC runtime wiring can reason about the mobile variant
 * without executing a renderer.
 */

export type ResponsiveOrientation = "portrait" | "landscape"

export interface ResponsiveRuleCondition {
  minWidth?: number
  maxWidth?: number
  minHeight?: number
  maxHeight?: number
  minAspectRatio?: number
  maxAspectRatio?: number
  orientation?: ResponsiveOrientation
}

export interface ResponsiveRuleContext {
  width: number
  height?: number
}

export interface ResponsiveRule<TProps extends Record<string, unknown> = Record<string, unknown>> {
  id?: string
  description?: string
  /**
   * Viewport/container condition. All supplied predicates must match.
   */
  when: ResponsiveRuleCondition
  /**
   * Shallow prop transform to apply when the condition matches. Nested
   * `margin`, `frameProps`, `mobileSemantics`, `style`, and `className` are
   * merged by `resolveResponsiveRules`; other keys replace the base value.
   */
  transform: Partial<TProps> & Record<string, unknown>
  /**
   * Higher priority applies later and wins on conflicts. Defaults to source
   * order when omitted.
   */
  priority?: number
}

export interface ResponsiveRuleMatch<TProps extends Record<string, unknown> = Record<string, unknown>> {
  rule: ResponsiveRule<TProps>
  index: number
}

export interface ResponsiveRuleResult<TProps extends Record<string, unknown> = Record<string, unknown>> {
  props: TProps
  matches: ResponsiveRuleMatch<TProps>[]
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

function orientationFor(context: ResponsiveRuleContext): ResponsiveOrientation | undefined {
  if (typeof context.height !== "number" || context.height <= 0) return undefined
  return context.width >= context.height ? "landscape" : "portrait"
}

function aspectRatioFor(context: ResponsiveRuleContext): number | undefined {
  if (typeof context.height !== "number" || context.height <= 0) return undefined
  return context.width / context.height
}

export function responsiveRuleMatches(
  rule: ResponsiveRule,
  context: ResponsiveRuleContext,
): boolean {
  const { when } = rule
  const width = context.width
  const height = context.height
  const aspectRatio = aspectRatioFor(context)
  const orientation = orientationFor(context)

  if (typeof when.minWidth === "number" && width < when.minWidth) return false
  if (typeof when.maxWidth === "number" && width > when.maxWidth) return false
  if (typeof when.minHeight === "number" && (typeof height !== "number" || height < when.minHeight)) return false
  if (typeof when.maxHeight === "number" && (typeof height !== "number" || height > when.maxHeight)) return false
  if (typeof when.minAspectRatio === "number" && (typeof aspectRatio !== "number" || aspectRatio < when.minAspectRatio)) return false
  if (typeof when.maxAspectRatio === "number" && (typeof aspectRatio !== "number" || aspectRatio > when.maxAspectRatio)) return false
  if (when.orientation && orientation !== when.orientation) return false
  return true
}

function mergeResponsiveProps<TProps extends Record<string, unknown>>(
  base: TProps,
  transform: Partial<TProps> & Record<string, unknown>,
): TProps {
  const merged: Record<string, unknown> = { ...base, ...transform }
  for (const key of ["margin", "frameProps", "mobileSemantics", "style"]) {
    if (isObject(base[key]) && isObject(transform[key])) {
      merged[key] = { ...base[key], ...transform[key] }
    }
  }
  if (typeof base.className === "string" && typeof transform.className === "string") {
    merged.className = `${base.className} ${transform.className}`
  }
  return merged as TProps
}

/**
 * Resolve matching responsive rules into a transformed prop object. Pure and
 * SSR-safe. Runtime HOCs can call this with measured container dimensions;
 * agents and audits can call it with target phone widths.
 */
export function resolveResponsiveRules<TProps extends Record<string, unknown>>(
  props: TProps,
  context: ResponsiveRuleContext,
  rules: ReadonlyArray<ResponsiveRule<TProps>> | undefined = props.responsiveRules as ReadonlyArray<ResponsiveRule<TProps>> | undefined,
): ResponsiveRuleResult<TProps> {
  if (!Array.isArray(rules) || rules.length === 0) {
    return { props, matches: [] }
  }

  const matches = rules
    .map((rule, index) => ({ rule, index }))
    .filter((match) => responsiveRuleMatches(match.rule, context))
    .sort((a, b) => {
      const pa = typeof a.rule.priority === "number" ? a.rule.priority : a.index
      const pb = typeof b.rule.priority === "number" ? b.rule.priority : b.index
      return pa - pb
    })

  const resolved = matches.reduce(
    (current, match) => mergeResponsiveProps(current, match.rule.transform),
    props,
  )

  return { props: resolved, matches }
}
