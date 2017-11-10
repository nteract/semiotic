import React from "react";
import { forceSimulation, forceX, forceY, forceCollide } from "d3-force";
import { /*area, curveCatmullRom,*/ arc } from "d3-shape";
import pathBounds from "svg-path-bounding-box";
import { Mark } from "semiotic-mark";

const twoPI = Math.PI * 2;

const iconBarCustomMark = ({
  type,
  projection,
  finalHeight,
  finalWidth,
  styleFn,
  renderValue,
  classFn
}) => (piece, i, xy) => {
  const iconD = typeof type.icon === "string" ? type.icon : type.icon(piece, i);
  const { iconPadding = 1, resize = "auto" } = type;

  const iconBounds = pathBounds(iconD);
  const iconTranslate = [
    0 - iconBounds.x1 + iconPadding,
    0 - iconBounds.y1 + iconPadding
  ];
  iconBounds.height += iconPadding * 2;
  iconBounds.width += iconPadding * 2;

  const icons = [];

  let stackedIconSize = iconBounds.height;
  let stackedIconNumber = 1;
  let iconScale = 1;
  const spaceToUse = projection === "horizontal" ? finalHeight : finalWidth;
  const sizeToFit =
    projection === "horizontal" ? iconBounds.height : iconBounds.width;
  const sizeToPad =
    projection === "horizontal" ? iconBounds.width : iconBounds.height;
  const spaceToFill = projection === "horizontal" ? xy.width : xy.height;
  const spaceToStackFill = projection === "horizontal" ? xy.height : xy.width;
  if (resize === "auto") {
    stackedIconSize = spaceToUse / sizeToFit;
    if (stackedIconSize < 1) {
      iconScale = stackedIconSize;
    } else {
      stackedIconNumber = Math.floor(stackedIconSize);
      iconScale = 1 + (stackedIconSize - stackedIconNumber) / stackedIconNumber;
    }
  } else if (resize === "fixed") {
    iconScale = spaceToUse / sizeToFit;
  }

  //  const finalIconWidth = iconBounds.width * iconScale;
  const finalIconHeight = iconBounds.height * iconScale;

  const spaceToStep = sizeToPad * iconScale;
  const spaceToStackStep = sizeToFit * iconScale;

  iconTranslate[0] = iconTranslate[0] * iconScale;
  iconTranslate[1] = iconTranslate[1] * iconScale;

  const randoClipID = `iso-clip-${i}-${Math.random()}`;
  const clipPath = `url(#${randoClipID})`;
  if (xy.width > 0) {
    icons.push(
      <clipPath key={randoClipID} id={randoClipID}>
        <rect x={0} y={0} width={xy.width} height={xy.height} />
      </clipPath>
    );
    const iconPieces = [];
    const stepStart =
      projection === "horizontal" ? 0 : xy.height - finalIconHeight;
    const stepper = projection === "horizontal" ? spaceToStep : -spaceToStep;
    const stepTest =
      projection === "horizontal"
        ? (step, spaceToFill) => step < spaceToFill
        : (step, spaceToFill, stepper) => step > 0 + stepper;

    for (
      let step = stepStart;
      stepTest(step, spaceToFill, stepper);
      step += stepper
    ) {
      for (let stack = 0; stack < spaceToStackFill; stack += spaceToStackStep) {
        const stepX = projection === "horizontal" ? step : stack;
        const stepY = projection === "horizontal" ? stack : step;
        const paddedX = stepX + iconTranslate[0];
        const paddedY = stepY + iconTranslate[1];
        iconPieces.push(
          <Mark
            forceUpdate={true}
            markType="path"
            key={`icon-${step}-${stack}`}
            transform={`translate(${paddedX},${paddedY}) scale(${iconScale})`}
            vectorEffect={"non-scaling-stroke"}
            d={iconD}
            style={styleFn(piece, i)}
            renderMode={renderValue}
            className={classFn(piece, i)}
          />
        );
      }
    }
    icons.push(
      <g key={`clipped-region-${i}`} clipPath={clipPath}>
        {iconPieces}
      </g>
    );
  }
  return icons;
};

export function pointOnArcAtAngle(center, angle, distance) {
  const radians = Math.PI * (angle + 0.75) * 2;

  const xPosition = center[0] + distance * Math.cos(radians);
  const yPosition = center[1] + distance * Math.sin(radians);

  return [xPosition, yPosition];
}

export function clusterBarLayout({
  type,
  data,
  renderMode,
  eventListenersGenerator,
  styleFn,
  projection,
  classFn,
  adjustedSize,
  margin
}) {
  let allCalculatedPieces = [];
  const keys = Object.keys(data);
  keys.forEach((key, ordsetI) => {
    const ordset = data[key];

    const barColumnWidth = ordset.width;
    const clusterWidth = barColumnWidth / ordset.pieceData.length;

    let currentX = 0;
    let currentY = 0;

    const calculatedPieces = ordset.pieceData.map((piece, i) => {
      const renderValue = renderMode && renderMode(piece, i);

      let xPosition = piece._orFX;
      let yPosition = piece._orFRBase;
      let finalWidth = clusterWidth;
      let finalHeight = piece._orFR;
      const xy = {};
      if (!piece.negative) {
        yPosition -= piece._orFR;
      }

      if (projection === "horizontal") {
        //TODO: NEGATIVE FOR HORIZONTAL
        yPosition = piece._orFX;
        xPosition = piece._orFRBase;
        finalHeight = clusterWidth;
        finalWidth = piece._orFR;
        if (piece.negative) {
          xPosition -= piece._orFR;
        }
      }

      let markD,
        translate,
        markProps = {};

      if (projection === "radial") {
        const arcGenerator = arc()
          .innerRadius(0)
          .outerRadius(piece._orFR / 2);

        let angle = (ordset.pct - ordset.pct_padding) / ordset.pieceData.length;
        let startAngle =
          ordset.pct_start +
          i / ordset.pieceData.length * (ordset.pct - ordset.pct_padding);
        let endAngle = startAngle + angle;

        markD = arcGenerator({
          startAngle: startAngle * twoPI,
          endAngle: endAngle * twoPI
        });
        const xOffset = adjustedSize[0] / 2 + margin.left;
        const yOffset = adjustedSize[1] / 2 + margin.top;
        translate = `translate(${xOffset},${yOffset})`;

        const startAngleFinal = startAngle * twoPI;
        const endAngleFinal = endAngle * twoPI;
        const outerPoint = pointOnArcAtAngle(
          [0, 0],
          (startAngle + endAngle) / 2,
          piece._orFR / 2
        );

        xy.arcGenerator = arcGenerator;
        xy.startAngle = startAngleFinal;
        xy.endAngle = endAngleFinal;
        xy.dx = outerPoint[0];
        xy.dy = outerPoint[1];

        const centroid = arcGenerator.centroid({
          startAngle: startAngleFinal,
          endAngle: endAngleFinal
        });
        finalHeight = undefined;
        finalWidth = undefined;
        xPosition = centroid[0] + xOffset;
        yPosition = centroid[1] + yOffset;

        markProps = { markType: "path", d: markD };
      } else {
        xPosition += currentX;
        yPosition += currentY;
        markProps = {
          markType: "rect",
          x: xPosition,
          y: yPosition,
          width: finalWidth,
          height: finalHeight,
          rx: 0,
          ry: 0
        };
      }

      const eventListeners = eventListenersGenerator(piece, i);

      xy.x = xPosition;
      xy.y = yPosition;
      xy.middle = clusterWidth / 2;
      xy.height = finalHeight;
      xy.width = finalWidth;

      if (type.icon && projection !== "radial") {
        type.customMark = iconBarCustomMark({
          type,
          projection,
          finalHeight,
          finalWidth,
          styleFn,
          renderValue,
          classFn
        });
      } else if (type.icon && projection === "radial") {
        console.error("Icons are currently unsupported on radial charts");
      }

      const renderElementObject = type.customMark ? (
        <g
          key={"piece-" + piece.renderKey}
          transform={
            translate ? translate : `translate(${xPosition},${yPosition})`
          }
        >
          {type.customMark(piece, i, xy)}
        </g>
      ) : (
        {
          className: classFn(piece, i),
          renderMode: renderValue,
          key: "piece-" + piece.renderKey,
          transform: translate,
          style: styleFn(piece, ordsetI),
          ...markProps,
          ...eventListeners
        }
      );

      const calculatedPiece = {
        o: key,
        xy,
        piece,
        renderElement: renderElementObject
      };
      if (projection === "horizontal") {
        currentY += finalHeight;
      } else {
        currentX += finalWidth;
      }

      //        currentOffset += pieceSize
      return calculatedPiece;
    });
    allCalculatedPieces = [...allCalculatedPieces, ...calculatedPieces];
  });
  return allCalculatedPieces;
}

export function barLayout({
  type,
  data,
  renderMode,
  eventListenersGenerator,
  styleFn,
  projection,
  classFn,
  adjustedSize,
  margin
}) {
  const keys = Object.keys(data);
  let allCalculatedPieces = [];
  keys.forEach((key, ordsetI) => {
    const ordset = data[key];
    const barColumnWidth = ordset.width;

    const calculatedPieces = ordset.pieceData.map((piece, i) => {
      const pieceSize = piece._orFR;
      const renderValue = renderMode && renderMode(piece, i);

      let xPosition = piece._orFX;
      let yPosition = piece._orFRBottom;
      let finalWidth = barColumnWidth;
      let finalHeight = pieceSize;

      if (!piece.negative) {
        yPosition -= piece._orFR;
      }

      if (projection === "horizontal") {
        yPosition = piece._orFX;
        xPosition = piece._orFRBottom;
        finalHeight = barColumnWidth;
        finalWidth = pieceSize;
        if (piece.negative) {
          xPosition = piece._orFRBottom - piece._orFR;
        }
      }

      let markD, translate, markProps;

      if (projection === "radial") {
        let { innerRadius } = type;
        let innerSize = (piece._orFRBottom - margin.left) / 2;
        let outerSize = piece._orFR / 2 + (piece._orFRBottom - margin.left) / 2;
        if (innerRadius) {
          innerRadius = parseInt(innerRadius);
          const canvasRadius = adjustedSize[0] / 2;
          const donutMod = (canvasRadius - innerRadius) / canvasRadius;
          innerSize = innerSize * donutMod + innerRadius;
          outerSize = outerSize * donutMod + innerRadius;
        }

        const arcGenerator = arc()
          .innerRadius(innerSize)
          .outerRadius(outerSize);
        //          .padAngle(ordset.pct_padding * twoPI);

        let angle = ordset.pct;
        let startAngle = ordset.pct_start;
        let endAngle = startAngle + angle - ordset.pct_padding / 2;

        markD = arcGenerator({
          startAngle: startAngle * twoPI,
          endAngle: endAngle * twoPI
        });
        const centroid = arcGenerator.centroid({
          startAngle: startAngle * twoPI,
          endAngle: endAngle * twoPI
        });
        finalHeight = undefined;
        finalWidth = undefined;
        const xOffset = adjustedSize[0] / 2 + margin.left;
        const yOffset = adjustedSize[1] / 2 + margin.top;
        xPosition = centroid[0] + xOffset;
        yPosition = centroid[1] + yOffset;
        translate = `translate(${xOffset},${yOffset})`;
        markProps = { markType: "path", d: markD };
      } else {
        markProps = {
          markType: "rect",
          x: xPosition,
          y: yPosition,
          width: finalWidth,
          height: finalHeight,
          rx: 0,
          ry: 0
        };
      }

      const eventListeners = eventListenersGenerator(piece, i);
      const xy = {
        x: xPosition,
        y: yPosition,
        middle: barColumnWidth / 2,
        height: finalHeight,
        width: finalWidth
      };

      if (type.icon && projection !== "radial") {
        type.customMark = iconBarCustomMark({
          type,
          projection,
          finalHeight,
          finalWidth,
          styleFn,
          renderValue,
          classFn
        });
      } else if (type.icon && projection !== "horizontal") {
        console.error("Icons are currently unsupported in radial charts");
      }

      const renderElementObject = type.customMark ? (
        <g
          key={"piece-" + piece.renderKey}
          transform={`translate(${xPosition},${yPosition})`}
        >
          {type.customMark(piece, i, xy)}
        </g>
      ) : (
        {
          className: classFn(piece, i),
          renderMode: renderValue,
          key: "piece-" + piece.renderKey,
          transform: translate,
          style: styleFn(piece, ordsetI),
          ...eventListeners,
          ...markProps
        }
      );

      const calculatedPiece = {
        o: key,
        xy,
        piece,
        renderElement: renderElementObject
      };
      return calculatedPiece;
    });
    allCalculatedPieces = [...allCalculatedPieces, ...calculatedPieces];
  });

  return allCalculatedPieces;
}

export function pointLayout({
  type,
  data,
  renderMode,
  eventListenersGenerator,
  styleFn,
  projection,
  classFn,
  adjustedSize,
  margin
}) {
  const circleRadius = type.r || 3;
  let allCalculatedPieces = [];
  const keys = Object.keys(data);
  keys.forEach((key, ordsetI) => {
    const ordset = data[key];

    const calculatedPieces = [];

    ordset.pieceData.forEach((piece, i) => {
      const renderValue = renderMode && renderMode(piece, i);

      let xPosition = ordset.middle;
      let yPosition = adjustedSize[1] - piece._orFR + margin.top;

      if (projection === "horizontal") {
        yPosition = ordset.middle;
        xPosition = piece._orFR;
      } else if (projection === "radial") {
        const angle = ordset.pct_middle;

        const rPosition = (piece._orFR - margin.left) / 2;
        const baseCentroid = pointOnArcAtAngle(
          [adjustedSize[0] / 2, adjustedSize[1] / 2],
          angle,
          rPosition
        );
        xPosition = baseCentroid[0] + margin.left;
        yPosition = baseCentroid[1] + margin.top;
      }

      //Only return the actual piece if you're rendering points, otherwise you just needed to iterate and calculate the points for the contour summary type
      const actualCircleRadius =
        typeof circleRadius === "function"
          ? circleRadius(piece, i)
          : circleRadius;
      const eventListeners = eventListenersGenerator(piece, i);

      const renderElementObject = type.customMark ? (
        <g
          key={"piece-" + piece.renderKey}
          transform={`translate(${xPosition},${yPosition})`}
        >
          {type.customMark(piece, i)}
        </g>
      ) : (
        {
          className: classFn(piece, i),
          markType: "rect",
          renderMode: renderValue,
          key: "piece-" + piece.renderKey,
          height: actualCircleRadius * 2,
          width: actualCircleRadius * 2,
          x: xPosition - actualCircleRadius,
          y: yPosition - actualCircleRadius,
          rx: actualCircleRadius,
          ry: actualCircleRadius,
          style: styleFn(piece, ordsetI),
          ...eventListeners
        }
      );

      const calculatedPiece = {
        o: key,
        xy: {
          x: xPosition,
          y: yPosition
        },
        piece,
        renderElement: renderElementObject
      };

      calculatedPieces.push(calculatedPiece);
    });
    allCalculatedPieces = [...allCalculatedPieces, ...calculatedPieces];
  });

  return allCalculatedPieces;
}

export function swarmLayout({
  type,
  data,
  renderMode,
  eventListenersGenerator,
  styleFn,
  projection,
  classFn,
  adjustedSize,
  margin
}) {
  let allCalculatedPieces = [];
  const iterations = type.iterations || 120;

  const columnKeys = Object.keys(data);

  columnKeys.forEach((key, ordsetI) => {
    const oColumn = data[key];
    let anglePiece = 1 / columnKeys.length;
    const oData = oColumn.pieceData;
    const adjustedColumnWidth = oColumn.width;

    const circleRadius =
      type.r ||
      Math.max(2, Math.min(5, 4 * adjustedColumnWidth / oData.length));

    const simulation = forceSimulation(oData)
      .force("y", forceY((d, i) => d._orFR).strength(type.strength || 2))
      .force("x", forceX(oColumn.middle))
      .force("collide", forceCollide(circleRadius))
      .stop();

    for (let i = 0; i < iterations; ++i) simulation.tick();

    const calculatedPieces = oData.map((piece, i) => {
      const renderValue = renderMode && renderMode(piece, i);

      let xPosition = piece.x;
      let yPosition = adjustedSize[1] - piece.y + margin.top;

      if (projection === "horizontal") {
        yPosition = piece.x;
        xPosition = piece.y;
      } else if (projection === "radial") {
        const angle = oColumn.pct_middle;
        xPosition =
          (piece.x - oColumn.middle) / adjustedColumnWidth * anglePiece;
        const rPosition = (piece._orFR - margin.left) / 2;
        const xAngle = angle + xPosition;
        const baseCentroid = pointOnArcAtAngle(
          [adjustedSize[0] / 2, adjustedSize[1] / 2],
          xAngle,
          rPosition
        );
        xPosition = baseCentroid[0] + margin.left;
        yPosition = baseCentroid[1] + margin.top;
      }

      const actualCircleRadius =
        typeof circleRadius === "function"
          ? circleRadius(piece, i)
          : circleRadius;

      const eventListeners = eventListenersGenerator(piece, i);

      const renderElementObject = type.customMark ? (
        <g
          key={"piece-" + piece.renderKey}
          transform={`translate(${xPosition},${yPosition})`}
        >
          {type.customMark(piece, i)}
        </g>
      ) : (
        {
          className: classFn(piece, i),
          markType: "rect",
          renderMode: renderValue,
          key: "piece-" + piece.renderKey,
          height: actualCircleRadius * 2,
          width: actualCircleRadius * 2,
          x: xPosition - actualCircleRadius,
          y: yPosition - actualCircleRadius,
          rx: actualCircleRadius,
          ry: actualCircleRadius,
          style: styleFn(piece, ordsetI),
          ...eventListeners
        }
      );

      const calculatedPiece = {
        o: key,
        xy: {
          x: xPosition,
          y: yPosition
        },
        piece,
        renderElement: renderElementObject
      };

      return calculatedPiece;
    });
    allCalculatedPieces = [...allCalculatedPieces, ...calculatedPieces];
  });

  return allCalculatedPieces;
}
