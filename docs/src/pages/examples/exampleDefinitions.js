export const EXAMPLE_DATA_STATES = Object.freeze([
  "live",
  "snapshot",
  "fallback",
  "error",
])

const EXAMPLE_DATA_STATE_SET = new Set(EXAMPLE_DATA_STATES)
const EXAMPLE_CONTRACT_FIELDS = [
  "publicImports",
  "data",
  "provenance",
  "accessibility",
  "motion",
  "responsive",
  "ssr",
  "performance",
]

/**
 * @typedef {"live" | "snapshot" | "fallback" | "error"} ExampleDataState
 *
 * @typedef {object} ExampleDefinition
 * @property {string} id Stable machine-readable example identifier.
 * @property {string} path Public docs route, rooted at `/examples/`.
 * @property {string} title Reader-facing title.
 * @property {string} eyebrow Short chart/family label.
 * @property {string} description Overview-card copy.
 * @property {boolean} isPilot Whether this definition drives the incremental registry migration.
 * @property {string} sourceFile Page source file used by the lazy Full Code loader.
 * @property {ExampleContract} contract Public experience and maintenance contract.
 *
 * @typedef {object} ExampleContract
 * @property {readonly string[]} publicImports Public Semiotic entry points used by the page.
 * @property {{ states: readonly ExampleDataState[], fixture: { kind: string, replay: boolean, schemaVersion: string } }} data
 * @property {{ source: string, capturedAt: string, freshnessOwner: string, reviewCadence: string }} provenance
 * @property {{ summary: string, navigation: string, keyboard: string, forcedColors: string }} accessibility
 * @property {{ reducedMotion: string, visibility: string }} motion
 * @property {{ status: string, viewports: readonly number[], selectionIdentity: string }} responsive
 * @property {{ status: string, hydration: string }} ssr
 * @property {{ status: string, budgets: Record<string, string> }} performance
 */

/** @type {readonly ExampleDefinition[]} */
export const EXAMPLE_DEFINITIONS = Object.freeze([
  {
    id: "watermarks",
    path: "/examples/watermarks",
    sourceFile: "WatermarksExamplePage.jsx",
    isPilot: true,
    title: "Watermarks, Made Physical",
    eyebrow: "EventDropChart · streaming lateness",
    description:
      "A physics-backed remake of the flink-watermarks mechanic with event-time and arrival-time as separate axes.",
    contract: {
      publicImports: ["semiotic/physics"],
      data: {
        states: ["snapshot"],
        fixture: {
          kind: "deterministic-local-scenarios",
          replay: true,
          schemaVersion: "1",
        },
      },
      provenance: {
        source: "Flink watermark mechanics, recreated with deterministic local scenarios",
        capturedAt: "2026-07-12",
        freshnessOwner: "Semiotic maintainers",
        reviewCadence: "release",
      },
      accessibility: {
        summary: "Narrative explanation and settled-window readouts",
        navigation: "Scenario controls and selected-event detail",
        keyboard: "Native buttons, range inputs, and select controls",
        forcedColors: "not-reviewed",
      },
      motion: {
        reducedMotion: "not-reviewed",
        visibility: "not-reviewed",
      },
      responsive: {
        status: "declared-not-measured",
        viewports: [320, 768, 1440],
        selectionIdentity: "selected event ID",
      },
      ssr: {
        status: "not-assessed",
        hydration: "not-assessed",
      },
      performance: {
        status: "unmeasured",
        budgets: {
          bundle: "unmeasured",
          interaction: "unmeasured",
          memory: "unmeasured",
          hiddenPage: "unmeasured",
        },
      },
    },
  },
  {
    id: "stakeholder-journey",
    path: "/examples/stakeholder-journey",
    sourceFile: "StakeholderJourneyExamplePage.jsx",
    isPilot: true,
    title: "The Stakeholder Journey",
    eyebrow: "StreamPhysicsFrame · controlled process comparison",
    description:
      "One deterministic cohort tracks the invitation relay and feeds leadership reach back into synchronized process geometry.",
    contract: {
      publicImports: ["semiotic/physics"],
      data: {
        states: ["snapshot"],
        fixture: {
          kind: "deterministic-local-simulation",
          replay: true,
          schemaVersion: "1",
        },
      },
      provenance: {
        source: "Stakeholder Journey and Open Source Ecosystem Canvas essays",
        capturedAt: "2026-07-12",
        freshnessOwner: "Semiotic maintainers",
        reviewCadence: "release",
      },
      accessibility: {
        summary: "Narrative comparison and stage ledger",
        navigation: "System selector and selected-stage detail",
        keyboard: "Native buttons and controls",
        forcedColors: "not-reviewed",
      },
      motion: {
        reducedMotion: "not-reviewed",
        visibility: "not-reviewed",
      },
      responsive: {
        status: "declared-not-measured",
        viewports: [320, 768, 1440],
        selectionIdentity: "stage ID",
      },
      ssr: {
        status: "not-assessed",
        hydration: "not-assessed",
      },
      performance: {
        status: "unmeasured",
        budgets: {
          bundle: "unmeasured",
          interaction: "unmeasured",
          memory: "unmeasured",
          hiddenPage: "unmeasured",
        },
      },
    },
  },
  {
    id: "merge-pressure",
    path: "/examples/merge-pressure",
    sourceFile: "MergePressureExamplePage.jsx",
    isPilot: true,
    title: "Merge Pressure",
    eyebrow: "GauntletChart · compound PR stream",
    description:
      "Compound PRs share finite review capacity, recirculate through CI, and accumulate merged points into a compound artifact.",
    contract: {
      publicImports: ["semiotic/physics"],
      data: {
        states: ["snapshot"],
        fixture: {
          kind: "deterministic-local-simulation",
          replay: true,
          schemaVersion: "1",
        },
      },
      provenance: {
        source: "Illustrative deterministic pull-request workflow model",
        capturedAt: "2026-07-12",
        freshnessOwner: "Semiotic maintainers",
        reviewCadence: "release",
      },
      accessibility: {
        summary: "Narrative workflow explanation and capacity readouts",
        navigation: "Scenario controls and project-state detail",
        keyboard: "Native buttons and controls",
        forcedColors: "not-reviewed",
      },
      motion: {
        reducedMotion: "not-reviewed",
        visibility: "not-reviewed",
      },
      responsive: {
        status: "declared-not-measured",
        viewports: [320, 768, 1440],
        selectionIdentity: "project ID",
      },
      ssr: {
        status: "not-assessed",
        hydration: "not-assessed",
      },
      performance: {
        status: "unmeasured",
        budgets: {
          bundle: "unmeasured",
          interaction: "unmeasured",
          memory: "unmeasured",
          hiddenPage: "unmeasured",
        },
      },
    },
  },
])

export const EXAMPLE_DEFINITIONS_BY_PATH = Object.freeze(
  Object.fromEntries(EXAMPLE_DEFINITIONS.map((definition) => [definition.path, definition])),
)

/**
 * Resolve a pilot definition from a docs route without making consumers repeat
 * trailing-slash normalization.
 */
export function getExampleDefinition(pathname) {
  if (typeof pathname !== "string") return undefined
  const normalizedPath = pathname.replace(/\/+$/, "") || "/"
  return EXAMPLE_DEFINITIONS_BY_PATH[normalizedPath]
}

export function getPilotExampleDefinitions() {
  return EXAMPLE_DEFINITIONS.filter((definition) => definition.isPilot)
}

/**
 * Example definition schema for the incremental docs pilot. The existing
 * examples manifest remains the authoritative full navigation registry until
 * all examples have migrated to this richer contract.
 */
const REQUIRED_DEFINITION_FIELDS = [
  "id",
  "path",
  "title",
  "eyebrow",
  "description",
]

const OPTIONAL_DEFINITION_FIELDS = [
  "isPilot",
  "sourceFile",
  "contract",
]

const ALLOWED_DEFINITION_FIELDS = new Set([
  ...REQUIRED_DEFINITION_FIELDS,
  ...OPTIONAL_DEFINITION_FIELDS,
])

function isBoolean(value) {
  return typeof value === "boolean"
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0
}

function isStringArray(value, { minimum = 1 } = {}) {
  return (
    Array.isArray(value) &&
    value.length >= minimum &&
    value.every((entry) => isNonEmptyString(entry))
  )
}

function validateExampleContract(errors, definition, index) {
  const label = definition.id ?? `index ${index}`
  const contract = definition.contract
  if (!contract || typeof contract !== "object" || Array.isArray(contract)) {
    errors.push(`Pilot ExampleDefinition "${label}" must define a contract object`)
    return
  }

  for (const field of EXAMPLE_CONTRACT_FIELDS) {
    if (!contract[field] || typeof contract[field] !== "object") {
      errors.push(`ExampleDefinition contract for "${label}" must define "${field}"`)
    }
  }

  if (!isStringArray(contract.publicImports)) {
    errors.push(`ExampleDefinition contract publicImports for "${label}" must be a non-empty string array`)
  } else if (contract.publicImports.some((entry) => !entry.startsWith("semiotic"))) {
    errors.push(`ExampleDefinition contract publicImports for "${label}" must use public Semiotic entry points`)
  }

  const states = contract.data?.states
  if (!isStringArray(states)) {
    errors.push(`ExampleDefinition contract data.states for "${label}" must be a non-empty string array`)
  } else {
    const seenStates = new Set()
    for (const state of states) {
      if (!EXAMPLE_DATA_STATE_SET.has(state)) {
        errors.push(`ExampleDefinition contract data.states for "${label}" has unknown state "${state}"`)
      }
      if (seenStates.has(state)) {
        errors.push(`ExampleDefinition contract data.states for "${label}" repeats "${state}"`)
      }
      seenStates.add(state)
    }
  }

  const fixture = contract.data?.fixture
  if (!fixture || !isNonEmptyString(fixture.kind) || !isNonEmptyString(fixture.schemaVersion)) {
    errors.push(`ExampleDefinition contract data.fixture for "${label}" must declare kind and schemaVersion`)
  }
  if (!isBoolean(fixture?.replay)) {
    errors.push(`ExampleDefinition contract data.fixture.replay for "${label}" must be a boolean`)
  }

  const provenance = contract.provenance
  for (const field of ["source", "capturedAt", "freshnessOwner", "reviewCadence"]) {
    if (!isNonEmptyString(provenance?.[field])) {
      errors.push(`ExampleDefinition contract provenance.${field} for "${label}" must be a non-empty string`)
    }
  }
  if (isNonEmptyString(provenance?.capturedAt) && !/^\d{4}-\d{2}-\d{2}$/.test(provenance.capturedAt)) {
    errors.push(`ExampleDefinition contract provenance.capturedAt for "${label}" must be YYYY-MM-DD`)
  }

  for (const field of ["summary", "navigation", "keyboard", "forcedColors"]) {
    if (!isNonEmptyString(contract.accessibility?.[field])) {
      errors.push(`ExampleDefinition contract accessibility.${field} for "${label}" must be a non-empty string`)
    }
  }
  for (const field of ["reducedMotion", "visibility"]) {
    if (!isNonEmptyString(contract.motion?.[field])) {
      errors.push(`ExampleDefinition contract motion.${field} for "${label}" must be a non-empty string`)
    }
  }

  const viewports = contract.responsive?.viewports
  if (!Array.isArray(viewports) || !viewports.every((viewport) => Number.isFinite(viewport) && viewport > 0)) {
    errors.push(`ExampleDefinition contract responsive.viewports for "${label}" must be positive numbers`)
  }
  for (const field of ["status", "selectionIdentity"]) {
    if (!isNonEmptyString(contract.responsive?.[field])) {
      errors.push(`ExampleDefinition contract responsive.${field} for "${label}" must be a non-empty string`)
    }
  }
  for (const field of ["status", "hydration"]) {
    if (!isNonEmptyString(contract.ssr?.[field])) {
      errors.push(`ExampleDefinition contract ssr.${field} for "${label}" must be a non-empty string`)
    }
  }
  if (!isNonEmptyString(contract.performance?.status)) {
    errors.push(`ExampleDefinition contract performance.status for "${label}" must be a non-empty string`)
  }
  const budgets = contract.performance?.budgets
  if (!budgets || typeof budgets !== "object" || Array.isArray(budgets) || Object.keys(budgets).length === 0) {
    errors.push(`ExampleDefinition contract performance.budgets for "${label}" must be a non-empty object`)
  } else if (!Object.values(budgets).every((value) => isNonEmptyString(value))) {
    errors.push(`ExampleDefinition contract performance.budgets for "${label}" must use non-empty strings`)
  }
}

export function validateExampleDefinitions(definitions = EXAMPLE_DEFINITIONS) {
  const errors = []

  if (!Array.isArray(definitions)) {
    return { ok: false, definitions, errors: ["ExampleDefinition list must be an array"] }
  }

  const seenPaths = new Set()
  const seenSourceFiles = new Set()
  const seenIds = new Set()

  definitions.forEach((definition, index) => {
    REQUIRED_DEFINITION_FIELDS.forEach((field) => {
      if (!isNonEmptyString(definition?.[field])) {
        errors.push(
          `ExampleDefinition at index ${index} must define "${field}" as a non-empty string`,
        )
      }
    })

    const { id, path, sourceFile } = definition ?? {}
    const isPilot = definition?.isPilot === true
    if (isPilot && !isNonEmptyString(sourceFile)) {
      errors.push(`ExampleDefinition at index ${index} must define "sourceFile" for pilot examples`)
    }
    if (isPilot) validateExampleContract(errors, definition, index)
    if (isNonEmptyString(id)) {
      if (seenIds.has(id)) {
        errors.push(`Duplicate ExampleDefinition id "${id}"`)
      }
      seenIds.add(id)
    }

    if (isNonEmptyString(path)) {
      if (!path.startsWith("/examples/")) {
        errors.push(`ExampleDefinition path "${path}" must start with "/examples/"`)
      }
      if (seenPaths.has(path)) {
        errors.push(`Duplicate ExampleDefinition path "${path}"`)
      }
      seenPaths.add(path)
    }

    if (isNonEmptyString(sourceFile)) {
      if (!sourceFile.endsWith(".jsx") || sourceFile.includes("/") || sourceFile.includes("\\")) {
        errors.push(
          `ExampleDefinition sourceFile "${sourceFile}" should be a local JSX source file (e.g. "ExamplePage.jsx")`,
        )
      }
      if (seenSourceFiles.has(sourceFile)) {
        errors.push(`Duplicate ExampleDefinition sourceFile "${sourceFile}"`)
      }
      seenSourceFiles.add(sourceFile)
    }

    if (!isBoolean(definition?.isPilot)) {
      if (definition?.isPilot !== undefined) {
        errors.push(`ExampleDefinition field "isPilot" for "${id ?? `index ${index}`}" must be a boolean`)
      }
    }

    const unknownKeys = Object.keys(definition ?? {}).filter(
      (field) => !ALLOWED_DEFINITION_FIELDS.has(field),
    )
    for (const key of unknownKeys) {
      if (key === "" || key.startsWith("__")) {
        continue
      }
      errors.push(`Unknown field "${key}" on ExampleDefinition "${id ?? `index ${index}`}"`)
    }
  })

  return { ok: errors.length === 0, definitions, errors }
}
