import { RenderPipelineType, DataAccessor } from "./generalTypes"
import { GeneralFrameProps, GeneralFrameState } from "./generalTypes"

export interface NodeType {
  degree: number
  inDegree: number
  outDegree: number
  id?: string
  createdByFrame?: boolean
  x: number
  y: number
  x1: number
  x0: number
  y1: number
  y0: number
  height: number
  width: number
  radius: number
  direction: string
  textHeight: number
  textWidth: number
  fontSize: number
  fontWeight?: number
  rotate?: number
  scale: number
  _NWFText?: string
  text?: string
  r: number
  nodeSize: number
  component: number
  shapeNode: boolean
  depth?: number
  d?: string
  index?: number
  zoomedHeight?: number
  zoomedWidth?: number
  value?: number
}

export interface EdgeType {
  circular?: boolean
  circularPathData?: {
    sourceX: number
    sourceY: number
    leftFullExtent: number
    rightFullExtent: number
    verticalFullExtent: number
    targetX: number
    targetY: number
  }
  source?: NodeType
  target?: NodeType
  d?: string
  x?: number
  y?: number
  y0?: number
  y1?: number
  sankeyWidth?: number
  direction?: string
  width?: number
  points?: Array<{ x: number; y: number }>
  showArrows?: boolean
  ephemeral?: boolean
  value?: number
}

export interface GraphSettingsType {
  type:
    | string
    | (({ edges, nodes }: { edges: EdgeType[]; nodes: NodeType[] }) => void)
  nodes: object[]
  edges: object[] | object
  nodeHash: Map<any, NodeType>
  edgeHash: Map<any, EdgeType>
  hierarchicalNetwork: boolean
  filterRenderedNodes?: Function
}

export interface NetworkSettingsType {
  type?:
    | string
    | (({ edges, nodes }: { edges: EdgeType[]; nodes: NodeType[] }) => void)
  hierarchyChildren?: Function
  hierarchySum?: Function
  layout?: Function
  nodeSize?: Function
  nodes?: NodeType[]
  edges?: EdgeType[]
  iterations?: number
  width?: number
  height?: number
  projection?: "horizontal" | "radial" | "vertical"
  customSankey?: Function
  groupWidth?: number
  padAngle?: number
  padding?: number
  orient?: string
  nodePadding?: number
  nodePaddingRatio?: number
  nodeWidth?: number
  direction?: string
  fontSize?: number
  rotate?: Function
  fontWeight?: number
  textAccessor?: Function
  edgeStrength?: number
  distanceMax?: number
  edgeDistance?: number
  forceManyBody?: Function | number
  hierarchicalNetwork: boolean
  graphSettings: GraphSettingsType
  sortGroups?: Function
  simulation?: Function
  sort?: (a: Record<string, any>, b: Record<string, any>) => number
  zoom?:
    | boolean
    | "stretch"
    | ((nodes: NodeType[], edges: EdgeType[], size: number[]) => void)
  fixExistingNodes?: boolean | Function
  showArrows?: boolean
}

export interface NetworkFrameState<TNode = Record<string, any>, TEdge = Record<string, any>> extends GeneralFrameState {
  nodeData: object[]
  edgeData: object[]
  projectedNodes: NodeType[]
  projectedEdges: EdgeType[]
  projectedXYPoints: object[]
  overlay: object[]
  nodeIDAccessor: (args: Record<string, any>) => string
  sourceAccessor: (args: Record<string, any>) => Record<string, any> | string
  targetAccessor: (args: Record<string, any>) => Record<string, any> | string
  nodeSizeAccessor: (args: Record<string, any>) => number
  edgeWidthAccessor: (args: Record<string, any>) => number
  nodeLabelAnnotations: object[]
  graphSettings: GraphSettingsType
  networkFrameRender: RenderPipelineType
  props: NetworkFrameProps<TNode, TEdge>
}

export interface NetworkFrameProps<TNode = Record<string, any>, TEdge = Record<string, any>> extends GeneralFrameProps {
  graph?:
    | { nodes: NodeType[]; edges: EdgeType[] }
    | EdgeType[]
    | {
        (): () => void
        nodes: Function
        edges: Function
        node: Function
        edge: Function
      }
  nodes?: TNode[]
  edges?: TEdge[] | TEdge
  networkType?: string | object
  nodeStyle?: Record<string, any> | ((args: Record<string, any>) => Record<string, any>)
  nodeClass?: string | ((args: Record<string, any>) => string)
  canvasNodes?: boolean | ((args: Record<string, any>) => boolean)
  edgeStyle?: Record<string, any> | ((args: Record<string, any>) => Record<string, any>)
  edgeClass?: string | ((args: Record<string, any>) => string)
  canvasEdges?: boolean | ((args: Record<string, any>) => boolean)
  nodeRenderMode?: string | ((args: Record<string, any>) => string)
  edgeRenderMode?: string | ((args: Record<string, any>) => string)
  nodeLabels?: boolean | ((args: Record<string, any>) => JSX.Element | string | null)
  edgeRenderKey?: (args: Record<string, any>) => string
  nodeRenderKey?: (args: Record<string, any>) => string
  edgeWidthAccessor?: DataAccessor<TEdge, number>
  nodeSizeAccessor?: DataAccessor<TNode, number> | number
  targetAccessor?: DataAccessor<TEdge, string | Record<string, any>>
  sourceAccessor?: DataAccessor<TEdge, string | Record<string, any>>
  nodeIDAccessor?: DataAccessor<TNode, string>
  edgeType?: string | Function
  customNodeIcon?: Function
  customEdgeIcon?: Function
  renderOrder?: ReadonlyArray<"edges" | "nodes">
  filterRenderedNodes?: (
    value?: NodeType,
    index?: number,
    array?: NodeType[]
  ) => any
}
