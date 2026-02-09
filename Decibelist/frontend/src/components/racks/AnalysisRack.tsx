import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'
import { MetricRow } from '../ui/MetricRow'
import { MetricRow as MetricRowType, SummaryItem } from '../../types'
import { classNames } from '../../utils/classNames'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend)

function SpectrumAnalyzer({ levels }: { levels: number[] }) {
  return (
    <div className="mt-6">
      <div className="crt-label">Spectrum Analyzer</div>
      <div className="spectrum-grid">
        {levels.map((level, index) => (
          <div
            key={index}
            className={classNames('spectrum-bar', level > 0.2 && 'spectrum-bar-on')}
            style={{ height: `${Math.max(0.08, Math.min(1, level)) * 100}%` }}
          />
        ))}
      </div>
    </div>
  )
}

export function AnalysisRack({
  summaryItems,
  statsRows,
  waveformData,
  histogramData,
  chartOptions,
  spectrumLevels,
}: {
  summaryItems: SummaryItem[]
  statsRows: MetricRowType[]
  waveformData: ChartData<'line'>
  histogramData: ChartData<'bar'>
  chartOptions: ChartOptions<'line' | 'bar'>
  spectrumLevels: number[]
}) {
  return (
    <div className="flex flex-col gap-8">
      <section className="module grid gap-8 p-8 lg:grid-cols-[1fr_1fr]">
        <div className="flex flex-col gap-5">
          <div className="module-title">Summary</div>
          <div className="grid gap-3">
            {summaryItems.map((item) => (
              <div key={item.label} className="flex items-center justify-between border-b border-white/5 pb-2 text-sm">
                <span className="text-slate-300">{item.label}</span>
                <span className="segment text-sm">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-5">
          <div className="module-title">Statistics</div>
          <div className="grid grid-cols-3 gap-4 border-b border-white/10 pb-3 text-xs uppercase tracking-[0.2em] text-slate-400">
            <div>Metric</div>
            <div>Original</div>
            <div>Mastered</div>
          </div>
          {statsRows.map((metric) => (
            <MetricRow key={metric.name} name={metric.name} original={metric.original} mastered={metric.mastered} />
          ))}
        </div>
      </section>

      <section className="module grid gap-6 p-8">
        <div className="module-title">Analysis Console</div>
        <div className="crt-screen crt-scanline p-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="analysis-chart">
              <div className="crt-label">Waveform</div>
              <Line data={waveformData} options={chartOptions} />
            </div>
            <div className="analysis-chart">
              <div className="crt-label">Loudness Histogram</div>
              <Bar data={histogramData} options={chartOptions} />
            </div>
          </div>
          <SpectrumAnalyzer levels={spectrumLevels} />
        </div>
      </section>
    </div>
  )
}
