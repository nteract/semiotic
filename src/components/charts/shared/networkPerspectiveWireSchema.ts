import type { ChartPropSpec } from "./chartSpecCore"

export const NETWORK_PERSPECTIVE_NAMES = [
  "flat",
  "isometric",
  "pixel",
  "dimetric",
  "military",
  "cabinet"
] as const

const PRESET_SCHEMA = { type: "string", enum: NETWORK_PERSPECTIVE_NAMES } as const
const NUMBER = { type: "number" } as const
const STRING = { type: "string" } as const
const BOOLEAN = { type: "boolean" } as const
const FLAG_OR_OBJECT = { type: ["boolean", "object"] } as const
/** Constant layout px or a datum field name; callbacks are React-only. */
const ACCESSOR = { type: ["number", "string"] } as const
const SCALE = { type: ["number", "string"] } as const

// Kept deliberately shallow: this schema is repeated in every network chart's
// tool definition. The prop description names the nested fields.
const CONFIG_SCHEMA = {
  type: "object",
  properties: {
    type: PRESET_SCHEMA,
    rotation: NUMBER,
    tilt: NUMBER,
    verticalScale: NUMBER,
    fit: { enum: ["contain", "none"] },
    fitPadding: NUMBER,
    elevation: ACCESSOR,
    elevationScale: SCALE,
    elevationGuides: FLAG_OR_OBJECT,
    depthSort: BOOLEAN,
    thickness: NUMBER,
    edgeShadow: FLAG_OR_OBJECT,
    marks: { enum: ["token", "billboard", "ground", "extrude"] },
    anchor: { enum: ["center", "feet"] },
    glyph: { type: "object" },
    glyphSize: NUMBER,
    extrude: ACCESSOR,
    extrudeScale: SCALE,
    edges: {
      type: "object",
      properties: {
        route: { enum: ["layout", "orthogonal", "orthogonal-rounded"] },
        elevation: { type: ["string", "number"] }
      }
    },
    labels: { type: "object", properties: { mode: { enum: ["upright", "ground"] }, axis: { enum: ["x", "y"] } } },
    ground: { type: "object", properties: { grid: FLAG_OR_OBJECT, plate: FLAG_OR_OBJECT } },
    regions: {
      type: "array",
      items: {
        type: "object",
        properties: { id: STRING, label: STRING, nodes: { type: "array", items: STRING }, elevation: NUMBER, depth: NUMBER },
        required: ["id"]
      }
    },
    transition: FLAG_OR_OBJECT
  },
  additionalProperties: false
} as const

/**
 * Shared chart-registry prop for network `perspective`. Callback forms
 * (`elevation`/`extrude`/`glyph`/`marks` functions) are React-only. No
 * top-level `enum`: it would reject the object form in JSON Schema.
 */
export const NETWORK_PERSPECTIVE_PROP_SPEC = {
  type: ["string", "object"],
  default: "flat",
  description:
    "Parallel projection after layout: \"isometric\" (true 30°), \"pixel\" (2:1), \"dimetric\", \"military\", \"cabinet\", or a config: elevation (field|px), thickness (px, default 6; 0 = flat pieces), edgeShadow, marks (token|billboard|ground|extrude), extrude, edges {route: orthogonal|orthogonal-rounded, elevation}, labels {mode: ground, axis}, ground {grid, plate}, regions [{id, label, nodes, elevation, depth, padding, fill, stroke}], glyph, transition. Points become tokens and areas become slabs with side walls; edges ride above the ground and cast a shadow; layout positions are unchanged. For topological positions, not measured ones.",
  schema: { oneOf: [PRESET_SCHEMA, CONFIG_SCHEMA] }
} as const satisfies ChartPropSpec
