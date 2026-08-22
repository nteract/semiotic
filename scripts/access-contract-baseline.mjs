#!/usr/bin/env node
/**
 * Print the Week 1 ChartAccessContract baseline for LineChart, BarChart, and
 * RealtimeLineChart using the built public access entry. Human AT results are
 * recorded in the strategy document; this command is the reproducible
 * machine-readable half.
 */
import { spawnSync } from "node:child_process"

const code = `
import {
  BAR_CHART_ACCESS_CONTRACT,
  LINE_CHART_ACCESS_CONTRACT,
  REALTIME_LINE_CHART_ACCESS_CONTRACT,
} from "semiotic/access"

console.log(JSON.stringify({
  version: 1,
  contracts: [
    LINE_CHART_ACCESS_CONTRACT,
    BAR_CHART_ACCESS_CONTRACT,
    REALTIME_LINE_CHART_ACCESS_CONTRACT,
  ],
}, null, 2))
`

const result = spawnSync(process.execPath, ["--input-type=module", "-e", code], {
  stdio: "inherit",
})
process.exit(result.status ?? 1)
