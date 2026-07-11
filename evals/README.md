# Semiotic AI evaluations

This directory holds versioned, reproducible evidence for Semiotic's agent-facing
surfaces. The fixtures intentionally contain no private prompts or production data.

- `tool-discovery/golden-prompts.json` defines expected public-profile tool routing,
  including negative cases where Semiotic should not be called.
- `first-try/fixtures.json` defines deterministic proposals used to measure validation,
  diagnosis, render evidence, and repair recovery.

The runners report their raw per-fixture results. They do not claim model quality:
model/client runs belong in separately versioned compatibility reports with model IDs,
dates, prompts, and consent-safe traces.
