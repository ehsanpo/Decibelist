import type { RefObject } from 'react'
import { classNames } from '../../utils/classNames'

export function PreviewRack({
  waveformRef,
  masteredRef,
  status,
  isPlaying,
  onTogglePlay,
  bypass,
  onToggleBypass,
  meterLevels,
  masteredReady,
  reportReady,
  onDownloadMastered,
  onDownloadReport,
}: {
  waveformRef: RefObject<HTMLDivElement>
  masteredRef: RefObject<HTMLDivElement>
  status: string
  isPlaying: boolean
  onTogglePlay: () => void
  bypass: boolean
  onToggleBypass: () => void
  meterLevels: number[]
  masteredReady: boolean
  reportReady: boolean
  onDownloadMastered: () => void
  onDownloadReport: () => void
}) {
  return (
    <section className="module grid gap-8 p-8 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="flex flex-col gap-5">
        <div className="module-title">Preview</div>
        <div className="crt-screen crt-scanline p-4">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-emerald-300">
            <span>Before / After</span>
            <span>{status}</span>
          </div>
          <div className="mt-4 space-y-3">
            <div ref={waveformRef} />
            <div ref={masteredRef} className="mix-blend-screen opacity-70" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button className="metal-button" onClick={onTogglePlay} type="button">
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button className="metal-button" onClick={onToggleBypass} type="button">
            {bypass ? 'Listen Mastered' : 'Bypass'}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <div className="module-title">Peak Meters</div>
        <div className="led-grid">
          {meterLevels.map((level, index) => (
            <div key={index} className={classNames('led', level > 0.3 && 'led-on')} />
          ))}
        </div>

        <div className="module-title">Download</div>
        <button className="metal-button w-full" onClick={onDownloadMastered} disabled={!masteredReady} type="button">
          Download Full Audio
        </button>
        <button className="metal-button w-full" onClick={onDownloadMastered} disabled={!masteredReady} type="button">
          Download Stems
        </button>
        <button className="metal-button w-full" onClick={onDownloadReport} disabled={!reportReady} type="button">
          Download Report
        </button>
      </div>
    </section>
  )
}
