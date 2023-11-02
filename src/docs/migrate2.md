# Migrate to Semiotic 2.0

**What's New in 2.0** This document outlines the high-level differences between 1.x and 2.0 releases.
For detailed information about changes, see Semiotic's [Change Log](CHANGELOG.md).

## Installing 2.0

TODO: Add installation and a usage example; highlight any non-obvious steps

## Major Changes

- React 17 Compatibility
    - Remove deprecated lifecycle events
    - Transition most components to functional components using hooks
- RoughJS is now optional
    - You need to import RoughJS (or anything that follows its pattern)
    - send it as the `sketchyRenderingEngine` prop of a frame for it to honor the `renderMode` options that were honored automatically in 1.0
- Dramatically Improved Build and Tooling
    - Smaller package sizes
    - Faster builds using Parcel
- `Areas` in `XYFrame` are now `Summaries`
    - Renamed components and files to `Summaries`
    - For example, `canvasAreas` has been renamed to `canvasSummaries`
- Removed download data functionality

## Improvements

### Canvas
- Canvas progressive rendering is improved
- Progressive rendering can be disabled via the `disableProgressiveRendering`
  prop on a frame

### Frames
- `frameRenderOrder` allows you to change the render order of elements in frames
 (you can even render them twice if you want them to sandwich another layer
of elements) takes an array of any or all (with duplicates) of these values:
 `["axes-tick-lines", "viz-layer", "matte", "axes-labels", "labels"]` which you can rearrange.
- `filterRenderedNodes`, `filterRenderedLines`, `filterRenderedPoints`, `filterRenderedSummaries` props on NetworkFrame and XYFrame that take a filter function and will apply the filter on the drawn viz after it's been created (useful for filtering Partition layouts and things like that)
- `lineBounds` summaryType in XYFrame (to create bounding regions around a line) takes `boundingAccessor` (when bounds above and below are the same), `topBoundingAccessor` and `bottomBoundingAccessor` to let you draw asymmetric bounding regions around a line.

### Charts

#### Boxplot chart

- 1.5IQR Outliers for Boxplot via `outliers: true` on the summaryType that
  pulls all points outside of 1.5 IQR and draws them as individual points
  outside the whiskers.

#### Trendline chart

- Trendline can now show the formula as a decoration via `showSlope: true` 
  in the summary object

#### Violin chart

- Multipart Violin via `subsets: fn => { returns filterAppliedOnViolinData }`
  on the `summaryType` allows you to draw more than one violin plot overlapping
  on the same column
- Add IQR viz to violin via `iqr: true` in the type object

### Actions and events

- Clickable Legend Events
- Pass raw event to interaction events
