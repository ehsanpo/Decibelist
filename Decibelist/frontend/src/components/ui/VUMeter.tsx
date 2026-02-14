import React, { useMemo } from "react";

interface VUMeterProps {
  level: number; // 0 to 1
  label?: string;
  subLabel?: string;
  className?: string;
}

export const VUMeter: React.FC<VUMeterProps> = ({
  level,
  label = "PEAK",
  subLabel = "DECIBELIST",
  className = "",
}) => {
  const angle = useMemo(() => {
    // level 0 -> -45 degrees
    // level 1 -> 45 degrees
    return level * 90 - 45;
  }, [level]);

  const dbValue = useMemo(() => {
    if (level <= 0) return "-inf";
    const db = 20 * Math.log10(level);
    return (db > 0 ? "+" : "") + db.toFixed(2);
  }, [level]);

  // Define scale positions for SVG
  // Reduced the span from -45/45 to -40/40 to pull the edges inward
  const scaleItems = [
    { label: "-30", angle: -40 },
    { label: "-20", angle: -20 },
    { label: "-10", angle: 0 },
    { label: "-5", angle: 20 },
    { label: "0", angle: 40 },
  ];

  return (
    <div
      className={`relative w-full aspect-[1.4/1] bg-[#1a1c1e] rounded-2xl border-[6px] border-[#25282a] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_2px_10px_rgba(255,255,255,0.05)] ${className}`}
    >
      {/* Internal Shadow/Glow */}
      <div className="absolute inset-2 rounded-xl bg-[#0f1113] shadow-[inset_0_0_60px_rgba(0,0,0,0.9)]" />

      {/* SVG Scale */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 143">
        {/* Main Arc - pulled in with cx/cy/r variations if needed, but here we just bound it */}
        <path
          d="M 45 105 Q 100 50 155 105"
          fill="none"
          stroke="#222"
          strokeWidth="1"
          strokeDasharray="2 2"
          className="opacity-30"
        />

        {/* Scale Ticks and Labels */}
        {scaleItems.map((item) => {
          const rad = (item.angle * Math.PI) / 180;
          const cx = 100;
          const cy = 160;
          const r1 = 110; // Tick start
          const r2 = 120; // Tick end
          const r3 = 135; // Label position

          const x1 = cx + r1 * Math.sin(rad);
          const y1 = cy - r1 * Math.cos(rad);
          const x2 = cx + r2 * Math.sin(rad);
          const y2 = cy - r2 * Math.cos(rad);
          const xl = cx + r3 * Math.sin(rad);
          const yl = cy - r3 * Math.cos(rad);

          return (
            <g key={item.label} className="opacity-60">
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={item.angle > 20 ? "#ff2a00" : "#555"}
                strokeWidth="1.5"
              />
              <text
                x={xl}
                y={yl}
                textAnchor="middle"
                alignmentBaseline="middle"
                fill="#888"
                fontSize="8"
                fontWeight="700"
                fontFamily="Space Grotesk, sans-serif"
              >
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Center Text */}
      <div className="absolute top-[68%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
        <span className="text-[14px] font-black tracking-[0.4em] text-white/80 uppercase italic drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          {label}
        </span>
        <span className="text-[8px] font-bold tracking-[0.2em] text-[#ff4d0099] uppercase">
          {subLabel}
        </span>
      </div>

      {/* Needle Mechanism */}
      <div className="absolute bottom-[-10%] left-1/2 w-0 h-0 flex items-center justify-center">
        {/* The Needle */}
        <div
          className="absolute bottom-0 w-[1.5px] h-[105px] origin-bottom transition-transform duration-[80ms] ease-out"
          style={{
            transform: `translateX(-50%) rotate(${angle}deg)`,
            background:
              "linear-gradient(to top, #ff2a00 0%, #ff8a00 50%, #ff4d00 100%)",
            boxShadow: "0 0 20px rgba(255, 60, 0, 0.4)",
          }}
        >
          {/* Needle Tip Light */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-10 bg-white/10 blur-[3px] rounded-full" />
        </div>

        {/* Pivot Hub */}
        <div className="absolute bottom-0 w-12 h-12 rounded-full bg-[#1a1c1e] border-4 border-[#25282a] shadow-[0_4px_15px_rgba(0,0,0,0.8)] z-10" />
      </div>

      {/* Bottom Glow Source */}
      <div className="absolute bottom-[-20%] left-1/2 -translate-x-1/2 w-[120%] h-1/2 bg-gradient-to-t from-[#ff4d001a] via-[#ff4d0005] to-transparent blur-3xl rounded-full" />

      {/* Labels Input/Output style from image */}
      <div className="absolute bottom-5 left-8 flex flex-col items-start opacity-20">
        <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">
          Input
        </span>
        <span className="text-[9px] font-mono text-slate-300 tracking-tighter">
          {dbValue} dB
        </span>
      </div>
      <div className="absolute bottom-5 right-8 flex flex-col items-end opacity-20">
        <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">
          Output
        </span>
        <span className="text-[9px] font-mono text-slate-300 tracking-tighter">
          {dbValue} dB
        </span>
      </div>

      {/* Glass Reflections */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-white/10 opacity-30" />
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>

      {/* Edge Reflection */}
      <div className="absolute inset-0 border border-white/10 rounded-2xl pointer-events-none" />
    </div>
  );
};
