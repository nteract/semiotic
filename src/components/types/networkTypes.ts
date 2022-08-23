import { GenericObject, RenderPipelineType } from "./generalTypes"
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
}

export interface EdgeType {
  circular?: boolean
  circularPathData?: any
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
  sort?: (a: GenericObject, b: GenericObject) => number
  zoom?:
    | boolean
    | "stretch"
    | ((nodes: NodeType[], edges: EdgeType[], size: number[]) => void)
  fixExistingNodes?: boolean | Function
  showArrows?: boolean
}

export interface NetworkFrameState extends GeneralFrameState {
  nodeData: object[]
  edgeData: object[]
  projectedNodes: NodeType[]
  projectedEdges: EdgeType[]
  projectedXYPoints: object[]
  overlay: object[]
  nodeIDAccessor: (args: GenericObject) => string
  sourceAccessor: (args: GenericObject) => GenericObject | string
  targetAccessor: (args: GenericObject) => GenericObject | string
  nodeSizeAccessor: (args: GenericObject) => number
  edgeWidthAccessor: (args: GenericObject) => number
  nodeLabelAnnotations: object[]
  graphSettings: GraphSettingsType
  networkFrameRender: RenderPipelineType
  props: NetworkFrameProps
}

export interface NetworkFrameProps extends GeneralFrameProps {
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
  nodes?: object[]
  edges?: object[] | object
  networkType?: string | object
  nodeStyle?: GenericObject | ((args: GenericObject) => GenericObject)
  nodeClass?: string | ((args: GenericObject) => string)
  canvasNodes?: boolean | ((args: GenericObject) => boolean)
  edgeStyle?: GenericObject | ((args: GenericObject) => GenericObject)
  edgeClass?: string | ((args: GenericObject) => string)
  canvasEdges?: boolean | ((args: GenericObject) => boolean)
  nodeRenderMode?: string | ((args: GenericObject) => string)
  edgeRenderMode?: string | ((args: GenericObject) => string)
  nodeLabels?: boolean | ((args: GenericObject) => JSX.Element | string | null)
  edgeRenderKey?: (args: GenericObject) => string
  nodeRenderKey?: (args: GenericObject) => string
  edgeWidthAccessor?: string | ((args: GenericObject) => number)
  nodeSizeAccessor?: string | ((args: GenericObject) => number)
  targetAccessor?: string | ((args: GenericObject) => string | GenericObject)
  sourceAccessor?: string | ((args: GenericObject) => string | GenericObject)
  nodeIDAccessor?: string | ((args: GenericObject) => string)
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
