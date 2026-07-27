export function summarizeFirstTryRows(rows, hasSubmission) {
  const generationRows = rows.filter(({ kind }) => kind === "generation")
  const reportedRows = hasSubmission
    ? generationRows.filter(({ source }) => source === "model-submission")
    : generationRows

  return {
    generationFixtures: reportedRows.length,
    availableGenerationFixtures: generationRows.length,
    guardFixtures: rows.length - generationRows.length,
    staticFixtures: reportedRows.filter(({ mode }) => mode === "static").length,
    pushFixtures: reportedRows.filter(({ mode }) => mode === "push").length,
    firstAttemptPassed: reportedRows.filter(
      ({ firstAttempt }) => firstAttempt.passed
    ).length,
    postRepairAttempted: reportedRows.filter(({ postRepair }) => postRepair)
      .length,
    postRepairPassed: reportedRows.filter(
      ({ postRepair }) => postRepair?.passed
    ).length
  }
}

export function summarizeGroundingRows(conditions, rows) {
  const conditionSummary = Object.fromEntries(
    conditions.map((condition) => {
      const available = rows.filter((entry) => entry.condition === condition)
      const scored = available.filter((entry) => entry.status === "scored")
      return [
        condition,
        {
          trials: scored.length,
          availableTrials: available.length,
          missing: available.length - scored.length,
          scored: scored.length,
          passed: scored.filter(({ passed }) => passed).length,
          accuracy:
            scored.length > 0
              ? scored.filter(({ passed }) => passed).length / scored.length
              : null,
          unanswerableTrials: scored.filter(({ answerable }) => !answerable)
            .length
        }
      ]
    })
  )

  const trials = Object.values(conditionSummary).reduce(
    (total, condition) => total + condition.trials,
    0
  )

  return {
    trials,
    availableTrials: rows.length,
    missing: rows.length - trials,
    conditions: conditionSummary
  }
}
