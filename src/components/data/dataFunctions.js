import { projectLineData, projectAreaData } from "../svg/lineDrawing";
import {
  projectedX,
  projectedY,
  projectedYTop,
  projectedYMiddle,
  projectedYBottom
} from "../constants/coordinateNames";
import {
  differenceLine,
  stackedArea,
  bumpChart,
  lineChart
} from "../svg/lineDrawing";
import { contouring } from "../svg/areaDrawing";
import { max, min } from "d3-array";

const builtInTransformations = {
  stackedarea: stackedArea,
  "stackedarea-invert": stackedArea,
  stackedpercent: stackedArea,
  "stackedpercent-invert": stackedArea,
  difference: differenceLine,
  bumparea: bumpChart,
  bumpline: bumpChart,
  "bumparea-invert": bumpChart,
  line: lineChart
};

export const stringToFn = (accessor, defaultAccessor, raw) => {
  if (!accessor) {
    return defaultAccessor;
  } else if (typeof accessor !== "function" && raw) {
    return () => accessor;
  }
  return typeof accessor !== "function" ? d => d[accessor] : accessor;
};

export const calculateDataExtent = ({
  lineDataAccessor,
  xAccessor,
  yAccessor,
  areas,
  points,
  lines,
  lineType,
  showLinePoints,
  xExtent,
  yExtent,
  invertX,
  invertY,
  areaDataAccessor,
  projection,
  areaType
}) => {
  lineDataAccessor = stringToFn(lineDataAccessor, d => d.coordinates);
  xAccessor = stringToFn(xAccessor, d => d[0]);
  yAccessor = stringToFn(yAccessor, d => d[1]);
  areaDataAccessor = stringToFn(areaDataAccessor, d => d.coordinates);

  let fullDataset = [];
  let initialProjectedLines = [];

  let projectedPoints = [],
    projectedLines = [],
    projectedAreas = [];
  if (points) {
    projectedPoints = points.map((d, i) => {
      const x = xAccessor(d, i);
      const y = yAccessor(d, i);
      return Object.assign({ [projectedX]: x, [projectedY]: y }, d);
    });
    fullDataset = projectedPoints;
  } else if (lines) {
    initialProjectedLines = projectLineData({
      data: lines,
      lineDataAccessor,
      xProp: projectedX,
      yProp: projectedY,
      yPropTop: projectedYTop,
      yPropBottom: projectedYBottom,
      xAccessor: xAccessor,
      yAccessor: yAccessor
    });

    const optionsObject = {
      xProp: projectedX,
      yProp: projectedY,
      yPropMiddle: projectedYMiddle,
      yPropTop: projectedYTop,
      yPropBottom: projectedYBottom
    };

    projectedLines = lineTransformation(lineType, optionsObject)(
      initialProjectedLines
    );

    projectedLines.forEach(d => {
      fullDataset = [
        ...fullDataset,
        ...d.data.map(p => Object.assign({ parentLine: d }, p))
      ];
    });
  }
  if (areas) {
    projectedAreas = projectAreaData({
      data: areas,
      areaDataAccessor,
      projection,
      xProp: projectedX,
      yProp: projectedY,
      yPropTop: projectedYTop,
      yPropBottom: projectedYBottom,
      xAccessor: xAccessor,
      yAccessor: yAccessor
    });
    projectedAreas.forEach(d => {
      const baseData = areaDataAccessor(d);
      if (d._xyfCoordinates[0][0][0]) {
        d._xyfCoordinates[0].forEach(multi => {
          fullDataset = [
            ...fullDataset,
            ...multi.map((p, q) =>
              Object.assign({ parentArea: d }, baseData[q], {
                [projectedX]: p[0],
                [projectedY]: p[1]
              })
            )
          ];
        });
      } else {
        fullDataset = [
          ...fullDataset,
          ...d._xyfCoordinates.map((p, q) =>
            Object.assign({ parentArea: d }, baseData[q], {
              [projectedX]: p[0],
              [projectedY]: p[1]
            })
          )
        ];
      }
    });
  }

  //Handle 'expose points on lines' option now that sending points and lines simultaneously is no longer allowed
  if (showLinePoints) {
    projectedPoints = fullDataset;
  }

  function lineTransformation(lineType = { type: "line" }, options) {
    const differenceCatch = (olineType, data) =>
      (lineType === "difference" ||
        (lineType.type && lineType.type === "difference")) &&
      data.length !== 2
        ? "line"
        : olineType;
    if (builtInTransformations[lineType]) {
      return data =>
        builtInTransformations[differenceCatch(lineType, data)]({
          type: lineType,
          ...options,
          data
        });
    }

    if (builtInTransformations[lineType.type]) {
      return data =>
        builtInTransformations[differenceCatch(lineType.type, data)]({
          ...lineType,
          ...options,
          data
        });
    }

    //otherwise assume a function
    return data => lineType({ ...options, data });
  }

  let xMin =
    xExtent && xExtent[0] !== undefined
      ? xExtent[0]
      : min(fullDataset.map(d => d[projectedX]));
  let xMax =
    xExtent && xExtent[1] !== undefined
      ? xExtent[1]
      : max(fullDataset.map(d => d[projectedX]));

  let yMin =
    yExtent && yExtent[0] !== undefined
      ? yExtent[0]
      : min(
          fullDataset.map(
            d =>
              d[projectedYBottom] === undefined
                ? d[projectedY]
                : Math.min(d[projectedYTop], d[projectedYBottom])
          )
        );
  let yMax =
    yExtent && yExtent[1] !== undefined
      ? yExtent[1]
      : max(
          fullDataset.map(
            d =>
              d[projectedYTop] === undefined
                ? d[projectedY]
                : Math.max(d[projectedYBottom], d[projectedYTop])
          )
        );

  let finalYExtent = [yMin, yMax];
  let finalXExtent = [xMin, xMax];

  if (invertX) {
    finalXExtent = [finalXExtent[1], finalXExtent[0]];
  }
  if (invertY) {
    finalYExtent = [finalYExtent[1], finalYExtent[0]];
  }

  if (
    areaType &&
    (areaType === "contour" || (areaType.type && areaType.type === "contour"))
  ) {
    projectedAreas = contouring({
      areaType,
      data: projectedAreas,
      projectedX,
      projectedY,
      finalXExtent,
      finalYExtent
    });
  } else if (
    typeof areaType === "function" ||
    (areaType && areaType.type && typeof areaType.type === "function")
  ) {
    const areaFunction = areaType.type || areaType;

    projectedAreas = areaFunction({
      xExtent: finalXExtent,
      yExtent: finalYExtent,
      projectedX,
      projectedY,
      fullDataset,
      projectedAreas
    });
  }

  return {
    xExtent: finalXExtent,
    yExtent: finalYExtent,
    projectedLines,
    projectedPoints,
    projectedAreas,
    fullDataset
  };
};
