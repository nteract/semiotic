import React from "react";
import { Mark } from "semiotic-mark";
import Annotation from "../Annotation";
import {
  AnnotationXYThreshold,
  AnnotationCalloutCircle,
  AnnotationBracket
} from "react-annotation";
import { packEnclose } from "d3-hierarchy";
import { max, min, sum, extent } from "d3-array";
import { pointOnArcAtAngle } from "../svg/pieceDrawing";
import { arc } from "d3-shape";

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians)
  };
}

function arcBracket({
  x,
  y,
  radius,
  startAngle,
  endAngle,
  inset,
  outset,
  curly = true
}) {
  const start = polarToCartesian(x, y, radius + outset, endAngle);
  const end = polarToCartesian(x, y, radius + outset, startAngle);

  const innerStart = polarToCartesian(x, y, radius + outset - inset, endAngle);
  const innerEnd = polarToCartesian(x, y, radius + outset - inset, startAngle);

  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  let d;
  if (curly) {
    const middleLeft = polarToCartesian(
      x,
      y,
      radius + outset,
      (startAngle + endAngle) / 2 + 10
    );

    const middle = polarToCartesian(
      x,
      y,
      radius + outset + 10,
      (startAngle + endAngle) / 2
    );
    const middleRight = polarToCartesian(
      x,
      y,
      radius + outset,
      (startAngle + endAngle) / 2 - 10
    );

    d = [
      "M",
      innerStart.x,
      innerStart.y,
      "L",
      start.x,
      start.y,
      "A",
      radius + outset,
      radius + outset,
      0,
      largeArcFlag,
      0,
      middleLeft.x,
      middleLeft.y,
      "A",
      radius + outset,
      radius + outset,
      1,
      largeArcFlag,
      1,
      middle.x,
      middle.y,
      "A",
      radius + outset,
      radius + outset,
      1,
      largeArcFlag,
      1,
      middleRight.x,
      middleRight.y,

      "A",
      radius + outset,
      radius + outset,
      0,
      largeArcFlag,
      0,
      end.x,
      end.y,
      "L",
      innerEnd.x,
      innerEnd.y
    ].join(" ");
  } else {
    const middle = polarToCartesian(
      x,
      y,
      radius + outset,
      (startAngle + endAngle) / 2
    );
    d = [
      "M",
      innerStart.x,
      innerStart.y,
      "L",
      start.x,
      start.y,
      "A",
      radius + outset,
      radius + outset,
      0,
      largeArcFlag,
      0,
      end.x,
      end.y,
      "L",
      innerEnd.x,
      innerEnd.y
    ].join(" ");
  }

  const midAngle = (startAngle + endAngle) / 2;
  let textOffset, largeTextArcFlag, finalTextEnd, finalTextStart, arcFlip;
  const lowerArc = midAngle > 90 && midAngle < 270;
  if (lowerArc) {
    textOffset = 12;
    largeTextArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    arcFlip = 0;
  } else {
    largeTextArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    textOffset = 5;
    arcFlip = 1;
  }
  textOffset += curly ? 10 : 0;
  const textStart = polarToCartesian(
    x,
    y,
    radius + outset + textOffset,
    endAngle
  );
  const textEnd = polarToCartesian(
    x,
    y,
    radius + outset + textOffset,
    startAngle
  );
  if (lowerArc) {
    finalTextStart = textStart;
    finalTextEnd = textEnd;
  } else {
    finalTextStart = textEnd;
    finalTextEnd = textStart;
  }

  const textD = [
    "M",
    finalTextStart.x,
    finalTextStart.y,
    "A",
    radius + outset + textOffset,
    radius + outset + textOffset,
    arcFlip,
    largeTextArcFlag,
    arcFlip,
    finalTextEnd.x,
    finalTextEnd.y
  ].join(" ");

  return { arcPath: d, textArcPath: textD };
}

export const svgORRule = ({ d, i, screenCoordinates, projection }) => {
  return (
    <Mark
      markType="text"
      key={d.label + "annotationtext" + i}
      forceUpdate={true}
      x={screenCoordinates[0] + (projection === "horizontal" ? 10 : 0)}
      y={screenCoordinates[1] + (projection === "vertical" ? 10 : 0)}
      className={`annotation annotation-or-label ${d.className || ""}`}
      textAnchor="middle"
    >
      {d.label}
    </Mark>
  );
};

export const basicReactAnnotationRule = ({ d, i, screenCoordinates }) => {
  const noteData = Object.assign(
    {
      dx: 0,
      dy: 0,
      x: screenCoordinates[0],
      y: screenCoordinates[1],
      note: { label: d.label },
      connector: { end: "arrow" }
    },
    d,
    { type: typeof d.type === "function" ? d.type : undefined }
  );
  return <Annotation key={d.key || `annotation-${i}`} noteData={noteData} />;
};

export const svgEncloseRule = ({ d, i, screenCoordinates }) => {
  const circle = packEnclose(
    screenCoordinates.map(p => ({ x: p[0], y: p[1], r: 2 }))
  );
  const noteData = Object.assign(
    {
      dx: 0,
      dy: 0,
      x: circle.x,
      y: circle.y,
      note: { label: d.label },
      connector: { end: "arrow" }
    },
    d,
    {
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
      case "right":
        noteData.dx = circle.r + noteData.rd;
        noteData.dy = 0;
        break;
      default:
        noteData.dx = 0;
        noteData.dy = 0;
    }
  }
  //TODO: Support .ra (setting angle)

  return <Annotation key={d.key || `annotation-${i}`} noteData={noteData} />;
};

export const svgRRule = ({
  d,
  i,
  screenCoordinates,
  rScale,
  rAccessor,
  margin,
  adjustedSize,
  adjustedPosition,
  projection
}) => {
  let x, y, xPosition, yPosition, subject, dx, dy;
  if (projection === "radial") {
    return (
      <Annotation
        key={d.key || `annotation-${i}`}
        noteData={Object.assign(
          {
            dx: 50,
            dy: 50,
            note: { label: d.label },
            connector: { end: "arrow" }
          },
          d,
          {
            type: AnnotationCalloutCircle,
            subject: {
              radius: (rScale(rAccessor(d)) - margin.left) / 2,
              radiusPadding: 0
            },
            x: adjustedSize[0] / 2 + margin.left,
            y: adjustedSize[1] / 2 + margin.top
          }
        )}
      />
    );
  } else if (projection === "horizontal") {
    dx = 50;
    dy = 50;
    yPosition = d.offset || margin.top + i * 25;
    x = screenCoordinates[0];
    y = yPosition;
    subject = {
      x,
      y1: margin.top,
      y2: adjustedSize[1] + adjustedPosition[1] + margin.top
    };
  } else {
    dx = 50;
    dy = -20;
    xPosition = d.offset || margin.left + i * 25;
    y = screenCoordinates[1];
    x = xPosition;
    subject = {
      y,
      x1: margin.left,
      x2: adjustedSize[0] + adjustedPosition[0] + margin.left
    };
  }

  const noteData = Object.assign(
    {
      dx,
      dy,
      note: { label: d.label },
      connector: { end: "arrow" }
    },
    d,
    {
      type: AnnotationXYThreshold,
      x,
      y,
      subject
    }
  );
  return <Annotation key={d.key || `annotation-${i}`} noteData={noteData} />;
};

export const svgCategoryRule = ({
  projection,
  d,
  i,
  categories,
  adjustedSize,
  margin
}) => {
  const {
    bracketType = "curly",
    position = projection === "vertical" ? "top" : "left",
    depth = 30,
    offset = 0,
    padding = 0
  } = d;
  const actualCategories = Array.isArray(d.categories)
    ? d.categories
    : [d.categories];
  const cats = actualCategories.map(c => categories[c]);

  if (projection === "radial") {
    const arcPadding = padding / adjustedSize[1];
    const leftX = min(
      cats.map(d => d.pct_start + d.pct_padding / 2 + arcPadding / 2)
    );
    const rightX = max(
      cats.map(d => d.pct_start + d.pct - d.pct_padding / 2 - arcPadding / 2)
    );

    const chartSize = Math.min(adjustedSize[0], adjustedSize[1]) / 2;
    const centerX = adjustedSize[0] / 2 + margin.left;
    const centerY = adjustedSize[1] / 2 + margin.top;

    const { arcPath, textArcPath } = arcBracket({
      x: 0,
      y: 0,
      radius: chartSize,
      startAngle: leftX * 360,
      endAngle: rightX * 360,
      inset: depth,
      outset: offset
    });
    const textPathID = `text-path-${i}-${Math.random()}`;
    return (
      <g
        className="category-annotation annotation"
        transform={`translate(${centerX},${centerY})`}
      >
        <path d={arcPath} fill="none" />
        <path id={textPathID} d={textArcPath} style={{ display: "none" }} />
        <text font-size="12.5">
          <textPath
            startOffset={"50%"}
            textAnchor={"middle"}
            xlinkHref={`#${textPathID}`}
          >
            {d.label}
          </textPath>
        </text>
      </g>
    );
  } else {
    const leftX = min(cats.map(d => d.x));
    const rightX = max(cats.map(d => d.x + d.width));
    let noteData;
    if (projection === "vertical") {
      let yPosition = position === "top" ? margin.top : adjustedSize[1];
      yPosition += position === "top" ? -offset : offset;
      let noteData = {
        type: AnnotationBracket,
        y: yPosition,
        x: leftX - padding,
        note: {
          title: d.title || d.label,
          label: d.title ? d.label : undefined
        },
        subject: {
          type: bracketType,
          width: rightX - leftX + padding * 2,
          depth: position === "top" ? -depth : depth
        }
      };
      return (
        <Annotation key={d.key || `annotation-${i}`} noteData={noteData} />
      );
    } else if (projection === "horizontal") {
      let yPosition =
        position === "left" ? margin.left : adjustedSize[0] + margin.left;
      yPosition += position === "left" ? -offset : offset;
      let noteData = {
        type: AnnotationBracket,
        x: yPosition,
        y: leftX - padding,
        note: {
          title: d.title || d.label,
          label: d.title ? d.label : undefined
        },
        subject: {
          type: bracketType,
          height: rightX - leftX + padding * 2,
          depth: position === "left" ? -depth : depth
        }
      };
    }
    return <Annotation key={d.key || `annotation-${i}`} noteData={noteData} />;
  }
};

export const htmlFrameHoverRule = ({
  d,
  i,
  rAccessor,
  oAccessor,
  size,
  projection,
  tooltipContent
}) => {
  //To string because React gives a DOM error if it gets a date
  let contentFill;
  if (d.isSummaryData) {
    let summaryLabel = <p key="html-annotation-content-2">{d.label}</p>;
    if (d.pieces && d.pieces.length !== 0) {
      if (d.pieces.length === 1) {
        summaryLabel = (
          <p key="html-annotation-content-2">{rAccessor(d.pieces[0])}</p>
        );
      } else {
        const pieceData = extent(d.pieces.map(rAccessor));
        summaryLabel = (
          <p key="html-annotation-content-2">
            From {pieceData[0]} to {pieceData[1]}
          </p>
        );
      }
    }
    contentFill = [
      <p key="html-annotation-content-1">{d.key}</p>,
      summaryLabel,
      <p key="html-annotation-content-3">{d.value}</p>
    ];
  } else {
    contentFill = [
      <p key="html-annotation-content-1">{oAccessor(d).toString()}</p>,
      <p key="html-annotation-content-2">{rAccessor(d).toString()}</p>
    ];
  }
  let content = <div className="tooltip-content">{contentFill}</div>;

  if (d.type === "frame-hover" && tooltipContent) {
    content = tooltipContent(d);
  }

  return (
    <div
      key={"xylabel" + i}
      className={`annotation annotation-or-label tooltip ${projection} ${d.className ||
        ""}`}
      style={{
        position: "absolute",
        bottom: `${10 + size[1] - d.y}px`,
        left: d.x + "px"
      }}
    >
      {content}
    </div>
  );
};

export const htmlColumnHoverRule = ({
  d,
  i,
  summaryType,
  oAccessor,
  rAccessor,
  projectedColumns,
  type,
  adjustedPosition,
  adjustedSize,
  margin,
  projection,
  tooltipContent
}) => {
  const maxPiece = max(d.pieces.map(d => d._orFR));
  //we need to ignore negative pieces to make sure the hover behavior populates on top of the positive bar
  const sumPiece = sum(d.pieces.map(d => d._orFR).filter(p => p > 0));
  const positionValue =
    summaryType.type ||
    ["swarm", "point", "clusterbar"].find(d => d === type.type)
      ? maxPiece
      : sumPiece;

  let xPosition =
    projectedColumns[oAccessor(d.pieces[0])].middle + adjustedPosition[0];
  let yPosition = positionValue;
  yPosition += margin.bottom + margin.top + 10;

  if (projection === "horizontal") {
    yPosition =
      adjustedSize[1] -
      projectedColumns[oAccessor(d.pieces[0])].middle +
      adjustedPosition[0] +
      margin.top +
      margin.bottom;
    xPosition = positionValue + adjustedPosition[0] + margin.left;
  } else if (projection === "radial") {
    [xPosition, yPosition] = pointOnArcAtAngle(
      [
        d.arcAngles.translate[0] - margin.left,
        d.arcAngles.translate[1] - margin.top
      ],
      d.arcAngles.midAngle,
      d.arcAngles.length
    );
    yPosition = 10 + adjustedSize[1] - yPosition;
  }

  //To string because React gives a DOM error if it gets a date
  let content = (
    <div className="tooltip-content">
      <p key="or-annotation-1">{oAccessor(d.pieces[0]).toString()}</p>
      <p key="or-annotation-2">{sumPiece}</p>
    </div>
  );

  if (d.type === "column-hover" && tooltipContent) {
    content = tooltipContent(d);
  }

  if (d.type === "xy") {
    content = d.label;
  }

  return (
    <div
      key={"orlabel" + i}
      className={`annotation annotation-or-label tooltip ${projection} ${d.className ||
        ""}`}
      style={{
        position: "absolute",
        bottom: yPosition + "px",
        left: xPosition + "px"
      }}
    >
      {content}
    </div>
  );
};
