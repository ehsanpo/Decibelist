import { KnobHeadless } from 'react-knob-headless'
import { classNames } from '../../utils/classNames'
import { clamp, roundToStep } from '../../utils/number'

export function KnobControl({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  size = 'md',
  onChange,
  formatValue,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  size?: 'sm' | 'md'
  onChange: (value: number) => void
  formatValue?: (value: number) => string
}) {
  const safeValue = clamp(value, min, max)
  const roundedValue = roundToStep(safeValue, min, max, step)
  const range = max - min
  const ratio = range === 0 ? 0 : (roundedValue - min) / range
  const angle = -135 + clamp(ratio, 0, 1) * 270
  const decimals = step >= 1 ? 0 : Math.min(3, Math.ceil(Math.abs(Math.log10(step))))
  const displayValue = formatValue
    ? formatValue(roundedValue)
    : `${roundedValue.toFixed(decimals)}${unit ? ` ${unit}` : ''}`
  const sizeClass = size === 'sm' ? 'h-20 w-20' : 'h-24 w-24'

  return (
    <div className="flex flex-col items-center gap-2">
      <KnobHeadless
        aria-label={label}
        className={classNames('knob-shell', sizeClass)}
        dragSensitivity={0.006}
        onValueRawChange={(raw) => onChange(roundToStep(raw, min, max, step))}
        style={{ ['--knob-angle' as string]: `${angle}deg` }}
        valueMax={max}
        valueMin={min}
        valueRaw={roundedValue}
        valueRawRoundFn={(raw) => roundToStep(raw, min, max, step)}
        valueRawDisplayFn={(raw) => {
          const rounded = roundToStep(raw, min, max, step)
          return formatValue
            ? formatValue(rounded)
            : `${rounded.toFixed(decimals)}${unit ? ` ${unit}` : ''}`
        }}
      >
        <div className="knob-cap" />
        <div className="knob-indicator">
          <span />
        </div>
      </KnobHeadless>
      <div className="knob-value">{displayValue}</div>
      <div className="knob-label">{label}</div>
    </div>
  )
}
