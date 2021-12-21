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

These examples use [some CSS](https://github.com/nteract/semiotic-docs/blob/master/public/semiotic.css) that override the default Semiotic styling.

## Contributing a Guide or Example

Create a fork of the repo.

- If you are creating a new page
  - Copy an existing Example/Guide as a placeholder for your new page in the corresponding `src/examples` or `src/guides` folders
  -  In the `src/App.js` file, search for the `PAGES` array, this array drives the navigation on the left, the url to component specification, and the image associated with the new page
  - Add a new entry for your new page
- Tips for creating the page
  - Import the [theme file](https://github.com/nteract/semiotic-docs/blob/master/src/theme.js) to use consistent colors, it's an array of colors
  - Document any data and reference its source in your example
  - If you're using the `MarkdownText` component on your page you can use backslash `\` to escape any additional backticks and $ signs in template code
  - If this example or guide is only valid for a version above v.1.18.0, please make a note of this in your description
  - Use the [DocumentFrame](https://github.com/nteract/semiotic-docs/blob/master/src/DocumentFrame.js) component to render your Semitoic code if you want to use the built in show/hide/copy code blocks
  - If you are using a new feature in Semiotic with a new prop type for example `renderMode`, you may see an error like `ERROR: no label found for renderMode` this means that `DocumentFrame` couldn't find a category to put that prop into, go into the `src/process.js` file and add that new prop into the corresponding process step. This allows `DocumentFrame` to group the code snippet props into meaningful categories

- Test your code snippets
  - Click the "Copy Full Code" button on your code snippet
  - Go into the [Test](https://github.com/nteract/semiotic-docs/blob/master/src/Test.js) file at `src/Test.js`
  - Delete all of the code except for the `import React from "react"` statement at the top
  - Paste in the code you copied in the step above
  - Navigate to `localhost:3000/test` to see how your component looks, make sure it matches exactly to the component you originally created
  - Handling errors during this test. 
    - using the `overrideProps` on `DocumentFrame`, this allows you to pass an object of props where the key is the same property you're sending to Semiotic, but instead you give it a string value. See the [candlestick example](https://github.com/nteract/semiotic-docs/blob/master/src/examples/CandlestickChart.js#L104) for an example where a title needs to be overwritten because it contains JSX 
    - using the `pre` on `DocumentFrame` to add initial code outside of your frame props, See the [candlestick example](https://github.com/nteract/semiotic-docs/blob/master/src/examples/CandlestickChart.js#L189) to see how it adds the import statement `import { scaleTime } from "d3-scale"` to the code snippet
overrideProps take the prop as a key, and a text. you need to
Using the pre value, baseball example
- If you created a new page instead of adding to an existing guide, create an image for your new page
  - Take a screenshot of your example
  - Run your image through [tiny png](https://tinypng.com/), upload it to the `public/assets/img` folder
  - In the `src/App.js` file entry you made in the `PAGES` array, make sure you update the associated image with the name of the file you added to the public folder

Submit a pull request
