#!/usr/bin/env node
/**
 * Print the Week 1 ChartAccessContract baseline for LineChart, BarChart, and
 * RealtimeLineChart. Human AT/browser-agent task results are recorded in
 * docs/strategy/infrastructure-value-goals-2026-08.md; this command provides
 * the reproducible machine-readable half of that baseline.
 */
import { execFileSync } from "node:child_process"

const code = `
import {
  BAR_CHART_ACCESS_CONTRACT,
  LINE_CHART_ACCESS_CONTRACT,
  REALTIME_LINE_CHART_ACCESS_CONTRACT,
} from "./src/components/access/chartAccessContracts.generated"
import { renderChartWithEvidence } from "./src/components/server/renderToStaticSVG"

console.log(JSON.stringify({
  version: 1,
  contracts: [
    LINE_CHART_ACCESS_CONTRACT,
    BAR_CHART_ACCESS_CONTRACT,
    REALTIME_LINE_CHART_ACCESS_CONTRACT,
  ],
}, null, 2))
`

execFileSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", code], {
  stdio: "inherit",
})
