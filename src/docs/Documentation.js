import * as React from "react"
import { useState } from "react"
import { useParams } from "react-router-dom"
import Introduction from "./Introduction"
import Examples from "./Examples"

import XYFrameDocs from "./components/XYFrameDocs"
import OrdinalFrameDocs from "./components/OrdinalFrameDocs"
import NetworkFrameDocs from "./components/NetworkFrameDocs"
import AxisDocs from "./components/AxisDocs"
import LegendDocs from "./components/LegendDocs"
import DividedLineDocs from "./components/DividedLineDocs"

import Divider from "@material-ui/core/Divider"

import classNames from "classnames"

//Examples
import RegionatedLineChartDocs from "./components/RegionatedLineChartDocs"
import Violin from "./components/Violin"
import ParallelCoordinates from "./components/ParallelCoordinates"
import BarLineDocs from "./components/BarLineDocs"
import HeatMap from "./components/HeatMap"
import Marimekko from "./components/Marimekko"
import DotPlot from "./components/DotPlot"
import DataSketchesPlot from "./components/DataSketchesPlot"
import DonutChart from "./components/DonutChart"
import JoyPlot from "./components/JoyPlot"
import WaterfallChart from "./components/WaterfallChart"
import BulletChart from "./components/BulletChart"
import NeighborhoodMap from "./components/NeighborhoodMap"
import CanvasInteraction from "./components/CanvasInteraction"
import BaseballMap from "./components/BaseballMap"
import SwarmBrush from "./components/SwarmBrush"
import LineBrush from "./components/LineBrush"
import Minimap from "./components/Minimap"
// import NetworkMinimap from "./components/NetworkMinimap"
import Timeline from "./components/Timeline"
import DivergingStackedBar from "./components/DivergingStackedBar"
import DivergingStackedIsotype from "./components/DivergingStackedIsotype"
import VerticalIsotype from "./components/VerticalIsotype"
import Sankey from "./components/Sankey"
import Chord from "./components/Chord"
import Dendrogram from "./components/Dendrogram"
import CustomNodes from "./components/CustomNodes"
import Sunburst from "./components/Sunburst"
import NegativeStacked from "./components/NegativeStacked"
import CustomMark from "./components/CustomMark"
import SharedTooltipExample from "./components/SharedTooltipExample"
import DecisionMatrix from "./components/DecisionMatrix"
import CometPlot from "./components/CometPlot"
import Networks from "./components/Networks"
import Sparkline from "./components/Sparkline"
import ResponsiveExample from "./components/ResponsiveExample"

import FacetControllerDocs from "./components/FacetControllerDocs"

//import Process from "./components/Process";
import BarToParallel from "./components/BarToParallel"
import AppleStockChart from "./components/AppleStockChart"

import CreatingBarChart from "./components/CreatingBarChart"
import CreatingPieChart from "./components/CreatingPieChart"
import CreatingLineChart from "./components/CreatingLineChart"
import CreatingXYPlots from "./components/CreatingXYPlots"
import CreatingCrossHighlighting from "./components/CreatingCrossHighlighting"
import UsingPatternsTextures from "./components/UsingPatternsTextures"

import RealtimeOrdinalFrame from "./components/RealtimeOrdinalFrame"
import RealtimeXYFrame from "./components/RealtimeXYFrame"

import Drawer from "@material-ui/core/Drawer"
import AppBar from "@material-ui/core/AppBar"
import Toolbar from "@material-ui/core/Toolbar"
import List from "@material-ui/core/List"
import ListItem from "@material-ui/core/ListItem"
import ListItemText from "@material-ui/core/ListItemText"
import { Link } from "react-router-dom"

const components = {
  informationmodel: { docs: BarToParallel },
  creatinglinechart: { docs: CreatingLineChart },
  creatingbarchart: { docs: CreatingBarChart },
  creatingpiechart: { docs: CreatingPieChart },
  creatingxyplots: { docs: CreatingXYPlots },
  creatingpcrosshighlight: { docs: CreatingCrossHighlighting },
  usingpatterns: { docs: UsingPatternsTextures },
  sparkline: { docs: Sparkline },
  xyframe: { docs: XYFrameDocs },
  regionatedlinechart: { docs: RegionatedLineChartDocs, parent: "xyframe" },
  annotations: { docs: AppleStockChart, parent: "xyframe" },
  homerunmap: { docs: BaseballMap, parent: "xyframe" },
  neighborhoodmap: { docs: NeighborhoodMap, parent: "xyframe" },
  canvasinteraction: { docs: CanvasInteraction, parent: "xyframe" },
  realtimeline: { docs: RealtimeXYFrame, parent: "xyframe" },
  minimap: { docs: Minimap, parent: "xyframe" },
  linebrush: { docs: LineBrush, parent: "xyframe" },
  negativestacked: { docs: NegativeStacked, parent: "xyframe" },
  datasketches: { docs: DataSketchesPlot, parent: "xyframe" },
  sharedTooltip: { docs: SharedTooltipExample, parent: "xyframe" },
  decisionMatrix: { docs: DecisionMatrix, parent: "xyframe" },
  cometplot: { docs: CometPlot, parent: "xyframe" },
  orframe: { docs: OrdinalFrameDocs },
  violin: { docs: Violin, parent: "orframe" },
  barline: { docs: BarLineDocs, parent: "orframe" },
  parallelcoordinates: { docs: ParallelCoordinates, parent: "orframe" },
  timeline: { docs: Timeline, parent: "orframe" },
  heatmap: { docs: HeatMap, parent: "orframe" },
  marimekko: { docs: Marimekko, parent: "orframe" },
  dotplot: { docs: DotPlot, parent: "orframe" },
  donutchart: { docs: DonutChart, parent: "orframe" },
  ridgeline: { docs: JoyPlot, parent: "orframe" },
  swarmbrush: { docs: SwarmBrush, parent: "orframe" },
  divergingstackedbar: { docs: DivergingStackedBar, parent: "orframe" },
  custommark: { docs: CustomMark, parent: "orframe" },
  divergingstackedisotype: { docs: DivergingStackedIsotype, parent: "orframe" },
  verticalisotype: { docs: VerticalIsotype, parent: "orframe" },
  waterfall: { docs: WaterfallChart, parent: "orframe" },
  bullet: { docs: BulletChart, parent: "orframe" },
  realtimebar: { docs: RealtimeOrdinalFrame, parent: "orframe" },
  networkframe: { docs: NetworkFrameDocs },
  //  networkminimap: { docs: NetworkMinimap, parent: "networkframe" },
  sankey: { docs: Sankey, parent: "networkframe" },
  chord: { docs: Chord, parent: "networkframe" },
  dendrogram: { docs: Dendrogram, parent: "networkframe" },
  customnode: { docs: CustomNodes, parent: "networkframe" },
  sunburst: { docs: Sunburst, parent: "networkframe" },
  networks: { docs: Networks, parent: "networkframe" },
  facet: { docs: FacetControllerDocs },
  axis: { docs: AxisDocs },
  legend: { docs: LegendDocs },
  dividedline: { docs: DividedLineDocs }
}

function Documentation(props) {
  let [open, setOpen] = useState(true)

  const match = useParams()
  const selected = match && match.component
  const selectedComponent = components[selected]

  const classes = {}

  let selectedDoc = null,
    Doc = null
  // const selectedStyles = {
  //   borderTop: "5px double #ac9739",
  //   borderBottom: "5px double #ac9739"
  // }

  if (selected === "responsive") {
    return <ResponsiveExample />
  }

  const allDocs = [
    <Link to={"/"} key="home-link">
      <ListItem button>
        <ListItemText primary="Home" />
      </ListItem>
    </Link>,
    <Link to={"/examples"} key="examples-link">
      <ListItem button>
        <ListItemText primary="Examples" />
      </ListItem>
    </Link>
  ]

  Object.keys(components).forEach((c) => {
    const cTitle = components[c].docs.title

    if (
      !components[c].parent ||
      components[c].parent === selected ||
      (selectedComponent &&
        components[c].parent === selectedComponent.parent) ||
      c === selected
    ) {
      let styleOver = {}
      if (components[c].parent) {
        styleOver = { paddingLeft: "20px" }
      }
      const finalStyle =
        selected === c
          ? {
              borderTop: "5px double #ac9739",
              borderBottom: "5px double #ac9739",
              fontWeight: 900,
              ...styleOver
            }
          : styleOver
      allDocs.push(
        <Link to={`/${c}`} key={`${c}-link`}>
          <ListItem key={cTitle} style={finalStyle}>
            <ListItemText primary={cTitle} />
          </ListItem>
        </Link>
      )
    }
  })

  if (components[selected]) {
    Doc = selectedComponent.docs
    selectedDoc = (
      <div className="row">
        <div className="col-xs-10 col-xs-offset-2">
          <Doc />
        </div>
      </div>
    )
  }

  const { AdditionalContent } = props

  return (
    <div className={classes.root}>
      <div
        className={classes.appFrame}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end"
        }}
      >
        <AppBar
          className={classNames(classes.appBar, open && classes.appBarShift)}
        >
          <Toolbar disableGutters={!open} className="semiotic-header">
            <span
              style={{ cursor: "pointer", color: "white" }}
              onClick={() => (props.history ? props.history.push("/") : null)}
            >
              Semiotic
            </span>
            <img
              style={{ paddingTop: "10px", width: "40px", height: "40px" }}
              src="/semiotic/semiotic_white.png"
            />
          </Toolbar>
        </AppBar>
        <Drawer
          type="persistent"
          classes={{
            paper: classes.drawerPaper
          }}
          open={open}
        >
          <div className={classes.drawerInner}>
            <div className={"drawer-title"}>Semiotic</div>
            <Divider />
            <List className={classes.list}>{allDocs}</List>
          </div>
        </Drawer>
        <main
          className={classNames(classes.content, open && classes.contentShift)}
        >
          {AdditionalContent ? <AdditionalContent /> : null}
          {selected === "examples" ? (
            <div className="row">
              <div className="col-xs-10 col-xs-offset-1">{Examples}</div>
            </div>
          ) : !selectedDoc ? (
            <div className="row">
              <div className="col-xs-10 col-xs-offset-1">{Introduction}</div>
            </div>
          ) : null}
          {selectedDoc}
        </main>
      </div>
    </div>
  )
}

export default Documentation
