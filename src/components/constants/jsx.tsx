import * as React from "react"
import { drawMarginPath } from "../svg/frameFunctions"

type FilterDefTypes = {
  matte?: any
  key: string
  additionalDefs?: React.ReactNode
}

export const filterDefs = ({ matte, key, additionalDefs }: FilterDefTypes) => (
  <defs>
    <filter id="paintyFilterHeavy">
      <feGaussianBlur
        id="gaussblurrer"
        in="SourceGraphic"
        stdDeviation={4}
        colorInterpolationFilters="sRGB"
        result="blur"
      />
      <feColorMatrix
        in="blur"
        mode="matrix"
        values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 34 -7"
        result="gooey"
      />
    </filter>
    <filter id="paintyFilterLight">
      <feGaussianBlur
        id="gaussblurrer"
        in="SourceGraphic"
        stdDeviation={2}
        colorInterpolationFilters="sRGB"
        result="blur"
      />
      <feColorMatrix
        in="blur"
        mode="matrix"
        values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 34 -7"
        result="gooey"
      />
    </filter>
    <clipPath id={`matte-clip-${key}`}>{matte}</clipPath>
    {additionalDefs}
  </defs>
)

export const generateFinalDefs = ({
  matte,
  size,
  margin,
  frameKey,
  additionalDefs,
  name
}) => {
  let marginGraphic

  if (typeof matte === "function") {
    marginGraphic = matte({ size, margin })
  } else if (React.isValidElement(matte)) {
    marginGraphic = matte
  } else if (matte === true) {
    marginGraphic = (
      <path
        fill="white"
        transform={`translate(${-margin.left},${-margin.top})`}
        d={drawMarginPath({
          margin,
          size: size,
          inset: 0
        })}
        className={`${name}-matte`}
      />
    )
  }

  const finalFilterDefs = filterDefs({
    matte: marginGraphic,
    key: matte && (frameKey || name),
    additionalDefs: additionalDefs
  })

  return { defs: finalFilterDefs, matte: marginGraphic }
}
