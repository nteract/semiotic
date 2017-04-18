
// const setupRow = ( series, datum, xAccessor, yAccessor, fields ) => {
//   const row = {
//       x: xAccessor(datum),
//       y: yAccessor(datum)
//     }
  
//     if (series && series.id !== undefined){
//       row.id = d.id
//     }

//     if (fields && Array.isArray(fields)){
//       fields.forEach(f => {
//         row[f] = a[f]
//       })
//     }
//   return row
// }

const cleanDates = (value) => {
  if (value.toJSON){
    return value.toJSON()
  }
  return value
}

export const xyDownloadMapping = ({ data, dataAccessor, xAccessor, yAccessor, fields }) => {
  const csvData = []
  data.forEach(d => {
    const datum = dataAccessor ? dataAccessor(d) : d.coordinates || d
    if (Array.isArray(datum)){
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

        if (d.id !== undefined) row.id = d.id

        if (fields && Array.isArray(fields)){
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
        
      if (datum.id !== undefined){
        row.id = datum.id
      }

      if (fields && Array.isArray(fields)){
        fields.forEach(f => {
          row[f] = datum[f]
        })
      }
    }
  })

  return csvData
}

//TODO add OR frame mapping
export const orDownloadMapping= () => {
  //test
  console.log('need to add this ')
}
