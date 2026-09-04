export type ValidationIssue = { path: string; message: string }

export interface StringFieldRule {
  required?: boolean
  values?: ReadonlyArray<string>
}

/** Validate a closed string-valued record from one ordered field definition. */
export function validateStringFields(
  record: Record<string, unknown>,
  fields: Record<string, StringFieldRule>,
  path: string,
  errors: ValidationIssue[]
): void {
  rejectUnknownKeys(record, Object.keys(fields), path, errors)
  for (const [key, rule] of Object.entries(fields)) {
    if (rule.values) {
      if (rule.required || record[key] !== undefined) {
        enumString(record, key, path, rule.values, errors)
      }
    } else if (rule.required) {
      requiredString(record, key, path, errors)
    } else {
      stringIfPresent(record, key, path, errors)
    }
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

export function numberIfPresent(
  record: Record<string, unknown>,
  key: string,
  path: string,
  errors: ValidationIssue[]
): void {
  if (
    record[key] !== undefined &&
    (typeof record[key] !== "number" || !Number.isFinite(record[key]))
  ) {
    errors.push({
      path: `${path}.${key}`,
      message: "Expected a finite number."
    })
  }
}

export function booleanIfPresent(
  record: Record<string, unknown>,
  key: string,
  path: string,
  errors: ValidationIssue[]
): void {
  if (record[key] !== undefined && typeof record[key] !== "boolean") {
    errors.push({ path: `${path}.${key}`, message: "Expected a boolean." })
  }
}

function isJsonValue(value: unknown): boolean {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return true
  }
  if (typeof value === "number") return Number.isFinite(value)
  if (Array.isArray(value)) return value.every(isJsonValue)
  return isRecord(value) && Object.values(value).every(isJsonValue)
}

export function jsonObjectIfPresent(
  record: Record<string, unknown>,
  key: string,
  path: string,
  errors: ValidationIssue[]
): void {
  if (
    record[key] !== undefined &&
    (!isRecord(record[key]) || !isJsonValue(record[key]))
  ) {
    errors.push({ path: `${path}.${key}`, message: "Expected a JSON object." })
  }
}

export function jsonValuesAreValid(values: ReadonlyArray<unknown>): boolean {
  return values.every(isJsonValue)
}

export function rejectUnknownKeys(
  record: Record<string, unknown>,
  allowed: ReadonlyArray<string>,
  path: string,
  errors: ValidationIssue[]
): void {
  const known = new Set(allowed)
  for (const key of Object.keys(record)) {
    if (!known.has(key)) {
      errors.push({
        path: `${path}.${key}`,
        message: "Unexpected property."
      })
    }
  }
}

export function requiredString(
  record: Record<string, unknown>,
  key: string,
  path: string,
  errors: ValidationIssue[]
): void {
  if (typeof record[key] !== "string" || !record[key]) {
    errors.push({
      path: `${path}.${key}`,
      message: "Expected a non-empty string."
    })
  }
}

export function enumString(
  record: Record<string, unknown>,
  key: string,
  path: string,
  allowed: ReadonlyArray<string>,
  errors: ValidationIssue[]
): void {
  if (typeof record[key] !== "string" || !allowed.includes(record[key])) {
    errors.push({
      path: `${path}.${key}`,
      message: `Expected one of: ${allowed.join(", ")}.`
    })
  }
}

export function optionalRecord(
  record: Record<string, unknown>,
  key: string,
  path: string,
  errors: ValidationIssue[]
): Record<string, unknown> | undefined {
  const value = record[key]
  if (value === undefined) return undefined
  if (!isRecord(value)) {
    errors.push({
      path: `${path}.${key}`,
      message: "Expected an object."
    })
    return undefined
  }
  return value
}

export function optionalArray(
  record: Record<string, unknown>,
  key: string,
  path: string,
  errors: ValidationIssue[]
): unknown[] | undefined {
  const value = record[key]
  if (value === undefined) return undefined
  if (!Array.isArray(value)) {
    errors.push({
      path: `${path}.${key}`,
      message: "Expected an array."
    })
    return undefined
  }
  return value
}

export function validateStringArray(
  value: unknown[] | undefined,
  path: string,
  errors: ValidationIssue[]
): void {
  if (value?.some((entry) => typeof entry !== "string" || !entry)) {
    errors.push({
      path,
      message: "Expected non-empty string values."
    })
  }
}

export function enumStringIfPresent(
  record: Record<string, unknown>,
  key: string,
  path: string,
  allowed: ReadonlyArray<string>,
  errors: ValidationIssue[]
): void {
  if (record[key] !== undefined) {
    enumString(record, key, path, allowed, errors)
  }
}

export function stringIfPresent(
  record: Record<string, unknown>,
  key: string,
  path: string,
  errors: ValidationIssue[]
): void {
  if (record[key] !== undefined && typeof record[key] !== "string") {
    errors.push({
      path: `${path}.${key}`,
      message: "Expected a string."
    })
  }
}

export function validateActor(
  value: unknown,
  path: string,
  errors: ValidationIssue[]
): void {
  if (!isRecord(value)) {
    errors.push({ path, message: "Expected an actor object." })
    return
  }
  rejectUnknownKeys(value, ["id", "name", "kind"], path, errors)
  requiredString(value, "kind", path, errors)
  stringIfPresent(value, "id", path, errors)
  stringIfPresent(value, "name", path, errors)
}
