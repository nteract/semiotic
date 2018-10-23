import AnnotationLayer from "./AnnotationLayer"
import DividedLine from "./DividedLine"
import XYFrame from "./XYFrame"
import OrdinalFrame from "./OrdinalFrame"
import MinimapXYFrame from "./MinimapXYFrame"
import MinimapNetworkFrame from "./MinimapNetworkFrame"
import MiniMap from "./MiniMap"
import Axis from "./Axis"
import Legend from "./Legend"
import Annotation from "./Annotation"
import Brush from "./Brush"
import InteractionLayer from "./InteractionLayer"
import VisualizationLayer from "./VisualizationLayer"
import NetworkFrame from "./NetworkFrame"
import { funnelize } from "./svg/lineDrawing"
import { calculateDataExtent } from "./data/dataFunctions"

import FacetController from "./FacetController"

import ResponsiveNetworkFrame from "./ResponsiveNetworkFrame"
import ResponsiveMinimapXYFrame from "./ResponsiveMinimapXYFrame"
import ResponsiveXYFrame from "./ResponsiveXYFrame"
import ResponsiveOrdinalFrame from "./ResponsiveOrdinalFrame"

import SparkXYFrame from "./SparkXYFrame"
import SparkOrdinalFrame from "./SparkOrdinalFrame"
import SparkNetworkFrame from "./SparkNetworkFrame"
import { chuckCloseCanvasTransform } from "./canvas/basicCanvasEffects"
import { Mark } from "semiotic-mark"

import { hexbinning, heatmapping } from "./svg/areaDrawing"

const ORFrame = OrdinalFrame
const ResponsiveORFrame = ResponsiveOrdinalFrame

export default {
  AnnotationLayer,
  DividedLine,
  XYFrame,
  MinimapXYFrame,
  MinimapNetworkFrame,
  MiniMap,
  Brush,
  Axis,
  InteractionLayer,
  VisualizationLayer,
  OrdinalFrame,
  ORFrame,
  Annotation,
  NetworkFrame,
  ResponsiveMinimapXYFrame,
  ResponsiveOrdinalFrame,
  ResponsiveORFrame,
  ResponsiveNetworkFrame,
  ResponsiveXYFrame,
  SparkOrdinalFrame,
  SparkNetworkFrame,
  SparkXYFrame,
  Legend,
  Mark,
  FacetController,
  funnelize,
  calculateDataExtent,
  chuckCloseCanvasTransform,
  hexbinning,
  heatmapping
}

export {
  AnnotationLayer,
  DividedLine,
  XYFrame,
  MinimapXYFrame,
  MinimapNetworkFrame,
  MiniMap,
  Brush,
  Axis,
  InteractionLayer,
  VisualizationLayer,
  OrdinalFrame,
  ORFrame,
  Annotation,
  NetworkFrame,
  ResponsiveMinimapXYFrame,
  ResponsiveOrdinalFrame,
  ResponsiveORFrame,
  ResponsiveNetworkFrame,
  ResponsiveXYFrame,
  SparkOrdinalFrame,
  SparkNetworkFrame,
  SparkXYFrame,
  Legend,
  Mark,
  chuckCloseCanvasTransform,
  funnelize,
  calculateDataExtent,
  FacetController,
  hexbinning,
  heatmapping
}
