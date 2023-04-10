/**
 * Ckmeans algorithm from d3-scale-cluster
 *
 * Much of the code that lies within was taken from the simple-statistics library,
 * which offers a javascript implementation of the ckmeans algorithm originally
 * designed by Haizhou Wang and Mingzhou Song
 *
 * https://cran.r-project.org/web/packages/Ckmeans.1d.dp/
 * https://github.com/simple-statistics/simple-statistics
 *
 * The simple-statistics software license is included below
 *
 * --
 *
 * ISC License
 *
 * Copyright (c) 2014, Tom MacWright
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
 * REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
 * FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
 * INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
 * LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
 * OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
 * PERFORMANCE OF THIS SOFTWARE.
 */

function numericSort(array) {
  return (
    array
      // ensure the array is not changed in-place
      .slice()
      // comparator function that treats input as numeric
      .sort(function (a, b) {
        return a - b
      })
  )
}

function uniqueCountSorted(input) {
  var uniqueValueCount = 0
  var lastSeenValue
  for (var i = 0; i < input.length; i++) {
    if (i === 0 || input[i] !== lastSeenValue) {
      lastSeenValue = input[i]
      uniqueValueCount++
    }
  }
  return uniqueValueCount
}

function makeMatrix(columns, rows) {
  var matrix = []
  for (var i = 0; i < columns; i++) {
    var column = []
    for (var j = 0; j < rows; j++) {
      column.push(0)
    }
    matrix.push(column)
  }
  return matrix
}

function ssq(j, i, sumX, sumXsq) {
  var sji // s(j, i)
  if (j > 0) {
    var muji = (sumX[i] - sumX[j - 1]) / (i - j + 1) // mu(j, i)
    sji = sumXsq[i] - sumXsq[j - 1] - (i - j + 1) * muji * muji
  } else {
    sji = sumXsq[i] - (sumX[i] * sumX[i]) / (i + 1)
  }
  return sji < 0 ? 0 : sji
}

function fillMatrixColumn(
  imin,
  imax,
  column,
  matrix,
  backtrackMatrix,
  sumX,
  sumXsq
) {
  if (imin > imax) {
    return
  }

  // Start at midpoint between imin and imax
  var i = Math.floor((imin + imax) / 2)

  // Initialization of S[k][i]:
  matrix[column][i] = matrix[column - 1][i - 1]
  backtrackMatrix[column][i] = i

  var jlow = column // the lower end for j

  if (imin > column) {
    jlow = Math.max(jlow, backtrackMatrix[column][imin - 1] || 0)
  }
  jlow = Math.max(jlow, backtrackMatrix[column - 1][i] || 0)

  var jhigh = i - 1 // the upper end for j
  if (imax < matrix[0].length - 1) {
    jhigh = Math.min(jhigh, backtrackMatrix[column][imax + 1] || 0)
  }

  var sji
  var sjlowi
  var ssqjlow
  var ssqj
  for (var j = jhigh; j >= jlow; --j) {
    // compute s(j,i)
    sji = ssq(j, i, sumX, sumXsq)

    // MS May 11, 2016 Added:
    if (sji + matrix[column - 1][jlow - 1] >= matrix[column][i]) {
      break
    }

    // Examine the lower bound of the cluster border
    // compute s(jlow, i)
    sjlowi = ssq(jlow, i, sumX, sumXsq)

    ssqjlow = sjlowi + matrix[column - 1][jlow - 1]

    if (ssqjlow < matrix[column][i]) {
      // shrink the lower bound
      matrix[column][i] = ssqjlow
      backtrackMatrix[column][i] = jlow
    }
    jlow++

    ssqj = sji + matrix[column - 1][j - 1]
    if (ssqj < matrix[column][i]) {
      matrix[column][i] = ssqj
      backtrackMatrix[column][i] = j
    }
  }

  fillMatrixColumn(imin, i - 1, column, matrix, backtrackMatrix, sumX, sumXsq)
  fillMatrixColumn(i + 1, imax, column, matrix, backtrackMatrix, sumX, sumXsq)
}

function fillMatrices(data, matrix, backtrackMatrix) {
  var nValues = matrix[0].length
  var sumX = new Array(nValues)
  var sumXsq = new Array(nValues)

  // Use the median to shift values of x to improve numerical stability
  var shift = data[Math.floor(nValues / 2)]

  // Initialize first row in matrix & backtrackMatrix
  for (var i = 0; i < nValues; ++i) {
    if (i === 0) {
      sumX[0] = data[0] - shift
      sumXsq[0] = (data[0] - shift) * (data[0] - shift)
    } else {
      sumX[i] = sumX[i - 1] + data[i] - shift
      sumXsq[i] = sumXsq[i - 1] + (data[i] - shift) * (data[i] - shift)
    }

    // Initialize for k = 0
    matrix[0][i] = ssq(0, i, sumX, sumXsq)
    backtrackMatrix[0][i] = 0
  }

  // Initialize the rest of the columns
  var imin
  for (var k = 1; k < matrix.length; ++k) {
    if (k < matrix.length - 1) {
      imin = k
    } else {
      // No need to compute matrix[K-1][0] ... matrix[K-1][N-2]
      imin = nValues - 1
    }

    fillMatrixColumn(
      imin,
      nValues - 1,
      k,
      matrix,
      backtrackMatrix,
      sumX,
      sumXsq
    )
  }
}

/**
 * Ckmeans clustering is an improvement on heuristic-based clustering
 * approaches like Jenks. The algorithm was developed in
 * [Haizhou Wang and Mingzhou Song](http://journal.r-project.org/archive/2011-2/RJournal_2011-2_Wang+Song.pdf)
 * as a [dynamic programming](https://en.wikipedia.org/wiki/Dynamic_programming) approach
 * to the problem of clustering numeric data into groups with the least
 * within-group sum-of-squared-deviations.
 *
 * Minimizing the difference within groups - what Wang & Song refer to as
 * `withinss`, or within sum-of-squares, means that groups are optimally
 * homogenous within and the data is split into representative groups.
 * This is very useful for visualization, where you may want to represent
 * a continuous variable in discrete color or style groups. This function
 * can provide groups that emphasize differences between data.
 *
 * Being a dynamic approach, this algorithm is based on two matrices that
 * store incrementally-computed values for squared deviations and backtracking
 * indexes.
 *
 * Unlike the [original implementation](https://cran.r-project.org/web/packages/Ckmeans.1d.dp/index.html),
 * this implementation does not include any code to automatically determine
 * the optimal number of clusters: this information needs to be explicitly
 * provided.
 *
 * ### References
 * _Ckmeans.1d.dp: Optimal k-means Clustering in One Dimension by Dynamic
 * Programming_ Haizhou Wang and Mingzhou Song ISSN 2073-4859
 *
 * from The R Journal Vol. 3/2, December 2011
 * @param {Array<number>} data input data, as an array of number values
 * @param {number} nClusters number of desired classes. This cannot be
 * greater than the number of values in the data array.
 * @returns {Array<Array<number>>} clustered input
 * @example
 * ckmeans([-1, 2, -1, 2, 4, 5, 6, -1, 2, -1], 3);
 * // The input, clustered into groups of similar numbers.
 * //= [[-1, -1, -1, -1], [2, 2, 2], [4, 5, 6]]);
 */

export function ckmeans(data, nClusters) {
  if (nClusters > data.length) {
    throw new Error("Cannot generate more classes than there are data values")
  }

  var nValues = data.length

  var sorted = numericSort(data)
  // we'll use this as the maximum number of clusters
  var uniqueCount = uniqueCountSorted(sorted)

  // if all of the input values are identical, there's one cluster
  // with all of the input in it.
  if (uniqueCount === 1) {
    return [sorted[0]]
  }
  nClusters = Math.min(uniqueCount, nClusters)

  // named 'S' originally
  var matrix = makeMatrix(nClusters, nValues)
  // named 'J' originally
  var backtrackMatrix = makeMatrix(nClusters, nValues)

  // This is a dynamic programming way to solve the problem of minimizing
  // within-cluster sum of squares. It's similar to linear regression
  // in this way, and this calculation incrementally computes the
  // sum of squares that are later read.
  fillMatrices(sorted, matrix, backtrackMatrix)

  // The real work of Ckmeans clustering happens in the matrix generation:
  // the generated matrices encode all possible clustering combinations, and
  // once they're generated we can solve for the best clustering groups
  // very quickly.
  var clusters = []
  var clusterRight = backtrackMatrix[0].length - 1

  // Backtrack the clusters from the dynamic programming matrix. This
  // starts at the bottom-right corner of the matrix (if the top-left is 0, 0),
  // and moves the cluster target with the loop.
  for (var cluster = backtrackMatrix.length - 1; cluster >= 0; cluster--) {
    var clusterLeft = backtrackMatrix[cluster][clusterRight]

    // fill the cluster from the sorted input by taking a slice of the
    // array. the backtrack matrix makes this easy - it stores the
    // indexes where the cluster should start and end.
    clusters[cluster] = sorted[clusterLeft]

    if (cluster > 0) {
      clusterRight = clusterLeft - 1
    }
  }

  return clusters
}
