export type SpectrogramData = {
  data: number[][]
  rows: number
  cols: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function createHannWindow(size: number) {
  const window = new Float32Array(size)
  const denom = size - 1
  for (let i = 0; i < size; i += 1) {
    window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / denom))
  }
  return window
}

function fftRadix2(re: Float32Array, im: Float32Array) {
  const n = re.length
  let j = 0
  for (let i = 1; i < n; i += 1) {
    let bit = n >> 1
    while (j & bit) {
      j ^= bit
      bit >>= 1
    }
    j ^= bit
    if (i < j) {
      const tempRe = re[i]
      const tempIm = im[i]
      re[i] = re[j]
      im[i] = im[j]
      re[j] = tempRe
      im[j] = tempIm
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len
    const wLenRe = Math.cos(ang)
    const wLenIm = Math.sin(ang)
    for (let i = 0; i < n; i += len) {
      let wRe = 1
      let wIm = 0
      for (let j = 0; j < len / 2; j += 1) {
        const evenIndex = i + j
        const oddIndex = i + j + len / 2
        const uRe = re[evenIndex]
        const uIm = im[evenIndex]
        const vRe = re[oddIndex] * wRe - im[oddIndex] * wIm
        const vIm = re[oddIndex] * wIm + im[oddIndex] * wRe
        re[evenIndex] = uRe + vRe
        im[evenIndex] = uIm + vIm
        re[oddIndex] = uRe - vRe
        im[oddIndex] = uIm - vIm
        const nextRe = wRe * wLenRe - wIm * wLenIm
        wIm = wRe * wLenIm + wIm * wLenRe
        wRe = nextRe
      }
    }
  }
}

export function computeSpectrogram(
  buffer: AudioBuffer,
  {
    rows,
    cols,
    fftSize,
    minDb = -80,
  }: {
    rows: number
    cols: number
    fftSize: number
    minDb?: number
  }
): SpectrogramData {
  const length = buffer.length
  const channels = buffer.numberOfChannels
  const mono = new Float32Array(length)
  for (let channel = 0; channel < channels; channel += 1) {
    const data = buffer.getChannelData(channel)
    for (let i = 0; i < length; i += 1) {
      mono[i] += data[i] / channels
    }
  }

  const window = createHannWindow(fftSize)
  const half = fftSize / 2
  const binSize = Math.max(1, Math.floor(half / rows))
  const data: number[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0))
  const re = new Float32Array(fftSize)
  const im = new Float32Array(fftSize)
  let maxMag = 1e-9

  const maxStart = Math.max(0, length - fftSize)
  for (let col = 0; col < cols; col += 1) {
    const start = Math.floor((col * maxStart) / Math.max(1, cols - 1))
    for (let i = 0; i < fftSize; i += 1) {
      const sample = mono[start + i] ?? 0
      re[i] = sample * window[i]
      im[i] = 0
    }

    fftRadix2(re, im)

    for (let row = 0; row < rows; row += 1) {
      const binStart = row * binSize
      const binEnd = row === rows - 1 ? half : binStart + binSize
      let sum = 0
      for (let bin = binStart; bin < binEnd; bin += 1) {
        sum += Math.hypot(re[bin], im[bin])
      }
      const avg = sum / (binEnd - binStart)
      data[row][col] = avg
      if (avg > maxMag) {
        maxMag = avg
      }
    }
  }

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const mag = data[row][col] / maxMag
      const db = 20 * Math.log10(mag + 1e-12)
      data[row][col] = clamp((db - minDb) / (0 - minDb), 0, 1)
    }
  }

  return { data, rows, cols }
}

export function averageSpectrum(spectrogram: SpectrogramData, defaultValue = 0) {
  const { data, rows, cols } = spectrogram
  if (!cols) {
    return Array.from({ length: rows }, () => defaultValue)
  }
  return data.map((row) => row.reduce((sum, value) => sum + value, 0) / cols)
}

export function diffSpectrogram(a: SpectrogramData, b: SpectrogramData): SpectrogramData {
  const rows = Math.min(a.rows, b.rows)
  const cols = Math.min(a.cols, b.cols)
  const data = Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => Math.abs(a.data[row][col] - b.data[row][col]))
  )
  return { data, rows, cols }
}
