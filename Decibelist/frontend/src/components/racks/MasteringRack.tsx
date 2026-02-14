import { MasteringEngine } from "../../../bindings/decibelist";
import { KnobControl } from "../ui/KnobControl";
import { SegmentedControl, SegmentedOption } from "../ui/SegmentedControl";
import { ToggleSwitch } from "../ui/ToggleSwitch";
import { classNames } from "../../utils/classNames";

export type EngineOption = {
  id: MasteringEngine;
  label: string;
  detail: string;
};
export type LabeledOption = { id: string; label: string };

export function MasteringRack({
  selectedAudio,
  onOpenAudio,
  engine,
  engineOptions,
  onEngineChange,
  targetMode,
  targetModeOptions,
  onTargetModeChange,
  targetLoudness,
  onTargetLoudnessChange,
  ceilingMode,
  ceilingModeOptions,
  onCeilingModeChange,
  ceiling,
  onCeilingChange,
  oversampling,
  oversamplingOptions,
  onOversamplingChange,
  autoMastering,
  onToggleAutoMastering,
  autoLevel,
  onAutoLevelChange,
  outputFormat,
  outputFormatOptions,
  onOutputFormatChange,
  sampleRate,
  sampleRateOptions,
  onSampleRateChange,
  lowCut,
  onLowCutChange,
  highCut,
  onHighCutChange,

  progress,
  status,
  onStartMastering,

  selectedAudios,
  batchProcessedCount,
  isBatchProcessing,

  outputDir,
  onChooseOutputDir,
}: {
  selectedAudio: string;
  onOpenAudio: () => void;
  engine: MasteringEngine;
  engineOptions: EngineOption[];
  onEngineChange: (engine: MasteringEngine) => void;

  targetMode: string;
  targetModeOptions: SegmentedOption[];
  onTargetModeChange: (value: string) => void;
  targetLoudness: number;
  onTargetLoudnessChange: (value: number) => void;
  ceilingMode: string;
  ceilingModeOptions: SegmentedOption[];
  onCeilingModeChange: (value: string) => void;
  ceiling: number;
  onCeilingChange: (value: number) => void;
  oversampling: string;
  oversamplingOptions: SegmentedOption[];
  onOversamplingChange: (value: string) => void;
  autoMastering: boolean;
  onToggleAutoMastering: () => void;
  autoLevel: number;
  onAutoLevelChange: (value: number) => void;
  outputFormat: string;
  outputFormatOptions: LabeledOption[];
  onOutputFormatChange: (value: string) => void;
  sampleRate: string;
  sampleRateOptions: LabeledOption[];
  onSampleRateChange: (value: string) => void;
  lowCut: number;
  onLowCutChange: (value: number) => void;
  highCut: number;
  onHighCutChange: (value: number) => void;

  progress: number;
  status: string;
  onStartMastering: () => void;

  selectedAudios: string[];
  batchProcessedCount: number;
  isBatchProcessing: boolean;

  outputDir: string;
  onChooseOutputDir: () => void;
}) {
  return (
    <section className="module grid gap-8 p-8 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="flex flex-col gap-6">
        <div className="grid gap-4">
          <p className="module-title px-4">Mastering Engine</p>
          <div className="engine-selection-grid px-2">
            {engineOptions.map((option, index) => (
              <div
                key={option.id}
                className={classNames(
                  "engine-deck",
                  engine === option.id && "engine-deck-active"
                )}
                onClick={() => onEngineChange(option.id)}
              >
                <div className="deck-status-pill">
                  <div
                    className="deck-status-fill"
                    style={{ width: engine === option.id ? "65%" : "5%" }}
                  ></div>
                </div>

                <div className="disc-viewport">
                  <div className="disc-body" />
                  <div className="disc-label-ring" />
                  <div className="disc-core">
                    <div className="disc-core-hole" />
                  </div>
                </div>

                <div className="deck-cover-plate">
                  <h3 className="deck-brand">{option.label}</h3>
                  <p className="deck-sub-label">{option.detail}</p>
                </div>

                <div className="deck-side-details">
                  <span>MOD 0{index + 1}</span>
                  <span>{option.label.toUpperCase()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-4 rounded-2xl border border-white/10 bg-black/30 p-8">
          <div className="module-title mb-4">Automatic Mastering</div>
          <div className="flex gap-16 items-end justify-center px-2">
            <ToggleSwitch
              active={autoMastering}
              onToggle={onToggleAutoMastering}
              label="Auto Engine"
            />
            <KnobControl
              label="Mastering Intensity"
              value={autoLevel}
              min={0}
              max={1}
              step={0.01}
              onChange={onAutoLevelChange}
              size="sm"
              tone="emerald"
              formatValue={(value) => `${(value * 100).toFixed(0)}%`}
            />
          </div>
        </div>
        <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/30 p-5">
          <div className="module-title mb-1">Limiter</div>

          <div className="grid grid-cols-2 gap-3">
            {/* Target Loudness Group */}
            <div className="flex flex-col gap-2 bg-black/20 rounded-xl p-3 border border-white/5">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-1">
                  Loudness Mode
                </span>
                <div>
                  {" "}
                  <SegmentedControl
                    value={targetMode}
                    onChange={onTargetModeChange}
                    options={targetModeOptions}
                    size="sm"
                    tone="cyan"
                  />
                </div>
              </div>
              <div className="flex justify-center pt-2 border-t border-white/5 mt-1">
                <KnobControl
                  label="Target"
                  value={targetLoudness}
                  min={-12}
                  max={-3}
                  step={0.1}
                  unit="dB"
                  onChange={onTargetLoudnessChange}
                  size="sm"
                />
              </div>
            </div>

            {/* Ceiling Group */}
            <div className="flex flex-col gap-2 bg-black/20 rounded-xl p-3 border border-white/5">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-1">
                  Ceiling Mode
                </span>
                <SegmentedControl
                  value={ceilingMode}
                  onChange={onCeilingModeChange}
                  options={ceilingModeOptions}
                  size="sm"
                  tone="cyan"
                />
              </div>
              <div className="flex justify-center pt-2 border-t border-white/5 mt-1">
                <KnobControl
                  label="Ceiling"
                  value={ceiling}
                  min={-1}
                  max={0}
                  step={0.1}
                  unit="dBFS"
                  onChange={onCeilingChange}
                  size="sm"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between bg-black/20 rounded-xl px-4 py-2 border border-white/5 mt-1">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">
              Oversampling
            </span>
            <SegmentedControl
              value={oversampling}
              onChange={onOversamplingChange}
              options={oversamplingOptions}
              size="sm"
              tone="amber"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/30 p-4">
          <div className="module-title flex justify-between items-center">
            <span>Mastering Control</span>
            {isBatchProcessing && (
              <span className="text-[10px] text-emerald-400 animate-pulse font-mono">
                BATCH MODE ACTIVE
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>Status</span>
              <span className="segment text-xs truncate max-w-[200px]">
                {status}
              </span>
            </div>

            {(isBatchProcessing || selectedAudios.length > 1) && (
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>Batch Queue</span>
                <span className="segment text-xs text-emerald-400">
                  {isBatchProcessing ? batchProcessedCount + 1 : 0} of{" "}
                  {selectedAudios.length} tracks
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-[1fr_auto] items-center gap-4 mt-2">
            <div className="segment">
              {isBatchProcessing ? "Active Task " : "Progress "}
              {progress.toFixed(0)}%
            </div>
            <button
              className={classNames(
                "metal-button metal-button-primary",
                isBatchProcessing && "opacity-50 cursor-not-allowed"
              )}
              onClick={onStartMastering}
              disabled={
                !outputDir ||
                isBatchProcessing ||
                (progress > 0 && progress < 100)
              }
              title={
                !outputDir
                  ? "Please select an output directory first"
                  : isBatchProcessing
                  ? "Wait for batch to complete"
                  : ""
              }
              type="button"
            >
              {isBatchProcessing ? "Processing Batch..." : "Start Mastering"}
            </button>
          </div>
        </div>
        <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/30 p-5">
          <div className="module-title mb-1">File Management</div>

          <div className="flex items-center justify-between bg-black/20 rounded-xl p-4 border border-white/5">
            <div className="flex flex-col gap-1 overflow-hidden">
              <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                {selectedAudios.length > 1 ? "Input Files" : "Input File"}
              </span>
              <p className="text-sm text-slate-300 truncate pr-4">
                {selectedAudios.length > 1
                  ? `${selectedAudios.length} tracks selected`
                  : selectedAudios[0] || "No file selected"}
              </p>
            </div>
            <button
              className="metal-button"
              onClick={onOpenAudio}
              type="button"
              disabled={isBatchProcessing}
            >
              {selectedAudios.length > 0 ? "Change" : "Open File(s)"}
            </button>
          </div>

          <div className="flex items-center justify-between bg-black/20 rounded-xl p-4 border border-white/5">
            <div className="flex flex-col gap-1 overflow-hidden">
              <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                Export Destination
              </span>
              <p className="text-sm text-slate-300 truncate pr-4">
                {outputDir || "Default (Same as source)"}
              </p>
            </div>
            <button
              className="metal-button"
              onClick={onChooseOutputDir}
              type="button"
            >
              Set Folder
            </button>
          </div>
        </div>
        <div className="grid gap-4 rounded-2xl border border-white/10 bg-black/30 p-5">
          <div>
            <p className="module-title mb-3">Export Settings</p>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2 bg-black/20 rounded-xl p-3 border border-white/5">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                  Output Format
                </span>
                <div>
                  <SegmentedControl
                    value={outputFormat}
                    onChange={onOutputFormatChange}
                    options={outputFormatOptions.map((f) => ({
                      value: f.id,
                      label: f.label,
                    }))}
                    size="sm"
                    tone="cyan"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2 bg-black/20 rounded-xl p-3 border border-white/5">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                  Sample Rate
                </span>
                <div>
                  <SegmentedControl
                    value={sampleRate}
                    onChange={onSampleRateChange}
                    options={sampleRateOptions.map((r) => ({
                      value: r.id,
                      label: r.label,
                    }))}
                    size="sm"
                    tone="cyan"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <p className="module-title mb-3">Filtering</p>
            <div className="grid grid-cols-2 gap-3 bg-black/20 rounded-xl p-4 border border-white/5">
              <KnobControl
                label="Low Cut"
                value={lowCut}
                min={0}
                max={40}
                step={1}
                unit="Hz"
                onChange={onLowCutChange}
                size="sm"
              />
              <KnobControl
                label="High Cut"
                value={highCut}
                min={18000}
                max={22000}
                step={100}
                onChange={onHighCutChange}
                size="sm"
                formatValue={(value) => `${value.toFixed(0)} Hz`}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
