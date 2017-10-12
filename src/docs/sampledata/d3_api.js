export const data = {
  name: "d3",
  children: [
    { name: "version", leafColor: "#fdcc8a", blockCalls: 1 },
    { name: "ascending", leafColor: "#e34a33", blockCalls: 120 },
    { name: "descending", leafColor: "#e34a33", blockCalls: 119 },
    { name: "min", leafColor: "#b30000", blockCalls: 1200 },
    { name: "max", leafColor: "#b30000", blockCalls: 721 },
    { name: "extent", leafColor: "#e34a33", blockCalls: 443 },
    { name: "sum", leafColor: "#e34a33", blockCalls: 103 },
    { name: "mean", leafColor: "#fc8d59", blockCalls: 49 },
    { name: "quantile", leafColor: "#fc8d59", blockCalls: 37 },
    { name: "median", leafColor: "#fc8d59", blockCalls: 28 },
    { name: "variance", leafColor: "#fc8d59", blockCalls: 8 },
    { name: "deviation", leafColor: "#fc8d59", blockCalls: 8 },
    { name: "bisectLeft", leafColor: "#fc8d59", blockCalls: 24 },
    { name: "bisectRight", leafColor: "#fc8d59", blockCalls: 24 },
    { name: "bisect", leafColor: "#e34a33", blockCalls: 73 },
    { name: "bisector", leafColor: "#fc8d59", blockCalls: 49 },
    { name: "shuffle", leafColor: "#fc8d59", blockCalls: 44 },
    { name: "permute", leafColor: "#fc8d59", blockCalls: 25 },
    { name: "pairs", leafColor: "#fc8d59", blockCalls: 19 },
    { name: "zip", leafColor: "#fc8d59", blockCalls: 38 },
    { name: "transpose", leafColor: "#fc8d59", blockCalls: 27 },
    { name: "keys", leafColor: "#e34a33", blockCalls: 255 },
    { name: "values", leafColor: "#e34a33", blockCalls: 77 },
    { name: "entries", leafColor: "#e34a33", blockCalls: 84 },
    { name: "merge", leafColor: "#e34a33", blockCalls: 76 },
    { name: "range", leafColor: "#b30000", blockCalls: 1204 },
    { name: "map", leafColor: "#e34a33", blockCalls: 74 },
    { name: "nest", leafColor: "#e34a33", blockCalls: 331 },
    { name: "set", leafColor: "#fc8d59", blockCalls: 36 },
    {
      name: "behavior",
      children: [
        { name: "drag", leafColor: "#e34a33", blockCalls: 242 },
        { name: "zoom", leafColor: "#e34a33", blockCalls: 189 }
      ],
      leafColor: "#e34a33",
      blockCalls: 394
    },
    { name: "rebind", leafColor: "#e34a33", blockCalls: 128 },
    { name: "dispatch", leafColor: "#e34a33", blockCalls: 177 },
    { name: "event", leafColor: "#b30000", blockCalls: 619 },
    { name: "requote", leafColor: "#fc8d59", blockCalls: 24 },
    {
      name: "selection",
      children: [{ name: "enter", leafColor: "#fdcc8a", blockCalls: 1 }],
      leafColor: "#e34a33",
      blockCalls: 94
    },
    {
      name: "ns",
      children: [
        {
          name: "prefix",
          children: [
            { name: "svg", leafColor: "#fdcc8a", blockCalls: 1 },
            { name: "xhtml", leafColor: "#fdcc8a", blockCalls: 1 },
            { name: "xlink", leafColor: "#fdcc8a", blockCalls: 1 },
            { name: "xml", leafColor: "#fdcc8a", blockCalls: 1 },
            { name: "xmlns", leafColor: "#fdcc8a", blockCalls: 1 }
          ],
          leafColor: "#fc8d59",
          blockCalls: 32
        },
        { name: "qualify", leafColor: "#fc8d59", blockCalls: 29 }
      ],
      leafColor: "#fc8d59",
      blockCalls: 38
    },
    { name: "select", leafColor: "#7f0000", blockCalls: 4195 },
    { name: "selectAll", leafColor: "#b30000", blockCalls: 600 },
    { name: "mouse", leafColor: "#e34a33", blockCalls: 339 },
    { name: "touch", leafColor: "#fc8d59", blockCalls: 39 },
    { name: "touches", leafColor: "#fc8d59", blockCalls: 39 },
    { name: "interpolateZoom", leafColor: "#fc8d59", blockCalls: 17 },
    { name: "color", leafColor: "#fdcc8a", blockCalls: 1 },
    { name: "hsl", leafColor: "#e34a33", blockCalls: 80 },
    { name: "hcl", leafColor: "#fc8d59", blockCalls: 38 },
    { name: "lab", leafColor: "#fc8d59", blockCalls: 31 },
    { name: "rgb", leafColor: "#e34a33", blockCalls: 188 },
    { name: "functor", leafColor: "#e34a33", blockCalls: 104 },
    { name: "xhr", leafColor: "#fc8d59", blockCalls: 29 },
    { name: "dsv", leafColor: "#fc8d59", blockCalls: 18 },
    {
      name: "csv",
      children: [
        { name: "parse", leafColor: "#fc8d59", blockCalls: 17 },
        { name: "parseRows", leafColor: "#fc8d59", blockCalls: 9 },
        { name: "format", leafColor: "#fc8d59", blockCalls: 12 },
        { name: "formatRows", leafColor: "#fdcc8a", blockCalls: 1 }
      ],
      leafColor: "#e34a33",
      blockCalls: 492
    },
    {
      name: "tsv",
      children: [
        { name: "parse", leafColor: "#fdcc8a", blockCalls: 1 },
        { name: "parseRows", leafColor: "#fdcc8a", blockCalls: 1 },
        { name: "format", leafColor: "#fc8d59", blockCalls: 13 },
        { name: "formatRows", leafColor: "#fdcc8a", blockCalls: 1 }
      ],
      leafColor: "#e34a33",
      blockCalls: 148
    },
    {
      name: "timer",
      children: [{ name: "flush", leafColor: "#e34a33", blockCalls: 54 }],
      leafColor: "#e34a33",
      blockCalls: 269
    },
    { name: "round", leafColor: "#e34a33", blockCalls: 52 },
    { name: "formatPrefix", leafColor: "#fc8d59", blockCalls: 28 },
    {
      name: "time",
      children: [
        {
          name: "year",
          children: [
            { name: "round", leafColor: "#fdcc8a", blockCalls: 1 },
            { name: "ceil", leafColor: "#fdcc8a", blockCalls: 1 },
            { name: "offset", leafColor: "#fdcc8a", blockCalls: 1 },
            {
              name: "range",
              children: [{ name: "utc", leafColor: "#fdcc8a", blockCalls: 1 }],
              leafColor: "#fdcc8a",
              blockCalls: 1
            },
            {
              name: "utc",
              children: [
                { name: "round", leafColor: "#fdcc8a", blockCalls: 1 },
                { name: "ceil", leafColor: "#fdcc8a", blockCalls: 1 },
                { name: "offset", leafColor: "#fdcc8a", blockCalls: 1 },
                { name: "range", leafColor: "#fdcc8a", blockCalls: 1 }
              ],
              leafColor: "#fdcc8a",
              blockCalls: 1
            }
          ],
          leafColor: "#fc8d59",
          blockCalls: 42
        },
        {
          name: "years",
          children: [{ name: "utc", leafColor: "#fdcc8a", blockCalls: 1 }],
          leafColor: "#fc8d59",
          blockCalls: 38
        },
        {
          name: "day",
          children: [
            { name: "round", leafColor: "#fdcc8a", blockCalls: 1 },
            { name: "ceil", leafColor: "#fdcc8a", blockCalls: 1 },
            { name: "offset", leafColor: "#fdcc8a", blockCalls: 1 },
            {
              name: "range",
              children: [{ name: "utc", leafColor: "#fdcc8a", blockCalls: 1 }],
              leafColor: "#fdcc8a",
              blockCalls: 1
            },
            {
              name: "utc",
              children: [
                { name: "round", leafColor: "#fdcc8a", blockCalls: 1 },
                { name: "ceil", leafColor: "#fdcc8a", blockCalls: 1 },
                { name: "offset", leafColor: "#fdcc8a", blockCalls: 1 },
                { name: "range", leafColor: "#fdcc8a", blockCalls: 1 }
              ],
              leafColor: "#fdcc8a",
              blockCalls: 1
            }
          ],
          leafColor: "#e34a33",
          blockCalls: 86
        },
        {
          name: "months",
          children: [{ name: "utc", leafColor: "#fdcc8a", blockCalls: 1 }],
          leafColor: "#fc8d59",
          blockCalls: 43
        },
        {
          name: "scale",
          children: [{ name: "utc", leafColor: "#fdcc8a", blockCalls: 1 }],
          leafColor: "#e34a33",
          blockCalls: 365
        }
      ],
      leafColor: "#b30000",
      blockCalls: 700
    },
    { name: "locale", leafColor: "#fc8d59", blockCalls: 11 },
    { name: "format", leafColor: "#e34a33", blockCalls: 343 },
    {
      name: "geo",
      children: [
        { name: "stream", leafColor: "#fc8d59", blockCalls: 25 },
        { name: "area", leafColor: "#fc8d59", blockCalls: 19 },
        { name: "bounds", leafColor: "#fc8d59", blockCalls: 38 },
        { name: "centroid", leafColor: "#fc8d59", blockCalls: 46 },
        { name: "clipExtent", leafColor: "#fc8d59", blockCalls: 19 },
        {
          name: "conicEqualArea",
          children: [{ name: "raw", leafColor: "#fdcc8a", blockCalls: 1 }],
          leafColor: "#fc8d59",
          blockCalls: 25
        },
        { name: "albers", leafColor: "#e34a33", blockCalls: 181 },
        { name: "albersUsa", leafColor: "#e34a33", blockCalls: 112 },
        { name: "path", leafColor: "#b30000", blockCalls: 760 },
        { name: "transform", leafColor: "#fc8d59", blockCalls: 34 },
        { name: "projection", leafColor: "#e34a33", blockCalls: 235 },
        { name: "projectionMutator", leafColor: "#fc8d59", blockCalls: 23 },
        {
          name: "equirectangular",
          children: [{ name: "raw", leafColor: "#fdcc8a", blockCalls: 1 }],
          leafColor: "#e34a33",
          blockCalls: 95
        },
        { name: "rotation", leafColor: "#fc8d59", blockCalls: 21 },
        { name: "circle", leafColor: "#fc8d59", blockCalls: 42 },
        { name: "distance", leafColor: "#fc8d59", blockCalls: 16 },
        { name: "graticule", leafColor: "#e34a33", blockCalls: 294 },
        { name: "greatArc", leafColor: "#fc8d59", blockCalls: 29 },
        { name: "interpolate", leafColor: "#fc8d59", blockCalls: 27 },
        { name: "length", leafColor: "#fc8d59", blockCalls: 19 },
        {
          name: "azimuthalEqualArea",
          children: [
            {
              name: "raw",
              children: [
                { name: "invert", leafColor: "#fdcc8a", blockCalls: 1 }
              ],
              leafColor: "#fc8d59",
              blockCalls: 5
            }
          ],
          leafColor: "#fc8d59",
          blockCalls: 39
        },
        {
          name: "azimuthalEquidistant",
          children: [
            {
              name: "raw",
              children: [
                { name: "invert", leafColor: "#fdcc8a", blockCalls: 1 }
              ],
              leafColor: "#fc8d59",
              blockCalls: 5
            }
          ],
          leafColor: "#fc8d59",
          blockCalls: 35
        },
        {
          name: "conicConformal",
          children: [{ name: "raw", leafColor: "#fdcc8a", blockCalls: 1 }],
          leafColor: "#fc8d59",
          blockCalls: 33
        },
        {
          name: "conicEquidistant",
          children: [{ name: "raw", leafColor: "#fdcc8a", blockCalls: 1 }],
          leafColor: "#fc8d59",
          blockCalls: 27
        },
        {
          name: "gnomonic",
          children: [
            {
              name: "raw",
              children: [
                { name: "invert", leafColor: "#fdcc8a", blockCalls: 1 }
              ],
              leafColor: "#fdcc8a",
              blockCalls: 4
            }
          ],
          leafColor: "#fc8d59",
          blockCalls: 36
        },
        {
          name: "mercator",
          children: [
            {
              name: "raw",
              children: [
                { name: "invert", leafColor: "#fdcc8a", blockCalls: 1 }
              ],
              leafColor: "#fdcc8a",
              blockCalls: 1
            }
          ],
          leafColor: "#e34a33",
          blockCalls: 222
        },
        {
          name: "orthographic",
          children: [
            {
              name: "raw",
              children: [
                { name: "invert", leafColor: "#fdcc8a", blockCalls: 1 }
              ],
              leafColor: "#fdcc8a",
              blockCalls: 1
            }
          ],
          leafColor: "#e34a33",
          blockCalls: 93
        },
        {
          name: "stereographic",
          children: [
            {
              name: "raw",
              children: [
                { name: "invert", leafColor: "#fdcc8a", blockCalls: 1 }
              ],
              leafColor: "#fdcc8a",
              blockCalls: 1
            }
          ],
          leafColor: "#fc8d59",
          blockCalls: 25
        },
        {
          name: "transverseMercator",
          children: [
            {
              name: "raw",
              children: [
                { name: "invert", leafColor: "#fdcc8a", blockCalls: 1 }
              ],
              leafColor: "#fdcc8a",
              blockCalls: 1
            }
          ],
          leafColor: "#fc8d59",
          blockCalls: 20
        }
      ],
      leafColor: "#b30000",
      blockCalls: 1015
    },
    {
      name: "geom",
      children: [
        { name: "hull", leafColor: "#fc8d59", blockCalls: 25 },
        { name: "polygon", leafColor: "#e34a33", blockCalls: 62 },
        { name: "voronoi", leafColor: "#e34a33", blockCalls: 129 },
        { name: "delaunay", leafColor: "#fc8d59", blockCalls: 34 },
        { name: "quadtree", leafColor: "#e34a33", blockCalls: 97 }
      ],
      leafColor: "#e34a33",
      blockCalls: 234
    },
    { name: "interpolateRgb", leafColor: "#e34a33", blockCalls: 94 },
    { name: "interpolateObject", leafColor: "#fc8d59", blockCalls: 24 },
    { name: "interpolateNumber", leafColor: "#e34a33", blockCalls: 149 },
    { name: "interpolateString", leafColor: "#fc8d59", blockCalls: 41 },
    { name: "interpolate", leafColor: "#b30000", blockCalls: 616 },
    { name: "interpolators", leafColor: "#fc8d59", blockCalls: 24 },
    { name: "interpolateArray", leafColor: "#fc8d59", blockCalls: 26 },
    { name: "ease", leafColor: "#e34a33", blockCalls: 87 },
    { name: "interpolateHcl", leafColor: "#e34a33", blockCalls: 104 },
    { name: "interpolateHsl", leafColor: "#e34a33", blockCalls: 207 },
    { name: "interpolateLab", leafColor: "#e34a33", blockCalls: 80 },
    { name: "interpolateRound", leafColor: "#fc8d59", blockCalls: 27 },
    { name: "transform", leafColor: "#fc8d59", blockCalls: 41 },
    { name: "interpolateTransform", leafColor: "#fc8d59", blockCalls: 27 },
    {
      name: "layout",
      children: [
        { name: "bundle", leafColor: "#fc8d59", blockCalls: 30 },
        { name: "chord", leafColor: "#e34a33", blockCalls: 56 },
        { name: "force", leafColor: "#e34a33", blockCalls: 258 },
        { name: "hierarchy", leafColor: "#fc8d59", blockCalls: 29 },
        { name: "partition", leafColor: "#e34a33", blockCalls: 56 },
        { name: "pie", leafColor: "#e34a33", blockCalls: 145 },
        { name: "stack", leafColor: "#e34a33", blockCalls: 78 },
        { name: "histogram", leafColor: "#fc8d59", blockCalls: 46 },
        { name: "pack", leafColor: "#e34a33", blockCalls: 61 },
        { name: "tree", leafColor: "#e34a33", blockCalls: 122 },
        { name: "cluster", leafColor: "#fc8d59", blockCalls: 41 },
        { name: "treemap", leafColor: "#e34a33", blockCalls: 52 }
      ],
      leafColor: "#b30000",
      blockCalls: 672
    },
    {
      name: "random",
      children: [
        { name: "normal", leafColor: "#e34a33", blockCalls: 55 },
        { name: "logNormal", leafColor: "#fdcc8a", blockCalls: 1 },
        { name: "bates", leafColor: "#fdcc8a", blockCalls: 2 },
        { name: "irwinHall", leafColor: "#fc8d59", blockCalls: 13 }
      ],
      leafColor: "#fdcc8a",
      blockCalls: 1
    },
    {
      name: "scale",
      children: [
        { name: "linear", leafColor: "#b30000", blockCalls: 1730 },
        { name: "log", leafColor: "#e34a33", blockCalls: 75 },
        { name: "pow", leafColor: "#fc8d59", blockCalls: 39 },
        { name: "sqrt", leafColor: "#e34a33", blockCalls: 152 },
        { name: "ordinal", leafColor: "#b30000", blockCalls: 613 },
        { name: "category10", leafColor: "#fdcc8a", blockCalls: 1 },
        { name: "category20", leafColor: "#fdcc8a", blockCalls: 1 },
        { name: "category20b", leafColor: "#fdcc8a", blockCalls: 1 },
        { name: "category20c", leafColor: "#fdcc8a", blockCalls: 1 },
        { name: "quantile", leafColor: "#fc8d59", blockCalls: 36 },
        { name: "quantize", leafColor: "#e34a33", blockCalls: 94 },
        { name: "threshold", leafColor: "#fc8d59", blockCalls: 42 },
        { name: "identity", leafColor: "#fc8d59", blockCalls: 47 }
      ],
      leafColor: "#7f0000",
      blockCalls: 2391
    },
    {
      name: "svg",
      children: [
        { name: "arc", leafColor: "#e34a33", blockCalls: 306 },
        {
          name: "line",
          children: [{ name: "radial", leafColor: "#fc8d59", blockCalls: 37 }],
          leafColor: "#b30000",
          blockCalls: 550
        },
        {
          name: "area",
          children: [{ name: "radial", leafColor: "#fc8d59", blockCalls: 27 }],
          leafColor: "#e34a33",
          blockCalls: 142
        },
        { name: "chord", leafColor: "#e34a33", blockCalls: 57 },
        {
          name: "diagonal",
          children: [{ name: "radial", leafColor: "#fc8d59", blockCalls: 36 }],
          leafColor: "#e34a33",
          blockCalls: 86
        },
        { name: "symbol", leafColor: "#e34a33", blockCalls: 56 },
        { name: "symbolTypes", leafColor: "#fc8d59", blockCalls: 29 },
        { name: "axis", leafColor: "#b30000", blockCalls: 782 },
        { name: "brush", leafColor: "#e34a33", blockCalls: 195 }
      ],
      leafColor: "#b30000",
      blockCalls: 1434
    },
    { name: "transition", leafColor: "#e34a33", blockCalls: 81 },
    { name: "text", leafColor: "#fc8d59", blockCalls: 37 },
    { name: "json", leafColor: "#b30000", blockCalls: 1014 },
    { name: "html", leafColor: "#fc8d59", blockCalls: 32 },
    { name: "xml", leafColor: "#fc8d59", blockCalls: 42 },
    { name: "hexbin", leafColor: "#fc8d59", blockCalls: 21 }
  ]
};
