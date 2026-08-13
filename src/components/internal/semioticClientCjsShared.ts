/**
 * Internal CommonJS namespace bundle.
 *
 * Every browser-facing `require()` facade selects its namespace from this one
 * module so React contexts and module-scoped stores retain a single identity
 * when consumers mix Semiotic subpaths. ESM uses native shared chunks instead.
 */
export * as semiotic from "../semiotic"
export * as xy from "../semiotic-xy"
export * as ordinal from "../semiotic-ordinal"
export * as network from "../semiotic-network"
export * as realtime from "../semiotic-realtime"
export * as realtimeCore from "../semiotic-realtime-core"
export * as realtimeReact from "../semiotic-realtime-react"
export * as physics from "../semiotic-physics"
export * as ai from "../semiotic-ai"
export * as controls from "../semiotic-controls"
export * as themesReact from "../semiotic-themes-react"
export * as utils from "../semiotic-utils"
export * as utilsReact from "../semiotic-utils-react"
export * as experimental from "../semiotic-experimental"
export * as value from "../semiotic-value"
