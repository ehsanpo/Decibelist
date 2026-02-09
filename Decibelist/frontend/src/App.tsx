import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChartOptions } from 'chart.js'
import { Dialogs, Events } from '@wailsio/runtime'
import WaveSurfer from 'wavesurfer.js'
import { AudioService, MasteringEngine } from '../bindings/decibelist'
import { AnalysisRack } from './components/racks/AnalysisRack'
import { JobsRack } from './components/racks/JobsRack'
import { MasteringRack } from './components/racks/MasteringRack'
import { PreviewRack } from './components/racks/PreviewRack'
import { RackTabs } from './components/ui/RackTabs'
import { demoMetrics, demoSummary } from './data/demo'
import { MasteringJob } from './types'
import { clamp } from './utils/number'

const engineOptions: { id: MasteringEngine; label: string; detail: string }[] = [
  { id: MasteringEngine.EngineHybrid, label: 'Hybrid', detail: 'Essentia + master_me' },
  { id: MasteringEngine.EngineClassic, label: 'Classic', detail: 'Phaselimiter chain' },
]

const outputFormats = [
  { id: 'wav-16', label: 'WAV 16' },
  { id: 'wav-24', label: 'WAV 24' },
  { id: 'wav-32', label: 'WAV 32 float' },
  { id: 'mp3-320', label: 'MP3 320' },
]

const sampleRates = [
  { id: '44.1kHz', label: '44.1kHz' },
  { id: '48kHz', label: '48kHz' },
  { id: 'Same as original', label: 'Original' },
]

const ceilingModes = [
  { value: 'Peak', label: 'Peak' },
  { value: 'True Peak', label: 'True Peak' },
  { value: 'True Peak (15kHz Lowpass)', label: 'True Peak LP' },
]

const targetModeOptions = [
  { value: 'Loudness', label: 'Loudness' },
  { value: 'YouTube', label: 'YouTube' },
]

const oversamplingOptions = [
  { value: '1x', label: '1x' },
  { value: '2x', label: '2x' },
]

const rackTabs = [
  { id: 'Mastering', label: 'Mastering Rack' },
  { id: 'Preview', label: 'Preview Rack' },
  { id: 'Analysis', label: 'Analysis Rack' },
  { id: 'Jobs', label: 'Jobs Rack' },
]

function parseMetricValue(text: string) {
  const match = text.match(/-?\d+(\.\d+)?/)
  if (!match) {
    return 0
  }
  return Number.parseFloat(match[0])
}

function clampVolume(value: number) {
  return clamp(value, 0, 1)
}

type RackId = 'Mastering' | 'Preview' | 'Analysis' | 'Jobs'

function App() {
  const [activeRack, setActiveRack] = useState<RackId>('Mastering')
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
  const [sampleRate, setSampleRate] = useState(sampleRates[0].id)
  const [lowCut, setLowCut] = useState(40)
  const [highCut, setHighCut] = useState(22000)
  const [preserveBass, setPreserveBass] = useState(false)
  const [status, setStatus] = useState('Idle')
  const [progress, setProgress] = useState(0)
  const [jobId, setJobId] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [bypass, setBypass] = useState(false)
  const [knobValues, setKnobValues] = useState({ drive: 62, air: 48, width: 55 })
  const [meterLevels, setMeterLevels] = useState<number[]>(Array.from({ length: 8 }, () => 0))
  const [spectrumLevels, setSpectrumLevels] = useState<number[]>(Array.from({ length: 24 }, () => 0))
  const [summaryItems, setSummaryItems] = useState(demoSummary)
  const [statsRows, setStatsRows] = useState(demoMetrics)
  const [jobs, setJobs] = useState<MasteringJob[]>([])

  const waveformRef = useRef<HTMLDivElement | null>(null)
  const masteredRef = useRef<HTMLDivElement | null>(null)
  const wavesurferOriginal = useRef<WaveSurfer | null>(null)
  const wavesurferMastered = useRef<WaveSurfer | null>(null)
  const syncingRef = useRef(false)
  const jobIdRef = useRef('')
  const selectedAudioRef = useRef('')
  const selectedAudioUrlRef = useRef('')

  useEffect(() => {
    selectedAudioRef.current = selectedAudio
  }, [selectedAudio])

  useEffect(() => {
    selectedAudioUrlRef.current = selectedAudioUrl
  }, [selectedAudioUrl])

  useEffect(() => {
    jobIdRef.current = jobId
  }, [jobId])

  useEffect(() => {
    const offProgress = Events.On('mastering:progress', (event) => {
      setProgress(event.data.percent)
      setStatus(event.data.message)
    })
    const offComplete = Events.On('mastering:complete', async (event) => {
      setStatus('Complete')
      setProgress(100)
      const outputPath = event.data.result?.outputPath
      let outputUrl = ''
      if (outputPath) {
        setMasteredAudio(outputPath)
        try {
          outputUrl = await AudioService.GetAudioDataURL(outputPath)
          setMasteredAudioUrl(outputUrl)
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
      const eventJobId = (event.data as { jobId?: string }).jobId
      const eventId = (event.data as { id?: string }).id
      const resolvedJobId = eventJobId || eventId || jobIdRef.current || `job-${Date.now()}`
      setJobId(resolvedJobId)
      const createdAt = new Date().toLocaleString()
      setJobs((prev) => {
        const filtered = prev.filter((job) => job.id !== resolvedJobId)
        return [
          {
            id: resolvedJobId,
            status: outputUrl ? 'Complete' : 'Complete (no preview)',
            createdAt,
            inputPath: selectedAudioRef.current,
            inputUrl: selectedAudioUrlRef.current,
            outputPath: outputPath || '',
            outputUrl,
          },
          ...filtered,
        ]
      })
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
        setSpectrumLevels((prev) => prev.map(() => 0))
        return
      }
      setMeterLevels((prev) => prev.map(() => Math.min(1, Math.random() * 1.1)))
      setSpectrumLevels((prev) => prev.map(() => Math.min(1, Math.random() * 1.1)))
    }, 120)
    return () => clearInterval(interval)
  }, [isPlaying])

  useEffect(() => {
    if (activeRack !== 'Preview') {
      wavesurferOriginal.current?.destroy()
      wavesurferMastered.current?.destroy()
      wavesurferOriginal.current = null
      wavesurferMastered.current = null
      return
    }
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
  }, [activeRack, selectedAudioUrl, masteredAudioUrl])

  useEffect(() => {
    const original = wavesurferOriginal.current
    const mastered = wavesurferMastered.current
    if (!original || !mastered) {
      return
    }
    const startVolumes = {
      original: clampVolume(original.getVolume()),
      mastered: clampVolume(mastered.getVolume()),
    }
    const target = bypass ? { original: 1, mastered: 0 } : { original: 0, mastered: 1 }
    const start = performance.now()
    const duration = 50

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const lerp = (a: number, b: number) => a + (b - a) * t
      original.setVolume(clampVolume(lerp(startVolumes.original, target.original)))
      mastered.setVolume(clampVolume(lerp(startVolumes.mastered, target.mastered)))
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

  const waveformData = useMemo(
    () => ({
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
    }),
    [
      loudnessOrig,
      rmsOrig,
      peakOrig,
      loudnessMaster,
      rmsMaster,
      peakMaster,
      metricMap,
    ]
  )

  const histogramData = useMemo(
    () => ({
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
    }),
    [loudnessOrig, rmsOrig, peakOrig, loudnessMaster, rmsMaster, peakMaster, metricMap]
  )

  const chartOptions = useMemo<ChartOptions<'line' | 'bar'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#cbd5f5',
          },
        },
      },
      scales: {
        x: {
          ticks: { color: '#94a3b8' },
          grid: { color: 'rgba(148, 163, 184, 0.15)' },
        },
        y: {
          ticks: { color: '#94a3b8' },
          grid: { color: 'rgba(148, 163, 184, 0.15)' },
        },
      },
    }),
    []
  )

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
      jobIdRef.current = id
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

  const loadJob = async (job: MasteringJob) => {
    if (!job.inputUrl || !job.outputUrl) {
      setStatus('Preview unavailable for this job')
      return
    }
    setSelectedAudio(job.inputPath || '')
    setSelectedAudioUrl(job.inputUrl)
    setMasteredAudio(job.outputPath || '')
    setMasteredAudioUrl(job.outputUrl)
    setJobId(job.id)
    jobIdRef.current = job.id
    setIsPlaying(false)
    setBypass(false)
    setActiveRack('Preview')
  }

  return (
    <div className="rack min-h-screen p-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.5em] text-slate-400">Decibelist</p>
            <h1 className="text-4xl font-semibold text-white">Offline AI Mastering Rack</h1>
          </div>
          <div className="segment text-lg">Job {jobId ? jobId.slice(0, 8) : '----'}</div>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <RackTabs active={activeRack} onChange={(value) => setActiveRack(value as RackId)} tabs={rackTabs} />
          <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Rack View</div>
        </div>

        {activeRack === 'Mastering' && (
          <MasteringRack
            selectedAudio={selectedAudio}
            onOpenAudio={openAudio}
            engine={engine}
            engineOptions={engineOptions}
            onEngineChange={setEngine}
            knobValues={knobValues}
            onKnobChange={setKnobValues}
            targetMode={targetMode}
            targetModeOptions={targetModeOptions}
            onTargetModeChange={(value) => setTargetMode(value as 'Loudness' | 'YouTube')}
            targetLoudness={targetLoudness}
            onTargetLoudnessChange={setTargetLoudness}
            ceilingMode={ceilingMode}
            ceilingModeOptions={ceilingModes}
            onCeilingModeChange={setCeilingMode}
            ceiling={ceiling}
            onCeilingChange={setCeiling}
            oversampling={oversampling}
            oversamplingOptions={oversamplingOptions}
            onOversamplingChange={setOversampling}
            autoMastering={autoMastering}
            onToggleAutoMastering={() => setAutoMastering((prev) => !prev)}
            autoLevel={autoLevel}
            onAutoLevelChange={setAutoLevel}
            outputFormat={outputFormat}
            outputFormatOptions={outputFormats}
            onOutputFormatChange={setOutputFormat}
            sampleRate={sampleRate}
            sampleRateOptions={sampleRates}
            onSampleRateChange={setSampleRate}
            lowCut={lowCut}
            onLowCutChange={setLowCut}
            highCut={highCut}
            onHighCutChange={setHighCut}
            preserveBass={preserveBass}
            onPreserveBassChange={setPreserveBass}
            progress={progress}
            status={status}
            onStartMastering={startMastering}
          />
        )}

        {activeRack === 'Preview' && (
          <PreviewRack
            waveformRef={waveformRef}
            masteredRef={masteredRef}
            status={status}
            isPlaying={isPlaying}
            onTogglePlay={togglePlay}
            bypass={bypass}
            onToggleBypass={() => setBypass((prev) => !prev)}
            meterLevels={meterLevels}
            masteredReady={Boolean(masteredAudio)}
            reportReady={Boolean(jobId)}
            onDownloadMastered={downloadMastered}
            onDownloadReport={downloadReport}
          />
        )}

        {activeRack === 'Analysis' && (
          <AnalysisRack
            summaryItems={summaryItems}
            statsRows={statsRows}
            waveformData={waveformData}
            histogramData={histogramData}
            chartOptions={chartOptions}
            spectrumLevels={spectrumLevels}
          />
        )}

        {activeRack === 'Jobs' && (
          <JobsRack jobs={jobs} activeJobId={jobId} onLoadJob={loadJob} />
        )}
      </div>
    </div>
  )
}

export default App
