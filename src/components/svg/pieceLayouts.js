import { forceSimulation, forceX, forceY, forceCollide } from "d3-force";
import { /*area, curveCatmullRom,*/ arc } from "d3-shape";

const twoPI = Math.PI * 2;

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
        //TODO: Make clustered radial bars work
        const arcGenerator = arc()
          .innerRadius(0)
          .outerRadius(piece._orFR / 2);

        let angle = ordset.pct / ordset.pieceData.length;
        let startAngle =
          ordset.pct_start + i / ordset.pieceData.length * ordset.pct;
        let endAngle = startAngle + angle;

        markD = arcGenerator({
          startAngle: startAngle * twoPI,
          endAngle: endAngle * twoPI
        });
        translate = `translate(${adjustedSize[0] / 2},${adjustedSize[1] / 2 +
          margin.top})`;
        const centroid = arcGenerator.centroid({
          startAngle: startAngle * twoPI,
          endAngle: endAngle * twoPI
        });
        finalHeight = undefined;
        finalWidth = undefined;
        xPosition = centroid[0];
        yPosition = centroid[1];
        markProps = { markType: "path", d: markD };
      } else {
        markProps = {
          markType: "rect",
          x: xPosition + currentX,
          y: yPosition + currentY,
          width: finalWidth,
          height: finalHeight,
          rx: 0,
          ry: 0
        };
      }

      const eventListeners = eventListenersGenerator(piece, i);

      const calculatedPiece = {
        o: key,
        xy: {
          x: xPosition + currentX,
          y: yPosition + currentY,
          middle: clusterWidth / 2,
          height: finalHeight,
          width: finalWidth
        },
        piece,
        renderElement: {
          className: classFn(piece, i),
          renderMode: renderValue,
          key: "piece-" + piece.renderKey,
          transform: translate,
          style: styleFn(piece, ordsetI),
          ...markProps,
          ...eventListeners
        }
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
        let innerSize = (piece._orFRBottom - margin.top) / 2;
        let outerSize = piece._orFR / 2 + (piece._orFRBottom - margin.top) / 2;
        if (innerRadius) {
          innerRadius = parseInt(innerRadius);
          const canvasRadius = adjustedSize[1] / 2;
          const donutMod = (canvasRadius - innerRadius) / canvasRadius;
          innerSize = innerSize * donutMod + innerRadius;
          outerSize = outerSize * donutMod + innerRadius;
        }

        const arcGenerator = arc()
          .innerRadius(innerSize)
          .outerRadius(outerSize)
          .padAngle(ordset.pct_padding * twoPI);

        let angle = ordset.pct;
        let startAngle = ordset.pct_start;
        let endAngle = startAngle + angle;

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
        xPosition = centroid[0];
        yPosition = centroid[1];
        translate =
          "translate(" +
          adjustedSize[0] / 2 +
          "," +
          (adjustedSize[1] / 2 + margin.top) +
          ")";
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

      const calculatedPiece = {
        o: key,
        xy: {
          x: xPosition,
          y: yPosition,
          middle: barColumnWidth / 2,
          height: finalHeight,
          width: finalWidth
        },
        piece,
        renderElement: {
          className: classFn(piece, i),
          renderMode: renderValue,
          key: "piece-" + piece.renderKey,
          transform: translate,
          style: styleFn(piece, ordsetI),
          ...eventListeners,
          ...markProps
        }
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
        xPosition = baseCentroid[0];
        yPosition = baseCentroid[1] + margin.top;
      }

      //Only return the actual piece if you're rendering points, otherwise you just needed to iterate and calculate the points for the contour summary type
      const actualCircleRadius =
        typeof circleRadius === "function"
          ? circleRadius(piece, i)
          : circleRadius;
      const eventListeners = eventListenersGenerator(piece, i);

      const calculatedPiece = {
        o: key,
        xy: {
          x: xPosition,
          y: yPosition
        },
        piece,
        renderElement: {
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
        xPosition = baseCentroid[0];
        yPosition = baseCentroid[1] + margin.top;
      }

      const actualCircleRadius =
        typeof circleRadius === "function"
          ? circleRadius(piece, i)
          : circleRadius;

      const eventListeners = eventListenersGenerator(piece, i);

      const calculatedPiece = {
        o: key,
        xy: {
          x: xPosition,
          y: yPosition
        },
        piece,
        renderElement: {
          className: classFn(piece, i),
          markType: "rect",
          height: actualCircleRadius * 2,
          width: actualCircleRadius * 2,
          x: xPosition - actualCircleRadius,
          y: yPosition - actualCircleRadius,
          rx: actualCircleRadius,
          ry: actualCircleRadius,
          renderMode: renderValue,
          key: "piece-" + piece.renderKey,
          style: styleFn(piece, ordsetI),
          ...eventListeners
        }
      };

      return calculatedPiece;
    });
    allCalculatedPieces = [...allCalculatedPieces, ...calculatedPieces];
  });

  return allCalculatedPieces;
}
