/**
 * Validation and normalization for Vitest benchmark output.
 *
 * Vitest 4 retains `sampleCount`; Vitest 5 reports `latency.samplesCount`.
 * Validate that count rather than the optional raw samples array so a
 * failed/empty benchmark cannot become a baseline hole.
 */

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function display(value) {
  return value === undefined ? "missing" : JSON.stringify(value)
}

function validateEntry(name, entry, source, errors) {
  if (typeof name !== "string" || name.length === 0) {
    errors.push(`${source}: benchmark has no non-empty name`)
    return null
  }
  if (!isRecord(entry)) {
    errors.push(`${source} > ${name}: result is not an object`)
    return null
  }

  const { mean, sampleCount } = entry
  if (!Number.isFinite(mean) || mean <= 0) {
    errors.push(
      `${source} > ${name}: mean must be a finite number greater than zero (received ${display(mean)})`,
    )
  }
  if (!Number.isSafeInteger(sampleCount) || sampleCount <= 0) {
    errors.push(
      `${source} > ${name}: sampleCount must be a positive integer (received ${display(sampleCount)})`,
    )
  }

  if (!Number.isFinite(mean) || mean <= 0 || !Number.isSafeInteger(sampleCount) || sampleCount <= 0) {
    return null
  }

  return { mean, sampleCount, unit: "ms" }
}

/**
 * Normalize Vitest 4 `--outputJson` or Vitest 5 JSON reporter output.
 * Keep both formats for comparisons against older release checkouts.
 */
export function collectVitestBenchmarks(raw, label = "Vitest benchmark output") {
  const errors = []
  const benchmarks = Object.create(null)
  const names = new Set()

  if (isRecord(raw) && Array.isArray(raw.testResults)) {
    if (raw.success !== true)
      errors.push(`${label}: benchmark run did not succeed`)
    raw = {
      files: raw.testResults.map((file) => {
        const source = `${label} > ${file?.name ?? "unknown file"}`
        if (
          !isRecord(file) ||
          file.status !== "passed" ||
          !Array.isArray(file.assertionResults)
        ) {
          errors.push(`${source}: failed or incomplete benchmark file`)
          return { filepath: file?.name, groups: [] }
        }
        return {
          filepath: file.name,
          groups: file.assertionResults.flatMap((test) => {
            // Optional engine benchmarks intentionally skip when not installed.
            if (
              test?.status === "skipped" ||
              test?.status === "pending" ||
              test?.status === "todo"
            )
              return []
            if (
              !isRecord(test) ||
              test.status !== "passed" ||
              !Array.isArray(test.benchmarks) ||
              test.benchmarks.length === 0
            ) {
              errors.push(
                `${source} > ${test?.title ?? "unknown test"}: failed or empty benchmark test`
              )
              return []
            }
            return test.benchmarks.map((group) => ({
              fullName: test.fullName,
              benchmarks: Array.isArray(group?.tasks)
                ? group.tasks.map((task) => ({
                    name: task?.name,
                    mean: task?.latency?.mean,
                    sampleCount: task?.latency?.samplesCount
                  }))
                : undefined
            }))
          })
        }
      })
    }
  }

  if (!isRecord(raw) || !Array.isArray(raw.files)) {
    return {
      benchmarks,
      errors: [`${label}: expected a JSON object with a files array`],
    }
  }

  let observed = 0
  raw.files.forEach((file, fileIndex) => {
    const fileLabel = isRecord(file) && typeof file.filepath === "string"
      ? file.filepath
      : `file #${fileIndex + 1}`
    if (!isRecord(file) || !Array.isArray(file.groups)) {
      errors.push(`${label} > ${fileLabel}: missing groups array`)
      return
    }

    file.groups.forEach((group, groupIndex) => {
      const groupLabel = isRecord(group) && typeof group.fullName === "string"
        ? group.fullName
        : `group #${groupIndex + 1}`
      const source = `${label} > ${fileLabel} > ${groupLabel}`
      if (!isRecord(group) || !Array.isArray(group.benchmarks)) {
        errors.push(`${source}: missing benchmarks array`)
        return
      }
      if (group.benchmarks.length === 0) {
        errors.push(`${source}: emitted zero benchmark entries`)
        return
      }

      group.benchmarks.forEach((entry) => {
        observed++
        const name = isRecord(entry) ? entry.name : undefined
        if (typeof name === "string" && names.has(name)) {
          errors.push(`${source} > ${name}: duplicate benchmark name`)
          return
        }
        const normalized = validateEntry(name, entry, source, errors)
        if (!normalized) return
        names.add(name)
        benchmarks[name] = normalized
      })
    })
  })

  if (observed === 0) {
    errors.push(`${label}: emitted zero benchmark entries`)
  }

  return { benchmarks, errors }
}

/**
 * Validate a normalized capture (`{ benchmarks: { name: { mean, sampleCount } } }`).
 */
export function collectCapturedBenchmarks(captured, label = "benchmark capture") {
  const errors = []
  const benchmarks = Object.create(null)
  const names = new Set()

  if (!isRecord(captured) || !isRecord(captured.benchmarks)) {
    return {
      benchmarks,
      errors: [`${label}: expected a JSON object with a benchmarks object`],
    }
  }

  const entries = Object.entries(captured.benchmarks)
  if (entries.length === 0) {
    errors.push(`${label}: contains zero benchmark entries`)
  }
  for (const [name, entry] of entries) {
    if (names.has(name)) {
      errors.push(`${label} > ${name}: duplicate benchmark name`)
      continue
    }
    const normalized = validateEntry(name, entry, label, errors)
    if (!normalized) continue
    names.add(name)
    benchmarks[name] = normalized
  }

  return { benchmarks, errors }
}

/** Report two-way baseline membership drift (missing, renamed, or new names). */
export function exactBenchmarkMembershipErrors(baseline, current) {
  const errors = []
  const baselineNames = Object.keys(baseline)
  const currentNames = Object.keys(current)

  for (const name of baselineNames) {
    if (!Object.hasOwn(current, name)) {
      errors.push(`baseline benchmark missing from current run: ${name}`)
    }
  }
  for (const name of currentNames) {
    if (!Object.hasOwn(baseline, name)) {
      errors.push(`current benchmark missing from baseline: ${name}`)
    }
  }

  return errors
}

export function printBenchmarkValidationErrors(errors) {
  for (const error of errors) console.error(`✗ ${error}`)
}
