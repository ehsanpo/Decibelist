export function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min
  }
  return Math.min(max, Math.max(min, value))
}

export function roundToStep(value: number, min: number, max: number, step = 1) {
  if (!Number.isFinite(value)) {
    return min
  }
  if (!Number.isFinite(step) || step <= 0) {
    return clamp(value, min, max)
  }
  const rounded = Math.round((value - min) / step) * step + min
  const fixed = Number.parseFloat(rounded.toFixed(6))
  return clamp(fixed, min, max)
}
