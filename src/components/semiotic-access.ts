/**
 * semiotic/access — public access-contract surface.
 *
 * This entry is deliberately separate from chart family entries so production
 * routes do not load access tooling merely to render a chart.
 */
export {
  CHART_ACCESS_CONTRACT_VERSION,
  createChartAccessContract,
} from "./access/chartAccessContract"
export type {
  AccessStatusRecord,
  ChartAccessContract,
  ChartAccessContractInput,
  ChartAccessContractText,
  ChartAccessContractKeyboard,
  ChartAccessContractNavigation,
  ChartAccessContractMediaPreferences,
  ChartAccessContractStreamStatus,
  ChartAccessContractSsr,
  ChartAccessContractEvidence,
  StreamStatusInput,
} from "./access/chartAccessContract"
export {
  BAR_CHART_ACCESS_CONTRACT,
  LINE_CHART_ACCESS_CONTRACT,
  REALTIME_LINE_CHART_ACCESS_CONTRACT,
} from "./access/chartAccessContractFixtures"
