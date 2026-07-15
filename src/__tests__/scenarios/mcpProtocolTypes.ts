import type { Datum } from "../../components/charts/shared/datumTypes"

export interface JsonRpcResponse {
  jsonrpc: "2.0"
  id: string | number
  result: Datum
  error?: Datum
}

export interface ListedMcpTool {
  name: string
  _meta?: {
    ui?: { resourceUri: string }
    "openai/outputTemplate"?: string
  }
  annotations?: {
    readOnlyHint?: boolean
    destructiveHint?: boolean
  }
}
