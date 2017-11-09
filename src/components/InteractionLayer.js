import React from "react";
import { brushX, brushY, brush } from "d3-brush";
import { extent } from "d3-array";
import { event } from "d3-selection";
import { voronoi } from "d3-voronoi";
import { Mark } from "semiotic-mark";

// components
import Brush from "./Brush";

import PropTypes from "prop-types";

class InteractionLayer extends React.Component {
  constructor(props) {
    super(props);

    this.createBrush = this.createBrush.bind(this);
    this.createColumnsBrush = this.createColumnsBrush.bind(this);
    this.brushStart = this.brushStart.bind(this);
    this.brush = this.brush.bind(this);
    this.brushEnd = this.brushEnd.bind(this);
    this.changeVoronoi = this.changeVoronoi.bind(this);
    this.doubleclickVoronoi = this.doubleclickVoronoi.bind(this);
    this.clickVoronoi = this.clickVoronoi.bind(this);
    this.calculateOverlay = this.calculateOverlay.bind(this);

    this.state = {
      overlayRegions: this.calculateOverlay(props)
    };
  }

  changeVoronoi(d, customHoverTypes) {
    if (this.props.customHoverBehavior) {
      this.props.customHoverBehavior(d);
    }
    if (!d) {
      this.props.voronoiHover(null);
    } else if (customHoverTypes === true) {
      let vorD = Object.assign({}, d);
      vorD.type = vorD.type === "column-hover" ? "column-hover" : "frame-hover";
      this.props.voronoiHover(vorD);
    } else {
      const arrayWrappedHoverTypes = Array.isArray(customHoverTypes)
        ? customHoverTypes
        : [customHoverTypes];
      const mappedHoverTypes = arrayWrappedHoverTypes.map(c => {
        const finalC = typeof c === "function" ? c(d) : c;
        return Object.assign({}, d, finalC);
      });
      this.props.voronoiHover(mappedHoverTypes);
    }
  }

  clickVoronoi(d) {
    if (this.props.customClickBehavior) {
      this.props.customClickBehavior(d);
    }
  }
  doubleclickVoronoi(d) {
    if (this.props.customDoubleClickBehavior) {
      this.props.customClickBehavior(d);
    }
  }

  brushStart(e, c) {
    if (this.props.interaction.start) {
      this.props.interaction.start(e, c);
    }
  }

  brush(e, c) {
    if (this.props.interaction.during) {
      this.props.interaction.during(e, c);
    }
  }

  brushEnd(e, c) {
    if (this.props.interaction.end) {
      this.props.interaction.end(e, c);
    }
  }

  createBrush() {
    let semioticBrush, mappingFn, selectedExtent;

    if (this.props.interaction.brush === "xBrush") {
      mappingFn = d =>
        !d
          ? null
          : [this.props.xScale.invert(d[0]), this.props.xScale.invert(d[1])];
      semioticBrush = brushX();
      selectedExtent = this.props.interaction.extent.map(d =>
        this.props.xScale(d)
      );
    } else if (this.props.interaction.brush === "yBrush") {
      mappingFn = d =>
        !d
          ? null
          : [this.props.yScale.invert(d[0]), this.props.yScale.invert(d[1])];
      semioticBrush = brushY();
      selectedExtent = this.props.interaction.extent.map(d =>
        this.props.yScale(d)
      );
    } else {
      semioticBrush = brush();
      mappingFn = d =>
        !d
          ? null
          : [
              [
                this.props.xScale.invert(d[0][0]),
                this.props.yScale.invert(d[0][1])
              ],
              [
                this.props.xScale.invert(d[1][0]),
                this.props.yScale.invert(d[1][1])
              ]
            ];
      selectedExtent = this.props.interaction.extent.map(d => [
        this.props.xScale(d[0]),
        this.props.yScale(d[1])
      ]);
    }

    semioticBrush
      .extent([
        [this.props.margin.left, this.props.margin.top],
        [
          this.props.size[0] + this.props.margin.left,
          this.props.size[1] + this.props.margin.top
        ]
      ])
      .on("start", () => {
        this.brushStart(mappingFn(event.selection));
      })
      .on("brush", () => {
        this.brush(mappingFn(event.selection));
      })
      .on("end", () => {
        this.brushEnd(mappingFn(event.selection));
      });

    return (
      <g className="brush">
        <Brush
          type={this.props.interaction.brush}
          selectedExtent={selectedExtent}
          svgBrush={semioticBrush}
          size={this.props.size}
        />
      </g>
    );
  }

  componentWillReceiveProps(nextProps) {
    this.setState({ overlayRegions: this.calculateOverlay(nextProps) });
  }

  calculateOverlay(props) {
    let voronoiPaths = [];
    const {
      xScale,
      yScale,
      points,
      projectedX,
      projectedY,
      projectedYMiddle,
      margin,
      size,
      overlay,
      interactionOverflow = { top: 0, bottom: 0, left: 0, right: 0 }
    } = props;

    if (points && props.hoverAnnotation && !overlay) {
      const voronoiDataset = [];
      const voronoiUniqueHash = {};

      points.forEach(d => {
        const xValue = parseInt(xScale(d[projectedX]));
        const yValue = parseInt(yScale(d[projectedYMiddle] || d[projectedY]));
        if (
          xValue &&
          yValue &&
          isNaN(xValue) === false &&
          isNaN(yValue) === false
        ) {
          const pointKey = xValue + "," + yValue;
          if (!voronoiUniqueHash[pointKey]) {
            const voronoiPoint = Object.assign({}, d, {
              coincidentPoints: [d],
              voronoiX: xValue,
              voronoiY: yValue
            });
            voronoiDataset.push(voronoiPoint);
            voronoiUniqueHash[pointKey] = voronoiPoint;
          } else {
            voronoiUniqueHash[pointKey].coincidentPoints.push(d);
          }
        }
      });

      const voronoiXExtent = extent(voronoiDataset.map(d => d.voronoiX));
      const voronoiYExtent = extent(voronoiDataset.map(d => d.voronoiY));

      const voronoiExtent = [
        [
          Math.min(voronoiXExtent[0], margin.left - interactionOverflow.left),
          Math.min(voronoiYExtent[0], margin.top - interactionOverflow.top)
        ],
        [
          Math.max(
            voronoiXExtent[1],
            size[0] + margin.left + interactionOverflow.right
          ),
          Math.max(
            voronoiXExtent[1],
            size[1] + margin.top + interactionOverflow.bottom
          )
        ]
      ];

      let voronoiDiagram = voronoi()
        .extent(voronoiExtent)
        .x(d => d.voronoiX)
        .y(d => d.voronoiY);

      const voronoiData = voronoiDiagram.polygons(voronoiDataset);
      const voronoiLinks = voronoiDiagram.links(voronoiDataset);

      //create neighbors
      voronoiLinks.forEach(v => {
        if (!v.source.neighbors) {
          v.source.neighbors = [];
        }
        v.source.neighbors.push(v.target);
      });

      voronoiPaths = voronoiData.map((d, i) => {
        return (
          <path
            onClick={() => {
              this.clickVoronoi(voronoiDataset[i]);
            }}
            onDoubleClick={() => {
              this.doubleclickVoronoi(voronoiDataset[i]);
            }}
            onMouseEnter={() => {
              this.changeVoronoi(voronoiDataset[i], props.hoverAnnotation);
            }}
            onMouseLeave={() => {
              this.changeVoronoi();
            }}
            key={"interactionVoronoi" + i}
            d={"M" + d.join("L") + "Z"}
            style={{ fillOpacity: 0 }}
          />
        );
      }, this);

      return voronoiPaths;
    } else if (overlay) {
      const renderedOverlay = overlay.map(overlayRegion => {
        return (
          <Mark
            forceUpdate={true}
            {...overlayRegion}
            onClick={() => {
              this.clickVoronoi(overlayRegion.onClick());
            }}
            onDoubleClick={() => {
              this.doubleclickVoronoi(overlayRegion.onDoubleClick());
            }}
            onMouseEnter={() => {
              this.changeVoronoi(
                overlayRegion.onMouseEnter(),
                props.hoverAnnotation
              );
            }}
            onMouseLeave={() => {
              this.changeVoronoi();
            }}
          />
        );
      });

      return renderedOverlay;
    }
  }

  createColumnsBrush() {
    const {
      projection,
      rScale,
      interaction,
      size,
      oColumns,
      margin
    } = this.props;

    let semioticBrush, mappingFn;

    const max = rScale.domain()[1];

    let type = "yBrush";

    if (projection && projection === "horizontal") {
      type = "xBrush";
      mappingFn = d => (!d ? null : [rScale.invert(d[0]), rScale.invert(d[1])]);
    } else {
      mappingFn = d =>
        !d
          ? null
          : [
              Math.abs(rScale.invert(d[1]) - max),
              Math.abs(rScale.invert(d[0]) - max)
            ];
    }

    const rRange = rScale.range();

    const columnHash = oColumns;
    let brushPosition, selectedExtent;
    const brushes = Object.keys(columnHash).map(c => {
      if (projection && projection === "horizontal") {
        selectedExtent = interaction.extent[c]
          ? interaction.extent[c].map(d => rScale(d))
          : rRange;
        brushPosition = [0, columnHash[c].x];
        semioticBrush = brushX();
        semioticBrush
          .extent([[rRange[0], 0], [rRange[1], columnHash[c].width]])
          .on("start", () => {
            this.brushStart(mappingFn(event.selection), c);
          })
          .on("brush", () => {
            this.brush(mappingFn(event.selection), c);
          })
          .on("end", () => {
            this.brushEnd(mappingFn(event.selection), c);
          });
      } else {
        selectedExtent = interaction.extent[c]
          ? interaction.extent[c]
              .map(d => margin.top + rRange[1] - rScale(d))
              .reverse()
          : rRange;
        brushPosition = [columnHash[c].x, 0];
        semioticBrush = brushY();
        semioticBrush
          .extent([[0, rRange[0]], [columnHash[c].width, rRange[1]]])
          .on("start", () => {
            this.brushStart(mappingFn(event.selection), c);
          })
          .on("brush", () => {
            this.brush(mappingFn(event.selection), c);
          })
          .on("end", () => {
            this.brushEnd(mappingFn(event.selection), c);
          });
      }

      return (
        <g key={`column-brush-${c}`} className="brush">
          <Brush
            type={type}
            position={brushPosition}
            key={"orbrush" + c}
            selectedExtent={selectedExtent}
            svgBrush={semioticBrush}
            size={size}
          />
        </g>
      );
    });
    return brushes;
  }

  render() {
    let semioticBrush = null;
    const { interaction, position, svgSize } = this.props;
    const { overlayRegions } = this.state;
    let { enabled } = this.props;

    if (interaction && interaction.brush) {
      enabled = true;
      semioticBrush = this.createBrush();
    }
    if (interaction && interaction.columnsBrush) {
      enabled = true;
      semioticBrush = this.createColumnsBrush();
    }

    return (
      <div
        className="interaction-layer"
        style={{
          position: "absolute",
          background: "none",
          pointerEvents: "none"
        }}
      >
        <svg
          height={svgSize[1]}
          width={svgSize[0]}
          style={{ background: "none", pointerEvents: "none" }}
        >
          <g
            className="interaction-overlay"
            transform={"translate(" + position + ")"}
            style={{ pointerEvents: enabled ? "all" : "none" }}
          >
            <g className="interaction-regions">{overlayRegions}</g>
            {semioticBrush}
          </g>
        </svg>
      </div>
    );
  }
}

InteractionLayer.propTypes = {
  name: PropTypes.string,
  interaction: PropTypes.object,
  overlay: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  oColumns: PropTypes.object,
  xScale: PropTypes.func,
  yScale: PropTypes.func,
  rScale: PropTypes.func,
  svgSize: PropTypes.array,
  margin: PropTypes.object
};

export default InteractionLayer;
