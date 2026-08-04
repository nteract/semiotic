/** Minimal typings for the checked-in US history river adapter (plain JS). */
export const US_DOMAIN: readonly [number, number]
export const US_CORE_NODE_IDS: Readonly<{
  states: string
  territories: string
  colonies: string
}>
export const US_PROCESS_NODES: ReadonlyArray<{
  id: string
  group?: string
  xExtent?: readonly [number | string, number | string]
  [key: string]: unknown
}>
export const US_PROCESS_EDGES: ReadonlyArray<{
  id: string
  source: string
  target: string
  value: number
  startTime: number | string
  endTime: number | string
  systemInTime?: number | string | null
  systemOutTime?: number | string | null
  [key: string]: unknown
}>
