`<MinimapXYFrame />` is a wrapper around XYFrame that enables a second XYFrame, typically for a zoomed out view and or brushing to go along with the parent frame. It takes all the attributes that XYFrame does along with:

## Minimap Attributes

### minimap { _object_ }
XYFrame attributes in object format

## X Brush Settings for Line Charts
```js
minimap={
    { margin: { top: 20, bottom: 35, left: 20, right: 20 },
    lines={data}
    lineDataAccessor={d => d.data.filter(p => p.px >= this.state.extent[0] && p.px <= this.state.extent[1])}
    lineStyle={d => ({ fill: d.color, fillOpacity: 0.5, stroke: d.color, strokeWidth: '3px' })}
    defined={d => d.y !== 0}
    brushEnd: this.updateDateRange,
    yBrushable: false,
    xBrushExtent: this.state.extent,
    lines: displayData,
    lineDataAccessor: d => d.data,
    size: [ 700, 150 ],
    axes: [ axes[1] ],
    }
}
```

## XY Brush Settings for Scatterplots and Summary Charts
```js
minimap={
    { margin: { top: 20, bottom: 35, left: 20, right: 20 },
    lineStyle: d => ({ fill: d.color, fillOpacity: 0.5, stroke: d.color }),
    brushEnd: e => this.updateExtent(e),
    summaries: data,
    summaryStyle: areaStyleObject,
    summaryType: areaTypeObject,
    size: [ 300, 300 ]
    }
}
```