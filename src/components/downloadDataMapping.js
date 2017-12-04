const cleanDates = value => {
  if (value && value.toJSON) {
    return value.toJSON()
  }
  return value
}

export const xyDownloadMapping = ({
  data,
  xAccessor,
  yAccessor,
  fields = []
}) => {
  const csvData = []
  data.forEach(datum => {
    if (Array.isArray(datum)) {
      datum.forEach(a => {
        const row = {}
        if (xAccessor) {
          row.x = cleanDates(xAccessor(a))
        } else if (a.x) {
          row.x = a.x
        }

        if (yAccessor) {
          row.y = cleanDates(yAccessor(a))
        } else if (a.y) {
          row.y = a.y
        }

        if (datum.id !== undefined) row.id = datum.id

        if (fields && Array.isArray(fields)) {
          fields.forEach(f => {
            row[f] = cleanDates(a[f])
          })
        }

        csvData.push(row)
      })
    } else {
      const row = {}
      if (xAccessor) {
        row.x = cleanDates(xAccessor(datum))
      } else if (datum.x) {
        row.x = datum.x
      }

      if (yAccessor) {
        row.y = cleanDates(yAccessor(datum))
      } else if (datum.y) {
        row.y = datum.y
      }

      if (datum.id !== undefined) {
        row.id = datum.id
      }

      fields.forEach(f => {
        row[f] = datum[f]
      })
      csvData.push(row)
    }
  })
  return csvData
}

export const orDownloadMapping = ({
  data,
  columns,
  oAccessor,
  rAccessor,
  fields = []
}) => {
  const dataKeys = Object.keys(data)
  const csvData = []

  dataKeys.forEach(key => {
    data[key].pieceData.forEach(piece => {
      const row = {}
      if (oAccessor) {
        row.column = oAccessor(piece)
      } else if (piece.x) {
        row.column = piece.x
      }

      if (rAccessor) {
        row.value = rAccessor(piece)
      } else if (piece.renderKey) {
        row.value = piece.renderKey
      }

      if (piece.id !== undefined) row.id = piece.id

      fields.forEach(f => {
        row[f] = cleanDates(piece[f])
      })

      csvData.push(row)
    })
  })

  return csvData
}

export const networkNodeDownloadMapping = ({ data, fields = [] }) => {
  const csvData = []
  data.forEach(d => {
    const row = {}
    row.id = d.id
    fields.forEach(f => {
      row[f] = d[f]
    })
    csvData.push(row)
  })
  return csvData
}

export const networkEdgeDownloadMapping = ({ data, fields = [] }) => {
  const csvData = []
  data.forEach(d => {
    const row = {}
    row.source = d.source.id
    row.target = d.target.id
    fields.forEach(f => {
      row[f] = d[f]
    })
    csvData.push(row)
  })

  return csvData
}
