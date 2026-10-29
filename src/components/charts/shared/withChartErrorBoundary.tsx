"use client"
import * as React from "react"
import { ChartErrorBoundary } from "../../ChartErrorBoundary"
import ChartError from "./ChartError"
import { isChartMode, resolveChartMode, type ChartModeInput } from "./chartMode"

interface ChartBoundaryProps extends ChartModeInput {
  mode?: string
  size?: [number, number]
  responsiveWidth?: boolean
  responsiveHeight?: boolean
}

interface ErrorSize {
  width?: number | string
  height?: number | string
}

type ChartProps<T> = T extends React.ComponentType<infer P> ? P : never

/** Protect charts using the same mode and family defaults as their setup. */
export function withChartErrorBoundary<T extends React.ComponentType<never>>(
  component: T,
  componentName: string,
  primarySize?: { width?: number; height?: number }
): T {
  return withSizedChartErrorBoundary(component, componentName, (input) => {
    const props = input as ChartBoundaryProps
    // Physics layouts reserve explicit tuples after mode/rule resolution.
    if (primarySize && props.size) {
      return {
        width: Math.max(1, props.size[0]),
        height: Math.max(1, props.size[1])
      }
    }
    return resolveChartMode(
      isChartMode(props.mode) ? props.mode : undefined,
      {
        ...props,
        width: props.size?.[0] ?? props.width,
        height: props.size?.[1] ?? props.height
      },
      primarySize
    )
  })
}

/** Protect chart setup and frames, retaining custom composition sizes and refs. */
export function withSizedChartErrorBoundary<
  T extends React.ComponentType<never>
>(
  component: T,
  componentName: string,
  resolveSize: (props: ChartProps<T>) => ErrorSize
): T {
  // React's HOC types cannot retain a generic chart's call signature. The
  // wrapper passes every prop and the original ref through without conversion.
  const Chart = component as unknown as React.ComponentType<
    ChartBoundaryProps & React.RefAttributes<unknown>
  >
  const Wrapped = React.forwardRef<unknown, ChartBoundaryProps>(
    function ChartWithErrorBoundary(props, ref) {
      return (
        <ChartErrorBoundary
          fallback={(error) => {
            const size = resolveSize(props as ChartProps<T>)
            return (
              <ChartError
                componentName={componentName}
                message={error.message}
                width={props.responsiveWidth ? "100%" : (size.width ?? "auto")}
                height={
                  props.responsiveHeight
                    ? "100%"
                    : typeof size.height === "number"
                      ? `${size.height}px`
                      : (size.height ?? "auto")
                }
              />
            )
          }}
        >
          <Chart {...props} {...(ref == null ? {} : { ref })} />
        </ChartErrorBoundary>
      )
    }
  )
  Wrapped.displayName = componentName
  return Wrapped as unknown as T
}
