import * as React from "react"
import type { ChartNotification } from "./ChartContainer"
import type { ChartConfig } from "./export/chartConfig"
import type { ChartContainerDataAudit } from "./chartContainerDataAudit"

const EMPTY_NOTIFICATIONS: ChartNotification[] = []

type DataAuditModule = typeof import("./chartContainerDataAudit")
type AuditableChartConfig = Pick<ChartConfig, "component" | "props">
let dataAuditModule: Promise<DataAuditModule> | undefined

function loadDataAudit(): Promise<DataAuditModule> {
  dataAuditModule ??= import("./chartContainerDataAudit").catch((error) => {
    dataAuditModule = undefined
    throw error
  })
  return dataAuditModule
}

/** Load the opt-in numeric evaluator only when a container asks for it. */
export function useChartContainerDataAudit(
  chartConfig: AuditableChartConfig | undefined,
  dataAudit: ChartContainerDataAudit | undefined,
): ChartNotification[] {
  const [notifications, setNotifications] = React.useState<ChartNotification[]>(
    EMPTY_NOTIFICATIONS,
  )
  const component = chartConfig?.component
  const props = chartConfig?.props
  const enabled = Boolean(dataAudit)
  const checkOutliers =
    typeof dataAudit === "object" ? dataAudit.checkOutliers : undefined
  const errorsOnly =
    typeof dataAudit === "object" ? dataAudit.errorsOnly : undefined
  const max = typeof dataAudit === "object" ? dataAudit.max : undefined

  React.useEffect(() => {
    let current = true
    if (!enabled || !component || !props) {
      setNotifications((previous) =>
        previous.length === 0 ? previous : EMPTY_NOTIFICATIONS,
      )
      return () => {
        current = false
      }
    }

    void loadDataAudit()
      .then(({ buildChartDataAuditNotifications }) => {
        if (current) {
          setNotifications(
            buildChartDataAuditNotifications(
              { component, props },
              { checkOutliers, errorsOnly, max },
            ),
          )
        }
      })
      .catch(() => {
        if (current) setNotifications(EMPTY_NOTIFICATIONS)
      })

    return () => {
      current = false
    }
  }, [checkOutliers, component, enabled, errorsOnly, max, props])

  return notifications
}
