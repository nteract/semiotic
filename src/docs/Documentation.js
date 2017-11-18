import React from "react";
import Introduction from "./Introduction";
import Examples from "./Examples";

import XYFrameDocs from "./components/XYFrameDocs";
import ORFrameDocs from "./components/ORFrameDocs";
import NetworkFrameDocs from "./components/NetworkFrameDocs";
import AxisDocs from "./components/AxisDocs";
import LegendDocs from "./components/LegendDocs";
import DividedLineDocs from "./components/DividedLineDocs";

import { withStyles } from "material-ui/styles";
import Divider from "material-ui/Divider";
import ChevronLeftIcon from "material-ui-icons/ChevronLeft";
import ChevronRightIcon from "material-ui-icons/ChevronRight";

import classNames from "classnames";

//Examples
import RegionatedLineChartDocs from "./components/RegionatedLineChartDocs";
import Violin from "./components/Violin";
import ParallelCoordinates from "./components/ParallelCoordinates";
import BarLineDocs from "./components/BarLineDocs";
import HeatMap from "./components/HeatMap";
import Marimekko from "./components/Marimekko";
import DotPlot from "./components/DotPlot";
import DonutChart from "./components/DonutChart";
import JoyPlot from "./components/JoyPlot";
import WaterfallChart from "./components/WaterfallChart";
import BulletChart from "./components/BulletChart";
import NeighborhoodMap from "./components/NeighborhoodMap";
import BaseballMap from "./components/BaseballMap";
import WordCloud from "./components/WordCloud";
import SwarmBrush from "./components/SwarmBrush";
import LineBrush from "./components/LineBrush";
import DivergingStackedBar from "./components/DivergingStackedBar";
import DivergingStackedIsotype from "./components/DivergingStackedIsotype";
import VerticalIsotype from "./components/VerticalIsotype";
import Sankey from "./components/Sankey";
import Chord from "./components/Chord";
import Dendrogram from "./components/Dendrogram";
import NegativeStacked from "./components/NegativeStacked";
import CustomMark from "./components/CustomMark";

//import Process from "./components/Process";
import BarToParallel from "./components/BarToParallel";
import AppleStockChart from "./components/AppleStockChart";

import CreatingBarChart from "./components/CreatingBarChart";
import CreatingPieChart from "./components/CreatingPieChart";
import CreatingLineChart from "./components/CreatingLineChart";

import RealtimeORFrame from "./components/RealtimeORFrame";
import RealtimeXYFrame from "./components/RealtimeXYFrame";

import "./../components/styles.css";
import Drawer from "material-ui/Drawer";
import AppBar from "material-ui/AppBar";
import List, { ListItem, ListItemIcon, ListItemText } from "material-ui/List";
import MenuIcon from "material-ui-icons/Menu";
import { Link } from "react-router-dom";
import Toolbar from "material-ui/Toolbar";
import Typography from "material-ui/Typography";
import IconButton from "material-ui/IconButton";

const components = {
  informationmodel: { docs: BarToParallel },
  creatinglinechart: { docs: CreatingLineChart },
  creatingbarchart: { docs: CreatingBarChart },
  creatingpiechart: { docs: CreatingPieChart },
  xyframe: { docs: XYFrameDocs },
  regionatedlinechart: { docs: RegionatedLineChartDocs, parent: "xyframe" },
  barline: { docs: BarLineDocs, parent: "xyframe" },
  annotations: { docs: AppleStockChart, parent: "xyframe" },
  homerunmap: { docs: BaseballMap, parent: "xyframe" },
  neighborhoodmap: { docs: NeighborhoodMap, parent: "xyframe" },
  realtimeline: { docs: RealtimeXYFrame, parent: "xyframe" },
  linebrush: { docs: LineBrush, parent: "xyframe" },
  negativestacked: { docs: NegativeStacked, parent: "xyframe" },
  orframe: { docs: ORFrameDocs },
  violin: { docs: Violin, parent: "orframe" },
  parallelcoordinates: { docs: ParallelCoordinates, parent: "orframe" },
  heatmap: { docs: HeatMap, parent: "orframe" },
  marimekko: { docs: Marimekko, parent: "orframe" },
  dotplot: { docs: DotPlot, parent: "orframe" },
  donutchart: { docs: DonutChart, parent: "orframe" },
  joyplot: { docs: JoyPlot, parent: "orframe" },
  swarmbrush: { docs: SwarmBrush, parent: "orframe" },
  divergingstackedbar: { docs: DivergingStackedBar, parent: "orframe" },
  custommark: { docs: CustomMark, parent: "orframe" },
  divergingstackedisotype: { docs: DivergingStackedIsotype, parent: "orframe" },
  verticalisotype: { docs: VerticalIsotype, parent: "orframe" },
  waterfall: { docs: WaterfallChart, parent: "orframe" },
  bullet: { docs: BulletChart, parent: "orframe" },
  realtimebar: { docs: RealtimeORFrame, parent: "orframe" },
  networkframe: { docs: NetworkFrameDocs },
  wordcloud: { docs: WordCloud, parent: "networkframe" },
  sankey: { docs: Sankey, parent: "networkframe" },
  chord: { docs: Chord, parent: "networkframe" },
  dendrogram: { docs: Dendrogram, parent: "networkframe" },
  axis: { docs: AxisDocs },
  legend: { docs: LegendDocs },
  dividedline: { docs: DividedLineDocs }
};

const drawerWidth = 240;

const styles = theme => ({
  root: {
    width: "100%",
    height: "100%",
    marginTop: 0,
    zIndex: 1,
    overflow: "hidden"
  },
  appFrame: {
    position: "relative",
    display: "flex",
    width: "100%",
    height: "100%"
  },
  appBar: {
    position: "absolute",
    transition: theme.transitions.create(["margin", "width"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen
    })
  },
  appBarShift: {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(["margin", "width"], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen
    })
  },
  menuButton: {
    marginLeft: 12,
    marginRight: 20
  },
  hide: {
    display: "none"
  },
  drawerPaper: {
    position: "relative",
    height: "100%",
    width: drawerWidth
  },
  drawerHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    padding: "0 8px",
    ...theme.mixins.toolbar
  },
  content: {
    width: "100%",
    marginLeft: -drawerWidth,
    flexGrow: 1,
    backgroundColor: theme.palette.background.default,
    padding: theme.spacing.unit * 3,
    transition: theme.transitions.create("margin", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen
    }),
    height: "calc(100% - 56px)",
    marginTop: 56,
    [theme.breakpoints.up("sm")]: {
      content: {
        height: "calc(100% - 64px)",
        marginTop: 64
      }
    }
  },
  contentShift: {
    marginLeft: 0,
    transition: theme.transitions.create("margin", {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen
    })
  }
});

class Documentation extends React.Component {
  state = {
    open: false
  };

  handleDrawerOpen = () => {
    this.setState({ open: true });
  };

  handleDrawerClose = () => {
    this.setState({ open: false });
  };

  render() {
    const { match, history, classes = {}, theme = {} } = this.props;
    const selected = match && match.params.component;
    const selectedComponent = components[selected];

    let selectedDoc, Doc;
    const selectedStyles = {
      borderTop: "5px double #ac9739",
      borderBottom: "5px double #ac9739"
    };

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
          <Link to={`/${c}`} key={`${c}-link`}>
            <ListItem key={cTitle} style={finalStyle}>
              {cIcon ? <ListItemIcon>{cIcon}</ListItemIcon> : null}
              <ListItemText primary={cTitle} />
            </ListItem>
          </Link>
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

    const { AdditionalContent } = this.props;

    return (
      <div className={classes.root}>
        <div className={classes.appFrame}>
          <AppBar
            className={classNames(
              classes.appBar,
              this.state.open && classes.appBarShift
            )}
          >
            <Toolbar
              disableGutters={!this.state.open}
              className="semiotic-header"
            >
              <IconButton
                color="contrast"
                aria-label="open drawer"
                onClick={this.handleDrawerOpen}
                className={classNames(
                  classes.menuButton,
                  this.state.open && classes.hide
                )}
              >
                <MenuIcon style={{ cursor: "pointer", color: "white" }} />
              </IconButton>
              <Typography type="title" color="inherit">
                <span
                  style={{ cursor: "pointer", color: "white" }}
                  onClick={() =>
                    this.props.history ? this.props.history.push("/") : null}
                >
                  Semiotic
                </span>
                <img
                  style={{ paddingTop: "10px", width: "40px", height: "40px" }}
                  src="/semiotic/semiotic_white.png"
                />
              </Typography>
            </Toolbar>
          </AppBar>
          <Drawer
            type="persistent"
            classes={{
              paper: classes.drawerPaper
            }}
            open={this.state.open}
          >
            <div className={classes.drawerInner}>
              <div className={"drawer-title"}>
                <IconButton onClick={this.handleDrawerClose}>
                  <ChevronLeftIcon />
                </IconButton>Semiotic
              </div>
              <Divider />
              <List className={classes.list}>{allDocs}</List>
            </div>
          </Drawer>
          <main
            className={classNames(
              classes.content,
              this.state.open && classes.contentShift
            )}
          >
            {AdditionalContent ? <AdditionalContent /> : null}
            {selected === "examples" ? (
              <div className="row">
                <div className="col-xs-8 col-xs-offset-2">{Examples}</div>
              </div>
            ) : !selectedDoc ? (
              <div className="row">
                <div className="col-xs-8 col-xs-offset-2">{Introduction}</div>
              </div>
            ) : null}
            {selectedDoc}
          </main>
        </div>
      </div>
    );
  }
}

export default withStyles(styles, { withTheme: true })(Documentation);
