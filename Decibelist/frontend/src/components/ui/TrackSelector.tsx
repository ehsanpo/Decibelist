import { classNames } from "../../utils/classNames";

export function TrackSelector({
  selectedAudios,
  selectedAudio,
  onSelectTrack,
  isBatchProcessing,
}: {
  selectedAudios: string[];
  selectedAudio: string;
  onSelectTrack: (path: string) => void;
  isBatchProcessing: boolean;
}) {
  if (selectedAudios.length <= 1) return null;

  return (
    <div className="flex flex-col gap-2 bg-black/40 rounded-xl p-4 border border-white/5 max-h-[280px] overflow-hidden">
      <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">
        Track Selection (Click to Preview)
      </span>
      <div className="flex flex-col gap-1 overflow-y-auto pr-1 custom-scrollbar">
        {selectedAudios.map((path) => {
          const fileName = path.split(/[/\\]/).pop();
          const isActive = selectedAudio === path;
          return (
            <button
              key={path}
              className={classNames(
                "text-left px-3 py-2 rounded-lg text-xs transition-all border group relative overflow-hidden",
                isActive
                  ? "bg-slate-800 border-slate-600 text-white shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                  : "bg-black/20 border-white/5 text-slate-400 hover:bg-white/5 hover:border-white/10"
              )}
              onClick={() => onSelectTrack(path)}
              disabled={isBatchProcessing}
              title={path}
            >
              <div className="flex items-center justify-between">
                <span className="truncate pr-2">{fileName}</span>
                {isActive && (
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
                )}
              </div>
              {!isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
