export const chuckCloseCanvasTransform = (
  canvas,
  context,
  size,
  pixelSize = 10
) => {
  const [baseWidth, baseHeight] = size

  const height =
    baseHeight +
    (baseHeight % pixelSize === 0 ? 0 : pixelSize - baseHeight % pixelSize)

  const width =
    baseWidth +
    (baseWidth % pixelSize === 0 ? 0 : pixelSize - baseWidth % pixelSize)

  const rgbStep = 4 * pixelSize

  const imageData = context.getImageData(0, 0, width, height)
  const rgbaArray = []
  const imageArray = imageData.data

  const rgbWidth = width * 4
  const halfPixelSize = pixelSize / 2

  for (let i = 0; i < imageArray.length; i += rgbStep) {
    let pixelPoint = {}
    if (pixelSize === 1) {
      pixelPoint = {
        r: imageArray[i],
        g: imageArray[i + 1],
        b: imageArray[i + 2],
        a: imageArray[i + 3],
        x: (i / 4) % width,
        y: Math.floor(i / 4 / width)
      }
    } else {
      const rgbHash = {}
      let totalHash = 0

      for (let p = 0; p < pixelSize * 4; p += pixelSize * 4) {
        for (let q = 0; q < pixelSize * rgbWidth; q += rgbWidth) {
          if (imageArray[p + i + q + 3] !== -1) {
            const hashVal = `rgba(${imageArray[p + i + q]},${
              imageArray[p + i + q + 1]
            },${imageArray[p + i + q + 2]},${imageArray[p + i + q + 3]})`
            rgbHash[hashVal] = rgbHash[hashVal] ? rgbHash[hashVal] + 1 : 1
            totalHash += 1
          }
        }
      }
      pixelPoint = {
        rgbEntries: Object.entries(rgbHash).sort((a, b) => b[1] - a[1]),
        totalEntries: totalHash,
        x: (i / 4) % width,
        y: Math.floor(i / 4 / width),
        rmod: pixelSize
      }
    }

    rgbaArray.push(pixelPoint)
    if (pixelSize !== 1 && (i + rgbStep) % rgbWidth === 0) {
      i += rgbWidth * (pixelSize - 1)
    }
  }

  const scale = 1
  const r = scale / 2
  context.clearRect(0, 0, width, height)
  const circleArc = 2 * Math.PI
  rgbaArray.forEach(point => {
    let currentR = r * pixelSize
    let rStep = currentR / point.totalEntries
    const baseX = point.x * scale + halfPixelSize
    const baseY = point.y * scale + halfPixelSize
    point.rgbEntries.forEach(e => {
      context.fillStyle = e[0]
      context.beginPath()
      context.arc(baseX, baseY, currentR, 0, circleArc)
      context.fill()
      currentR -= e[1] * rStep
    })
  })
}
