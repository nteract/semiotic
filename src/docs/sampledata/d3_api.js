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
    { name: "transition", leafColor: "#e34a33", blockCalls: 81 },
    { name: "text", leafColor: "#fc8d59", blockCalls: 37 },
    { name: "json", leafColor: "#b30000", blockCalls: 1014 },
    { name: "html", leafColor: "#fc8d59", blockCalls: 32 },
    { name: "xml", leafColor: "#fc8d59", blockCalls: 42 },
    { name: "hexbin", leafColor: "#fc8d59", blockCalls: 21 }
  ]
}
