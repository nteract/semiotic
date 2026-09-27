import { min } from "d3-array";

import { selfLinking } from "./linkAttributes.js";
import { ColumnOccupancy } from "./columnOccupancy";

import {
  sortLinkSourceYAscending,
  sortLinkSourceYDescending,
  sortLinkTargetYAscending,
  sortLinkTargetYDescending,
  sortLinkColumnAscending,
} from "./sortGraph.js";

function horizontalLink(link) {
  var sx = link.source.x1;
  var sy = link.y0;
  var tx = link.target.x0;
  var ty = link.y1;
  var mx = (sx + tx) / 2;
  return "M" + sx + "," + sy + "C" + mx + "," + sy + " " + mx + "," + ty + " " + tx + "," + ty;
}

export function addCircularPathData(
  inputGraph,
  id,
  circularLinkGap,
  baseRadius,
  verticalMargin
) {
  let graph = inputGraph;

  var buffer = 5;

  // Circular flows use the same value-to-width scale as forward flows.
  // The frame scales the complete layout uniformly to fit its viewport.
  graph.links.forEach(function (link) {
    if (link.circular) {
      link._circularWidth = link.width;
      link._circularStub = false;
    }
  });

  var minY = min(graph.links, function (link) {
    return link.source.y0;
  });

  // create object for circular Path Data
  graph.links.forEach(function (link) {
    if (link.circular) {
      link.circularPathData = {};
    }
  });

  var circular = graph.links.filter(function (link) { return link.circular; });
  var sourceCounts = new Map();
  var targetCounts = new Map();
  circular.forEach(function (link) {
    sourceCounts.set(link.source, (sourceCounts.get(link.source) || 0) + 1);
    targetCounts.set(link.target, (targetCounts.get(link.target) || 0) + 1);
  });
  var isolatedSelfLinks = new Set(circular.filter(function (link) {
    return selfLinking(link, id) && sourceCounts.get(link.source) === 1 && targetCounts.get(link.target) === 1;
  }));
  ["top", "bottom"].forEach(function (type) {
    var links = circular.filter(function (link) { return link.circularLinkType === type; });
    calcVerticalBuffer(links.slice(), isolatedSelfLinks, circularLinkGap);
    // Group and sort once per endpoint column, then accumulate radii once.
    ["source", "target"].forEach(function (endpoint) {
      var columns = new Map();
      links.forEach(function (link) {
        var column = link[endpoint].column;
        if (!columns.has(column)) columns.set(column, []);
        columns.get(column).push(link);
      });
      columns.forEach(function (group) {
        group.sort(endpoint === "source"
          ? (type === "bottom" ? sortLinkSourceYDescending : sortLinkSourceYAscending)
          : (type === "bottom" ? sortLinkTargetYDescending : sortLinkTargetYAscending));
        var offset = 0;
        var side = endpoint === "source" ? "right" : "left";
        group.forEach(function (link, i) {
          link.circularPathData[side + "SmallArcRadius"] = baseRadius + link._circularWidth / 2 + offset;
          link.circularPathData[side + "LargeArcRadius"] = baseRadius + link._circularWidth / 2 + i * circularLinkGap + offset;
          offset += link._circularWidth;
        });
      });
    });
  });

  // add the base data for each link
  graph.links.forEach(function (link) {
    if (link.circular) {
      link.circularPathData.arcRadius = link._circularWidth + baseRadius;
      link.circularPathData.rightNodeBuffer = buffer;
      link.circularPathData.leftNodeBuffer = buffer;
      link.circularPathData.sourceWidth = link.source.x1 - link.source.x0;
      link.circularPathData.sourceX =
        link.source.x0 + link.circularPathData.sourceWidth;
      link.circularPathData.targetX = link.target.x0;
      link.circularPathData.sourceY = link.y0;
      link.circularPathData.targetY = link.y1;

      // for self linking paths, and that the only circular link in/out of that node
      if (isolatedSelfLinks.has(link)) {
        link.circularPathData.rightSmallArcRadius = baseRadius + link._circularWidth / 2;
        link.circularPathData.rightLargeArcRadius = baseRadius + link._circularWidth / 2;
        link.circularPathData.leftSmallArcRadius = baseRadius + link._circularWidth / 2;
        link.circularPathData.leftLargeArcRadius = baseRadius + link._circularWidth / 2;

        if (link.circularLinkType == "bottom") {
          link.circularPathData.verticalFullExtent =
            link.source.y1 +
            verticalMargin +
            link.circularPathData.verticalBuffer;
          link.circularPathData.verticalRightInnerExtent =
            link.circularPathData.verticalFullExtent -
            link.circularPathData.rightLargeArcRadius;
          link.circularPathData.verticalLeftInnerExtent =
            link.circularPathData.verticalFullExtent -
            link.circularPathData.leftLargeArcRadius;
        } else {
          // top links
          link.circularPathData.verticalFullExtent =
            link.source.y0 -
            verticalMargin -
            link.circularPathData.verticalBuffer;
          link.circularPathData.verticalRightInnerExtent =
            link.circularPathData.verticalFullExtent +
            link.circularPathData.rightLargeArcRadius;
          link.circularPathData.verticalLeftInnerExtent =
            link.circularPathData.verticalFullExtent +
            link.circularPathData.leftLargeArcRadius;
        }
      } else {
        // bottom links
        if (link.circularLinkType == "bottom") {
          link.circularPathData.verticalFullExtent =
            Math.max(graph.y1, link.source.y1, link.target.y1) +
            verticalMargin +
            link.circularPathData.verticalBuffer;
          link.circularPathData.verticalRightInnerExtent =
            link.circularPathData.verticalFullExtent -
            link.circularPathData.rightLargeArcRadius;
          link.circularPathData.verticalLeftInnerExtent =
            link.circularPathData.verticalFullExtent -
            link.circularPathData.leftLargeArcRadius;
        } else {
          // top links
          link.circularPathData.verticalFullExtent =
            minY - verticalMargin - link.circularPathData.verticalBuffer;
          link.circularPathData.verticalRightInnerExtent =
            link.circularPathData.verticalFullExtent +
            link.circularPathData.rightLargeArcRadius;
          link.circularPathData.verticalLeftInnerExtent =
            link.circularPathData.verticalFullExtent +
            link.circularPathData.leftLargeArcRadius;
        }
      }

      // all links
      link.circularPathData.rightInnerExtent =
        link.circularPathData.sourceX + link.circularPathData.rightNodeBuffer;
      link.circularPathData.leftInnerExtent =
        link.circularPathData.targetX - link.circularPathData.leftNodeBuffer;
      link.circularPathData.rightFullExtent =
        link.circularPathData.sourceX +
        link.circularPathData.rightLargeArcRadius +
        link.circularPathData.rightNodeBuffer;
      link.circularPathData.leftFullExtent =
        link.circularPathData.targetX -
        link.circularPathData.leftLargeArcRadius -
        link.circularPathData.leftNodeBuffer;
    }

    if (link.circular) {
      link.path = createCircularPathString(link);
    } else {
      link.path = horizontalLink(link);
    }
  });

  return graph;
}

// creates vertical buffer values per set of top/bottom links
function calcVerticalBuffer(links, isolatedSelfLinks, circularLinkGap) {
  if (links.length === 0) return;
  links.sort(sortLinkColumnAscending);
  var columns = Array.from(new Set(links.flatMap(function (link) {
    return [link.source.column, link.target.column];
  }))).sort(function (a, b) { return a - b; });
  var index = new Map(columns.map(function (column, i) { return [column, i]; }));
  var occupancy = new ColumnOccupancy(columns.length);
  links.forEach(function (link) {
    var source = index.get(link.source.column);
    var target = index.get(link.target.column);
    var lo = Math.min(source, target);
    var hi = Math.max(source, target);
    var buffer = isolatedSelfLinks.has(link) ? 0 : occupancy.query(lo, hi);
    link.circularPathData.verticalBuffer = buffer + link._circularWidth / 2;
    occupancy.reserve(lo, hi, buffer + link._circularWidth + circularLinkGap);
  });
}

// create a d path using the addCircularPathData
function createCircularPathString(link) {
  var pathString = "";

  if (link.circularLinkType == "top") {
    pathString =
      // start at the left of the source node
      "M" +
      link.circularPathData.sourceX +
      " " +
      link.circularPathData.sourceY +
      " " +
      // line left to buffer point
      "L" +
      link.circularPathData.rightInnerExtent +
      " " +
      link.circularPathData.sourceY +
      " " +
      // Arc around: Centre of arc X and  //Centre of arc Y
      "A" +
      link.circularPathData.rightLargeArcRadius +
      " " +
      link.circularPathData.rightSmallArcRadius +
      " 0 0 0 " +
      // End of arc X //End of arc Y
      link.circularPathData.rightFullExtent +
      " " +
      (link.circularPathData.sourceY -
        link.circularPathData.rightSmallArcRadius) +
      " " + // End of arc X
      // line up to buffer point
      "L" +
      link.circularPathData.rightFullExtent +
      " " +
      link.circularPathData.verticalRightInnerExtent +
      " " +
      // Arc around: Centre of arc X and  //Centre of arc Y
      "A" +
      link.circularPathData.rightLargeArcRadius +
      " " +
      link.circularPathData.rightLargeArcRadius +
      " 0 0 0 " +
      // End of arc X //End of arc Y
      link.circularPathData.rightInnerExtent +
      " " +
      link.circularPathData.verticalFullExtent +
      " " + // End of arc X
      // line right to buffer point
      "L" +
      link.circularPathData.leftInnerExtent +
      " " +
      link.circularPathData.verticalFullExtent +
      " " +
      // Arc around: Centre of arc X and  //Centre of arc Y
      "A" +
      link.circularPathData.leftLargeArcRadius +
      " " +
      link.circularPathData.leftLargeArcRadius +
      " 0 0 0 " +
      // End of arc X //End of arc Y
      link.circularPathData.leftFullExtent +
      " " +
      link.circularPathData.verticalLeftInnerExtent +
      " " + // End of arc X
      // line down
      "L" +
      link.circularPathData.leftFullExtent +
      " " +
      (link.circularPathData.targetY -
        link.circularPathData.leftSmallArcRadius) +
      " " +
      // Arc around: Centre of arc X and  //Centre of arc Y
      "A" +
      link.circularPathData.leftLargeArcRadius +
      " " +
      link.circularPathData.leftSmallArcRadius +
      " 0 0 0 " +
      // End of arc X //End of arc Y
      link.circularPathData.leftInnerExtent +
      " " +
      link.circularPathData.targetY +
      " " + // End of arc X
      // line to end
      "L" +
      link.circularPathData.targetX +
      " " +
      link.circularPathData.targetY;
  } else {
    // bottom path
    pathString =
      // start at the left of the source node
      "M" +
      link.circularPathData.sourceX +
      " " +
      link.circularPathData.sourceY +
      " " +
      // line left to buffer point
      "L" +
      link.circularPathData.rightInnerExtent +
      " " +
      link.circularPathData.sourceY +
      " " +
      // Arc around: Centre of arc X and  //Centre of arc Y
      "A" +
      link.circularPathData.rightLargeArcRadius +
      " " +
      link.circularPathData.rightSmallArcRadius +
      " 0 0 1 " +
      // End of arc X //End of arc Y
      link.circularPathData.rightFullExtent +
      " " +
      (link.circularPathData.sourceY +
        link.circularPathData.rightSmallArcRadius) +
      " " + // End of arc X
      // line down to buffer point
      "L" +
      link.circularPathData.rightFullExtent +
      " " +
      link.circularPathData.verticalRightInnerExtent +
      " " +
      // Arc around: Centre of arc X and  //Centre of arc Y
      "A" +
      link.circularPathData.rightLargeArcRadius +
      " " +
      link.circularPathData.rightLargeArcRadius +
      " 0 0 1 " +
      // End of arc X //End of arc Y
      link.circularPathData.rightInnerExtent +
      " " +
      link.circularPathData.verticalFullExtent +
      " " + // End of arc X
      // line right to buffer point
      "L" +
      link.circularPathData.leftInnerExtent +
      " " +
      link.circularPathData.verticalFullExtent +
      " " +
      // Arc around: Centre of arc X and  //Centre of arc Y
      "A" +
      link.circularPathData.leftLargeArcRadius +
      " " +
      link.circularPathData.leftLargeArcRadius +
      " 0 0 1 " +
      // End of arc X //End of arc Y
      link.circularPathData.leftFullExtent +
      " " +
      link.circularPathData.verticalLeftInnerExtent +
      " " + // End of arc X
      // line up
      "L" +
      link.circularPathData.leftFullExtent +
      " " +
      (link.circularPathData.targetY +
        link.circularPathData.leftSmallArcRadius) +
      " " +
      // Arc around: Centre of arc X and  //Centre of arc Y
      "A" +
      link.circularPathData.leftLargeArcRadius +
      " " +
      link.circularPathData.leftSmallArcRadius +
      " 0 0 1 " +
      // End of arc X //End of arc Y
      link.circularPathData.leftInnerExtent +
      " " +
      link.circularPathData.targetY +
      " " + // End of arc X
      // line to end
      "L" +
      link.circularPathData.targetX +
      " " +
      link.circularPathData.targetY;
  }

  return pathString;
}
