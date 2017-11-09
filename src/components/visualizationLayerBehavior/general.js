import React from "react";

import { Mark } from "semiotic-mark";
import { line, area, curveLinear } from "d3-shape";

export function lineGeneratorDecorator({
  generator,
  projectedCoordinateNames,
  defined,
  xScale,
  yScale,
  interpolator,
  singleLine
}) {
  const { x, y, yTop, yBottom } = projectedCoordinateNames;

  generator.x(d => xScale(d[x])).curve(interpolator);

  if (singleLine) {
    generator.y(d => yScale(d[y]));
  } else {
    generator.y0(d => yScale(d[yBottom])).y1(d => yScale(d[yTop]));
  }

  if (defined) {
    generator.defined(p => p._xyFrameUndefined || defined(p));
  } else {
    generator.defined(p => !p._xyFrameUndefined);
  }
}

export function createPoints({
  xScale,
  yScale,
  canvasDrawing,
  data,
  projectedCoordinateNames,
  customMark,
  canvasRender,
  styleFn,
  classFn,
  renderKeyFn,
  renderMode
}) {
  const { y, x } = projectedCoordinateNames;
  const mappedPoints = [];
  data.forEach((d, i) => {
    const dX = xScale(d[x]);
    const dY = yScale(d[y]);
    const markProps = customMark
      ? Object.assign({}, customMark({ d, i }).props)
      : { key: `piece-${i}`, markType: "circle", r: 2 };

    if (canvasRender && canvasRender(d, i) === true) {
      const canvasPoint = {
        type: "point",
        baseClass: "frame-piece",
        tx: dX,
        ty: dY,
        d,
        i,
        markProps,
        styleFn,
        renderFn: renderMode,
        classFn
      };
      canvasDrawing.push(canvasPoint);
    } else {
      mappedPoints.push(
        clonedAppliedElement({
          baseClass: "frame-piece",
          tx: dX,
          ty: dY,
          d,
          i,
          markProps,
          styleFn,
          renderFn: renderMode,
          renderKeyFn,
          classFn
        })
      );
    }
  });
  return mappedPoints;
}

export function createLines({
  xScale,
  yScale,
  canvasDrawing,
  data,
  projectedCoordinateNames,
  customMark,
  canvasRender,
  styleFn,
  classFn,
  renderMode,
  renderKeyFn,
  type,
  defined
}) {
  const customLine = typeof type === "object" ? type : { type };
  const interpolator = customLine.interpolator
    ? customLine.interpolator
    : curveLinear;
  const lineGenerator = area();

  lineGeneratorDecorator({
    projectedCoordinateNames,
    defined,
    interpolator,
    generator: lineGenerator,
    xScale,
    yScale
  });

  const mappedLines = [];
  data.forEach((d, i) => {
    if (customMark && typeof customMark === "function") {
      mappedLines.push(customMark({ d, i, xScale, yScale, canvasDrawing }));
    } else {
      const markProps = { markType: "path", d: lineGenerator(d.data) };
      if (canvasRender && canvasRender(d, i) === true) {
        const canvasLine = {
          type: "line",
          baseClass: "xyframe-line",
          tx: 0,
          ty: 0,
          d,
          i,
          markProps,
          styleFn,
          renderFn: renderMode,
          classFn
        };
        canvasDrawing.push(canvasLine);
      } else {
        mappedLines.push(
          clonedAppliedElement({
            baseClass: "xyframe-line",
            d,
            i,
            markProps,
            styleFn,
            renderFn: renderMode,
            renderKeyFn,
            classFn
          })
        );
      }
    }
  });

  if (customLine.type === "difference" && data.length === 2) {
    //Create the overlay line for the difference chart

    const diffdataA = data[0].data.map((basedata, baseI) => {
      const linePoint =
        basedata._xyfYTop > data[1].data[baseI]._xyfYTop
          ? basedata._xyfYTop
          : basedata._xyfYBottom;
      return {
        _xyfX: basedata._xyfX,
        _xyfY: linePoint,
        _xyfYBottom: linePoint,
        _xyfYTop: linePoint
      };
    });

    const diffdataB = data[0].data.map((basedata, baseI) => {
      const linePoint =
        data[1].data[baseI]._xyfYTop > basedata._xyfYTop
          ? data[1].data[baseI]._xyfYTop
          : data[1].data[baseI]._xyfYBottom;
      return {
        _xyfX: basedata._xyfX,
        _xyfY: linePoint,
        _xyfYBottom: linePoint,
        _xyfYTop: linePoint
      };
    });

    const doClassname = classFn
      ? `xyframe-line ${classFn(diffdataA)}`
      : "xyframe-line";

    const overLine = line();

    lineGeneratorDecorator({
      projectedCoordinateNames,
      defined,
      interpolator,
      generator: overLine,
      xScale,
      yScale,
      singleLine: true
    });

    //      let baseStyle = props.lineStyle ? props.lineStyle(diffdata, 0) : {}
    const diffOverlayA = (
      <Mark
        key={"xyline-diff-a"}
        className={`${doClassname} difference-overlay-a`}
        markType="path"
        d={overLine(diffdataA)}
        style={{ fill: "none", pointerEvents: "none" }}
      />
    );
    mappedLines.push(diffOverlayA);

    const diffOverlayB = (
      <Mark
        key={"xyline-diff-b"}
        className={`${doClassname} difference-overlay-b`}
        markType="path"
        d={overLine(diffdataB)}
        style={{ fill: "none", pointerEvents: "none" }}
      />
    );
    mappedLines.push(diffOverlayB);
  }

  return mappedLines;
}

export function createAreas({
  xScale,
  yScale,
  canvasDrawing,
  data,
  projectedCoordinateNames,
  canvasRender,
  styleFn,
  classFn,
  renderKeyFn,
  renderMode,
  type
}) {
  const areaClass = classFn || (() => "");
  const areaStyle = styleFn || (() => ({}));

  const renderFn = renderMode;

  if (!Array.isArray(data)) {
    data = [data];
  }

  const renderedAreas = [];

  data.forEach((d, i) => {
    let className = "xyframe-area";
    if (areaClass) {
      className = `xyframe-area ${areaClass(d)}`;
    }
    let drawD = "";
    if (d.type === "MultiPolygon") {
      d.coordinates.forEach(coord => {
        coord.forEach(c => {
          drawD += `M${c
            .map(p => `${xScale(p[0])},${yScale(p[1])}`)
            .join("L")}Z `;
        });
      });
    } else {
      drawD = `M${d._xyfCoordinates
        .map(p => `${xScale(p[0])},${yScale(p[1])}`)
        .join("L")}Z`;
    }

    const renderKey = renderKeyFn ? renderKeyFn(d, i) : `area-${i}`;

    if (canvasRender && canvasRender(d, i) === true) {
      const canvasArea = {
        type: "area",
        baseClass: "xyframe-area",
        tx: 0,
        ty: 0,
        d,
        i,
        markProps: { markType: "path", d: drawD },
        styleFn: areaStyle,
        renderFn,
        classFn: () => className
      };
      canvasDrawing.push(canvasArea);
    } else {
      renderedAreas.push(
        <Mark
          key={renderKey}
          forceUpdate={true}
          renderMode={renderFn ? renderFn(d, i) : undefined}
          className={className}
          markType="path"
          d={drawD}
          style={areaStyle(d, i)}
        />
      );
    }
  });
  return renderedAreas;
}

export function clonedAppliedElement({
  tx,
  ty,
  d,
  i,
  markProps,
  styleFn,
  renderFn,
  classFn,
  renderKeyFn,
  baseClass
}) {
  markProps.style = styleFn ? styleFn(d, i) : {};

  markProps.renderMode = renderFn ? renderFn(d, i) : undefined;

  if (tx || ty) {
    markProps.transform = `translate(${tx || 0},${ty || 0})`;
  }

  markProps.className = baseClass;

  markProps.key = renderKeyFn
    ? renderKeyFn(d, i)
    : `${baseClass}-${d.key === undefined ? i : d.key}`;

  if (classFn) {
    markProps.className = `${baseClass} ${classFn(d, i)}`;
  }

  return <Mark {...markProps} />;
}
