# Semiotic

*These pages contain information about semiotic's upcoming 2.0 release.*
*Looking for 1.x release documentation? Please visit https://semioticv1.nteract.io.*

**Semiotic is a data visualization framework for React.**

It offers frame types, such as XYFrame, OrdinalFrame, and NetworkFrame, to
deploy a wide variety of charts:

- `XYFrame`: XY data i.e. line charts and scatterplots
- `OrdinalFrame`: categorical data i.e. bar charts, violin plots, parallel
  coordinates
- `NetworkFrame`: topological and network data i.e. flow diagrams, network
  visualization, and hierarchical views

![](assets/img/or-summary.png)

### Getting Started

Install and save `semiotic` to your project with `yarn` or `npm`.

```js
yarn add -E semiotic

//or npm
npm i -SE semiotic
```

Use with the following import syntax:

```js
import NetworkFrame from "semiotic/lib/NetworkFrame"
```

Alternatively, you can use semiotic's bundled version available on unpkg.com.

```html
<script type="module">
  import { XYFrame } from "https://unpkg.com/semiotic?module";
</script>
```

Use with the following import syntax:

```js
const { NetworkFrame } = Semiotic
```

Along with the semiotic and React components, these examples rely on some basic
[CSS](https://github.com/nteract/semiotic-docs/blob/master/public/semiotic.css)
for styling.

### History

This library is created and maintained by [Elijah Meeks](https://twitter.com/Elijah_Meeks).

These docs were created in collaboration with [Susie Lu](https://twitter.com/DataToViz).

### Questions

Visit the **#semiotic** channel at nteract's Discord. New to Discord? 
[Here's an invitation to join the nteract Discord.](https://discord.gg/W2anQdA2)
