/** Nested JSON Schema fragments for CrucibleChart's serializable program. */

const stringArray = (minimum = 1) => ({
  type: "array",
  items: { type: "string" },
  minItems: minimum
})

const metricMap = {
  type: "object",
  additionalProperties: { type: "number" }
}

const selector = {
  type: "object",
  properties: {
    ids: stringArray(),
    categories: stringArray(),
    statuses: {
      type: "array",
      items: {
        type: "string",
        enum: [
          "queued",
          "active",
          "transformed",
          "consumed",
          "retained",
          "ejected",
          "failed",
          "recovered"
        ]
      },
      minItems: 1
    },
    outletIds: stringArray(),
    count: { type: "integer", minimum: 0 }
  },
  additionalProperties: false
}

const loss = {
  type: "object",
  properties: {
    amount: { type: "number", minimum: 0 },
    metrics: metricMap,
    label: { type: "string" }
  },
  additionalProperties: false
}

const relation = {
  type: "object",
  properties: {
    id: { type: "string" },
    sourceIds: stringArray(2),
    label: { type: "string" },
    category: { type: "string" },
    strength: { type: "number" },
    metrics: metricMap
  },
  required: ["id", "sourceIds"],
  additionalProperties: false
}

const allocation = {
  type: "object",
  properties: {
    productId: { type: "string" },
    amount: { type: "number", minimum: 0 },
    metrics: metricMap
  },
  required: ["productId"],
  additionalProperties: false
}

const effect = {
  oneOf: [
    {
      type: "object",
      description: "Change the explicit semantic state of selected source components.",
      properties: {
        type: { const: "set-state" },
        select: selector,
        state: {
          type: "string",
          enum: [
            "queued",
            "active",
            "transformed",
            "retained",
            "ejected",
            "failed",
            "recovered"
          ]
        },
        outletId: { type: "string" },
        reason: { type: "string" },
        metricsDelta: metricMap
      },
      required: ["type", "select", "state"],
      additionalProperties: false
    },
    {
      type: "object",
      description: "Author a visible relation; physics never discovers one.",
      properties: {
        type: { const: "set-relation" },
        relation
      },
      required: ["type", "relation"],
      additionalProperties: false
    },
    {
      type: "object",
      description: "Resolve previously authored relations.",
      properties: {
        type: { const: "resolve-relation" },
        relationIds: stringArray(),
        resolution: {
          type: "string",
          enum: ["combined", "rejected", "expired"]
        },
        reason: { type: "string" }
      },
      required: ["type", "relationIds", "resolution"],
      additionalProperties: false
    },
    {
      type: "object",
      description:
        "Combine named sources into a declared product. Set complete=false before later contribute effects.",
      properties: {
        type: { const: "combine" },
        sourceIds: stringArray(),
        productId: { type: "string" },
        basisRelationIds: stringArray(),
        loss,
        complete: { type: "boolean", default: true }
      },
      required: ["type", "sourceIds", "productId"],
      additionalProperties: false
    },
    {
      type: "object",
      description: "Add named sources to an explicitly forming product.",
      properties: {
        type: { const: "contribute" },
        sourceIds: stringArray(),
        productId: { type: "string" },
        basisRelationIds: stringArray(),
        loss
      },
      required: ["type", "sourceIds", "productId"],
      additionalProperties: false
    },
    {
      type: "object",
      description: "Complete a forming product and optionally route it to a declared outlet.",
      properties: {
        type: { const: "complete-product" },
        productId: { type: "string" },
        outletId: { type: "string" },
        reason: { type: "string" }
      },
      required: ["type", "productId"],
      additionalProperties: false
    },
    {
      type: "object",
      description: "Split one named source into explicit product allocations.",
      properties: {
        type: { const: "split" },
        sourceId: { type: "string" },
        products: { type: "array", items: allocation, minItems: 1 },
        loss
      },
      required: ["type", "sourceId", "products"],
      additionalProperties: false
    },
    {
      type: "object",
      description: "Route selected source components to a declared outlet with a reason.",
      properties: {
        type: { const: "eject" },
        select: selector,
        outletId: { type: "string" },
        state: {
          type: "string",
          enum: ["ejected", "failed", "retained", "recovered"]
        },
        reason: { type: "string" }
      },
      required: ["type", "select", "outletId"],
      additionalProperties: false
    },
    {
      type: "object",
      description: "Apply an explicit numeric metric delta to the run, sources, or products.",
      properties: {
        type: { const: "set-metric" },
        target: {
          oneOf: [
            { const: "run" },
            {
              type: "object",
              properties: { components: selector },
              required: ["components"],
              additionalProperties: false
            },
            {
              type: "object",
              properties: { productIds: stringArray() },
              required: ["productIds"],
              additionalProperties: false
            }
          ]
        },
        metricsDelta: metricMap
      },
      required: ["type", "target", "metricsDelta"],
      additionalProperties: false
    },
    {
      type: "object",
      description: "Record an authored run-level outcome and optional summary.",
      properties: {
        type: { const: "set-outcome" },
        outcome: { type: "string" },
        summary: { type: "string" }
      },
      required: ["type", "outcome"],
      additionalProperties: false
    }
  ]
}

const eventAt = {
  oneOf: [
    {
      type: "object",
      properties: { time: { type: "number", minimum: 0 } },
      required: ["time"],
      additionalProperties: false
    },
    {
      type: "object",
      properties: {
        phaseId: { type: "string" },
        progress: { type: "number", minimum: 0, maximum: 1 }
      },
      required: ["phaseId"],
      additionalProperties: false
    }
  ]
}

export const CRUCIBLE_PHASES_SCHEMA: Readonly<Record<string, unknown>> = {
  minItems: 1,
  items: {
    type: "object",
    properties: {
      id: { type: "string" },
      duration: { type: "number", exclusiveMinimum: 0 },
      label: { type: "string" },
      description: { type: "string" },
      intensity: { type: "number" },
      motion: {
        type: "string",
        enum: ["charge", "mix", "hold", "press", "bind", "separate", "pour", "quench"]
      },
      color: { type: "string" },
      metrics: { type: "object" }
    },
    required: ["id", "duration"],
    additionalProperties: false
  }
}

export const CRUCIBLE_PRODUCTS_SCHEMA: Readonly<Record<string, unknown>> = {
  items: {
    type: "object",
    properties: {
      id: { type: "string" },
      label: { type: "string" },
      description: { type: "string" },
      category: { type: "string" },
      amount: { type: "number", minimum: 0 },
      color: { type: "string" },
      metrics: metricMap,
      outletId: { type: "string" },
      order: { type: "number" }
    },
    required: ["id"],
    additionalProperties: false
  }
}

export const CRUCIBLE_OUTLETS_SCHEMA: Readonly<Record<string, unknown>> = {
  items: {
    type: "object",
    properties: {
      id: { type: "string" },
      label: { type: "string" },
      description: { type: "string" },
      side: { type: "string", enum: ["left", "right", "bottom"] },
      color: { type: "string" },
      order: { type: "number" }
    },
    required: ["id"],
    additionalProperties: false
  }
}

export const CRUCIBLE_EVENTS_SCHEMA: Readonly<Record<string, unknown>> = {
  items: {
    type: "object",
    properties: {
      id: { type: "string" },
      at: eventAt,
      effects: { type: "array", items: effect, minItems: 1 },
      label: { type: "string" },
      description: { type: "string" },
      summary: { type: "string" }
    },
    required: ["id", "at", "effects"],
    additionalProperties: false
  }
}
