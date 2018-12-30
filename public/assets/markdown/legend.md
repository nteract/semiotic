`<Legend>` provides a simple legend based on the array of `legendGroups` you send it. Legend returns a `<g>` element and so must be placed in an `<svg>`.

# &lt;API Reference>

### width: { _number_ }

The legend width. Currently only used to determine the length of the separator line between legend elements.

```html
<legend width="{100}" ... />
```

### title: { _string_ }

The legend title, a `<text>` element with classs `legend-title`.

```html
<Legend label={"My Legend} ... />
```

### legendGroups: { _array_ }

An array of legend groups, which are objects that have `items` and a styling function that defines how to render each legend item.

#### Legend Group Object Properties

- `type`: Can be `"line"` or `"fill"` which determines whether the legend item is a diagonal line or a rectangle. Can also be a function that takes an item and returns SVG JSX.

- `styleFn`: A function that takes an item and returns JSX style object applied to the item symbol.

- `label`: An optional legendGroup sub-label

- `items`: An array of the items being rendered in this legendGroup. Each item has values corresponding to the settings in the styleFn (and custom type, if that is a function) as well as a `label` value that will be used for the text label of the item.

```js
import { Legend } from 'semiotic'

const areaLegendGroups = [
   { styleFn: d => ({ fill: d.color, stroke: "black" }), items: [
      { label: "Area 1", color: "red" },
      { label: "Area 2", color: "blue" }
      ]
   }
]

const lineLegendGroups = [
   { type: "line", styleFn: d => ({ stroke: d.color }), items: [
      { label: "Line 1", color: "red" },
      { label: "Line 2", color: "blue" }
      ]
   }
]

<Legend
   title={"Test Area Legend"}
   legendGroups={areaLegendGroups}
/>

<!-- Legend will automatically separate different legend groups with a thin line --!>
<Legend
   title={"Combined Legend"}
   legendGroups={[ ...lineLegendGroups, ...areaLegendGroups ]}
/>
```
