import type { ChartPropSpec } from "./chartSpecCore"

const NUMBER_OR_STRING_SCHEMA = {
  type: ["number", "string"],
} as const

const TWO_NUMBER_TUPLE_SCHEMA = {
  type: "array",
  items: { type: "number" },
  minItems: 2,
  maxItems: 2,
} as const

/** JSON-safe subset of `HatchFill` accepted by declarative style rules. */
export const HATCH_FILL_WIRE_SCHEMA = {
  type: "object",
  properties: {
    type: { const: "hatch" },
    background: { type: "string" },
    stroke: { type: "string" },
    lineWidth: { type: "number" },
    spacing: { type: "number" },
    angle: { type: "number" },
    lineOpacity: { type: "number" },
  },
  required: ["type"],
  additionalProperties: false,
} as const

/** JSON-safe declarative threshold; predicate functions remain React-only. */
export const STYLE_RULE_WHEN_WIRE_SCHEMA = {
  oneOf: [
    { type: "boolean" },
    {
      type: "object",
      properties: {
        axis: { type: "string", enum: ["x", "y", "value"] },
        field: { type: "string" },
        gt: { type: "number" },
        gte: { type: "number" },
        lt: { type: "number" },
        lte: { type: "number" },
        eq: NUMBER_OR_STRING_SCHEMA,
        ne: NUMBER_OR_STRING_SCHEMA,
        within: TWO_NUMBER_TUPLE_SCHEMA,
        outside: TWO_NUMBER_TUPLE_SCHEMA,
        in: {
          type: "array",
          items: NUMBER_OR_STRING_SCHEMA,
        },
      },
      additionalProperties: false,
    },
  ],
} as const

/** Nested authoring contract shared by every chart with wired `styleRules`. */
export const STYLE_RULES_WIRE_SCHEMA = {
  items: {
    type: "object",
    properties: {
      id: { type: "string" },
      label: { type: "string" },
      when: STYLE_RULE_WHEN_WIRE_SCHEMA,
      style: {
        type: "object",
        properties: {
          fill: {
            oneOf: [
              { type: "string" },
              HATCH_FILL_WIRE_SCHEMA,
            ],
          },
          fillOpacity: { type: "number" },
          stroke: { type: "string" },
          strokeWidth: { type: "number" },
          strokeDasharray: { type: "string" },
          opacity: { type: "number" },
          cursor: { type: "string" },
        },
        additionalProperties: false,
      },
    },
    required: ["style"],
    additionalProperties: false,
  },
} as const

/**
 * Shared chart-registry prop for the serializable `StyleRule` contract.
 * React callers may additionally use predicate `when` and functional `style`
 * values; those function variants are intentionally absent from JSON Schema.
 */
export const STYLE_RULES_PROP_SPEC = {
  type: "array",
  description:
    "Ordered declarative style rules; matching styles merge in order and the last value wins per property. Wire configs accept boolean/declarative-threshold `when` values and object styles (including cursor and solid or HatchFill fill). Predicate and style functions are React-only.",
  schema: STYLE_RULES_WIRE_SCHEMA,
} as const satisfies ChartPropSpec
