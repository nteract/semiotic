import type { ChartNotification } from "./ChartContainer"
import type { ChartConfig } from "./export/chartConfig"
import { auditData } from "./data/auditData"
import {
  toDataAuditNotifications,
  type DataAuditNotificationOptions,
} from "./data/dataAuditPresentation"
import type { AuditDataOptions } from "./data/auditData"

export interface ChartContainerDataAuditOptions
  extends Pick<AuditDataOptions, "checkOutliers">,
    DataAuditNotificationOptions {}

export type ChartContainerDataAudit = boolean | ChartContainerDataAuditOptions

type AuditableChartConfig = Pick<ChartConfig, "component" | "props">

export function buildChartDataAuditNotifications(
  chartConfig: AuditableChartConfig | undefined,
  dataAudit: ChartContainerDataAudit | undefined,
): ChartNotification[] {
  if (!dataAudit || !chartConfig?.component || !chartConfig.props) return []
  const options = typeof dataAudit === "object" ? dataAudit : {}
  try {
    const result = auditData(chartConfig.component, chartConfig.props, undefined, {
      checkOutliers: options.checkOutliers,
    })
    return toDataAuditNotifications(result, {
      max: options.max,
      errorsOnly: options.errorsOnly,
    })
  } catch {
    // Function accessors are contained per row by auditData. This final guard
    // keeps container chrome fail-safe for throwing third-party proxy objects.
    return []
  }
}

