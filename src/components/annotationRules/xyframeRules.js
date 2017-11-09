import React from "react";
import { Mark } from "semiotic-mark";
import Annotation from "../Annotation";
import {
  AnnotationXYThreshold,
  AnnotationCalloutCircle,
  AnnotationCalloutRect
} from "react-annotation";

import { line } from "d3-shape";
import { packEnclose } from "d3-hierarchy";
import { extent } from "d3-array";

const pointsAlong = along => ({
  d,
  lines,
  points,
  xScale,
  yScale,
  pointStyle
}) => {
  const alongScale = along === "_xyfX" ? xScale : yScale;
  if (d && d[along]) {
    const { threshold = 1, r = () => 4, styleFn = pointStyle } = d;
    const foundPoints = [];

    const halfThreshold = threshold / 2;

    if (lines && lines.length > 0) {
      lines.forEach(line => {
        const linePoints = line.data.filter(p => {
          const pAlong = alongScale(p[along]);
          const dAlong = alongScale(d[along]);

          return (
            pAlong <= dAlong + halfThreshold && pAlong >= dAlong - halfThreshold
          );
        });
        foundPoints.push(...linePoints);
      });
    }

    if (points && points.length > 0) {
      const pointPoints = points.filter(p => {
        const pAlong = alongScale(p[along]);
        const dAlong = alongScale(d[along]);

        return (
          pAlong <= dAlong + halfThreshold && pAlong >= dAlong - halfThreshold
        );
      });
      foundPoints.push(...pointPoints);
    }

    return foundPoints.map((p, i) => (
      <circle
        key={`found-circle-${i}`}
        r={r(p, i)}
        style={styleFn(p, i)}
        cx={xScale(p._xyfX)}
        cy={yScale(p._xyfY)}
      />
    ));
  }
  return null;
};

export const svgHorizontalPointsAnnotation = pointsAlong("_xyfY");
export const svgVerticalPointsAnnotation = pointsAlong("_xyfX");

export const svgXYAnnotation = ({ screenCoordinates, i, d }) => {
  const laLine = (
    <Mark
      className={`annotation ${d.type} ${d.className || ""} `}
      key={"annotationpoint" + i}
      markType="circle"
      cx={screenCoordinates[0]}
      cy={screenCoordinates[1]}
      forceUpdate={true}
      r={5}
    />
  );
  let laLabel;
  if (d.type === "xy") {
    laLabel = (
      <Mark
        markType="text"
        key={d.label + "annotationtext" + i}
        forceUpdate={true}
        x={screenCoordinates[0]}
        y={10 + screenCoordinates[1]}
        className={`annotation annotation-xy-label ${d.className || ""} `}
      >
        {d.label}
      </Mark>
    );
  }

  return [laLine, laLabel];
};

export const basicReactAnnotation = ({ screenCoordinates, d, i }) => {
  const noteData = Object.assign(
    {
      dx: 0,
      dy: 0,
      note: { label: d.label },
      connector: { end: "arrow" }
    },
    d,
    {
      type: d.type
    }
  );

  noteData.x = noteData.x ? noteData.x : screenCoordinates[0];
  noteData.y = noteData.y ? noteData.y : screenCoordinates[1];

  return <Annotation key={d.key || `annotation-${i}`} noteData={noteData} />;
};

export const svgEncloseAnnotation = ({ screenCoordinates, d, i }) => {
  const circle = packEnclose(
    screenCoordinates.map(p => ({ x: p[0], y: p[1], r: 2 }))
  );
  const noteData = Object.assign(
    {
      dx: 0,
      dy: 0,
      note: { label: d.label },
      connector: { end: "arrow" }
    },
    d,
    {
      x: circle.x,
      y: circle.y,
      type: AnnotationCalloutCircle,
      subject: {
        radius: circle.r,
        radiusPadding: 5 || d.radiusPadding
      }
    }
  );

  if (noteData.rp) {
    switch (noteData.rp) {
      case "top":
        noteData.dx = 0;
        noteData.dy = -circle.r - noteData.rd;
        break;
      case "bottom":
        noteData.dx = 0;
        noteData.dy = circle.r + noteData.rd;
        break;
      case "left":
        noteData.dx = -circle.r - noteData.rd;
        noteData.dy = 0;
        break;
      default:
        noteData.dx = circle.r + noteData.rd;
        noteData.dy = 0;
    }
  }
  //TODO: Support .ra (setting angle)

  return <Annotation key={d.key || `annotation-${i}`} noteData={noteData} />;
};

export const svgXAnnotation = ({
  screenCoordinates,
  d,
  i,
  annotationLayer,
  adjustedSize,
  margin
}) => {
  const yPosition = annotationLayer.position[1];

  const noteData = Object.assign(
    {
      dx: 50,
      dy: 20,
      y: yPosition,
      note: { label: d.label },
      connector: { end: "arrow" }
    },
    d,
    {
      type: AnnotationXYThreshold,
      x: screenCoordinates[0],
      subject: {
        x: screenCoordinates[0],
        y1: yPosition,
        y2: adjustedSize[1] + margin.top
      }
    }
  );
  return <Annotation key={d.key || `annotation-${i}`} noteData={noteData} />;
};

export const svgYAnnotation = ({
  screenCoordinates,
  d,
  i,
  annotationLayer,
  adjustedSize,
  adjustedPosition,
  margin
}) => {
  const xPosition = margin.left + i * 25;

  const noteData = Object.assign(
    {
      dx: 50,
      dy: -20,
      x: xPosition,
      note: { label: d.label },
      connector: { end: "arrow" }
    },
    d,
    {
      type: AnnotationXYThreshold,
      y: screenCoordinates[1],
      subject: {
        y: screenCoordinates[1],
        x1: margin.left,
        x2: adjustedSize[0] + adjustedPosition[0] + margin.left
      }
    }
  );
  return <Annotation key={d.key || `annotation-${i}`} noteData={noteData} />;
};

export const svgBoundsAnnotation = ({
  screenCoordinates,
  d,
  i,
  adjustedSize,
  adjustedPosition,
  xAccessor,
  yAccessor,
  xScale,
  yScale,
  margin
}) => {
  const startXValue = xAccessor(d.bounds[0]);
  const startYValue = yAccessor(d.bounds[0]);
  const endXValue = xAccessor(d.bounds[1]);
  const endYValue = yAccessor(d.bounds[1]);

  const x0Position = startXValue ? xScale(startXValue) : margin.left;
  const y0Position = startYValue
    ? yScale(startYValue)
    : adjustedSize[1] + margin.top;
  const x1Position = endXValue
    ? xScale(endXValue)
    : adjustedSize[0] + margin.left;
  const y1Position = endYValue ? yScale(endYValue) : margin.top;

  const noteData = Object.assign(
    {
      dx: 250,
      dy: -20,
      note: { label: d.label },
      connector: { end: "arrow" }
    },
    d,
    {
      type: AnnotationCalloutRect,
      x: Math.min(x0Position, x1Position),
      y: Math.min(y0Position, y1Position),
      subject: {
        width: Math.abs(x1Position - x0Position),
        height: Math.abs(y0Position - y1Position)
      }
    }
  );
  return <Annotation key={d.key || `annotation-${i}`} noteData={noteData} />;
};

export const svgLineAnnotation = ({ d, i, screenCoordinates }) => {
  const lineGenerator = line()
    .x(p => p[0])
    .y(p => p[1]);
  const lineD = lineGenerator(screenCoordinates);
  const laLine = (
    <Mark
      key={d.label + "annotationline" + i}
      markType="path"
      d={lineD}
      className={`annotation annotation-line ${d.className || ""} `}
    />
  );

  const laLabel = (
    <Mark
      markType="text"
      key={d.label + "annotationlinetext" + i}
      x={(screenCoordinates[0][0] + screenCoordinates[1][0]) / 2}
      y={(screenCoordinates[0][1] + screenCoordinates[1][1]) / 2}
      className={`annotation annotation-line-label ${d.className || ""} `}
    >
      {d.label}
    </Mark>
  );

  return [laLine, laLabel];
};

export const svgAreaAnnotation = ({
  d,
  i,
  screenCoordinates,
  xScale,
  xAccessor,
  yScale,
  yAccessor,
  annotationLayer
}) => {
  const mappedCoordinates =
    "M" +
    d.coordinates
      .map(p => [xScale(xAccessor(p)), yScale(yAccessor(p))])
      .join("L") +
    "Z";
  const xBounds = extent(d.coordinates.map(p => xScale(xAccessor(p))));
  const yBounds = extent(d.coordinates.map(p => yScale(yAccessor(p))));
  const xCenter = (xBounds[0] + xBounds[1]) / 2;
  const yCenter = (yBounds[0] + yBounds[1]) / 2;

  const laLine = (
    <Mark
      key={d.label + "annotationarea" + i}
      markType="path"
      transform={"translate(" + annotationLayer.position + ")"}
      d={mappedCoordinates}
      className={`annotation annotation-area ${d.className || ""} `}
    />
  );

  const laLabel = (
    <Mark
      markType="text"
      key={d.label + "annotationtext" + i}
      forceUpdate={true}
      x={xCenter}
      y={yCenter}
      transform={"translate(" + annotationLayer.position + ")"}
      className={`annotation annotation-area-label ${d.className || ""} `}
      style={{ textAnchor: "middle" }}
    >
      {d.label}
    </Mark>
  );

  return [laLine, laLabel];
};

export const htmlTooltipAnnotation = ({
  content,
  screenCoordinates,
  size,
  i,
  d
}) => {
  //To string because React gives a DOM error if it gets a date

  return (
    <div
      key={"xylabel" + i}
      className={`annotation annotation-xy-label ${d.className || ""} `}
      style={{
        position: "absolute",
        bottom: size[1] - screenCoordinates[1] + "px",
        left: screenCoordinates[0] + "px"
      }}
    >
      {content}
    </div>
  );
};
