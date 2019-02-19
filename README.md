# Semiotic Docs

**[Semiotic](https://github.com/nteract/semiotic) is a data visualization framework for React.**

It provides three types of frames XYFrame, OrdinalFrame, NetworkFrame, to deploy a wide variety of charts.

- `XYFrame`: XY data i.e. line charts and scatterplots
- `OrdinalFrame`: categorical data i.e. bar charts, violin plots, parallel coordinates
- `NetworkFrame`: topological and network data i.e. flow diagrams, network visualization, and hierarchical views

This library is created and maintained by [Elijah Meeks](https://twitter.com/Elijah_Meeks).

These docs were created in collaboration with [Susie Lu](https://twitter.com/DataToViz).

## Getting Started

Install and save `semiotic` to your project with `yarn` or `npm`.

```js
yarn add -E semiotic
//or npm
npm i -SE semiotic
```

with the following import syntax:

```js
import NetworkFrame from "semiotic/lib/NetworkFrame"
```

or you can use the bundled version on unpkg.com

```html
<script src="https://unpkg.com/semiotic" />
```

with the following import syntax:

```js
const { NetworkFrame } = Semiotic
```

These examples use [some CSS](https://github.com/nteract/semiotic-docs/blob/master/public/semiotic.css) to make things look nice.
