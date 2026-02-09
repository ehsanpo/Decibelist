import { useEffect, useMemo, useRef, useState } from 'react'
import { Dialogs, Events } from '@wailsio/runtime'
import WaveSurfer from 'wavesurfer.js'
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'
import { AudioService, MasteringEngine } from '../bindings/decibelist'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend)

const engineOptions: { id: MasteringEngine; label: string; detail: string }[] = [
  { id: MasteringEngine.EngineHybrid, label: 'Hybrid', detail: 'Essentia + master_me' },
  { id: MasteringEngine.EngineClassic, label: 'Classic', detail: 'Phaselimiter chain' },
]

const outputFormats = [
  { id: 'wav-16', label: 'WAV (16bit)' },
  { id: 'wav-24', label: 'WAV (24bit)' },
  { id: 'wav-32', label: 'WAV (32bit float)' },
  { id: 'mp3-320', label: 'MP3 (320kbps)' },
]

const sampleRates = ['44.1kHz', '48kHz', 'Same as original']

const demoSummary = [
  { label: 'Status', value: 'Succeeded' },
  { label: 'Time', value: '09 Feb 2026 02:08' },
  { label: 'Length', value: '01:12' },
  { label: 'Mode', value: 'Custom Mastering' },
  { label: 'Mastering Algorithm', value: 'v2' },
  { label: 'Target Loudness', value: '-3.0 dB' },
  { label: 'Target Loudness Mode', value: 'Loudness' },
  { label: 'Automatic Mastering', value: 'Enabled' },
  { label: 'Automatic Mastering Level', value: '0.5' },
  { label: 'Low Cut Freq', value: '40.00 Hz' },
  { label: 'High Cut Freq', value: '22000.00 Hz' },
  { label: 'Ceiling Mode', value: 'True Peak (15kHz Lowpass)' },
  { label: 'Ceiling', value: '-0.6 dB' },
  { label: 'Oversampling', value: '1x' },
  { label: 'Output Format', value: 'WAV (16bit)' },
  { label: 'Sampling Rate', value: '44100 Hz' },
  { label: 'Download Full Audio', value: 'Available' },
  { label: 'Bass Preservation', value: 'Disabled' },
  { label: 'Limiting Error', value: '2.6 dB' },
]

const demoMetrics = [
  { name: 'Loudness', original: '-10.5 dB (71%)', mastered: '-8.1 dB (92%)' },
  { name: 'RMS', original: '-9.8 dB (95%)', mastered: '-9.2 dB (98%)' },
  { name: 'Peak', original: '0.0 dB (0%)', mastered: '-3.3 dB (9%)' },
  { name: 'True Peak', original: '0.5 dB', mastered: '-0.7 dB' },
  { name: 'True Peak (15kHz lowpass)', original: '0.6 dB', mastered: '-0.6 dB' },
  { name: 'Loudness Range', original: '8.6 dB (41%)', mastered: '3.3 dB (2%)' },
  { name: 'YouTube Loudness', original: '-10.1 dB', mastered: '-6.9 dB' },
  { name: 'YouTube Loudness Compensation', original: '-0.2 dB', mastered: '-3.4 dB' },
  { name: 'Micro Dynamics', original: '2.8 dB (53%)', mastered: '2.2 dB (25%)' },
  { name: 'Space', original: '-8.3 dB (50%)', mastered: '-8.6 dB (46%)' },
  { name: 'Professionality', original: '42 %', mastered: '71 %' },
  { name: 'Professionality2', original: '10 %', mastered: '50 %' },
  { name: 'Acoustic Entropy', original: '145 bit', mastered: '178 bit' },
  { name: 'Ear Damage', original: '23.6 dB', mastered: '19.2 dB' },
  { name: 'Dissonance', original: '6.05', mastered: '7.85' },
]

function classNames(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(' ')
}

function parseMetricValue(text: string) {
  const match = text.match(/-?\d+(\.\d+)?/)
  if (!match) {
    return 0
  }
  return Number.parseFloat(match[0])
}

function Knob({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  const angle = -135 + (value / 100) * 270
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-24 w-24">
        <div className="knob-shell h-24 w-24" style={{ ['--knob-angle' as string]: `${angle}deg` }}>
          <div className="knob-cap" />
          <div className="knob-indicator">
            <span />
          </div>
        </div>
      </div>
      <input
        className="skeuo-slider w-24"
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <p className="text-xs uppercase tracking-[0.2em] text-slate-300">{label}</p>
    </div>
  )
}

function ToggleSwitch({
  active,
  onToggle,
  label,
}: {
  active: boolean
  onToggle: () => void
  label: string
}) {
  return (
    <button className="flex items-center gap-4" onClick={onToggle}>
      <div className={classNames('toggle w-20', active && 'toggle-active')}>
        <div className="toggle-dot" />
      </div>
      <span className="text-sm uppercase tracking-[0.2em] text-slate-200">{label}</span>
    </button>
  )
}

function MetricRow({ name, original, mastered }: { name: string; original: string; mastered: string }) {
  return (
    <div className="grid grid-cols-3 gap-4 border-b border-white/5 py-3 text-sm">
      <div className="text-slate-200">{name}</div>
      <div className="text-slate-400">{original}</div>
      <div className="text-emerald-200">{mastered}</div>
    </div>
  )
}

function App() {
  const [engine, setEngine] = useState<MasteringEngine>(MasteringEngine.EngineHybrid)
  const [selectedAudio, setSelectedAudio] = useState('')
  const [selectedAudioUrl, setSelectedAudioUrl] = useState('')
  const [masteredAudio, setMasteredAudio] = useState('')
  const [masteredAudioUrl, setMasteredAudioUrl] = useState('')
  const [targetMode, setTargetMode] = useState<'Loudness' | 'YouTube'>('Loudness')
  const [targetLoudness, setTargetLoudness] = useState(-6)
  const [ceilingMode, setCeilingMode] = useState('True Peak (15kHz Lowpass)')
  const [ceiling, setCeiling] = useState(-0.6)
  const [oversampling, setOversampling] = useState('1x')
  const [autoMastering, setAutoMastering] = useState(true)
  const [autoLevel, setAutoLevel] = useState(0.5)
  const [outputFormat, setOutputFormat] = useState(outputFormats[0].id)
  const [sampleRate, setSampleRate] = useState(sampleRates[0])
  const [lowCut, setLowCut] = useState(40)
  const [highCut, setHighCut] = useState(22000)
  const [preserveBass, setPreserveBass] = useState(false)
  const [status, setStatus] = useState('Idle')
  const [progress, setProgress] = useState(0)
  const [jobId, setJobId] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [bypass, setBypass] = useState(false)
  const [knobValues, setKnobValues] = useState({ drive: 62, air: 48, width: 55 })

  const waveformRef = useRef<HTMLDivElement | null>(null)
  const masteredRef = useRef<HTMLDivElement | null>(null)
  const wavesurferOriginal = useRef<WaveSurfer | null>(null)
  const wavesurferMastered = useRef<WaveSurfer | null>(null)
  const syncingRef = useRef(false)

  const [meterLevels, setMeterLevels] = useState<number[]>(Array.from({ length: 8 }, () => 0))
  const [summaryItems, setSummaryItems] = useState(demoSummary)
  const [statsRows, setStatsRows] = useState(demoMetrics)

  useEffect(() => {
    const offProgress = Events.On('mastering:progress', (event) => {
      setProgress(event.data.percent)
      setStatus(event.data.message)
    })
    const offComplete = Events.On('mastering:complete', async (event) => {
      setStatus('Complete')
      setProgress(100)
      if (event.data.result?.outputPath) {
        const outputPath = event.data.result.outputPath
        setMasteredAudio(outputPath)
        try {
          const url = await AudioService.GetAudioDataURL(outputPath)
          setMasteredAudioUrl(url)
        } catch (error) {
          setMasteredAudioUrl('')
          setStatus('Complete (preview failed)')
          console.log(error)
        }
      }
      if (event.data.result?.summary?.length) {
        setSummaryItems(event.data.result.summary)
      }
      if (event.data.result?.metrics?.length) {
        setStatsRows(event.data.result.metrics)
      }
    })
    const offError = Events.On('mastering:error', (event) => {
      setStatus(event.data.error || 'Error')
    })
    return () => {
      offProgress()
      offComplete()
      offError()
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isPlaying) {
        setMeterLevels((prev) => prev.map(() => 0))
        return
      }
      setMeterLevels((prev) => prev.map(() => Math.min(1, Math.random() * 1.1)))
    }, 120)
    return () => clearInterval(interval)
  }, [isPlaying])

  useEffect(() => {
    if (!waveformRef.current || !masteredRef.current) {
      return
    }

    wavesurferOriginal.current?.destroy()
    wavesurferMastered.current?.destroy()

    const baseOptions = {
      waveColor: '#55b6ff',
      progressColor: '#a4fff1',
      cursorColor: '#ffffff',
      barWidth: 2,
      barGap: 2,
      height: 120,
      normalize: true,
    }

    const original = WaveSurfer.create({
      ...baseOptions,
      container: waveformRef.current,
    })

    const mastered = WaveSurfer.create({
      ...baseOptions,
      container: masteredRef.current,
      waveColor: '#ffbb3b',
      progressColor: '#ffef9c',
    })

    wavesurferOriginal.current = original
    wavesurferMastered.current = mastered

    const syncPlayback = (source: WaveSurfer, target: WaveSurfer) => {
      if (syncingRef.current) {
        return
      }
      syncingRef.current = true
      const duration = source.getDuration()
      if (duration > 0) {
        const ratio = source.getCurrentTime() / duration
        target.seekTo(Math.min(1, Math.max(0, ratio)))
      }
      if (source.isPlaying() && !target.isPlaying()) {
        target.play()
      }
      if (!source.isPlaying() && target.isPlaying()) {
        target.pause()
      }
      syncingRef.current = false
    }

    const syncSeek = (source: WaveSurfer, target: WaveSurfer) => {
      if (syncingRef.current) {
        return
      }
      syncingRef.current = true
      const duration = source.getDuration()
      if (duration > 0) {
        const ratio = source.getCurrentTime() / duration
        target.seekTo(Math.min(1, Math.max(0, ratio)))
      }
      if (source.isPlaying() && !target.isPlaying()) {
        target.play()
      }
      syncingRef.current = false
    }

    const syncState = () => {
      setIsPlaying(original.isPlaying() || mastered.isPlaying())
    }

    original.on('interaction', () => syncSeek(original, mastered))
    mastered.on('interaction', () => syncSeek(mastered, original))
    original.on('play', () => {
      if (!mastered.isPlaying()) {
        mastered.play()
      }
      syncState()
    })
    mastered.on('play', () => {
      if (!original.isPlaying()) {
        original.play()
      }
      syncState()
    })
    original.on('pause', () => {
      if (mastered.isPlaying()) {
        mastered.pause()
      }
      syncState()
    })
    mastered.on('pause', () => {
      if (original.isPlaying()) {
        original.pause()
      }
      syncState()
    })
    original.on('ready', () => syncPlayback(original, mastered))
    mastered.on('ready', () => syncPlayback(mastered, original))

    original.setVolume(bypass ? 1 : 0)
    mastered.setVolume(bypass ? 0 : 1)

    if (selectedAudioUrl) {
      original.load(selectedAudioUrl)
    }
    if (masteredAudioUrl) {
      mastered.load(masteredAudioUrl)
    }
    return () => {
      original.destroy()
      mastered.destroy()
      wavesurferOriginal.current = null
      wavesurferMastered.current = null
    }
  }, [selectedAudioUrl, masteredAudioUrl])

  useEffect(() => {
    const original = wavesurferOriginal.current
    const mastered = wavesurferMastered.current
    if (!original || !mastered) {
      return
    }
    const startVolumes = {
      original: original.getVolume(),
      mastered: mastered.getVolume(),
    }
    const target = bypass ? { original: 1, mastered: 0 } : { original: 0, mastered: 1 }
    const start = performance.now()
    const duration = 50

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const lerp = (a: number, b: number) => a + (b - a) * t
      original.setVolume(lerp(startVolumes.original, target.original))
      mastered.setVolume(lerp(startVolumes.mastered, target.mastered))
      if (t < 1) {
        requestAnimationFrame(tick)
      }
    }

    requestAnimationFrame(tick)
  }, [bypass])

  const metricMap = useMemo(() => {
    const map = new Map<string, { original: string; mastered: string }>()
    statsRows.forEach((metric) => map.set(metric.name, { original: metric.original, mastered: metric.mastered }))
    return map
  }, [statsRows])

  const loudnessOrig = parseMetricValue(metricMap.get('Loudness')?.original ?? '0')
  const loudnessMaster = parseMetricValue(metricMap.get('Loudness')?.mastered ?? '0')
  const rmsOrig = parseMetricValue(metricMap.get('RMS')?.original ?? '0')
  const rmsMaster = parseMetricValue(metricMap.get('RMS')?.mastered ?? '0')
  const peakOrig = parseMetricValue(metricMap.get('Peak')?.original ?? '0')
  const peakMaster = parseMetricValue(metricMap.get('Peak')?.mastered ?? '0')

  const waveformData = {
    labels: ['LUFS', 'RMS', 'Peak', 'Range', 'True Peak', 'Space', 'Dynamics', 'Entropy'],
    datasets: [
      {
        label: 'Original',
        data: [
          Math.abs(loudnessOrig),
          Math.abs(rmsOrig),
          Math.abs(peakOrig),
          Math.abs(parseMetricValue(metricMap.get('Loudness Range')?.original ?? '0')),
          Math.abs(parseMetricValue(metricMap.get('True Peak')?.original ?? '0')),
          Math.abs(parseMetricValue(metricMap.get('Space')?.original ?? '0')),
          Math.abs(parseMetricValue(metricMap.get('Micro Dynamics')?.original ?? '0')),
          Math.abs(parseMetricValue(metricMap.get('Acoustic Entropy')?.original ?? '0')),
        ],
        borderColor: '#55b6ff',
        backgroundColor: 'rgba(85, 182, 255, 0.2)',
      },
      {
        label: 'Mastered',
        data: [
          Math.abs(loudnessMaster),
          Math.abs(rmsMaster),
          Math.abs(peakMaster),
          Math.abs(parseMetricValue(metricMap.get('Loudness Range')?.mastered ?? '0')),
          Math.abs(parseMetricValue(metricMap.get('True Peak')?.mastered ?? '0')),
          Math.abs(parseMetricValue(metricMap.get('Space')?.mastered ?? '0')),
          Math.abs(parseMetricValue(metricMap.get('Micro Dynamics')?.mastered ?? '0')),
          Math.abs(parseMetricValue(metricMap.get('Acoustic Entropy')?.mastered ?? '0')),
        ],
        borderColor: '#ffbb3b',
        backgroundColor: 'rgba(255, 187, 59, 0.2)',
      },
    ],
  }

  const histogramData = {
    labels: ['LUFS', 'RMS', 'Peak', 'TP', 'Range', 'Space'],
    datasets: [
      {
        label: 'Original',
        data: [
          Math.abs(loudnessOrig),
          Math.abs(rmsOrig),
          Math.abs(peakOrig),
          Math.abs(parseMetricValue(metricMap.get('True Peak')?.original ?? '0')),
          Math.abs(parseMetricValue(metricMap.get('Loudness Range')?.original ?? '0')),
          Math.abs(parseMetricValue(metricMap.get('Space')?.original ?? '0')),
        ],
        backgroundColor: 'rgba(111, 243, 255, 0.4)',
      },
      {
        label: 'Mastered',
        data: [
          Math.abs(loudnessMaster),
          Math.abs(rmsMaster),
          Math.abs(peakMaster),
          Math.abs(parseMetricValue(metricMap.get('True Peak')?.mastered ?? '0')),
          Math.abs(parseMetricValue(metricMap.get('Loudness Range')?.mastered ?? '0')),
          Math.abs(parseMetricValue(metricMap.get('Space')?.mastered ?? '0')),
        ],
        backgroundColor: 'rgba(255, 187, 59, 0.5)',
      },
    ],
  }

  const openAudio = async () => {
    const result = await Dialogs.OpenFile({
      AllowsMultipleSelection: false,
      Filters: [{ DisplayName: 'Audio', Pattern: '*.wav;*.mp3;*.flac;*.aiff;*.m4a' }],
      Title: 'Select Audio File',
    })
    if (typeof result === 'string' && result) {
      setSelectedAudio(result)
      setSelectedAudioUrl('')
      setMasteredAudio('')
      setMasteredAudioUrl('')
      setIsPlaying(false)
      setBypass(false)
      try {
        const url = await AudioService.GetAudioDataURL(result)
        setSelectedAudioUrl(url)
      } catch (error) {
        setStatus('Failed to load audio for preview')
        console.log(error)
      }
    }
  }

  const startMastering = async () => {
    if (!selectedAudio) {
      setStatus('Select an audio file first')
      return
    }
    setStatus('Starting...')
    setProgress(1)
    try {
      const id = await AudioService.StartMastering({
        inputPath: selectedAudio,
        outputDir: '',
        engine,
        options: {
          targetLoudnessMode: targetMode,
          targetLoudness,
          ceilingMode,
          ceiling,
          oversampling,
          automaticMastering: autoMastering,
          automaticLevel: autoLevel,
          outputFormat,
          sampleRate,
          lowCutHz: lowCut,
          highCutHz: highCut,
          preserveBass,
        },
      })
      setJobId(id)
    } catch (error) {
      setStatus('Failed to start mastering')
      console.log(error)
    }
  }

  const togglePlay = () => {
    const original = wavesurferOriginal.current
    const mastered = wavesurferMastered.current
    if (!original || !mastered) {
      return
    }
    const shouldPause = original.isPlaying() || mastered.isPlaying()
    if (shouldPause) {
      original.pause()
      mastered.pause()
      setIsPlaying(false)
    } else {
      original.play()
      mastered.play()
      setIsPlaying(true)
    }
  }

  const downloadMastered = async () => {
    if (!masteredAudio) {
      setStatus('Mastered file not ready')
      return
    }
    const savePath = await Dialogs.SaveFile({
      Filename: 'decibelist_mastered.wav',
    })
    if (savePath) {
      await AudioService.ExportFile(masteredAudio, savePath)
      setStatus(`Exported to ${savePath}`)
    }
  }

  const downloadReport = async () => {
    if (!jobId) {
      setStatus('No report available yet')
      return
    }
    const savePath = await Dialogs.SaveFile({
      Filename: 'decibelist_report.json',
    })
    if (savePath) {
      await AudioService.ExportReport(jobId, savePath)
      setStatus(`Report saved to ${savePath}`)
    }
  }

  return (
    <div className="rack min-h-screen p-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.5em] text-slate-400">Decibelist</p>
            <h1 className="text-4xl font-semibold text-white">Offline AI Mastering Rack</h1>
          </div>
          <div className="segment text-lg">Job {jobId ? jobId.slice(0, 8) : '----'}</div>
        </header>

        <section className="module grid gap-8 p-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="module-title">Select Audio</p>
                <p className="text-sm text-slate-300">{selectedAudio || 'No audio selected yet.'}</p>
              </div>
              <button className="metal-button" onClick={openAudio}>
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
                      'rounded-2xl border border-white/10 p-4 text-left transition',
                      engine === option.id ? 'bg-emerald-500/20 shadow-glow' : 'bg-white/5'
                    )}
                    onClick={() => setEngine(option.id)}
                  >
                    <p className="text-lg font-semibold text-white">{option.label}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-300">{option.detail}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <Knob
                label="Drive"
                value={knobValues.drive}
                onChange={(value) => setKnobValues({ ...knobValues, drive: value })}
              />
              <Knob
                label="Air"
                value={knobValues.air}
                onChange={(value) => setKnobValues({ ...knobValues, air: value })}
              />
              <Knob
                label="Width"
                value={knobValues.width}
                onChange={(value) => setKnobValues({ ...knobValues, width: value })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="module-title">Limiter</div>
            <div className="grid gap-4">
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>Target Loudness Mode</span>
                <div className="flex gap-2">
                  <button
                    className={classNames(
                      'rounded-full px-3 py-1 text-xs uppercase',
                      targetMode === 'Loudness' && 'bg-accent-cyan text-slate-900'
                    )}
                    onClick={() => setTargetMode('Loudness')}
                  >
                    Loudness
                  </button>
                  <button
                    className={classNames(
                      'rounded-full px-3 py-1 text-xs uppercase',
                      targetMode === 'YouTube' && 'bg-accent-cyan text-slate-900'
                    )}
                    onClick={() => setTargetMode('YouTube')}
                  >
                    YouTube
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Target Loudness {targetLoudness.toFixed(1)} dB
                </label>
                <input
                  className="skeuo-slider mt-2"
                  type="range"
                  min={-12}
                  max={-3}
                  step={0.1}
                  value={targetLoudness}
                  onChange={(event) => setTargetLoudness(Number(event.target.value))}
                />
              </div>
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>Ceiling Mode</span>
                <select
                  className="rounded-full bg-black/40 px-3 py-1 text-xs uppercase tracking-[0.2em]"
                  value={ceilingMode}
                  onChange={(event) => setCeilingMode(event.target.value)}
                >
                  <option>Peak</option>
                  <option>True Peak</option>
                  <option>True Peak (15kHz Lowpass)</option>
                </select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Ceiling {ceiling.toFixed(1)} dBFS
                </label>
                <input
                  className="skeuo-slider mt-2"
                  type="range"
                  min={-1}
                  max={0}
                  step={0.1}
                  value={ceiling}
                  onChange={(event) => setCeiling(Number(event.target.value))}
                />
              </div>
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>Oversampling</span>
                <div className="flex gap-2">
                  {['1x', '2x'].map((option) => (
                    <button
                      key={option}
                      className={classNames(
                        'rounded-full px-3 py-1 text-xs uppercase',
                        oversampling === option && 'bg-accent-amber text-slate-900'
                      )}
                      onClick={() => setOversampling(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="module grid gap-8 p-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col gap-5">
            <div className="module-title">Automatic Mastering</div>
            <div className="flex items-center justify-between">
              <ToggleSwitch
                active={autoMastering}
                onToggle={() => setAutoMastering((prev) => !prev)}
                label="Enabled"
              />
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Level {autoLevel.toFixed(2)}</div>
            </div>
            <input
              className="skeuo-slider"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={autoLevel}
              onChange={(event) => setAutoLevel(Number(event.target.value))}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Output Format</label>
                <select
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/50 px-3 py-2 text-sm"
                  value={outputFormat}
                  onChange={(event) => setOutputFormat(event.target.value)}
                >
                  {outputFormats.map((format) => (
                    <option key={format.id} value={format.id}>
                      {format.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Sampling Rate</label>
                <select
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/50 px-3 py-2 text-sm"
                  value={sampleRate}
                  onChange={(event) => setSampleRate(event.target.value)}
                >
                  {sampleRates.map((rate) => (
                    <option key={rate}>{rate}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Low Cut {lowCut} Hz</label>
                <input
                  className="skeuo-slider mt-2"
                  type="range"
                  min={0}
                  max={40}
                  value={lowCut}
                  onChange={(event) => setLowCut(Number(event.target.value))}
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-400">High Cut {highCut} Hz</label>
                <input
                  className="skeuo-slider mt-2"
                  type="range"
                  min={18000}
                  max={22000}
                  value={highCut}
                  onChange={(event) => setHighCut(Number(event.target.value))}
                />
              </div>
            </div>

            <label className="flex items-center gap-3 text-sm text-slate-300">
              <input
                type="checkbox"
                className="h-4 w-4 accent-emerald-400"
                checked={preserveBass}
                onChange={(event) => setPreserveBass(event.target.checked)}
              />
              Preserve Bass (depending on the sound source, it may be easy to distort)
            </label>
          </div>

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
              <button className="metal-button" onClick={togglePlay}>
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <button className="metal-button" onClick={() => setBypass((prev) => !prev)}>
                {bypass ? 'Listen Mastered' : 'Bypass'}
              </button>
            </div>

            <div className="grid grid-cols-[1fr_auto] items-center gap-4">
              <div className="segment">Progress {progress.toFixed(0)}%</div>
              <button className="metal-button" onClick={startMastering}>
                Start Mastering
              </button>
            </div>

            <div className="module-title">Peak Meters</div>
            <div className="led-grid">
              {meterLevels.map((level, index) => (
                <div key={index} className={classNames('led', level > 0.3 && 'led-on')} />
              ))}
            </div>
          </div>
        </section>

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
            <div className="module-title">Download</div>
            <button className="metal-button w-full" onClick={downloadMastered} disabled={!masteredAudio}>
              Download Full Audio
            </button>
            <button className="metal-button w-full" onClick={downloadMastered} disabled={!masteredAudio}>
              Download Stems
            </button>
            <button className="metal-button w-full" onClick={downloadReport} disabled={!jobId}>
              Download Report
            </button>
          </div>
        </section>

        <section className="module grid gap-8 p-8">
          <div className="module-title">Statistics (click ? for indices)</div>
          <div className="grid grid-cols-3 gap-4 border-b border-white/10 pb-3 text-xs uppercase tracking-[0.2em] text-slate-400">
            <div>Metric</div>
            <div>Original</div>
            <div>Mastered</div>
          </div>
          {statsRows.map((metric) => (
            <MetricRow key={metric.name} name={metric.name} original={metric.original} mastered={metric.mastered} />
          ))}
        </section>

        <section className="module grid gap-8 p-8">
          <div className="module-title">Waveform</div>
          <Line data={waveformData} />
          <div className="module-title">Loudness Histogram</div>
          <Bar data={histogramData} />
        </section>
      </div>
    </div>
  )
}

export default App
