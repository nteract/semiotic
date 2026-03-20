import { find } from "./find.js";
import { findCircuits } from "./networks/elementaryCircuits.js";
import {
  getNodeID,
  value,
  numberOfNonSelfLinkingCycles,
  linkTargetCenter,
  linkSourceCenter,
  nodeCenter,
} from "./nodeAttributes.js";
import { selfLinking } from "./linkAttributes.js";
import { left, right, center, justify } from "./align.js";
import {
  ascendingBreadth,
  ascendingTargetBreadth,
  ascendingSourceBreadth,
  sortSourceLinks,
  sortTargetLinks,
} from "./sortGraph.js";
import { addCircularPathData } from "./circularPath.js";
import { min, max, sum, mean, group, groups } from "d3-array";

function constant(x) {
  return function () {
    return x;
  };
}

function defaultId(d) {
  return d.index;
}

function defaultNodes(graph) {
  return graph.nodes;
}

function defaultLinks(graph) {
  return graph.links;
}

function createMap(arr, id) {
  var m = new Map();
  var nodeByIDGroup = group(arr, id);
  nodeByIDGroup.forEach(function (v, key) {
    m.set(key, v[0]);
  });
  return m;
}

function computeNodeLinks(graph, id) {
  graph.nodes.forEach(function (node, i) {
    node.index = i;
    node.sourceLinks = [];
    node.targetLinks = [];
  });

  var nodeByID = createMap(graph.nodes, id);

  graph.links.forEach(function (link, i) {
    link.index = i;
    var source = link.source;
    var target = link.target;
    if (typeof source !== "object") {
      source = link.source = find(nodeByID, source);
    }
    if (typeof target !== "object") {
      target = link.target = find(nodeByID, target);
    }
    source.sourceLinks.push(link);
    target.targetLinks.push(link);
  });
}

function identifyCircles(graph, sortNodes) {
  var circularLinkID = 0;

  if (sortNodes == null) {
    var adjList = [];
    for (var i = 0; i < graph.links.length; i++) {
      var link = graph.links[i];
      var source = link.source.index;
      var target = link.target.index;
      if (!adjList[source]) adjList[source] = [];
      if (!adjList[target]) adjList[target] = [];
      if (adjList[source].indexOf(target) === -1) adjList[source].push(target);
    }

    var cycles = findCircuits(adjList);
    cycles.sort(function (a, b) {
      return a.length - b.length;
    });

    var circularLinks = {};
    for (i = 0; i < cycles.length; i++) {
      var cycle = cycles[i];
      var last = cycle.slice(-2);
      if (!circularLinks[last[0]]) circularLinks[last[0]] = {};
      circularLinks[last[0]][last[1]] = true;
    }

    graph.links.forEach(function (link) {
      var target = link.target.index;
      var source = link.source.index;
      if (
        target === source ||
        (circularLinks[source] && circularLinks[source][target])
      ) {
        link.circular = true;
        link.circularLinkID = circularLinkID++;
      } else {
        link.circular = false;
      }
    });
  } else {
    graph.links.forEach(function (link) {
      if (sortNodes(link.source) < sortNodes(link.target)) {
        link.circular = false;
      } else {
        link.circular = true;
        link.circularLinkID = circularLinkID++;
      }
    });
  }
}

function selectCircularLinkTypes(graph, id) {
  var numberOfTops = 0;
  var numberOfBottoms = 0;

  graph.links.forEach(function (link) {
    if (link.circular) {
      if (link.source.circularLinkType || link.target.circularLinkType) {
        link.circularLinkType = link.source.circularLinkType
          ? link.source.circularLinkType
          : link.target.circularLinkType;
      } else {
        link.circularLinkType =
          numberOfTops < numberOfBottoms ? "top" : "bottom";
      }

      if (link.circularLinkType == "top") {
        numberOfTops++;
      } else {
        numberOfBottoms++;
      }

      graph.nodes.forEach(function (node) {
        if (
          getNodeID(node, id) == getNodeID(link.source, id) ||
          getNodeID(node, id) == getNodeID(link.target, id)
        ) {
          node.circularLinkType = link.circularLinkType;
        }
      });
    }
  });

  graph.links.forEach(function (link) {
    if (link.circular) {
      if (link.source.circularLinkType == link.target.circularLinkType) {
        link.circularLinkType = link.source.circularLinkType;
      }
      if (selfLinking(link, id)) {
        link.circularLinkType = link.source.circularLinkType;
      }
    }
  });
}

function computeNodeValues(graph) {
  graph.nodes.forEach(function (node) {
    node.partOfCycle = false;
    node.value = Math.max(
      sum(node.sourceLinks, value),
      sum(node.targetLinks, value)
    );
    node.sourceLinks.forEach(function (link) {
      if (link.circular) {
        node.partOfCycle = true;
        node.circularLinkType = link.circularLinkType;
      }
    });
    node.targetLinks.forEach(function (link) {
      if (link.circular) {
        node.partOfCycle = true;
        node.circularLinkType = link.circularLinkType;
      }
    });
  });
}

function computeNodeDepths(graph, sortNodes, align) {
  var nodes, next, x;

  if (sortNodes != null) {
    graph.nodes.sort(function (a, b) {
      return sortNodes(a) < sortNodes(b) ? -1 : 1;
    });

    var c = 0;
    var currentSortIndex = sortNodes(graph.nodes[0]);

    graph.nodes.forEach(function (node) {
      c = sortNodes(node) == currentSortIndex ? c : c + 1;
      currentSortIndex =
        sortNodes(node) == currentSortIndex
          ? currentSortIndex
          : sortNodes(node);
      node.column = c;
    });
  }

  for (
    nodes = graph.nodes, next = [], x = 0;
    nodes.length;
    ++x, nodes = next, next = []
  ) {
    nodes.forEach(function (node) {
      node.depth = x;
      node.sourceLinks.forEach(function (link) {
        if (next.indexOf(link.target) < 0 && !link.circular) {
          next.push(link.target);
        }
      });
    });
  }

  for (
    nodes = graph.nodes, next = [], x = 0;
    nodes.length;
    ++x, nodes = next, next = []
  ) {
    nodes.forEach(function (node) {
      node.height = x;
      node.targetLinks.forEach(function (link) {
        if (next.indexOf(link.source) < 0 && !link.circular) {
          next.push(link.source);
        }
      });
    });
  }

  graph.nodes.forEach(function (node) {
    node.column =
      sortNodes == null ? align(node, x) : node.column;
  });
}

function adjustSankeySize(graph, nodePadding, nodeWidth) {
  var columns = groups(graph.nodes, function (d) {
    return d.column;
  })
    .sort(function (a, b) {
      return a[0] - b[0];
    })
    .map(function (d) {
      return d[1];
    });

  graph.py = nodePadding;

  var ky = min(columns, function (nodes) {
    return (
      (graph.y1 - graph.y0 - (nodes.length - 1) * graph.py) /
      sum(nodes, function (d) {
        return d.value;
      })
    );
  });

  graph.ky = ky;

  graph.links.forEach(function (link) {
    link.width = link.value * graph.ky;
  });

  var maxColumn = max(graph.nodes, function (node) {
    return node.column;
  });

  if (maxColumn > 0) {
    graph.nodes.forEach(function (node) {
      node.x0 =
        graph.x0 +
        node.column * ((graph.x1 - graph.x0 - nodeWidth) / maxColumn);
      node.x1 = node.x0 + nodeWidth;
    });
  } else {
    graph.nodes.forEach(function (node) {
      node.x0 = graph.x0;
      node.x1 = node.x0 + nodeWidth;
    });
  }
}

// Compute the weighted barycenter of a node's connections.
// For nodes in the first column (no target links), use source link targets.
// For other nodes, use target link sources. Returns NaN if no connections.
function barycenter(node) {
  var totalWeight = 0;
  var weightedSum = 0;

  // Pull toward source positions (upstream connections)
  node.targetLinks.forEach(function (link) {
    if (!link.circular) {
      var w = link.value || 1;
      weightedSum += nodeCenter(link.source) * w;
      totalWeight += w;
    }
  });

  // Pull toward target positions (downstream connections)
  node.sourceLinks.forEach(function (link) {
    if (!link.circular) {
      var w = link.value || 1;
      weightedSum += nodeCenter(link.target) * w;
      totalWeight += w;
    }
  });

  return totalWeight > 0 ? weightedSum / totalWeight : NaN;
}

function computeNodeBreadths(graph, nodeSort, id) {
  var columns = groups(graph.nodes, function (d) {
    return d.column;
  })
    .sort(function (a, b) {
      return a[0] - b[0];
    })
    .map(function (d) {
      return d[1];
    });

  columns.forEach(function (nodes, columnIndex) {
    var nodesLength = nodes.length;

    // Use barycenter ordering to reduce crossings when no custom sort is given.
    // For the first column, fall back to the original heuristic since there
    // are no upstream positions yet. For subsequent columns, sort by the
    // weighted average y-position of connected nodes (barycenter heuristic).
    if (nodeSort) {
      nodes.sort(nodeSort);
    } else if (columnIndex > 0) {
      // Barycenter sort: order nodes by the average y of their connections
      // to minimise link crossings. Nodes without connections keep their
      // relative order via a stable index fallback.
      var baryCache = new Map();
      nodes.forEach(function (n, idx) {
        var bc = barycenter(n);
        baryCache.set(n, { bc: bc, idx: idx });
      });
      nodes.sort(function (a, b) {
        var infoA = baryCache.get(a);
        var infoB = baryCache.get(b);
        var bcA = infoA.bc;
        var bcB = infoB.bc;
        // Circular-link nodes: keep top-cycle nodes above bottom-cycle nodes
        if (a.circularLinkType !== b.circularLinkType) {
          if (a.circularLinkType == "top" && b.circularLinkType == "bottom") return -1;
          if (a.circularLinkType == "bottom" && b.circularLinkType == "top") return 1;
          if (a.circularLinkType == "top") return -1;
          if (b.circularLinkType == "top") return 1;
          if (a.circularLinkType == "bottom") return 1;
          if (b.circularLinkType == "bottom") return -1;
        }
        if (!isNaN(bcA) && !isNaN(bcB)) return bcA - bcB;
        if (!isNaN(bcA)) return -1;
        if (!isNaN(bcB)) return 1;
        return infoA.idx - infoB.idx;
      });
    } else {
      // First column: use the original circular-link-aware heuristic
      var optimizedSort = function (a, b) {
        if (a.circularLinkType == b.circularLinkType) {
          return (
            numberOfNonSelfLinkingCycles(b, id) -
            numberOfNonSelfLinkingCycles(a, id)
          );
        } else if (
          a.circularLinkType == "top" &&
          b.circularLinkType == "bottom"
        ) {
          return -1;
        } else if (a.circularLinkType == "top" && b.partOfCycle == false) {
          return -1;
        } else if (a.partOfCycle == false && b.circularLinkType == "bottom") {
          return -1;
        }
        return 0;
      };
      nodes.sort(optimizedSort);
    }

    nodes.forEach(function (node, i) {
      if (node.depth == columns.length - 1 && nodesLength == 1) {
        node.y0 = graph.y1 / 2 - node.value * graph.ky;
        node.y1 = node.y0 + node.value * graph.ky;
      } else if (node.depth == 0 && nodesLength == 1) {
        node.y0 = graph.y1 / 2 - node.value * graph.ky;
        node.y1 = node.y0 + node.value * graph.ky;
      } else if (node.partOfCycle) {
        if (numberOfNonSelfLinkingCycles(node, id) == 0) {
          node.y0 = graph.y1 / 2 + i;
          node.y1 = node.y0 + node.value * graph.ky;
        } else if (node.circularLinkType == "top") {
          node.y0 = graph.y0 + i;
          node.y1 = node.y0 + node.value * graph.ky;
        } else {
          node.y0 = graph.y1 - node.value * graph.ky - i;
          node.y1 = node.y0 + node.value * graph.ky;
        }
      } else {
        if (graph.y0 == 0 || graph.y1 == 0) {
          node.y0 = ((graph.y1 - graph.y0) / nodesLength) * i;
          node.y1 = node.y0 + node.value * graph.ky;
        } else {
          node.y0 = (graph.y1 - graph.y0) / 2 - nodesLength / 2 + i;
          node.y1 = node.y0 + node.value * graph.ky;
        }
      }
    });
  });
}

function resolveCollisionsAndRelax(
  graph,
  nodeSort,
  id,
  nodePadding,
  minNodePadding,
  iterations
) {
  var columns = groups(graph.nodes, function (d) {
    return d.column;
  })
    .sort(function (a, b) {
      return a[0] - b[0];
    })
    .map(function (d) {
      return d[1];
    });

  resolveCollisions();

  for (var alpha = 1, n = iterations; n > 0; --n) {
    relaxLeftAndRight((alpha *= 0.99), id);
    resolveCollisions();
  }

  function relaxLeftAndRight(alpha, id) {
    var columnsLength = columns.length;

    columns.forEach(function (nodes) {
      var n = nodes.length;
      var depth = nodes[0].depth;

      nodes.forEach(function (node) {
        var nodeHeight;
        if (node.sourceLinks.length || node.targetLinks.length) {
          if (
            node.partOfCycle &&
            numberOfNonSelfLinkingCycles(node, id) > 0
          ) {
            // Cycle nodes participate in relaxation but with reduced strength
            // to prevent destabilization while still centering on connections
            var avgT = mean(node.sourceLinks, linkTargetCenter);
            var avgS = mean(node.targetLinks, linkSourceCenter);
            var avgC = avgT && avgS ? (avgT + avgS) / 2 : (avgT || avgS);
            if (avgC) {
              var dyC = (avgC - nodeCenter(node)) * alpha * 0.3;
              node.y0 += dyC;
              node.y1 += dyC;
            }
          } else if (depth == 0 && n == 1) {
            nodeHeight = node.y1 - node.y0;
            node.y0 = graph.y1 / 2 - nodeHeight / 2;
            node.y1 = graph.y1 / 2 + nodeHeight / 2;
          } else if (depth == columnsLength - 1 && n == 1) {
            nodeHeight = node.y1 - node.y0;
            node.y0 = graph.y1 / 2 - nodeHeight / 2;
            node.y1 = graph.y1 / 2 + nodeHeight / 2;
          } else if (
            node.targetLinks.length == 1 &&
            node.targetLinks[0].source.sourceLinks.length == 1
          ) {
            nodeHeight = node.y1 - node.y0;
            node.y0 = node.targetLinks[0].source.y0;
            node.y1 = node.y0 + nodeHeight;
          } else {
            var avg = 0;
            var avgTargetY = mean(node.sourceLinks, linkTargetCenter);
            var avgSourceY = mean(node.targetLinks, linkSourceCenter);

            if (avgTargetY && avgSourceY) {
              avg = (avgTargetY + avgSourceY) / 2;
            } else {
              avg = avgTargetY || avgSourceY;
            }

            var dy = (avg - nodeCenter(node)) * alpha;
            node.y0 += dy;
            node.y1 += dy;
          }
        }
      });
    });
  }

  function resolveCollisions() {
    columns.forEach(function (nodes) {
      var node,
        dy,
        y = graph.y0,
        n = nodes.length,
        i;

      if (nodeSort) {
        nodes.sort(nodeSort);
      } else {
        nodes.sort(ascendingBreadth);
      }

      for (i = 0; i < n; ++i) {
        node = nodes[i];
        dy = y - node.y0;
        if (dy > 0) {
          node.y0 += dy;
          node.y1 += dy;
        }
        y = node.y1 + nodePadding;
      }

      dy = y - nodePadding - graph.y1;
      if (dy > 0) {
        y = node.y0 -= dy;
        node.y1 -= dy;

        for (i = n - 2; i >= 0; --i) {
          node = nodes[i];
          dy = node.y1 + minNodePadding - y;
          if (dy > 0) {
            node.y0 -= dy;
            node.y1 -= dy;
          }
          y = node.y0;
        }
      }
    });
  }
}

function computeLinkBreadths(graph) {
  graph.nodes.forEach(function (node) {
    node.sourceLinks.sort(ascendingTargetBreadth);
    node.targetLinks.sort(ascendingSourceBreadth);
  });
  graph.nodes.forEach(function (node) {
    var y0 = node.y0;
    var y1 = y0;
    var y0cycle = node.y1;
    var y1cycle = y0cycle;

    node.sourceLinks.forEach(function (link) {
      if (link.circular) {
        link.y0 = y0cycle - link.width / 2;
        y0cycle = y0cycle - link.width;
      } else {
        link.y0 = y0 + link.width / 2;
        y0 += link.width;
      }
    });
    node.targetLinks.forEach(function (link) {
      if (link.circular) {
        link.y1 = y1cycle - link.width / 2;
        y1cycle = y1cycle - link.width;
      } else {
        link.y1 = y1 + link.width / 2;
        y1 += link.width;
      }
    });
  });
}

function adjustGraphExtents(graph, nodeWidth) {
  // No-op: disabled while researching better cycle layout approaches.
  // The original implementation shrank graph bounds to make room for cycles,
  // which pushed nodes off-screen. Clamping the extents was too aggressive.
  // See ATTRIBUTION.md for context on the research direction.
}

function fillHeight(graph) {
  var nodes = graph.nodes;
  var links = graph.links;

  var top = false;
  var bottom = false;

  links.forEach(function (link) {
    if (link.circularLinkType == "top") {
      top = true;
    } else if (link.circularLinkType == "bottom") {
      bottom = true;
    }
  });

  if (top == false || bottom == false) {
    var minY0 = min(nodes, function (node) {
      return node.y0;
    });
    var maxY1 = max(nodes, function (node) {
      return node.y1;
    });

    var currentHeight = maxY1 - minY0;
    var chartHeight = graph.y1 - graph.y0;
    var ratio = chartHeight / currentHeight;

    function moveScale(val) {
      return (
        ((val - minY0) / (maxY1 - minY0)) * (graph.y1 - graph.y0) + graph.y0
      );
    }

    if (ratio < 1) {
      nodes.forEach(function (node) {
        node.y0 = moveScale(node.y0);
        node.y1 = moveScale(node.y1);
      });

      links.forEach(function (link) {
        link.y0 = moveScale(link.y0);
        link.y1 = moveScale(link.y1);
        link.width = link.width * ratio;
      });
    } else {
      nodes.forEach(function (node) {
        var nodeHeight = node.y1 - node.y0;
        var dy = moveScale(node.y0) - node.y0;
        node.y0 = moveScale(node.y0);
        node.y1 = node.y0 + nodeHeight;
        node.sourceLinks.forEach(function (link) {
          link.y0 = link.y0 + dy;
        });
        node.targetLinks.forEach(function (link) {
          link.y1 = link.y1 + dy;
        });
      });
    }
  }
}

export function sankeyCircular() {
  var x0 = 0,
    y0 = 0,
    x1 = 1,
    y1 = 1;
  var dx = 24;
  var py = 8;
  var pyRatio = null;
  var id = defaultId;
  var align = justify;
  var nodeSort = undefined;
  var iterations = 32;
  var circularGap = 2;
  var baseRadius = 10;
  var verticalMargin = 8;
  var getNodes = defaultNodes;
  var getLinks = defaultLinks;

  function sankey() {
    var graph = {
      nodes: getNodes.apply(null, arguments),
      links: getLinks.apply(null, arguments),
    };
    compute(graph);
    return graph;
  }

  function compute(graph) {
    graph.x0 = x0;
    graph.y0 = y0;
    graph.x1 = x1;
    graph.y1 = y1;
    graph.py = 0;

    computeNodeLinks(graph, id);
    identifyCircles(graph, nodeSort);
    selectCircularLinkTypes(graph, id);
    computeNodeValues(graph);
    computeNodeDepths(graph, nodeSort, align);

    var nodePadding = py;
    if (pyRatio !== null) {
      var columns = groups(graph.nodes, function (d) {
        return d.column;
      })
        .sort(function (a, b) {
          return a[0] - b[0];
        })
        .map(function (d) {
          return d[1];
        });
      var maxNodesInColumn = max(columns, function (c) {
        return c.length;
      });
      if (maxNodesInColumn > 1) {
        nodePadding = Math.max(
          1,
          ((y1 - y0) * pyRatio) / (maxNodesInColumn - 1)
        );
      }
    }

    adjustSankeySize(graph, nodePadding, dx);

    computeNodeBreadths(graph, nodeSort, id);
    resolveCollisionsAndRelax(
      graph,
      nodeSort,
      id,
      nodePadding,
      nodePadding,
      iterations
    );
    computeLinkBreadths(graph);

    addCircularPathData(graph, id, circularGap, baseRadius, verticalMargin);
    adjustGraphExtents(graph, dx);

    // Second pass for better positioning
    computeNodeBreadths(graph, nodeSort, id);
    resolveCollisionsAndRelax(
      graph,
      nodeSort,
      id,
      nodePadding,
      nodePadding,
      iterations
    );
    computeLinkBreadths(graph);

    addCircularPathData(graph, id, circularGap, baseRadius, verticalMargin);

    sortSourceLinks(graph, id);
    sortTargetLinks(graph, id);
    fillHeight(graph);

    addCircularPathData(graph, id, circularGap, baseRadius, verticalMargin);
  }

  sankey.update = function (graph) {
    computeLinkBreadths(graph);
    addCircularPathData(graph, id, circularGap, baseRadius, verticalMargin);
    return graph;
  };

  sankey.nodeWidth = function (_) {
    return arguments.length ? ((dx = +_), sankey) : dx;
  };

  sankey.nodePadding = function (_) {
    return arguments.length ? ((py = +_), sankey) : py;
  };

  sankey.nodePaddingRatio = function (_) {
    return arguments.length ? ((pyRatio = +_), sankey) : pyRatio;
  };

  sankey.nodes = function (_) {
    return arguments.length
      ? ((getNodes = typeof _ === "function" ? _ : constant(_)), sankey)
      : getNodes;
  };

  sankey.links = function (_) {
    return arguments.length
      ? ((getLinks = typeof _ === "function" ? _ : constant(_)), sankey)
      : getLinks;
  };

  sankey.nodeId = function (_) {
    return arguments.length
      ? ((id = typeof _ === "function" ? _ : constant(_)), sankey)
      : id;
  };

  sankey.nodeAlign = function (_) {
    return arguments.length
      ? ((align = typeof _ === "function" ? _ : constant(_)), sankey)
      : align;
  };

  sankey.nodeSort = function (_) {
    return arguments.length ? ((nodeSort = _), sankey) : nodeSort;
  };

  sankey.iterations = function (_) {
    return arguments.length ? ((iterations = +_), sankey) : iterations;
  };

  sankey.circularLinkGap = function (_) {
    return arguments.length ? ((circularGap = +_), sankey) : circularGap;
  };

  sankey.extent = function (_) {
    return arguments.length
      ? ((x0 = +_[0][0]),
        (y0 = +_[0][1]),
        (x1 = +_[1][0]),
        (y1 = +_[1][1]),
        sankey)
      : [
          [x0, y0],
          [x1, y1],
        ];
  };

  sankey.size = function (_) {
    return arguments.length
      ? ((x0 = y0 = 0), (x1 = +_[0]), (y1 = +_[1]), sankey)
      : [x1 - x0, y1 - y0];
  };

  return sankey;
}

export {
  left as sankeyLeft,
  right as sankeyRight,
  center as sankeyCenter,
  justify as sankeyJustify,
};
