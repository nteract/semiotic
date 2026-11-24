import { useMemo } from "react"

import { buildFormatter } from "./formatting"
import type { BigNumberFormat, BigNumberTarget } from "./types"

export interface TargetPresentation {
  label: string | undefined
  percent: string | null
  formattedValue: string
  text: string
}

interface UseTargetPresentationOptions {
  target: BigNumberTarget | undefined
  value: number | null | undefined
  format: BigNumberFormat | undefined
  locale: string | undefined
  currency: string | undefined
  precision: number | undefined
}

export function useValueFormatter(
  format: BigNumberFormat | undefined, locale?: string, currency?: string, precision?: number
) {
  return useMemo(() => buildFormatter(format ?? "number", { locale, currency, precision }),
    [format, locale, currency, precision])
}

/**
 * Format a finite target once for both visible chrome and the accessible
 * sentence. Invalid target values are omitted rather than announcing NaN or
 * infinity.
 */
export function useTargetPresentation({
  target,
  value,
  format,
  locale,
  currency,
  precision
}: UseTargetPresentationOptions): TargetPresentation | null {
  const percentFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale ?? "en-US", {
        style: "percent",
        maximumFractionDigits: 0
      }),
    [locale]
  )
  const targetFormatter = useValueFormatter(target?.format ?? format, locale, currency, precision)

  return useMemo(() => {
    if (!target || !Number.isFinite(target.value)) return null

    const percent =
      typeof value === "number" &&
      Number.isFinite(value) &&
      target.value !== 0
        ? percentFormatter.format(value / target.value)
        : null
    const formattedValue = targetFormatter(target.value)
    const amount = target.label ? `${target.label} (${formattedValue})` : formattedValue
    const text = percent ? `${percent} of ${amount}` : `target ${amount}`

    return { label: target.label, percent, formattedValue, text }
  }, [target, value, targetFormatter, percentFormatter])
}
