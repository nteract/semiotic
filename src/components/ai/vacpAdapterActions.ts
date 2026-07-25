import {
  buildDataSchema,
  isRecord,
  jsonSafe,
  safeRecord,
  stableHash,
} from "./vacpAdapterRuntime"
import {
  SEMIOTIC_VACP_ACTIVATE_NAVIGATION_ACTION,
  SEMIOTIC_VACP_CLEAR_SELECTION_ACTION,
  SEMIOTIC_VACP_INSPECT_DATA_ACTION,
  SEMIOTIC_VACP_SET_INTERVAL_SELECTION_ACTION,
  SEMIOTIC_VACP_SET_POINT_SELECTION_ACTION,
  type CreateSemioticVACPBridgeOptions,
  type NavigationModel,
  type RuntimeAction,
  type RuntimeModelBase,
  type SelectionModel,
  type SemioticVACPRefs,
} from "./vacpAdapterTypes"
import {
  VACP_DATA_SCHEMA_ACTION,
  type VacpDataSchemaDetail,
} from "./vacpTypes"

function addRuntimeAction(
  actions: RuntimeAction[],
  action: RuntimeAction
): void {
  if (!action.descriptor.name.trim()) {
    throw new Error("VACP action names must be non-empty.")
  }
  if (
    actions.some(
      (existing) => existing.descriptor.name === action.descriptor.name
    )
  ) {
    throw new Error(`Duplicate VACP action "${action.descriptor.name}".`)
  }
  actions.push(action)
}

function requiredRecord(
  params: unknown,
  action: string
): Record<string, unknown> {
  if (!isRecord(params)) {
    throw new Error(`${action} expects an object parameter payload.`)
  }
  return params
}

function positiveInteger(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(1, Math.floor(value))
    : fallback
}

function selectionForParams(
  params: Record<string, unknown>,
  models: readonly SelectionModel[],
  mode?: "point" | "interval"
): SelectionModel {
  if (typeof params.selectionRef !== "string") {
    throw new Error("params.selectionRef must be a VACP selection ref.")
  }
  const model = models.find(
    (candidate) => candidate.ref === params.selectionRef
  )
  if (!model) throw new Error(`Unknown selection ref "${params.selectionRef}".`)
  if (mode && !model.modes.has(mode)) {
    throw new Error(`Selection "${model.name}" does not accept ${mode} state.`)
  }
  return model
}

function pointFields(
  value: unknown,
  allowed: readonly string[]
): Record<string, unknown[]> {
  if (!isRecord(value) || !Object.keys(value).length) {
    throw new Error("params.fields must be a non-empty object.")
  }
  const fields = Object.create(null) as Record<string, unknown[]>
  for (const [field, values] of Object.entries(value)) {
    if (!allowed.includes(field)) {
      throw new Error(`Field "${field}" is not allowed for this selection.`)
    }
    if (!Array.isArray(values) || !values.length) {
      throw new Error(`Point selection field "${field}" requires values[].`)
    }
    for (const entry of values) {
      if (
        entry !== null &&
        typeof entry !== "string" &&
        typeof entry !== "boolean" &&
        (typeof entry !== "number" || !Number.isFinite(entry))
      ) {
        throw new Error(
          `Point selection field "${field}" only accepts JSON primitive values.`
        )
      }
    }
    fields[field] = [...values]
  }
  return fields
}

function intervalFields(
  value: unknown,
  allowed: readonly string[]
): Record<string, [number, number]> {
  if (!isRecord(value) || !Object.keys(value).length) {
    throw new Error("params.fields must be a non-empty object.")
  }
  const fields = Object.create(null) as Record<string, [number, number]>
  for (const [field, range] of Object.entries(value)) {
    if (!allowed.includes(field)) {
      throw new Error(`Field "${field}" is not allowed for this selection.`)
    }
    if (
      !Array.isArray(range) ||
      range.length !== 2 ||
      typeof range[0] !== "number" ||
      typeof range[1] !== "number" ||
      !Number.isFinite(range[0]) ||
      !Number.isFinite(range[1])
    ) {
      throw new Error(
        `Interval selection field "${field}" requires [min,max].`
      )
    }
    fields[field] = [
      Math.min(range[0], range[1]),
      Math.max(range[0], range[1]),
    ]
  }
  return fields
}

function isStableMatchValue(value: unknown): boolean {
  return (
    value == null ||
    typeof value === "string" ||
    (typeof value === "number" && Number.isFinite(value)) ||
    typeof value === "boolean" ||
    (value instanceof Date && Number.isFinite(value.getTime()))
  )
}

function navigationMatch(
  value: unknown,
  fields: readonly string[]
): Record<string, unknown> {
  if (!isRecord(value)) throw new Error("params.match must be an object.")
  for (const field of Object.keys(value)) {
    if (!fields.includes(field)) {
      throw new Error(`params.match includes undeclared field "${field}".`)
    }
  }
  const match = Object.create(null) as Record<string, unknown>
  for (const field of fields) {
    if (
      !Object.prototype.hasOwnProperty.call(value, field) ||
      !isStableMatchValue(value[field])
    ) {
      throw new Error(
        `params.match requires a primitive value for "${field}".`
      )
    }
    match[field] =
      value[field] instanceof Date ? value[field].toISOString() : value[field]
  }
  return match
}

export function buildRuntimeActions(
  model: RuntimeModelBase,
  options: CreateSemioticVACPBridgeOptions,
  refs: SemioticVACPRefs
): RuntimeAction[] {
  const actions: RuntimeAction[] = []
  const handleRefs = model.dataHandles.map((handle) => handle.ref)
  if (handleRefs.length) {
    addRuntimeAction(actions, {
      descriptor: {
        name: VACP_DATA_SCHEMA_ACTION,
        title: "Describe Semiotic data",
        description:
          "Return columns, types, row count, and optional bounded summaries for a chart DataHandle.",
        targetRef: refs.view,
        parameters: {
          type: "object",
          properties: {
            handleRef: { type: "string", enum: handleRefs },
            detail: { type: "string", enum: ["columns", "full"] },
            sampleRows: { type: "number", minimum: 1 },
          },
          required: ["handleRef"],
        },
      },
      execute(params) {
        const payload = requiredRecord(params, VACP_DATA_SCHEMA_ACTION)
        if (typeof payload.handleRef !== "string") {
          throw new Error("params.handleRef must be a DataHandle ref.")
        }
        const handle = model.dataHandles.find(
          (candidate) => candidate.ref === payload.handleRef
        )
        if (!handle) throw new Error(`Unknown DataHandle "${payload.handleRef}".`)
        const detail: VacpDataSchemaDetail =
          payload.detail === undefined || payload.detail === "columns"
            ? "columns"
            : payload.detail === "full"
              ? "full"
              : (() => {
                  throw new Error(
                    'params.detail must be "columns" or "full".'
                  )
                })()
        const requested =
          typeof payload.sampleRows === "number" &&
          Number.isFinite(payload.sampleRows)
            ? Math.max(1, Math.floor(payload.sampleRows))
            : detail === "full"
              ? 1000
              : Math.min(handle.rows.length, 1000)
        const maximum = positiveInteger(
          options.dataAccess?.maxSchemaRows,
          5000
        )
        return buildDataSchema({
          handleRef: handle.ref,
          rows: handle.rows,
          detail,
          sampleRows: Math.min(requested, maximum),
        })
      },
    })
  }

  if (handleRefs.length && options.dataAccess?.sample) {
    addRuntimeAction(actions, {
      descriptor: {
        name: SEMIOTIC_VACP_INSPECT_DATA_ACTION,
        title: "Inspect bounded Semiotic rows",
        description:
          "Return a bounded JSON sample from a chart DataHandle. This action is opt-in.",
        targetRef: refs.view,
        parameters: {
          type: "object",
          properties: {
            handleRef: { type: "string", enum: handleRefs },
            offset: { type: "number", minimum: 0 },
            limit: { type: "number", minimum: 1 },
          },
          required: ["handleRef"],
        },
      },
      execute(params) {
        const payload = requiredRecord(
          params,
          SEMIOTIC_VACP_INSPECT_DATA_ACTION
        )
        if (typeof payload.handleRef !== "string") {
          throw new Error("params.handleRef must be a DataHandle ref.")
        }
        const handle = model.dataHandles.find(
          (candidate) => candidate.ref === payload.handleRef
        )
        if (!handle) throw new Error(`Unknown DataHandle "${payload.handleRef}".`)
        const offset =
          typeof payload.offset === "number" && Number.isFinite(payload.offset)
            ? Math.max(0, Math.floor(payload.offset))
            : 0
        const maximum = positiveInteger(
          options.dataAccess?.maxSampleRows,
          50
        )
        const requested =
          typeof payload.limit === "number" && Number.isFinite(payload.limit)
            ? Math.max(1, Math.floor(payload.limit))
            : Math.min(20, maximum)
        const limit = Math.min(requested, maximum)
        const rows = handle.rows.slice(offset, offset + limit)
        return {
          handleRef: handle.ref,
          offset,
          limit,
          rowCount: handle.rows.length,
          rows: jsonSafe(rows, { maxArrayLength: maximum }),
          truncated: offset + rows.length < handle.rows.length,
        }
      },
    })
  }

  const selectionRefs = model.selections.map((selection) => selection.ref)
  const pointSelections = model.selections.filter((selection) =>
    selection.modes.has("point")
  )
  if (
    pointSelections.length &&
    options.selectionActions?.setPointSelection
  ) {
    addRuntimeAction(actions, {
      descriptor: {
        name: SEMIOTIC_VACP_SET_POINT_SELECTION_ACTION,
        title: "Set point selection",
        description:
          "Set a named LinkedCharts point-selection clause with allowlisted fields.",
        targetRef: refs.view,
        parameters: {
          type: "object",
          properties: {
            selectionRef: {
              type: "string",
              enum: pointSelections.map((selection) => selection.ref),
            },
            fields: { type: "object" },
          },
          required: ["selectionRef", "fields"],
        },
      },
      async execute(params) {
        const payload = requiredRecord(
          params,
          SEMIOTIC_VACP_SET_POINT_SELECTION_ACTION
        )
        const selection = selectionForParams(
          payload,
          model.selections,
          "point"
        )
        const fields = pointFields(payload.fields, selection.fields)
        await options.selectionActions?.setPointSelection?.(
          selection.name,
          selection.clientId,
          fields
        )
        return { selectionRef: selection.ref, fields }
      },
    })
  }

  const intervalSelections = model.selections.filter((selection) =>
    selection.modes.has("interval")
  )
  if (
    intervalSelections.length &&
    options.selectionActions?.setIntervalSelection
  ) {
    addRuntimeAction(actions, {
      descriptor: {
        name: SEMIOTIC_VACP_SET_INTERVAL_SELECTION_ACTION,
        title: "Set interval selection",
        description:
          "Set a named LinkedCharts interval-selection clause in data units.",
        targetRef: refs.view,
        parameters: {
          type: "object",
          properties: {
            selectionRef: {
              type: "string",
              enum: intervalSelections.map((selection) => selection.ref),
            },
            fields: { type: "object" },
          },
          required: ["selectionRef", "fields"],
        },
      },
      async execute(params) {
        const payload = requiredRecord(
          params,
          SEMIOTIC_VACP_SET_INTERVAL_SELECTION_ACTION
        )
        const selection = selectionForParams(
          payload,
          model.selections,
          "interval"
        )
        const fields = intervalFields(payload.fields, selection.fields)
        await options.selectionActions?.setIntervalSelection?.(
          selection.name,
          selection.clientId,
          fields
        )
        return { selectionRef: selection.ref, fields }
      },
    })
  }

  if (selectionRefs.length && options.selectionActions?.clearSelection) {
    addRuntimeAction(actions, {
      descriptor: {
        name: SEMIOTIC_VACP_CLEAR_SELECTION_ACTION,
        title: "Clear selection",
        description:
          "Clear every active clause from one named LinkedCharts selection.",
        targetRef: refs.view,
        parameters: {
          type: "object",
          properties: {
            selectionRef: { type: "string", enum: selectionRefs },
          },
          required: ["selectionRef"],
        },
      },
      async execute(params) {
        const payload = requiredRecord(
          params,
          SEMIOTIC_VACP_CLEAR_SELECTION_ACTION
        )
        const selection = selectionForParams(payload, model.selections)
        await options.selectionActions?.clearSelection?.(selection.name)
        return { selectionRef: selection.ref, cleared: true }
      },
    })
  }

  const navigations = model.charts
    .map((chart) => chart.navigation)
    .filter(
      (navigation): navigation is NavigationModel =>
        !!navigation &&
        navigation.index.valid &&
        !!navigation.binding.onActiveChange
    )
  if (navigations.length) {
    addRuntimeAction(actions, {
      descriptor: {
        name: SEMIOTIC_VACP_ACTIVATE_NAVIGATION_ACTION,
        title: "Activate chart navigation target",
        description:
          "Move an accessible chart navigation tree to a uniquely identified datum.",
        targetRef: refs.view,
        parameters: {
          type: "object",
          properties: {
            navigationRef: {
              type: "string",
              enum: navigations.map((navigation) => navigation.ref),
            },
            match: { type: "object" },
          },
          required: ["navigationRef", "match"],
        },
      },
      execute(params) {
        const payload = requiredRecord(
          params,
          SEMIOTIC_VACP_ACTIVATE_NAVIGATION_ACTION
        )
        if (typeof payload.navigationRef !== "string") {
          throw new Error("params.navigationRef must be a navigation ref.")
        }
        const navigation = navigations.find(
          (candidate) => candidate.ref === payload.navigationRef
        )
        if (!navigation) {
          throw new Error(`Unknown navigation ref "${payload.navigationRef}".`)
        }
        const match = navigationMatch(
          payload.match,
          navigation.index.matchFields
        )
        const node = navigation.index.byKey.get(stableHash(match))
        if (!node) {
          throw new Error("No navigation datum matches params.match.")
        }
        navigation.binding.onActiveChange?.(node)
        return {
          navigationRef: navigation.ref,
          targetRef: navigation.index.targetRef(match),
          match,
        }
      },
    })
  }

  const customActions =
    typeof options.actions === "function" ? options.actions() : options.actions
  for (const custom of customActions ?? []) {
    if (custom.available && !custom.available()) continue
    addRuntimeAction(actions, {
      descriptor: {
        ...custom.descriptor,
        ...(custom.descriptor.parameters
          ? { parameters: safeRecord(custom.descriptor.parameters) }
          : {}),
      },
      async execute(params) {
        const validation = custom.validate?.(params)
        if (typeof validation === "string" && validation) {
          throw new Error(validation)
        }
        return custom.execute(params)
      },
    })
  }

  return actions
}
