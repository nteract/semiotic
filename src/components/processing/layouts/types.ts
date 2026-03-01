import { NodeType, NetworkSettingsType } from "../../types/networkTypes"

export type NetworkLayoutHandler = (args: {
  projectedNodes: NodeType[]
  projectedEdges: any[]
  networkSettings: NetworkSettingsType
  adjustedSize: number[]
  edgeHash: Map<string, any>
  nodeIDAccessor: Function
  edgeWidthAccessor: Function
  nodeSizeAccessor: Function
  size: number[]
}) => { projectedNodes: NodeType[], projectedEdges: any[], components?: any[] }

export type NetworkLayoutMap = Record<string, NetworkLayoutHandler>
