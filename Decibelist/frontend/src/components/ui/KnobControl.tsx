import { KnobHeadless } from "react-knob-headless";
import { useId } from "react";
import { classNames } from "../../utils/classNames";
import { clamp, roundToStep } from "../../utils/number";

export function KnobControl({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  size = "md",
  tone = "cyan",
  onChange,
  formatValue,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  size?: "sm" | "md";
  tone?: "cyan" | "amber" | "emerald";
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
}) {
  const id = useId();
  const shellId = `knob-shell-${id.replace(/:/g, "")}`;
  const coreId = `knob-core-${id.replace(/:/g, "")}`;

  const accentColor =
    tone === "amber" ? "#ffbb3b" : tone === "emerald" ? "#7dff6b" : "#6ff3ff";

  const safeValue = clamp(value, min, max);
  const roundedValue = roundToStep(safeValue, min, max, step);
  const range = max - min;
  const ratio = range === 0 ? 0 : (roundedValue - min) / range;
  const angle = -135 + clamp(ratio, 0, 1) * 270;

  const decimals =
    step >= 1 ? 0 : Math.min(3, Math.ceil(Math.abs(Math.log10(step))));
  const displayValue = formatValue
    ? formatValue(roundedValue)
    : `${roundedValue.toFixed(decimals)}${unit ? ` ${unit}` : ""}`;

  const sizeClass = size === "sm" ? "h-20 w-20" : "h-24 w-24";
  const segments = 24;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={classNames("relative select-none touch-none", sizeClass)}>
        <KnobHeadless
          aria-label={label}
          className="w-full h-full"
          dragSensitivity={0.006}
          onValueRawChange={(raw) => onChange(roundToStep(raw, min, max, step))}
          valueMax={max}
          valueMin={min}
          valueRaw={roundedValue}
          valueRawRoundFn={(raw) => roundToStep(raw, min, max, step)}
          valueRawDisplayFn={(raw) => {
            const rounded = roundToStep(raw, min, max, step);
            return formatValue
              ? formatValue(rounded)
              : `${rounded.toFixed(decimals)}${unit ? ` ${unit}` : ""}`;
          }}
        >
          <svg
            viewBox="-20 -20 240 240"
            className="w-full h-full cursor-pointer drop-shadow-lg"
            overflow="visible"
          >
            <defs>
              <radialGradient id={shellId} cx="40%" cy="35%">
                <stop offset="0%" stopColor="#2f3742" />
                <stop offset="100%" stopColor="#0f1115" />
              </radialGradient>
              <radialGradient id={coreId} cx="35%" cy="35%">
                <stop offset="0%" stopColor="#444" />
                <stop offset="70%" stopColor="#222" />
                <stop offset="100%" stopColor="#111" />
              </radialGradient>
            </defs>

            {/* Background Shell */}
            <circle
              cx="100"
              cy="100"
              r="90"
              fill={`url(#${shellId})`}
              stroke="#0b1120"
              strokeWidth="2"
            />

            {/* Inner Ring Shadow */}
            <circle cx="100" cy="100" r="70" fill="#0a0d11" />

            {/* Segments/Graduation Marks */}
            {Array.from({ length: segments }).map((_, i) => {
              // Map segments to the 270 degree range (-135 to 135)
              const segmentAngle = (i / (segments - 1)) * 270 - 135;
              const active = i / (segments - 1) <= ratio + 0.001;
              const rad = (segmentAngle * Math.PI) / 180;

              // Graduation marks geometry
              const x1 = 100 + Math.cos(rad) * 74;
              const y1 = 100 + Math.sin(rad) * 74;
              const x2 = 100 + Math.cos(rad) * 88;
              const y2 = 100 + Math.sin(rad) * 88;

              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={active ? accentColor : "#252a32"}
                  strokeWidth="6"
                  strokeLinecap="round"
                  className="transition-colors duration-150"
                  style={{
                    filter: active
                      ? `drop-shadow(0 0 4px ${accentColor}b3)` // Add some transparency to the glow
                      : undefined,
                  }}
                />
              );
            })}

            {/* Knob Cap Core */}
            <circle
              cx="100"
              cy="100"
              r="62"
              fill={`url(#${coreId})`}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="1"
            />

            {/* Pointer / Indicator */}
            <g transform={`rotate(${angle} 100 100)`}>
              <rect
                x="99"
                y="93"
                width="55"
                height="14"
                rx="3"
                fill="#1f2937"
                className="drop-shadow-md"
              />
              <rect
                x="144"
                y="93"
                width="14"
                height="14"
                rx="2"
                fill={accentColor}
              />
            </g>

            {/* Center Cap */}
            <circle cx="100" cy="100" r="8" fill="#111827" />
          </svg>
        </KnobHeadless>
      </div>
      <div className="knob-value">{displayValue}</div>
      <div className="knob-label">{label}</div>
    </div>
  );
}
