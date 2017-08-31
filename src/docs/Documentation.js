import React from "react";
import IconButton from "material-ui/IconButton";
import NavigationClose from "material-ui/svg-icons/navigation/close";
import Introduction from "./Introduction";
import Examples from "./Examples";

import XYFrameDocs from "./components/XYFrameDocs";
import ORFrameDocs from "./components/ORFrameDocs";
import NetworkFrameDocs from "./components/NetworkFrameDocs";
import AxisDocs from "./components/AxisDocs";
import LegendDocs from "./components/LegendDocs";
import DividedLineDocs from "./components/DividedLineDocs";
import MarkDocs from "./components/MarkDocs";

//Examples
import RegionatedLineChartDocs from "./components/RegionatedLineChartDocs";
import TemperatureSummaries from "./components/TemperatureSummaries";
import ParallelCoordinates from "./components/ParallelCoordinates";
import BarLineDocs from "./components/BarLineDocs";
import HeatMap from "./components/HeatMap";
import Marimekko from "./components/Marimekko";
import DotPlot from "./components/DotPlot";
import DonutChart from "./components/DonutChart";
import JoyPlot from "./components/JoyPlot";
import WaterfallChart from "./components/WaterfallChart";
import NeighborhoodMap from "./components/NeighborhoodMap";
import WordCloud from "./components/WordCloud";
import SwarmBrush from "./components/SwarmBrush";
import DivergingStackedBar from "./components/DivergingStackedBar";
import Sankey from "./components/Sankey";
import Chord from "./components/Chord";
//import Process from "./components/Process";
import BarToParallel from "./components/BarToParallel";
import AppleStockChart from "./components/AppleStockChart";

import "./../components/styles.css";
import Drawer from "material-ui/Drawer";
import AppBar from "material-ui/AppBar";
import Menu from "material-ui/Menu";
import MenuItem from "material-ui/MenuItem";
import { Link } from "react-router-dom";

const components = {
  informationmodel: { docs: BarToParallel },
  xyframe: { docs: XYFrameDocs },
  regionatedlinechart: { docs: RegionatedLineChartDocs, parent: "xyframe" },
  barline: { docs: BarLineDocs, parent: "xyframe" },
  neighborhoodmap: { docs: NeighborhoodMap, parent: "xyframe" },
  annotations: { docs: AppleStockChart, parent: "xyframe" },
  orframe: { docs: ORFrameDocs },
  temperaturesummaries: { docs: TemperatureSummaries, parent: "orframe" },
  parallelcoordinates: { docs: ParallelCoordinates, parent: "orframe" },
  heatmap: { docs: HeatMap, parent: "orframe" },
  marimekko: { docs: Marimekko, parent: "orframe" },
  dotplot: { docs: DotPlot, parent: "orframe" },
  donutchart: { docs: DonutChart, parent: "orframe" },
  joyplot: { docs: JoyPlot, parent: "orframe" },
  waterfall: { docs: WaterfallChart, parent: "orframe" },
  swarmbrush: { docs: SwarmBrush, parent: "orframe" },
  divergingstackedbar: { docs: DivergingStackedBar, parent: "orframe" },
  networkframe: { docs: NetworkFrameDocs },
  wordcloud: { docs: WordCloud, parent: "networkframe" },
  sankey: { docs: Sankey, parent: "networkframe" },
  chord: { docs: Chord, parent: "networkframe" },
  mark: { docs: MarkDocs },
  axis: { docs: AxisDocs },
  legend: { docs: LegendDocs },
  dividedline: { docs: DividedLineDocs }
};

export default class Documentation extends React.Component {
  state = {
    open: false
  };

  render() {
    const { match } = this.props;
    const selected = match && match.params.component;
    const selectedComponent = components[selected];

    let selectedDoc, Doc;
    const selectedStyles = {
      borderTop: "5px double #ac9739",
      borderBottom: "5px double #ac9739"
    };

    const allDocs = [
      <MenuItem
        key="home"
        primaryText="Home"
        style={!selected ? selectedStyles : undefined}
        containerElement={<Link to={"/"} />}
      />,
      <MenuItem
        key="examples"
        primaryText="Examples"
        style={selected === "examples" ? selectedStyles : undefined}
        containerElement={<Link to={"/examples"} />}
      />
    ];
    Object.keys(components).forEach(c => {
      const cTitle = components[c].docs.title;
      const cIcon = components[c].docs.icon;

      if (
        !components[c].parent ||
        components[c].parent === selected ||
        (selectedComponent &&
          components[c].parent === selectedComponent.parent) ||
        c === selected
      ) {
        let styleOver = {};
        if (components[c].parent) {
          styleOver = { paddingLeft: "20px" };
        }
        const finalStyle =
          selected === c
            ? {
                borderTop: "5px double #ac9739",
                borderBottom: "5px double #ac9739",
                fontWeight: 900,
                ...styleOver
              }
            : styleOver;
        allDocs.push(
          <MenuItem
            leftIcon={cIcon}
            key={cTitle}
            primaryText={cTitle}
            style={finalStyle}
            containerElement={<Link to={`/${c}`} />}
          />
        );
      }
    });

    if (components[selected]) {
      Doc = selectedComponent.docs;
      selectedDoc = (
        <div className="row">
          <div className="col-xs-8 col-xs-offset-2">
            <Doc />
          </div>
        </div>
      );
    }

    return (
      <div>
        <Drawer
          width={250}
          docked={this.state.open}
          containerStyle={{ overflowX: "hidden" }}
        >
          <AppBar
            title="Semiotic"
            className="appbar"
            iconClassNameRight="muidocs-icon-navigation-expand-more"
            onLeftIconButtonTouchTap={() =>
              this.setState({ open: !this.state.open })}
          />
          <Menu>{allDocs}</Menu>
        </Drawer>
        <AppBar
          title="Semiotic"
          className="appbar"
          style={{ position: "fixed", top: 0, left: 0 }}
          iconClassNameRight="muidocs-icon-navigation-expand-more"
          onLeftIconButtonTouchTap={() =>
            this.setState({ open: !this.state.open })}
        >
          <img
            style={{ paddingTop: "10px", width: "40px", height: "40px" }}
            src="/semiotic/semiotic_white.png"
          />
        </AppBar>
        <div className="row">
          <div className="col-xs-8 col-xs-offset-2">
            {selected === "examples" ? (
              Examples
            ) : !selectedDoc ? (
              Introduction
            ) : null}
          </div>
        </div>
        {selectedDoc}
      </div>
    );
  }
}
