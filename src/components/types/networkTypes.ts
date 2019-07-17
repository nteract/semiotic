import { AnnotationHandling } from "./annotationTypes"
import {
  CanvasPostProcessTypes,
  GenericObject,
  MarginType,
  RenderPipelineType
} from "./generalTypes"
import { LegendProps } from "./legendTypes"

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
  source?: NodeType
  target?: NodeType
  d?: string
  x?: number
  y?: number
  sankeyWidth?: number
  direction?: string
  width?: number
  points?: Array<{ x: number; y: number }>
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
}

export interface NetworkSettingsType {
  type:
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
  zoom?: boolean | "stretch" | ((nodes: NodeType[], size: number[]) => void)
}

export interface NetworkFrameState {
  dataVersion?: string
  adjustedPosition: number[]
  adjustedSize: number[]
  backgroundGraphics?: React.ReactNode | Function
  foregroundGraphics?: React.ReactNode | Function
  title: object
  renderNumber: number
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
  margin: MarginType
  legendSettings: LegendProps
  nodeLabelAnnotations: object[]
  graphSettings: GraphSettingsType
  networkFrameRender: RenderPipelineType
}

export interface NetworkFrameProps {
  dataVersion?: string
  name: string
  graph?:
    | { nodes: NodeType[]; edges: EdgeType[] }
    | EdgeType[]
    | {
        (): any
        nodes: Function
        edges: Function
        node: Function
        edge: Function
      }
  nodes?: object[]
  edges?: object[] | object
  networkType?: string | object
  size: number[]
  nodeStyle?: GenericObject | ((args: GenericObject) => GenericObject)
  nodeClass?: string | ((args: GenericObject) => string)
  canvasNodes?: boolean | ((args: GenericObject) => boolean)
  edgeStyle?: GenericObject | ((args: GenericObject) => GenericObject)
  edgeClass?: string | ((args: GenericObject) => string)
  canvasEdges?: boolean | ((args: GenericObject) => boolean)
  nodeRenderMode?: string | ((args: GenericObject) => string)
  edgeRenderMode?: string | ((args: GenericObject) => string)
  nodeLabels?: boolean | ((args: GenericObject) => boolean)
  title?: Element
  legend?: object
  edgeRenderKey?: (args: GenericObject) => string
  nodeRenderKey?: (args: GenericObject) => string
  backgroundGraphics?: React.ReactNode | Function
  foregroundGraphics?: React.ReactNode | Function
  additionalDefs?: Element
  svgAnnotationRules?: Function
  htmlAnnotationRules?: Function
  tooltipContent?: Function
  annotations: object[]
  annotationSettings?: AnnotationHandling
  className?: string
  customClickBehavior?: Function
  customDoubleClickBehavior?: Function
  customHoverBehavior?: Function
  matte?: boolean | object | Element | Function
  useSpans?: boolean
  beforeElements?: Element
  afterElements?: Element
  interaction?: object
  hoverAnnotation?: boolean | string | Array<object | Function>
  download?: boolean
  downloadFields?: Array<string>
  baseMarkProps?: object
  canvasPostProcess?: CanvasPostProcessTypes
  disableContext?: boolean
  edgeWidthAccessor?: string | ((args: GenericObject) => number)
  nodeSizeAccessor?: string | ((args: GenericObject) => number)
  targetAccessor?: string | ((args: GenericObject) => string | GenericObject)
  sourceAccessor?: string | ((args: GenericObject) => string | GenericObject)
  nodeIDAccessor?: string | ((args: GenericObject) => string)
  edgeType?: string | Function
  customNodeIcon?: Function
  customEdgeIcon?: Function
  margin?: number | object
  onNodeOut?: Function
  onNodeClick?: Function
  onNodeEnter?: Function
  renderOrder?: ReadonlyArray<"edges" | "nodes">
  filterRenderedNodes: (
    value?: NodeType,
    index?: number,
    array?: NodeType[]
  ) => any
  onUnmount?: Function
}
