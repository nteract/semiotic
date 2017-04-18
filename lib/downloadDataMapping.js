'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

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

var cleanDates = function cleanDates(value) {
  if (value.toJSON) {
    return value.toJSON();
  }
  return value;
};

var xyDownloadMapping = exports.xyDownloadMapping = function xyDownloadMapping(_ref) {
  var data = _ref.data,
      dataAccessor = _ref.dataAccessor,
      xAccessor = _ref.xAccessor,
      yAccessor = _ref.yAccessor,
      fields = _ref.fields;

  var csvData = [];
  data.forEach(function (d) {
    var datum = dataAccessor ? dataAccessor(d) : d.coordinates || d;
    if (Array.isArray(datum)) {
      datum.forEach(function (a) {
        var row = {};
        if (xAccessor) {
          row.x = cleanDates(xAccessor(a));
        } else if (a.x) {
          row.x = a.x;
        }

        if (yAccessor) {
          row.y = cleanDates(yAccessor(a));
        } else if (a.y) {
          row.y = a.y;
        }

        if (d.id !== undefined) row.id = d.id;

        if (fields && Array.isArray(fields)) {
          fields.forEach(function (f) {
            row[f] = cleanDates(a[f]);
          });
        }

        csvData.push(row);
      });
    } else {
      var row = {};
      if (xAccessor) {
        row.x = cleanDates(xAccessor(datum));
      } else if (datum.x) {
        row.x = datum.x;
      }

      if (yAccessor) {
        row.y = cleanDates(yAccessor(datum));
      } else if (datum.y) {
        row.y = datum.y;
      }

      if (datum.id !== undefined) {
        row.id = datum.id;
      }

      if (fields && Array.isArray(fields)) {
        fields.forEach(function (f) {
          row[f] = datum[f];
        });
      }
    }
  });

  return csvData;
};

//TODO add OR frame mapping
var orDownloadMapping = exports.orDownloadMapping = function orDownloadMapping() {
  //test
  console.log('need to add this ');
};