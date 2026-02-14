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
} from "chart.js";
import { useEffect, useRef } from "react";
import { Bar, Line } from "react-chartjs-2";
import { MetricRow } from "../ui/MetricRow";
import { MetricRow as MetricRowType, SummaryItem } from "../../types";
import type { SpectrogramData } from "../../utils/spectrogram";
import { TrackSelector } from "../ui/TrackSelector";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend
);

const spectrogramStops = [
  { stop: 0, color: [8, 5, 18] },
  { stop: 0.25, color: [40, 16, 68] },
  { stop: 0.5, color: [120, 32, 88] },
  { stop: 0.75, color: [220, 76, 66] },
  { stop: 1, color: [255, 214, 128] },
];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function colorFromValue(value: number) {
  const clamped = Math.max(0, Math.min(1, value));
  for (let i = 0; i < spectrogramStops.length - 1; i += 1) {
    const current = spectrogramStops[i];
    const next = spectrogramStops[i + 1];
    if (clamped >= current.stop && clamped <= next.stop) {
      const localT = (clamped - current.stop) / (next.stop - current.stop);
      return [
        Math.round(lerp(current.color[0], next.color[0], localT)),
        Math.round(lerp(current.color[1], next.color[1], localT)),
        Math.round(lerp(current.color[2], next.color[2], localT)),
      ];
    }
  }
  return spectrogramStops[spectrogramStops.length - 1].color;
}

function SpectrogramCanvas({
  title,
  data,
}: {
  title: string;
  data: SpectrogramData | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!data || !canvasRef.current) {
      return;
    }
    const canvas = canvasRef.current;
    const { rows, cols } = data;
    canvas.width = cols;
    canvas.height = rows;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    const image = ctx.createImageData(cols, rows);
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const [r, g, b] = colorFromValue(data.data[row][col]);
        const invertedRow = rows - 1 - row;
        const index = (invertedRow * cols + col) * 4;
        image.data[index] = r;
        image.data[index + 1] = g;
        image.data[index + 2] = b;
        image.data[index + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
  }, [data]);

  return (
    <div className="spectrogram-panel">
      <div className="crt-label">{title}</div>
      {!data ? (
        <p className="text-xs text-emerald-200/70">
          Waiting for spectrogram analysis...
        </p>
      ) : (
        <canvas ref={canvasRef} className="spectrogram-canvas" />
      )}
    </div>
  );
}

export function AnalysisRack({
  summaryItems,
  statsRows,
  waveformData,
  histogramData,
  spectrumData,
  spectrumDistributionData,
  chartOptions,
  spectrogramOriginal,
  spectrogramMastered,
  limitingErrorSpectrogram,
  selectedAudios,
  selectedAudio,
  onSelectTrack,
  isBatchProcessing,
}: {
  summaryItems: SummaryItem[];
  statsRows: MetricRowType[];
  waveformData: ChartData<"line">;
  histogramData: ChartData<"bar">;
  spectrumData: ChartData<"line">;
  spectrumDistributionData: ChartData<"line">;
  chartOptions: ChartOptions<"line" | "bar">;
  spectrogramOriginal: SpectrogramData | null;
  spectrogramMastered: SpectrogramData | null;
  limitingErrorSpectrogram: SpectrogramData | null;
  selectedAudios: string[];
  selectedAudio: string;
  onSelectTrack: (path: string) => void;
  isBatchProcessing: boolean;
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_300px] items-start">
      <div className="flex flex-col gap-8">
        <section className="module grid gap-8 p-8 lg:grid-cols-[1fr_1fr]">
          <div className="flex flex-col gap-5">
            <div className="module-title">Summary</div>
            {summaryItems.length === 0 ? (
              <p className="text-sm text-slate-400">
                No summary yet. Run a mastering job to populate this panel.
              </p>
            ) : (
              <div className="grid gap-3">
                {summaryItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between border-b border-white/5 pb-2 text-sm"
                  >
                    <span className="text-slate-300">{item.label}</span>
                    <span className="segment text-sm">{item.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-5">
            <div className="module-title">Statistics</div>
            {statsRows.length === 0 ? (
              <p className="text-sm text-slate-400">
                No statistics yet. Run a mastering job to populate this panel.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4 border-b border-white/10 pb-3 text-xs uppercase tracking-[0.2em] text-slate-400">
                  <div>Metric</div>
                  <div>Original</div>
                  <div>Mastered</div>
                </div>
                {statsRows.map((metric) => (
                  <MetricRow
                    key={metric.name}
                    name={metric.name}
                    original={metric.original}
                    mastered={metric.mastered}
                  />
                ))}
              </>
            )}
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
              <div className="analysis-chart">
                <div className="crt-label">Spectrum</div>
                <Line data={spectrumData} options={chartOptions} />
              </div>
              <div className="analysis-chart">
                <div className="crt-label">
                  Spectrum Distribution (+3dB/oct)
                </div>
                <Line data={spectrumDistributionData} options={chartOptions} />
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2 mt-6">
              <SpectrogramCanvas
                title="Spectrum Analyzer (Original)"
                data={spectrogramOriginal}
              />
              <SpectrogramCanvas
                title="Spectrum Analyzer (Mastered)"
                data={spectrogramMastered}
              />
            </div>
            <SpectrogramCanvas
              title="Limiting Error Spectrogram"
              data={limitingErrorSpectrogram}
            />
          </div>
        </section>
      </div>

      <div className="flex flex-col gap-6 sticky top-6">
        <div className="module-title">Session Tracks</div>
        <TrackSelector
          selectedAudios={selectedAudios}
          selectedAudio={selectedAudio}
          onSelectTrack={onSelectTrack}
          isBatchProcessing={isBatchProcessing}
        />
      </div>
    </div>
  );
}
