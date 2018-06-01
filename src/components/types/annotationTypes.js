// @flow

export type AnnotationHandling = {
  dataVersion?: string,
  layout: {
    type: AnnotationTypes,
    orient?: "nearest" | "left" | "right" | "top" | "bottom" | Array<string>,
    characterWidth?: number,
    lineWidth?: number,
    lineHeight?: number,
    padding?: number,
    iterations?: number,
    pointSizeFunction?: function,
    marginOffset?: number
  }
}

export type AnnotationLayerProps = {
  useSpans: boolean,
  legendSettings: {
    position: "right" | "left",
    title: string
  },
  margin: Object,
  size: Array<number>,
  axes: Array<Object>,
  annotationHandling?: AnnotationHandling | AnnotationTypes,
  annotations: Array<Object>,
  pointSizeFunction?: function,
  labelSizeFunction?: function,
  svgAnnotationRule: function,
  htmlAnnotationRule: function
}