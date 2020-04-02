export const data = {
  name: "d3",
  children: [
    {
      name: "behavior",
      children: [
        { name: "drag", leafColor: "#e34a33", blockCalls: 242 },
        { name: "zoom", leafColor: "#e34a33", blockCalls: 189 }
      ],
      leafColor: "#e34a33"
    },
    {
      name: "selection",
      children: [{ name: "enter", leafColor: "#fdcc8a", blockCalls: 1 }],
      leafColor: "#e34a33"
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
          leafColor: "#fc8d59"
        },
        { name: "qualify", leafColor: "#fc8d59", blockCalls: 29 }
      ],
      leafColor: "#fc8d59"
    },
    {
      name: "csv",
      children: [
        { name: "parse", leafColor: "#fc8d59", blockCalls: 17 },
        { name: "parseRows", leafColor: "#fc8d59", blockCalls: 9 },
        { name: "format", leafColor: "#fc8d59", blockCalls: 12 },
        { name: "formatRows", leafColor: "#fdcc8a", blockCalls: 1 }
      ],
      leafColor: "#e34a33"
    },
    {
      name: "tsv",
      children: [
        { name: "parse", leafColor: "#fdcc8a", blockCalls: 1 },
        { name: "parseRows", leafColor: "#fdcc8a", blockCalls: 1 },
        { name: "format", leafColor: "#fc8d59", blockCalls: 13 },
        { name: "formatRows", leafColor: "#fdcc8a", blockCalls: 1 }
      ],
      leafColor: "#e34a33"
    },
    {
      name: "timer",
      children: [{ name: "flush", leafColor: "#e34a33", blockCalls: 54 }],
      leafColor: "#e34a33"
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
          leafColor: "#fc8d59"
        },
        {
          name: "years",
          children: [{ name: "utc", leafColor: "#fdcc8a", blockCalls: 1 }],
          leafColor: "#fc8d59"
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
          leafColor: "#fc8d59"
        },
        {
          name: "scale",
          children: [{ name: "utc", leafColor: "#fdcc8a", blockCalls: 1 }],
          leafColor: "#e34a33"
        }
      ],
      leafColor: "#b30000"
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
          leafColor: "#fc8d59"
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
          leafColor: "#e34a33"
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
              leafColor: "#fc8d59"
            }
          ],
          leafColor: "#fc8d59"
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
          leafColor: "#fc8d59"
        },
        {
          name: "conicConformal",
          children: [{ name: "raw", leafColor: "#fdcc8a", blockCalls: 1 }],
          leafColor: "#fc8d59"
        },
        {
          name: "conicEquidistant",
          children: [{ name: "raw", leafColor: "#fdcc8a", blockCalls: 1 }],
          leafColor: "#fc8d59"
        },
        {
          name: "gnomonic",
          children: [
            {
              name: "raw",
              children: [
                { name: "invert", leafColor: "#fdcc8a", blockCalls: 1 }
              ],
              leafColor: "#fdcc8a"
            }
          ],
          leafColor: "#fc8d59"
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
          leafColor: "#e34a33"
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
          leafColor: "#e34a33"
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
          leafColor: "#fc8d59"
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
      leafColor: "#b30000"
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
      name: "svg",
      children: [
        { name: "arc", leafColor: "#e34a33", blockCalls: 306 },
        {
          name: "line",
          children: [{ name: "radial", leafColor: "#fc8d59", blockCalls: 37 }],
          leafColor: "#b30000"
        },
        {
          name: "area",
          children: [{ name: "radial", leafColor: "#fc8d59", blockCalls: 27 }],
          leafColor: "#e34a33"
        },
        { name: "chord", leafColor: "#e34a33", blockCalls: 57 },
        {
          name: "diagonal",
          children: [{ name: "radial", leafColor: "#fc8d59", blockCalls: 36 }],
          leafColor: "#e34a33"
        },
        { name: "symbol", leafColor: "#e34a33", blockCalls: 56 },
        { name: "symbolTypes", leafColor: "#fc8d59", blockCalls: 29 },
        { name: "axis", leafColor: "#b30000", blockCalls: 782 },
        { name: "brush", leafColor: "#e34a33", blockCalls: 195 }
      ],
      leafColor: "#b30000"
    },
    { name: "transition", leafColor: "#e34a33", blockCalls: 81 },
    { name: "text", leafColor: "#fc8d59", blockCalls: 37 },
    { name: "json", leafColor: "#b30000", blockCalls: 1014 },
    { name: "html", leafColor: "#fc8d59", blockCalls: 32 },
    { name: "xml", leafColor: "#fc8d59", blockCalls: 42 },
    { name: "hexbin", leafColor: "#fc8d59", blockCalls: 21 }
  ]
}
