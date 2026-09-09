import React, { useRef, useState } from "react"
import { UnitPileChart } from "semiotic/physics"
import "./PhysicsLivePileDemo.css"

type Row = { id: string; category: string; value: number }
const initialRows: Row[] = [
  { id: "first", category: "A", value: 49 },
  { id: "second", category: "A", value: 49 },
]

export default function PhysicsLivePileDemo() {
  const ref = useRef<React.ComponentRef<typeof UnitPileChart>>(null)
  const nextId = useRef(0)
  const [data, setData] = useState(initialRows)
  const [rows, setRows] = useState(initialRows)
  const [unitValue, setUnitValue] = useState(100)
  const [paused, setPaused] = useState(false)
  const total = rows.reduce((sum, row) => sum + row.value, 0)

  function edit(action: (chart: NonNullable<typeof ref.current>) => void) {
    if (!ref.current) return
    action(ref.current)
    setRows(ref.current.getData() as Row[])
  }

  return (
    <section className="physics-live-demo" aria-label="Live pile editor">
      <div className="physics-live-demo__controls">
        <button
          type="button"
          onClick={() =>
            edit((chart) =>
              chart.push({ id: `added-${nextId.current++}`, category: "A", value: 49 }),
            )
          }
        >
          Add 49 to A
        </button>
        <button
          type="button"
          disabled={rows.some((row) => row.category === "B")}
          onClick={() =>
            edit((chart) =>
              chart.push({ id: `added-${nextId.current++}`, category: "B", value: 100 }),
            )
          }
        >
          Add category B
        </button>
        <button
          type="button"
          disabled={!rows.length}
          onClick={() =>
            edit((chart) => chart.update(rows[0].id, (row) => ({ ...row, value: row.value * 2 })))
          }
        >
          Double first record
        </button>
        <button
          type="button"
          disabled={!rows.length}
          onClick={() => edit((chart) => chart.remove(rows[rows.length - 1].id))}
        >
          Remove last record
        </button>
        <button
          type="button"
          disabled={!rows.length}
          onClick={() => edit((chart) => chart.clear())}
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => {
            const fresh = initialRows.map((row) => ({ ...row }))
            setData(fresh)
            setRows(fresh)
          }}
        >
          Reset 49 + 49
        </button>
        <label>
          Value per full circle
          <select value={unitValue} onChange={(event) => setUnitValue(Number(event.target.value))}>
            <option value={100}>100</option>
            <option value={50}>50</option>
            <option value={10}>10</option>
          </select>
        </label>
        <label className="physics-live-demo__pause">
          <input
            type="checkbox"
            checked={paused}
            onChange={(event) => setPaused(event.target.checked)}
          />
          Pause motion
        </label>
      </div>
      <p className="physics-live-demo__total" role="status">
        {rows.length} source records · Total {total}
      </p>
      <div className="physics-live-demo__scene">
        <div className="physics-live-demo__chart">
          <UnitPileChart
            ref={ref}
            data={data}
            valueAccessor="value"
            categoryAccessor="category"
            colorBy="category"
            unitValue={unitValue}
            ballRadius={16}
            responsiveWidth
            height={300}
            paused={paused}
            title="Live category totals"
            description="Full and partial circles represent the source quantities. Category labels report exact totals."
          />
        </div>
        <table>
          <caption>Source records</caption>
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col">Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.category}</td>
                <td>{row.value}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              <td>{total}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  )
}
