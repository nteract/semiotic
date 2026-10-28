"use client"
import * as React from "react"
import { ChartErrorBoundary } from "../../ChartErrorBoundary"
import ChartError from "./ChartError"
import { withDisplayName } from "./withDisplayName"

interface ChartBoundaryProps {
  width?: number
  height?: number
  size?: [number, number]
  responsiveWidth?: boolean
  responsiveHeight?: boolean
}

/** Protect chart setup as well as its frame, preserving generic props and refs. */
export function withChartErrorBoundary<T extends React.ComponentType<never>>(
  component: T,
  componentName: string
): T {
  // React's HOC types cannot retain a generic chart's call signature. The
  // wrapper passes every prop and the original ref through without conversion.
  const Chart = component as unknown as React.ComponentType<
    ChartBoundaryProps & React.RefAttributes<unknown>
  >
  const Wrapped = withDisplayName(
    React.forwardRef<unknown, ChartBoundaryProps>(
      function ChartWithErrorBoundary(props, ref) {
        return (
          <ChartErrorBoundary
            fallback={(error) => (
              <ChartError
                componentName={componentName}
                message={error.message}
                width={
                  props.responsiveWidth
                    ? "100%"
                    : (props.size?.[0] ?? props.width ?? "100%")
                }
                height={
                  props.responsiveHeight
                    ? "100%"
                    : (props.size?.[1] ?? props.height ?? "100%")
                }
              />
            )}
          >
            <Chart {...props} {...(ref == null ? {} : { ref })} />
          </ChartErrorBoundary>
        )
      }
    ),
    componentName
  )
  return Wrapped as unknown as T
}
