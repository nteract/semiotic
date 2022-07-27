import * as Semiotic from "../../dist/semiotic.module.js"
import React from "react"
import { csvParse } from "d3-dsv"
import { createRoot } from "react-dom/client"

const data = {
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
      leafColor: "#e34a33"
    },
    { name: "rebind", leafColor: "#e34a33", blockCalls: 128 },
    { name: "dispatch", leafColor: "#e34a33", blockCalls: 177 },
    { name: "event", leafColor: "#b30000", blockCalls: 619 },
    { name: "requote", leafColor: "#fc8d59", blockCalls: 24 },
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
      name: "geom",
      children: [
        { name: "hull", leafColor: "#fc8d59", blockCalls: 25 },
        { name: "polygon", leafColor: "#e34a33", blockCalls: 62 },
        { name: "voronoi", leafColor: "#e34a33", blockCalls: 129 },
        { name: "delaunay", leafColor: "#fc8d59", blockCalls: 34 },
        { name: "quadtree", leafColor: "#e34a33", blockCalls: 97 }
      ],
      leafColor: "#e34a33"
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
      leafColor: "#7f0000"
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

const barData = [
  { position: "a", amount: 5 },
  { position: "b", amount: 7 },
  { position: "c", amount: 10 },
  { position: "d", amount: 20 },
  { position: "e", amount: 10 }
]

const joyData =
  " Almost Certainly,Highly Likely,Very Good Chance,Probable,Likely,Probably,We Believe,Better Than Even,About Even,We Doubt,Improbable,Unlikely,Probably Not,Little Chance,Almost No Chance,Highly Unlikely,Chances Are Slight\n95,80,85,75,66,75,66,55,50,40,20,30,15,20,5,25,25\n95,75,75,51,75,51,51,51,50,20,49,25,49,5,5,10,5\n95,85,85,70,75,70,80,60,50,30,10,25,25,20,1,5,15\n95,85,85,70,75,70,80,60,50,30,10,25,25,20,1,5,15\n98,95,80,70,70,75,65,60,50,10,50,5,20,5,1,2,10\n95,99,85,90,75,75,80,65,50,7,15,8,15,5,1,3,20\n85,95,65,80,40,45,80,60,45,45,35,20,40,20,10,20,30\n97,95,75,70,70,80,75,55,50,25,30,15,25,20,3,5,10\n95,95,80,70,65,80,65,55,50,20,30,35,35,15,5,15,10\n90,85,90,70,75,70,65,60,52,60,20,30,45,20,10,6,25\n90,90,85,70,60,75,80,60,50,25,1,15,40,20,15,10,15\n99,97,70,75,75,75,90,67,50,17,10,10,25,17,2,3,5\n60,80,70,70,60,55,60,55,50,20,5,30,30,10,5,5,15\n88.7,69,80,51,70,60,50,5,50,30,49,20,40,13,2,3,5\n99,98,85,85,75,65,5,65,50,100,1,10,100,100,95,90,35\n95,90,80,70,70,80,85,60,50,30,40,30,40,15,1,5,10\n97,90,70,51,65,60,75,51,50,5,10,15,10,15,2,7,5\n99,95,75,60,65,75,80,55,50,25,3,15,30,10,1,5,40\n95,95,90,60,80,75,75,60,50,25,10,10,20,25,5,5,10\n95,90,75,80,75,75,50,50.1,50,25,20,25,49.9,25,5,5,10\n90,80,80,75,80,75,60,60,50,40,30,10,25,20,5,5,5\n92,85,75,60,70,60,85,57,50,25,33,10,10,7,3,3,13\n98,90,75,80,85,85,85,60,49,5,15,2,10,2,5,5,5\n98,92,91,85,85,85,70,60,50,30,7,18,27,17,2,3,10\n90,90,75,75,65,80,80,60,50,12,25,35,30,20,2,10,20\n95,85,80,75,65,75,50,60,50,33,10,25,25,10,2,5,5\n95,90,80,60,75,60,60,51,50,10,49,20,40,15,5,20,10\n98,95,75,85,90,85,75,98,50,40,7,10,25,10,2,5,5\n85,85,90,60,65,76,50,51,50,33,25,25,20,10,1,15,15\n80,15,74,65,65,65,60,60,50,38,29,36,34,29,7,15,30\n98,80,75,65,70,55,60,55,50,25,20,12,35,15,1,8,15\n96,85,80,75,70,90,80,60,50,5,9,3,20,20,10,5,12\n99,85,75,80,75,90,50,51,50,1,0.001,10,10,5,0.05,10,5\n85,84,87,50,60,65,50,60,50,60,3,24,30,20,5,15,30\n90,95,80,70,90,60,60,80,40,25,3,5,20,4,2,2,30\n95,85,80,64,80,80,75,80,50,10,10,25,20,8,2,5,5\n98,96,90,90,90,80,70,53,50,40,4,30,30,8,1,5,10\n98,96,82,75,86,80,45,69,52,21,12,34,26,18,7,3,13\n80,90,70,80,80,80,70,60,50,10,0,20,30,10,1,10,10\n95,90,90,80,90,90,85,55,48,15,20,35,15,15,5,8,10\n99,90,80,90,60,50,90,60,50,40,20,10,40,5,1,30,15\n85,80,80,70,70,70,65,51,45,30,15,35,30,10,5,15,20\n90,70,80,75,70,65,70,60,50,15,35,20,25,5,2,10,10\n95,80,90,75,70,75,100,60,50,10,5,10,20,10,1,5,5\n85,90,75,65,65,60,95,55,50,95,5,20,40,25,2,5,10\n95,80,75,75,60,68,55,51,49,25,20,35,40,17,5,10,15"

const XYSettings = {
  size: [200, 200],
  axes: [
    {
      className: "Chart-axis",
      label: {
        locationDistance: 70,
        name: "Delta"
      },
      orient: "left"
    },
    {
      className: "Chart-axis",
      label: "Rows",
      orient: "bottom"
    }
  ],
  lines: [
    {
      color: "#C0CA33",
      id: "1",
      coordinates: [
        {
          x: 0,
          y: 0
        },
        {
          x: 1,
          y: 0
        },
        {
          x: 2,
          y: 0
        },
        {
          x: 3,
          y: 0
        },
        {
          x: 4,
          y: 0
        },
        {
          x: 5,
          y: 0
        }
      ]
    },
    {
      color: "#8E24AA",
      id: "2",
      coordinates: [
        {
          x: 0,
          y: -0.00012227529271774396
        },
        {
          x: 1,
          y: -0.00005312456395045739
        },
        {
          x: 2,
          y: 0.00001889742921998283
        },
        {
          x: 3,
          y: 0.000028825940210450846
        },
        {
          x: 4,
          y: 0.000028842013103075326
        },
        {
          x: 5,
          y: -0.000003542697624871541
        }
      ]
    }
  ],
  lineStyle: (line) => ({
    stroke: line.color,
    strokeWidth: 2
  }),
  margin: { top: 30, right: 0, bottom: 30, left: 60 },
  pointStyle: (point) => ({
    fill: point.parentLine.color,
    stroke: point.parentLine.color,
    strokeWidth: "2px"
  }),
  showLinePoints: true,
  xAccessor: "x",
  yAccessor: "y"
}

let _Semiotic = Semiotic,
  OrdinalFrame = _Semiotic.OrdinalFrame,
  NetworkFrame = _Semiotic.NetworkFrame,
  XYFrame = _Semiotic.XYFrame

const parsedAnswers = csvParse(joyData)

const atomicData = []

const colors = [
  "#2c0845",
  "#6782c9",
  "#99ceeb",
  "#203f52",
  "#24ffcd",
  "#069668",
  "#b1f65d",
  "#02531d",
  "#d8e9b2",
  "#96a467",
  "#66050d",
  "#d73e50",
  "#c99084",
  "#704b0c",
  "#3ff44c",
  "#4ba40b",
  "#f3d426",
  "#f6932e",
  "#fe5900",
  "#3441c5",
  "#d38ffd",
  "#a113b2",
  "#fb5de7",
  "#8a4488",
  "#270fe2"
]

parsedAnswers.forEach((answer, i) => {
  Object.keys(answer).forEach((key) => {
    answer[key] = +answer[key]
    atomicData.push({
      respondent: `person ${i}`,
      response: key,
      value: answer[key]
    })
  })
  answer.respondent = `person ${i}`
})
const root = createRoot(document.getElementById("main"))

root.render(
  React.createElement(
    "div",
    {
      style: {
        display: "flex",
        flexWrap: "wrap",
        width: "800px",
        height: "1000px"
      }
    },
    [
      React.createElement(OrdinalFrame, {
        title: "Ridgeline Plot",
        size: [400, 200],
        projection: "horizontal",
        data: atomicData,
        oAccessor: "response",
        rAccessor: "value",
        summaryType: { type: "ridgeline", amplitude: 100 },
        summaryStyle: function summaryStyle(d, i) {
          return {
            fill: colors[i % colors.length],
            stroke: "grey",
            fillOpacity: 0.75
          }
        },
        axes: {
          orient: "left",
          tickValues: [0, 20, 40, 60, 80, 100],
          tickFormat: function tickFormat(d) {
            return `${d}%`
          }
        },
        oLabel: function oLabel(d) {
          return React.createElement(
            "text",
            { fontSize: "8px", textAnchor: "end", y: 3, x: -3 },
            d
          )
        },
        margin: { left: 100, right: 50, bottom: 28, top: 40 },
        oPadding: 5
      }),
      React.createElement(OrdinalFrame, {
        title: "Horizontal Bars",
        size: [200, 200],
        projection: "horizontal",
        oAccessor: "position",
        rAccessor: "amount",
        data: barData,
        type: "bar",
        style: { fill: "lightblue", stroke: "darkblue", opacity: 0.5 },
        axes: {
          orient: "left"
        },
        margin: 30,
        oPadding: 5
      }),
      React.createElement(OrdinalFrame, {
        title: "Pie Chart",
        size: [200, 200],
        projection: "radial",
        data: [
          { value: 5, o: "Five" },
          { value: 10, o: "Ten" },
          { value: 20, o: "Twenty" }
        ],
        type: "bar",
        style: (d, i) => ({
          fill: colors[i % colors.length],
          stroke: "darkblue",
          opacity: 0.5
        }),
        dynamicColumnWidth: "value",
        rAccessor: () => 1,
        oAccessor: "o",
        margin: { top: 45, left: 15, right: 15, bottom: 15 },
        oLabel: true
      }),
      React.createElement(OrdinalFrame, {
        title: "Vertical Bars",
        size: [200, 200],
        projection: "vertical",
        oAccessor: "position",
        rAccessor: "amount",
        data: barData,
        type: "bar",
        style: { fill: "lightblue", stroke: "darkblue", opacity: 0.5 },
        axes: {
          orient: "left"
        },
        tooltipContent: (d) =>
          React.createElement("div", {
            className: "tooltip-content",
            children:
              (d.column && `Column hover: ${d.column.name}`) ||
              `Frame hover: ${d.position}`
          }),
        margin: 30,
        oPadding: 5
      }),
      React.createElement(NetworkFrame, {
        size: [200, 200],
        edges: data,
        networkType: { type: "treemap", hierarchySum: (d) => d.blockCalls },
        nodeStyle: (d) => ({
          fill: colors[d.depth],
          stroke: "black",
          strokeOpacity: 0.25,
          fillOpacity: 0.25
        }),
        nodeIDAccessor: "name"
      }),
      React.createElement(NetworkFrame, {
        size: [200, 200],
        edges: data,
        networkType: { type: "tree" },
        nodeSizeAccessor: 2,
        nodeStyle: (d) => ({
          fill: colors[d.depth],
          stroke: "black",
          strokeOpacity: 0.25,
          fillOpacity: 0.25
        }),
        edgeStyle: { stroke: "black" },
        nodeIDAccessor: "name"
      }),
      React.createElement(XYFrame, XYSettings)
    ]
  )
)
