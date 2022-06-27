import annotation from "./annotation"

export interface DEXState {
  annotation?: any
}

type FlagsState = {
  enableScopedFilters: boolean
  enableNewGridImplementation: boolean
  enableNewChartExportMethod: boolean
}

export default function reducers(state: DEXState = {}, action) {
  return {
    annotation: annotation(state.annotation, action)
  }
}
