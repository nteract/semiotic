/**
 * Runtime validation map derived from the Chart Spec Registry.
 *
 * `validateProps.ts` consumes the compact ComponentSpec shape below. The
 * richer registry entries in `chartSpecs.ts` carry docs/schema-only fields too,
 * so this module strips each prop down to the runtime validation fields
 * (`type`, `enum`) while keeping the public `VALIDATION_MAP` export stable.
 */
import {
  CHART_SPECS,
  composeProps,
  type ChartSpec,
  type ChartPropSpec,
} from "./chartSpecs"
import type { ComponentSpec, PropDef } from "./validateProps"

function validationPropFromSpec(propSpec: ChartPropSpec): PropDef {
  const prop: PropDef = { type: propSpec.type }
  if (propSpec.enum) prop.enum = [...propSpec.enum]
  return prop
}

function validationEntryFromSpec(spec: ChartSpec): ComponentSpec {
  const props: Record<string, PropDef> = {}
  for (const [propName, propSpec] of Object.entries(composeProps(spec))) {
    props[propName] = validationPropFromSpec(propSpec)
  }

  return {
    required: [...spec.required],
    dataShape: spec.dataShape,
    dataAccessors: [...spec.dataAccessors],
    props,
  }
}

export const VALIDATION_MAP: Record<string, ComponentSpec> = Object.fromEntries(
  Object.entries(CHART_SPECS).map(([name, spec]) => [
    name,
    validationEntryFromSpec(spec),
  ]),
)
