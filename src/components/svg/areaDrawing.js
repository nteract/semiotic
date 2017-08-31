import { contourDensity } from "d3-contour";
import { scaleLinear } from "d3-scale";
import alphaShape from "alpha-complex";
import polylabel from "@mapbox/polylabel";

export function contouring({ areaType, data, finalXExtent, finalYExtent }) {
  let projectedAreas = [];
  if (!areaType.type) {
    areaType = { type: areaType };
  }

  const {
    resolution = 500,
    thresholds = 10,
    bandwidth = 20,
    neighborhood
  } = areaType;

  const xScale = scaleLinear()
    .domain(finalXExtent)
    .rangeRound([0, resolution])
    .nice();
  const yScale = scaleLinear()
    .domain(finalYExtent)
    .rangeRound([resolution, 0])
    .nice();

  data.forEach(contourData => {
    let contourProjectedAreas = contourDensity()
      .size([resolution, resolution])
      .x(d => xScale(d[0]))
      .y(d => yScale(d[1]))
      .thresholds(thresholds)
      .bandwidth(bandwidth)(contourData._xyfCoordinates);

    if (neighborhood) {
      contourProjectedAreas = [contourProjectedAreas[0]];
    }

    contourProjectedAreas.forEach(area => {
      area.parentArea = contourData;
      area.bounds = [];
      area.coordinates.forEach(poly => {
        poly.forEach((subpoly, i) => {
          poly[i] = subpoly.map(coordpair => {
            coordpair = [
              xScale.invert(coordpair[0]),
              yScale.invert(coordpair[1])
            ];
            return coordpair;
          });
          //Only push bounds for the main poly, not its interior rings, otherwise you end up labeling interior cutouts
          if (i === 0) {
            area.bounds.push(shapeBounds(poly[i]));
          }
        });
      });
    });
    projectedAreas = [...projectedAreas, ...contourProjectedAreas];
  });

  return projectedAreas;
}

export function alphaShaping({ areaType, data }) {
  let projectedAreas = [];
  if (!areaType.type) {
    areaType = { type: areaType };
  }

  const { alpha = 0.001 } = areaType;

  data.forEach(alphadata => {
    const arrayOfData = alphadata._xyfCoordinates;
    const alphaShapes = alphaShape(alpha, arrayOfData).map(shape =>
      shape.map(d => arrayOfData[d])
    );

    boundary(alphaShapes).forEach(as => {
      projectedAreas.push(
        Object.assign(
          { id: alphadata.id, _xyfCoordinates: as },
          { bounds: shapeBounds(as) }
        )
      );
    });
  });

  return projectedAreas;
}

function shapeBounds(coordinates) {
  let left = [Infinity, 0];
  let right = [-Infinity, 0];
  let top = [0, Infinity];
  let bottom = [0, -Infinity];
  coordinates.forEach(d => {
    left = d[0] < left[0] ? d : left;
    right = d[0] > right[0] ? d : right;
    bottom = d[1] > bottom[1] ? d : bottom;
    top = d[1] < top[1] ? d : top;
  });

  return { center: polylabel([coordinates]), top, left, right, bottom };
}

//FROM JASON DAVIES D3 ALPHA SHAPE EXAMPLE http://bl.ocks.org/jasondavies/1554783
function boundary(mesh) {
  const counts = {},
    edges = {},
    result = [];
  let r;
  // Traverse the edges of all triangles and discard any edges that appear twice.
  mesh.forEach(triangle => {
    for (let i = 0; i < 3; i++) {
      const edge = [triangle[i], triangle[(i + 1) % 3]]
        .sort(ascendingCoords)
        .map(String);
      (edges[edge[0]] = edges[edge[0]] || []).push(edge[1]);
      (edges[edge[1]] = edges[edge[1]] || []).push(edge[0]);
      const k = edge.join(":");
      if (counts[k]) delete counts[k];
      else counts[k] = 1;
    }
  });

  while (1) {
    // Pick an arbitrary starting point on a boundary.
    const k = Object.keys(counts).find(() => true) || null;
    if (k == null) break;
    result.push((r = k.split(":").map(splitFn)));
    delete counts[k];
    let q = r[1];
    while (q[0] !== r[0][0] || q[1] !== r[0][1]) {
      let p = q,
        qs = edges[p.join(",")],
        n = qs.length;
      for (let i = 0; i < n; i++) {
        q = qs[i].split(",").map(Number);
        let edge = [p, q].sort(ascendingCoords).join(":");
        if (counts[edge]) {
          delete counts[edge];
          r.push(q);
          break;
        }
      }
    }
  }
  return result;
}

function ascendingCoords(a, b) {
  return a[0] === b[0] ? b[1] - a[1] : b[0] - a[0];
}

function splitFn(d) {
  return d.split(",").map(Number);
}
