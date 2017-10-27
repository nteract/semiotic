import React from "react";

import { area, line, curveBasis } from "d3-shape";
import { hsl } from "d3-color";
import DividedLine from "../DividedLine";
import { select } from "d3-selection";
import { scaleLinear } from "d3-scale";

//All generic line constructors expect a projected coordinates array with x & y coordinates, if there are no y1 & x1 coordinates then it defaults to 0-width
function roundToTenth(number) {
  return Math.round(number * 10) / 10;
}

export function areaLineGenerator(customAccessors, interpolator) {
  let lineGenerator = area()
    .x0(customAccessors.x)
    .y0(customAccessors.y)
    .x1(customAccessors.x1)
    .y1(customAccessors.y1)
    .interpolate(interpolator || "linear");
  return lineGenerator;
}

export function areaLine(props) {
  let lineGenerator = areaLineGenerator(
    props.customAccessors,
    props.interpolate
  );
  props.d = lineGenerator(props.coordinates);

  return props;
}

export function verticalbar(props) {
  props.y = props.y - props.height;
  return props;
}

export function horizontalbar(props) {
  //just flips height for width
  let originalHeight = props.height;
  let originalWidth = props.width;
  props.width = originalHeight;
  props.height = originalWidth;

  return props;
}

export function pathStr({ x, y, width, height, cx, cy, r }) {
  if (cx !== undefined) {
    return (
      [
        "M",
        roundToTenth(cx - r),
        roundToTenth(cy),
        "a",
        r,
        r,
        0,
        1,
        0,
        r * 2,
        0,
        "a",
        r,
        r,
        0,
        1,
        0,
        -(r * 2),
        0
      ].join(" ") + "Z"
    );
  }
  return (
    [
      "M",
      roundToTenth(x),
      roundToTenth(y),
      "h",
      width,
      "v",
      height,
      "h",
      -width,
      "v",
      -height
    ].join(" ") + "Z"
  );
}

export function circlePath(cx, cy, r) {
  return pathStr({ cx, cy, r });
}

export function rectPath(x, y, width, height) {
  return pathStr({ x, y, width, height });
}

export function linePath(x1, x2, y1, y2) {
  return "M" + x1 + "," + y1 + "L" + x2 + "," + y2 + "L";
}

export function jitterLine(pathNode) {
  let length = pathNode.getTotalLength();
  let j = 2;
  let x = j + Math.random() * j * 5;
  let jitteredPoints = [];
  let lineGen = line()
    .x(d => d.x)
    .y(d => d.y)
    .curve(curveBasis);

  let newPoint = pathNode.getPointAtLength(0);
  jitteredPoints.push(newPoint);

  while (x < length) {
    newPoint = pathNode.getPointAtLength(x);
    let newX = newPoint.x + (Math.random() * j - j / 2);
    let newY = newPoint.y + (Math.random() * j - j / 2);
    jitteredPoints.push({ x: newX, y: newY });
    x += j + Math.random() * j * 5;
  }
  newPoint = pathNode.getPointAtLength(length);
  jitteredPoints.push(newPoint);

  return lineGen(jitteredPoints);
}

export function cheapSketchy(path, opacity = 1) {
  if (opacity === 0) {
    //no fill
    return "";
  }
  const opacitySketchyScale = scaleLinear()
    .domain([0, 1])
    .range([10, 1])
    .clamp(true);
  const length = path.getTotalLength();
  let drawCode = "";
  let x = 0;
  const step = opacitySketchyScale(opacity);

  while (x < length / 2) {
    let start = path.getPointAtLength(x);
    let end = path.getPointAtLength(length - x);

    drawCode +=
      " M" +
      (start.x + (Math.random() * step - step / 2)) +
      " " +
      (start.y + (Math.random() * step - step / 2)) +
      "L" +
      (end.x + (Math.random() * step - step / 2)) +
      " " +
      (end.y + (Math.random() * step - step / 2));

    x += step + Math.random() * step;
  }

  return drawCode;
}

export function cheapPopArtsy(path, size) {
  let length = path.getTotalLength();
  let circles = [];
  let x = 0;
  let step = size * 3;

  while (x < length / 2) {
    const start = path.getPointAtLength(x);
    const end = path.getPointAtLength(length - x);
    const distance = Math.sqrt(
      Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
    );
    let begin = size / 2;
    while (begin < distance - size / 2) {
      const percent = begin / distance;
      const circleXa = percent * start.x;
      const circleXb = (1 - percent) * end.x;
      const circleYa = percent * start.y;
      const circleYb = (1 - percent) * end.y;
      circles.push([circleXa + circleXb, circleYa + circleYb]);
      begin = begin + (step + Math.random());
    }
    x = x + step;
  }

  return circles;
}

export function randomColor(baseColor, range) {
  const hslBase = hsl(baseColor);
  hslBase.h =
    hslBase.h +
    (Math.floor(Math.random() * (range * 255)) - Math.floor(range / 2));
  hslBase.s =
    hslBase.s + (Math.floor(Math.random() * range) - Math.floor(range / 2));
  hslBase.l =
    hslBase.l + (Math.floor(Math.random() * range) - Math.floor(range / 2));
  return hslBase.toString();
}

export function painty(markType, cloneProps) {
  delete cloneProps.markType;
  if (
    (markType === "path" ||
      markType === "circle" ||
      markType === "line" ||
      markType === "rect") &&
    cloneProps.style &&
    (cloneProps.style.stroke || cloneProps.style.fill)
  ) {
    if (markType === "circle") {
      cloneProps.d = circlePath(
        cloneProps.cx || 0,
        cloneProps.cy || 0,
        cloneProps.r
      );
    }

    if (markType === "rect") {
      cloneProps.d = rectPath(
        cloneProps.x || 0,
        cloneProps.y || 0,
        cloneProps.width,
        cloneProps.height
      );
    }

    if (markType === "line") {
      cloneProps.d = linePath(
        cloneProps.x1,
        cloneProps.x2,
        cloneProps.y1,
        cloneProps.y2
      );
    }

    select("body")
      .append("svg")
      .attr("id", "sketchyTempSVG");

    let fills = [];
    let outlines = [];

    cloneProps.d
      .split("M")
      .filter((d, i) => i !== 0)
      .forEach((pathD, i) => {
        let pathDummy = select("#sketchyTempSVG")
          .append("path")
          .attr("class", cloneProps.className)
          .attr("d", `M${pathD}`);

        let pathNode = pathDummy.node();

        if (cloneProps.style && cloneProps.style.fill !== "none") {
          let sketchyFill = cheapPopArtsy(pathNode, 4);
          let fillProps = Object.assign({}, cloneProps);
          let fillStyle = Object.assign({}, cloneProps.style);
          const fillValue = fillStyle.fill;
          fillProps.style = fillStyle;
          delete fillProps.d;
          delete fillProps.style.fillOpacity;
          delete fillProps.style.stroke;
          delete fillProps.style.strokeWidth;

          fills.push(
            sketchyFill.map((circle, ci) => {
              fillProps.key = `painty-fill-${i}-${ci}`;
              fillProps.cx = circle[0];
              fillProps.cy = circle[1];
              fillProps.style = Object.assign({}, fillProps.style);
              fillProps.style.fill = randomColor(fillValue, 0.05);
              fillProps.r = Math.random() * 2 + 3;
              return React.createElement("circle", fillProps);
            })
          );
        }

        if (
          cloneProps.style &&
          cloneProps.style.stroke !== "none" &&
          cloneProps.style.strokeWidth !== 0
        ) {
          let sketchyOutline = jitterLine(pathNode);

          let outlineProps = Object.assign({}, cloneProps);
          let outlineStyle = Object.assign({}, cloneProps.style);
          outlineProps.style = outlineStyle;
          outlineProps.d = sketchyOutline;
          outlineProps.key = `painty-outline-${i}`;
          outlineProps.style.fill = "none";

          outlines.push(React.createElement("path", outlineProps));
        }
      });

    select("#sketchyTempSVG").remove();

    return [
      <path
        key="painty-interaction-overlay"
        d={cloneProps.d}
        style={{ opacity: 0 }}
      />,
      <g key="painty-fill" style={{ filter: "url(#paintyFilterHeavy)" }}>
        {fills}
      </g>,
      outlines
    ];
  }

  return React.createElement(markType, cloneProps);
}

export function sketchy(markType, cloneProps) {
  delete cloneProps.markType;
  if (markType === "text" && typeof cloneProps.children !== "object") {
    let stringyChild = cloneProps.children.toString();
    let x = 0;
    let sketchyText = [];
    let sketchyBase = [];
    while (x <= stringyChild.length + 1) {
      let random = parseInt(Math.random() * 2) + 1;
      let randomSub = stringyChild.substring(x, random + x);

      let randomTspan = (
        <tspan
          style={{
            fontSize: 10 + parseInt(Math.random() * 6) + "px",
            strokeWidth: 0,
            fontWeight: Math.random() < 0.5 ? "900" : "100"
          }}
        >
          {randomSub}
        </tspan>
      );
      sketchyBase.push(randomSub);
      sketchyText.push(randomTspan);
      x += random;
    }

    cloneProps.children = sketchyText;
    return React.createElement("text", cloneProps);
  }

  if (
    (markType === "path" ||
      markType === "circle" ||
      markType === "line" ||
      markType === "rect") &&
    cloneProps.style &&
    (cloneProps.style.stroke || cloneProps.style.fill)
  ) {
    if (markType === "circle") {
      cloneProps.d = circlePath(
        cloneProps.cx || 0,
        cloneProps.cy || 0,
        cloneProps.r
      );
    }

    if (markType === "rect") {
      cloneProps.d = rectPath(
        cloneProps.x || 0,
        cloneProps.y || 0,
        cloneProps.width,
        cloneProps.height
      );
    }

    if (markType === "line") {
      cloneProps.d = linePath(
        cloneProps.x1,
        cloneProps.x2,
        cloneProps.y1,
        cloneProps.y2
      );
    }
    const fills = [];
    const outlines = [];
    const sketchKey = Math.random().toString();

    if (cloneProps.d) {
      select("body")
        .append("svg")
        .attr("id", "sketchyTempSVG");

      const mType = cloneProps.d.substring(0, 1) === "M" ? "M" : "m";

      cloneProps.d
        .split(mType)
        .filter((d, i) => i !== 0)
        .forEach((pathD, i) => {
          let pathDummy = select("#sketchyTempSVG")
            .append("path")
            .attr("class", cloneProps.className)
            .attr("d", `${mType}${pathD}`);

          let pathNode = pathDummy.node();
          if (cloneProps.style && cloneProps.style.fill !== "none") {
            const fillProps = Object.assign({}, cloneProps);
            const fillStyle = Object.assign({}, cloneProps.style);
            const sketchyFill = cheapSketchy(pathNode, fillStyle.fillOpacity);
            if (markType !== "rect" && markType !== "circle") {
              fillStyle.clipPath = `url(#clip-path-${sketchKey})`;
            }
            fillProps.style = fillStyle;
            fillProps.d = sketchyFill;
            fillStyle.stroke = fillStyle.fill;
            fillStyle.strokeWidth = "1px";
            //            fillStyle.strokeOpacity = fillStyle.fillOpacity ? fillStyle.fillOpacity : 1;
            fillStyle.fill = "none";
            fillProps.key = `sketchFill-${i}`;
            fills.push(<path {...fillProps} />);
          }
          if (
            cloneProps.style &&
            cloneProps.style.stroke !== "none" &&
            cloneProps.style.strokeWidth !== 0
          ) {
            let sketchyOutline = jitterLine(pathNode);

            let outlineProps = Object.assign({}, cloneProps);
            let outlineStyle = Object.assign({}, cloneProps.style);
            outlineProps.style = outlineStyle;
            outlineProps.d = sketchyOutline;
            outlineProps.key = `sketchOutline-${i}`;
            outlineProps.style.fill = "none";
            outlines.push(<path {...outlineProps} />);
          }
        });
    }

    select("#sketchyTempSVG").remove();
    let generatedClipPath;
    if (markType !== "rect" && markType !== "circle") {
      generatedClipPath = (
        <clipPath key="sketchy-clip-overlay" id={`clip-path-${sketchKey}`}>
          <path d={cloneProps.d} style={{ opacity: 0 }} />
        </clipPath>
      );
    }

    return [
      generatedClipPath,
      <path
        key="sketchy-interaction-overlay"
        d={cloneProps.d}
        style={{ opacity: 0 }}
      />,
      fills,
      outlines
    ];
  }

  return React.createElement(markType, cloneProps);
}

export function generateSVG(props, className) {
  let markType = props.markType;
  let renderMode = props.renderMode;

  let cloneProps = Object.assign({}, props);
  delete cloneProps.markType;
  delete cloneProps.renderMode;
  delete cloneProps.resetAfter;
  delete cloneProps.droppable;
  delete cloneProps.nid;
  delete cloneProps.dropFunction;
  delete cloneProps.context;
  delete cloneProps.updateContext;
  delete cloneProps.parameters;
  delete cloneProps.lineDataAccessor;
  delete cloneProps.customAccessors;
  delete cloneProps.interpolate;
  delete cloneProps.forceUpdate;
  delete cloneProps.searchIterations;
  delete cloneProps.simpleInterpolate;

  if (markType === "verticalbar") {
    markType = "rect";
    cloneProps = verticalbar(cloneProps);
  } else if (markType === "horizontalbar") {
    markType = "rect";
    cloneProps = horizontalbar(cloneProps);
  } else if (markType === "simpleline") {
    markType = "path";
    cloneProps = areaLine(cloneProps);
  }

  //        let transform = cloneProps['transform'];
  if (props.draggable) {
    delete cloneProps.transform;
  }

  cloneProps.className = className;

  let actualSVG = null;

  if (props.markType === "dividedline") {
    actualSVG = React.createElement(DividedLine, props);
  } else if (renderMode === "sketchy") {
    actualSVG = sketchy(markType, cloneProps);
  } else if (renderMode === "painty") {
    actualSVG = painty(markType, cloneProps);
  } else if (renderMode === "forcePath" && markType === "circle") {
    cloneProps.d = circlePath(
      cloneProps.cx || 0,
      cloneProps.cy || 0,
      cloneProps.r
    );
    markType = "path";
    actualSVG = React.createElement(markType, cloneProps);
  } else if (renderMode === "forcePath" && markType === "rect") {
    cloneProps.d = rectPath(
      cloneProps.x || 0,
      cloneProps.y || 0,
      cloneProps.width,
      cloneProps.height
    );
    markType = "path";
    actualSVG = React.createElement(markType, cloneProps);
  } else {
    if (props.markType === "text" && typeof cloneProps.children !== "object") {
      cloneProps.children = <tspan>{cloneProps.children}</tspan>;
    }
    actualSVG = React.createElement(markType, cloneProps);
  }
  return actualSVG;
}
