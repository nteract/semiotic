//var tarjan = require('strongly-connected-components');

function stronglyConnectedComponents(adjList) {
  var numVertices = adjList.length;
  var index = new Array(numVertices);
  var lowValue = new Array(numVertices);
  var active = new Array(numVertices);
  var child = new Array(numVertices);
  var scc = new Array(numVertices);
  var sccLinks = new Array(numVertices);

  //Initialize tables
  for (var i = 0; i < numVertices; ++i) {
    index[i] = -1;
    lowValue[i] = 0;
    active[i] = false;
    child[i] = 0;
    scc[i] = -1;
    sccLinks[i] = [];
  }

  // The strongConnect function
  var count = 0;
  var components = [];
  var sccAdjList = [];

  function strongConnect(v) {
    // To avoid running out of stack space, this emulates the recursive behaviour of the normal algorithm, effectively using T as the call stack.
    var S = [v],
      T = [v];
    index[v] = lowValue[v] = count;
    active[v] = true;
    count += 1;
    while (T.length > 0) {
      v = T[T.length - 1];
      var e = adjList[v];
      if (child[v] < e.length) {
        // If we're not done iterating over the children, first try finishing that.
        for (var i = child[v]; i < e.length; ++i) {
          // Start where we left off.
          var u = e[i];
          if (index[u] < 0) {
            index[u] = lowValue[u] = count;
            active[u] = true;
            count += 1;
            S.push(u);
            T.push(u);
            break; // First recurse, then continue here (with the same child!).
            // There is a slight change to Tarjan's algorithm here.
            // Normally, after having recursed, we set lowValue like we do for an active child (although some variants of the algorithm do it slightly differently).
            // Here, we only do so if the child we recursed on is still active.
            // The reasoning is that if it is no longer active, it must have had a lowValue equal to its own index, which means that it is necessarily higher than our lowValue.
          } else if (active[u]) {
            lowValue[v] = Math.min(lowValue[v], lowValue[u]) | 0;
          }
          if (scc[u] >= 0) {
            // Node v is not yet assigned an scc, but once it is that scc can apparently reach scc[u].
            sccLinks[v].push(scc[u]);
          }
        }
        child[v] = i; // Remember where we left off.
      } else {
        // If we're done iterating over the children, check whether we have an scc.
        if (lowValue[v] === index[v]) {
          // TODO: It /might/ be true that T is always a prefix of S (at this point!!!), and if so, this could be used here.
          var component = [];
          var links = [],
            linkCount = 0;
          for (var i = S.length - 1; i >= 0; --i) {
            var w = S[i];
            active[w] = false;
            component.push(w);
            links.push(sccLinks[w]);
            linkCount += sccLinks[w].length;
            scc[w] = components.length;
            if (w === v) {
              S.length = i;
              break;
            }
          }
          components.push(component);
          var allLinks = new Array(linkCount);
          for (var i = 0; i < links.length; i++) {
            for (var j = 0; j < links[i].length; j++) {
              allLinks[--linkCount] = links[i][j];
            }
          }
          sccAdjList.push(allLinks);
        }
        T.pop(); // Now we're finished exploring this particular node (normally corresponds to the return statement)
      }
    }
  }

  //Run strong connect starting from each vertex
  for (var i = 0; i < numVertices; ++i) {
    if (index[i] < 0) {
      strongConnect(i);
    }
  }

  // Compact sccAdjList
  var newE;
  for (var i = 0; i < sccAdjList.length; i++) {
    var e = sccAdjList[i];
    if (e.length === 0) continue;
    e.sort(function (a, b) {
      return a - b;
    });
    newE = [e[0]];
    for (var j = 1; j < e.length; j++) {
      if (e[j] !== e[j - 1]) {
        newE.push(e[j]);
      }
    }
    sccAdjList[i] = newE;
  }

  return { components: components, adjacencyList: sccAdjList };
}

export function findCircuits(edges, cb) {
  var circuits = []; // Output

  var stack = [];
  var blocked = [];
  var B = {};
  var Ak = [];
  var s;

  function unblock(u) {
    blocked[u] = false;
    if (B.hasOwnProperty(u)) {
      Object.keys(B[u]).forEach(function (w) {
        delete B[u][w];
        if (blocked[w]) {
          unblock(w);
        }
      });
    }
  }

  function circuit(v) {
    var found = false;

    stack.push(v);
    blocked[v] = true;

    // L1
    var i;
    var w;
    for (i = 0; i < Ak[v].length; i++) {
      w = Ak[v][i];
      if (w === s) {
        output(s, stack);
        found = true;
      } else if (!blocked[w]) {
        found = circuit(w);
      }
    }

    // L2
    if (found) {
      unblock(v);
    } else {
      for (i = 0; i < Ak[v].length; i++) {
        w = Ak[v][i];
        var entry = B[w];

        if (!entry) {
          entry = {};
          B[w] = entry;
        }

        entry[w] = true;
      }
    }
    stack.pop();
    return found;
  }

  function output(start, stack) {
    var cycle = [].concat(stack).concat(start);
    if (cb) {
      cb(cycle);
    } else {
      circuits.push(cycle);
    }
  }

  function subgraph(minId) {
    // Remove edges with indice smaller than minId
    for (var i = 0; i < edges.length; i++) {
      if (i < minId || !edges[i]) edges[i] = [];
      edges[i] = edges[i].filter(function (i) {
        return i >= minId;
      });
    }
  }

  function adjacencyStructureSCC(from) {
    // Make subgraph starting from vertex minId
    subgraph(from);
    var g = edges;

    // Find strongly connected components using Tarjan algorithm
    //var sccs = tarjan(g);
    var sccs = stronglyConnectedComponents(g);

    // Filter out trivial connected components (ie. made of one node)
    var ccs = sccs.components.filter(function (scc) {
      return scc.length > 1;
    });

    // Find least vertex
    var leastVertex = Infinity;
    var leastVertexComponent;
    for (var i = 0; i < ccs.length; i++) {
      for (var j = 0; j < ccs[i].length; j++) {
        if (ccs[i][j] < leastVertex) {
          leastVertex = ccs[i][j];
          leastVertexComponent = i;
        }
      }
    }

    var cc = ccs[leastVertexComponent];

    if (!cc) return false;

    // Return the adjacency list of first component
    var adjList = edges.map(function (l, index) {
      if (cc.indexOf(index) === -1) return [];
      return l.filter(function (i) {
        return cc.indexOf(i) !== -1;
      });
    });

    return {
      leastVertex: leastVertex,
      adjList: adjList,
    };
  }

  s = 0;
  var n = edges.length;
  while (s < n) {
    // find strong component with least vertex in
    // subgraph starting from vertex `s`
    var p = adjacencyStructureSCC(s);

    // Its least vertex
    s = p.leastVertex;
    // Its adjacency list
    Ak = p.adjList;

    if (Ak) {
      for (var i = 0; i < Ak.length; i++) {
        for (var j = 0; j < Ak[i].length; j++) {
          var vertexId = Ak[i][j];
          blocked[+vertexId] = false;
          B[vertexId] = {};
        }
      }
      circuit(s);
      s = s + 1;
    } else {
      s = n;
    }
  }

  if (cb) {
    return;
  } else {
    return circuits;
  }
}
