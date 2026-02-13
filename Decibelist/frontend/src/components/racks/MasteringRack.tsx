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

  outputDir: string;
  onChooseOutputDir: () => void;
}) {
  return (
    <section className="module grid gap-8 p-8 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 p-4">
          <div>
            <p className="module-title">Select Audio</p>
            <p className="text-sm text-slate-300">
              {selectedAudio || "No audio selected yet."}
            </p>
          </div>
          <button className="metal-button" onClick={onOpenAudio} type="button">
            Choose File
          </button>
        </div>

        <div className="grid gap-4 rounded-2xl border border-white/10 bg-black/30 p-4">
          <p className="module-title">Mastering Engine</p>
          <div className="grid gap-3 md:grid-cols-2">
            {engineOptions.map((option) => (
              <button
                key={option.id}
                className={classNames(
                  "rounded-2xl border border-white/10 p-4 text-left transition",
                  engine === option.id
                    ? "bg-emerald-500/20 shadow-glow"
                    : "bg-white/5"
                )}
                onClick={() => onEngineChange(option.id)}
                type="button"
              >
                <p className="text-lg font-semibold text-white">
                  {option.label}
                </p>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300">
                  {option.detail}
                </p>
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 rounded-2xl border border-white/10 bg-black/30 p-4">
          <div className="module-title">Automatic Mastering</div>
          <div className="flex items-center justify-between">
            <ToggleSwitch
              active={autoMastering}
              onToggle={onToggleAutoMastering}
              label="Enabled"
            />
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Level {autoLevel.toFixed(2)}
            </div>
          </div>
          <KnobControl
            label="Auto Level"
            value={autoLevel}
            min={0}
            max={1}
            step={0.01}
            onChange={onAutoLevelChange}
            size="sm"
            tone="emerald"
            formatValue={(value) => value.toFixed(2)}
          />
        </div>
        <div className="grid gap-6 rounded-2xl border border-white/10 bg-black/30 p-4">
          <div>
            <p className="module-title">Export Settings</p>
            <div className="mt-3 grid gap-3">
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>Output Format</span>
                <SegmentedControl
                  value={outputFormat}
                  onChange={onOutputFormatChange}
                  options={outputFormatOptions.map((format) => ({
                    value: format.id,
                    label: format.label,
                  }))}
                  size="sm"
                  tone="cyan"
                />
              </div>
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>Sampling Rate</span>
                <SegmentedControl
                  value={sampleRate}
                  onChange={onSampleRateChange}
                  options={sampleRateOptions.map((rate) => ({
                    value: rate.id,
                    label: rate.label,
                  }))}
                  size="sm"
                  tone="cyan"
                />
              </div>
            </div>
          </div>

          <div>
            <p className="module-title">Filtering</p>
            <div className="mt-3 grid gap-6 sm:grid-cols-2">
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

      <div className="flex flex-col gap-6">
        <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/30 p-4">
          <div className="module-title">Mastering Control</div>
          <div className="flex items-center justify-between text-sm text-slate-300">
            <span>Status</span>
            <span className="segment text-xs">{status}</span>
          </div>
          <div className="grid grid-cols-[1fr_auto] items-center gap-4">
            <div className="segment">Progress {progress.toFixed(0)}%</div>
            <button
              className="metal-button disabled:opacity-40"
              onClick={onStartMastering}
              disabled={!outputDir || (progress > 0 && progress < 100)}
              title={
                !outputDir ? "Please select an output directory first" : ""
              }
              type="button"
            >
              Start Mastering
            </button>
          </div>
        </div>
        <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/30 p-4">
          <p className="module-title">Save Location</p>
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col overflow-hidden">
              <span className="text-[10px] uppercase tracking-wider text-slate-500">
                Target Folder
              </span>
              <span className="truncate text-sm text-slate-300">
                {outputDir || "Same as original file"}
              </span>
            </div>
            <button
              className="metal-button text-xs py-1.5 px-3 min-w-[100px]"
              onClick={onChooseOutputDir}
              type="button"
            >
              Change
            </button>
          </div>
        </div>
        <div className="grid gap-5 rounded-2xl border border-white/10 bg-black/30 p-4">
          <div className="module-title">Limiter</div>
          <div className="flex items-center justify-between text-sm text-slate-300">
            <span>Target Loudness Mode</span>
            <SegmentedControl
              value={targetMode}
              onChange={onTargetModeChange}
              options={targetModeOptions}
              size="sm"
              tone="cyan"
            />
          </div>
          <KnobControl
            label="Target Loudness"
            value={targetLoudness}
            min={-12}
            max={-3}
            step={0.1}
            unit="dB"
            onChange={onTargetLoudnessChange}
          />
          <div className="flex items-center justify-between text-sm text-slate-300">
            <span>Ceiling Mode</span>
            <SegmentedControl
              value={ceilingMode}
              onChange={onCeilingModeChange}
              options={ceilingModeOptions}
              size="sm"
              tone="cyan"
            />
          </div>
          <KnobControl
            label="Ceiling"
            value={ceiling}
            min={-1}
            max={0}
            step={0.1}
            unit="dBFS"
            onChange={onCeilingChange}
          />
          <div className="flex items-center justify-between text-sm text-slate-300">
            <span>Oversampling</span>
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
    </section>
  );
}
