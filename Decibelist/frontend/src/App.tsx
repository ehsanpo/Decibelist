import { useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import type { ChartOptions } from "chart.js";
import { Dialogs, Events } from "@wailsio/runtime";
import WaveSurfer from "wavesurfer.js";
import { AudioService, MasteringEngine } from "../bindings/decibelist";
import { AnalysisRack } from "./components/racks/AnalysisRack";
import { JobsRack } from "./components/racks/JobsRack";
import { MasteringRack } from "./components/racks/MasteringRack";
import { PreviewRack } from "./components/racks/PreviewRack";
import { RackTabs } from "./components/ui/RackTabs";
import { MasteringJob, MetricRow, SummaryItem } from "./types";
import { clamp } from "./utils/number";
import Fan from "./components/svg/fan";
import {
  averageSpectrum,
  computeSpectrogram,
  diffSpectrogram,
  type SpectrogramData,
} from "./utils/spectrogram";
const engineOptions: { id: MasteringEngine; label: string; detail: string }[] =
  [
    {
      id: MasteringEngine.EngineHybrid,
      label: "Hybrid",
      detail: "Essentia + master_me",
    },
    {
      id: MasteringEngine.EngineClassic,
      label: "Classic",
      detail: "Phaselimiter chain",
    },
  ];

const outputFormats = [
  { id: "wav-16", label: "WAV 16" },
  { id: "wav-24", label: "WAV 24" },
  { id: "wav-32", label: "WAV 32 float" },
  { id: "mp3-320", label: "MP3 320" },
];

const sampleRates = [
  { id: "44.1kHz", label: "44.1kHz" },
  { id: "48kHz", label: "48kHz" },
  { id: "Same as original", label: "Original" },
];

const ceilingModes = [
  { value: "Peak", label: "Peak" },
  { value: "True Peak", label: "True Peak" },
  { value: "True Peak (15kHz Lowpass)", label: "True Peak LP" },
];

const targetModeOptions = [
  { value: "Loudness", label: "Loudness" },
  { value: "YouTube", label: "YouTube" },
];

const oversamplingOptions = [
  { value: "1x", label: "1x" },
  { value: "2x", label: "2x" },
];

const rackTabs = [
  { id: "Mastering", label: "Mastering Rack" },
  { id: "Preview", label: "Preview Rack" },
  { id: "Analysis", label: "Analysis Rack" },
  { id: "Jobs", label: "Jobs Rack" },
];

const METER_BANDS = 8;
const SPECTROGRAM_ROWS = 128;
const SPECTROGRAM_COLS = 240;
const SPECTROGRAM_FFT_SIZE = 2048;

function parseMetricValue(text: string) {
  const match = text.match(/-?\d+(\.\d+)?/);
  if (!match) {
    return 0;
  }
  return Number.parseFloat(match[0]);
}

function clampVolume(value: number) {
  return clamp(value, 0, 1);
}

type AnalyserKey = "original" | "mastered";
type MediaSourceMap = {
  original?: MediaElementAudioSourceNode;
  mastered?: MediaElementAudioSourceNode;
};

function buildAnalyser(
  wavesurfer: WaveSurfer | null,
  key: AnalyserKey,
  audioContextRef: MutableRefObject<AudioContext | null>,
  mediaSourceRef: MutableRefObject<MediaSourceMap>
) {
  if (!wavesurfer) {
    return null;
  }
  const backend = (wavesurfer as unknown as { backend?: any }).backend;
  const analyserFromBackend: AnalyserNode | undefined =
    backend?.analyser || backend?.analyserNode;
  if (analyserFromBackend) {
    return analyserFromBackend;
  }

  const media = wavesurfer.getMediaElement?.();
  if (!(media instanceof HTMLMediaElement)) {
    return null;
  }

  const audioContext = audioContextRef.current ?? new AudioContext();
  audioContextRef.current = audioContext;
  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => null);
  }

  let mediaSource = mediaSourceRef.current[key];
  if (!mediaSource) {
    try {
      mediaSource = audioContext.createMediaElementSource(media);
      mediaSourceRef.current[key] = mediaSource;
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.8;
  try {
    mediaSource.connect(analyser);
    analyser.connect(audioContext.destination);
  } catch (error) {
    console.log(error);
  }
  return analyser;
}

function getBandLevels(analyser: AnalyserNode, bands: number) {
  const buffer = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(buffer);
  const bandSize = Math.max(1, Math.floor(buffer.length / bands));
  return Array.from({ length: bands }, (_, index) => {
    const start = index * bandSize;
    const end = index === bands - 1 ? buffer.length : start + bandSize;
    let sum = 0;
    for (let i = start; i < end; i += 1) {
      sum += buffer[i];
    }
    const avg = sum / (end - start);
    return Math.min(1, (avg / 255) * 1.2);
  });
}

type RackId = "Mastering" | "Preview" | "Analysis" | "Jobs";

function App() {
  const [activeRack, setActiveRack] = useState<RackId>("Mastering");
  const [engine, setEngine] = useState<MasteringEngine>(
    MasteringEngine.EngineHybrid
  );
  const [selectedAudio, setSelectedAudio] = useState("");
  const [selectedAudioUrl, setSelectedAudioUrl] = useState("");
  const [masteredAudio, setMasteredAudio] = useState("");
  const [masteredAudioUrl, setMasteredAudioUrl] = useState("");
  const [targetMode, setTargetMode] = useState<"Loudness" | "YouTube">(
    "Loudness"
  );
  const [targetLoudness, setTargetLoudness] = useState(-6);
  const [ceilingMode, setCeilingMode] = useState("True Peak (15kHz Lowpass)");
  const [ceiling, setCeiling] = useState(-0.6);
  const [oversampling, setOversampling] = useState("1x");
  const [autoMastering, setAutoMastering] = useState(true);
  const [autoLevel, setAutoLevel] = useState(0.5);
  const [outputFormat, setOutputFormat] = useState(outputFormats[0].id);
  const [sampleRate, setSampleRate] = useState(sampleRates[0].id);
  const [lowCut, setLowCut] = useState(40);
  const [highCut, setHighCut] = useState(22000);
  const [outputDir, setOutputDir] = useState("");

  const [status, setStatus] = useState("Idle");
  const [progress, setProgress] = useState(0);
  const [jobId, setJobId] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [bypass, setBypass] = useState(false);

  const [meterLevels, setMeterLevels] = useState<number[]>(
    Array.from({ length: METER_BANDS }, () => 0)
  );
  const [spectrogramOriginal, setSpectrogramOriginal] =
    useState<SpectrogramData | null>(null);
  const [spectrogramMastered, setSpectrogramMastered] =
    useState<SpectrogramData | null>(null);
  const [limitingErrorSpectrogram, setLimitingErrorSpectrogram] =
    useState<SpectrogramData | null>(null);
  const [summaryItems, setSummaryItems] = useState<SummaryItem[]>([]);
  const [statsRows, setStatsRows] = useState<MetricRow[]>([]);
  const [jobs, setJobs] = useState<MasteringJob[]>([]);

  const waveformRef = useRef<HTMLDivElement | null>(null);
  const masteredRef = useRef<HTMLDivElement | null>(null);
  const wavesurferOriginal = useRef<WaveSurfer | null>(null);
  const wavesurferMastered = useRef<WaveSurfer | null>(null);
  const syncingRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaSourceRef = useRef<MediaSourceMap>({});
  const analyserRef = useRef<{
    original: AnalyserNode | null;
    mastered: AnalyserNode | null;
  }>({
    original: null,
    mastered: null,
  });
  const jobIdRef = useRef("");
  const selectedAudioRef = useRef("");
  const selectedAudioUrlRef = useRef("");

  const scheduleSpectrogram = (
    buffer: AudioBuffer,
    setState: (data: SpectrogramData) => void
  ) => {
    const run = () => {
      const result = computeSpectrogram(buffer, {
        rows: SPECTROGRAM_ROWS,
        cols: SPECTROGRAM_COLS,
        fftSize: SPECTROGRAM_FFT_SIZE,
      });
      setState(result);
    };
    const idleCallback = (
      window as Window & { requestIdleCallback?: (cb: () => void) => number }
    ).requestIdleCallback;
    if (idleCallback) {
      idleCallback(run);
      return;
    }
    setTimeout(run, 0);
  };

  const computeSpectrogramFromWaveSurfer = (
    wavesurfer: WaveSurfer,
    setState: (data: SpectrogramData) => void
  ) => {
    const decoded = wavesurfer.getDecodedData?.();
    if (!decoded) {
      return;
    }
    scheduleSpectrogram(decoded, setState);
  };

  useEffect(() => {
    selectedAudioRef.current = selectedAudio;
  }, [selectedAudio]);

  useEffect(() => {
    selectedAudioUrlRef.current = selectedAudioUrl;
  }, [selectedAudioUrl]);

  useEffect(() => {
    jobIdRef.current = jobId;
  }, [jobId]);

  // Load jobs and outputDir from localStorage
  useEffect(() => {
    const savedJobs = localStorage.getItem("decibelist_jobs");
    const savedOutputDir = localStorage.getItem("decibelist_output_dir");

    if (savedOutputDir) {
      setOutputDir(savedOutputDir);
    }

    if (savedJobs) {
      try {
        const parsedJobs: MasteringJob[] = JSON.parse(savedJobs);
        // Refresh URLs for all jobs
        const refreshJobs = async () => {
          const updatedJobs = await Promise.all(
            parsedJobs.map(async (job) => {
              let inputUrl = job.inputUrl;
              let outputUrl = job.outputUrl;

              if (job.inputPath) {
                try {
                  inputUrl = await AudioService.GetAudioDataURL(job.inputPath);
                } catch (e) {
                  console.error(e);
                }
              }
              if (job.outputPath) {
                try {
                  outputUrl = await AudioService.GetAudioDataURL(
                    job.outputPath
                  );
                } catch (e) {
                  console.error(e);
                }
              }

              return { ...job, inputUrl, outputUrl };
            })
          );
          setJobs(updatedJobs);
        };
        refreshJobs();
      } catch (error) {
        console.error("Failed to load jobs", error);
      }
    }
  }, []);

  // Save jobs to localStorage
  useEffect(() => {
    if (jobs.length > 0) {
      localStorage.setItem("decibelist_jobs", JSON.stringify(jobs));
    }
  }, [jobs]);

  // Save outputDir to localStorage
  useEffect(() => {
    localStorage.setItem("decibelist_output_dir", outputDir);
  }, [outputDir]);

  useEffect(() => {
    const offProgress = Events.On("mastering:progress", (event) => {
      setProgress(event.data.percent);
      setStatus(event.data.message);
    });
    const offComplete = Events.On("mastering:complete", async (event) => {
      setStatus("Complete");
      setProgress(100);
      const outputPath = event.data.result?.outputPath;
      let outputUrl = "";
      if (outputPath) {
        setMasteredAudio(outputPath);
        setSpectrogramMastered(null);
        try {
          outputUrl = await AudioService.GetAudioDataURL(outputPath);
          setMasteredAudioUrl(outputUrl);
        } catch (error) {
          setMasteredAudioUrl("");
          setStatus("Complete (preview failed)");
          console.log(error);
        }
      }
      if (event.data.result?.summary?.length) {
        setSummaryItems(event.data.result.summary);
      }
      if (event.data.result?.metrics?.length) {
        setStatsRows(event.data.result.metrics);
      }
      const eventJobId = (event.data as { jobId?: string }).jobId;
      const eventId = (event.data as { id?: string }).id;
      const resolvedJobId =
        eventJobId || eventId || jobIdRef.current || `job-${Date.now()}`;
      setJobId(resolvedJobId);
      const createdAt = new Date().toLocaleString();
      setJobs((prev) => {
        const filtered = prev.filter((job) => job.id !== resolvedJobId);
        return [
          {
            id: resolvedJobId,
            status: outputUrl ? "Complete" : "Complete (no preview)",
            createdAt,
            inputPath: selectedAudioRef.current,
            inputUrl: selectedAudioUrlRef.current,
            outputPath: outputPath || "",
            outputUrl,
          },
          ...filtered,
        ];
      });
    });
    const offError = Events.On("mastering:error", (event) => {
      setStatus(event.data.error || "Error");
    });
    return () => {
      offProgress();
      offComplete();
      offError();
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!analyserRef.current.original && wavesurferOriginal.current) {
        analyserRef.current.original = buildAnalyser(
          wavesurferOriginal.current,
          "original",
          audioContextRef,
          mediaSourceRef
        );
      }
      if (!analyserRef.current.mastered && wavesurferMastered.current) {
        analyserRef.current.mastered = buildAnalyser(
          wavesurferMastered.current,
          "mastered",
          audioContextRef,
          mediaSourceRef
        );
      }

      const originalAnalyser = analyserRef.current.original;
      const masteredAnalyser = analyserRef.current.mastered;
      if (!isPlaying || !originalAnalyser || !masteredAnalyser) {
        setMeterLevels(Array.from({ length: METER_BANDS }, () => 0));
        return;
      }
      const activeAnalyser = bypass ? originalAnalyser : masteredAnalyser;
      setMeterLevels(getBandLevels(activeAnalyser, METER_BANDS));
    }, 120);
    return () => clearInterval(interval);
  }, [isPlaying, bypass]);

  useEffect(() => {
    if (!waveformRef.current || !masteredRef.current) {
      return;
    }
    if (wavesurferOriginal.current || wavesurferMastered.current) {
      return;
    }

    const baseOptions = {
      waveColor: "#55b6ff",
      progressColor: "#a4fff1",
      cursorColor: "#ffffff",
      barWidth: 2,
      barGap: 2,
      height: 120,
      normalize: true,
    };

    const original = WaveSurfer.create({
      ...baseOptions,
      container: waveformRef.current,
    });

    const mastered = WaveSurfer.create({
      ...baseOptions,
      container: masteredRef.current,
      waveColor: "#ffbb3b",
      progressColor: "#ffef9c",
    });

    wavesurferOriginal.current = original;
    wavesurferMastered.current = mastered;
    analyserRef.current.original = buildAnalyser(
      original,
      "original",
      audioContextRef,
      mediaSourceRef
    );
    analyserRef.current.mastered = buildAnalyser(
      mastered,
      "mastered",
      audioContextRef,
      mediaSourceRef
    );

    const syncPlayback = (source: WaveSurfer, target: WaveSurfer) => {
      if (syncingRef.current) {
        return;
      }
      syncingRef.current = true;
      const duration = source.getDuration();
      if (duration > 0) {
        const ratio = source.getCurrentTime() / duration;
        target.seekTo(Math.min(1, Math.max(0, ratio)));
      }
      if (source.isPlaying() && !target.isPlaying()) {
        target.play();
      }
      if (!source.isPlaying() && target.isPlaying()) {
        target.pause();
      }
      syncingRef.current = false;
    };

    const syncSeek = (source: WaveSurfer, target: WaveSurfer) => {
      if (syncingRef.current) {
        return;
      }
      syncingRef.current = true;
      const duration = source.getDuration();
      if (duration > 0) {
        const ratio = source.getCurrentTime() / duration;
        target.seekTo(Math.min(1, Math.max(0, ratio)));
      }
      if (source.isPlaying() && !target.isPlaying()) {
        target.play();
      }
      syncingRef.current = false;
    };

    const syncState = () => {
      setIsPlaying(original.isPlaying() || mastered.isPlaying());
    };

    const ensureAnalysers = () => {
      if (!analyserRef.current.original) {
        analyserRef.current.original = buildAnalyser(
          original,
          "original",
          audioContextRef,
          mediaSourceRef
        );
      }
      if (!analyserRef.current.mastered) {
        analyserRef.current.mastered = buildAnalyser(
          mastered,
          "mastered",
          audioContextRef,
          mediaSourceRef
        );
      }
    };

    original.on("interaction", () => syncSeek(original, mastered));
    mastered.on("interaction", () => syncSeek(mastered, original));
    original.on("play", () => {
      ensureAnalysers();
      if (!mastered.isPlaying()) {
        mastered.play();
      }
      syncState();
    });
    mastered.on("play", () => {
      ensureAnalysers();
      if (!original.isPlaying()) {
        original.play();
      }
      syncState();
    });
    original.on("pause", () => {
      if (mastered.isPlaying()) {
        mastered.pause();
      }
      syncState();
    });
    mastered.on("pause", () => {
      if (original.isPlaying()) {
        original.pause();
      }
      syncState();
    });
    original.on("ready", () => syncPlayback(original, mastered));
    mastered.on("ready", () => syncPlayback(mastered, original));
    original.on("ready", ensureAnalysers);
    mastered.on("ready", ensureAnalysers);
    original.on("decode", () =>
      computeSpectrogramFromWaveSurfer(original, setSpectrogramOriginal)
    );
    mastered.on("decode", () =>
      computeSpectrogramFromWaveSurfer(mastered, setSpectrogramMastered)
    );
    original.on("error", (error) => {
      setStatus("Preview failed to load");
      console.log(error);
    });
    mastered.on("error", (error) => {
      setStatus("Preview failed to load");
      console.log(error);
    });

    original.setVolume(bypass ? 1 : 0);
    mastered.setVolume(bypass ? 0 : 1);
    return () => {
      original.destroy();
      mastered.destroy();
      wavesurferOriginal.current = null;
      wavesurferMastered.current = null;
      analyserRef.current.original = null;
      analyserRef.current.mastered = null;
      mediaSourceRef.current = {};
    };
  }, []);

  useEffect(() => {
    const original = wavesurferOriginal.current;
    if (!original) {
      return;
    }
    if (!selectedAudioUrl) {
      return;
    }
    original.load(selectedAudioUrl).catch((error) => {
      setStatus("Preview failed to load");
      console.log(error);
    });
  }, [selectedAudioUrl]);

  useEffect(() => {
    const mastered = wavesurferMastered.current;
    if (!mastered) {
      return;
    }
    if (!masteredAudioUrl) {
      return;
    }
    mastered.load(masteredAudioUrl).catch((error) => {
      setStatus("Preview failed to load");
      console.log(error);
    });
  }, [masteredAudioUrl]);

  useEffect(() => {
    const original = wavesurferOriginal.current;
    const mastered = wavesurferMastered.current;
    if (!original || !mastered) {
      return;
    }
    const startVolumes = {
      original: clampVolume(original.getVolume()),
      mastered: clampVolume(mastered.getVolume()),
    };
    const target = bypass
      ? { original: 1, mastered: 0 }
      : { original: 0, mastered: 1 };
    const start = performance.now();
    const duration = 50;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const lerp = (a: number, b: number) => a + (b - a) * t;
      original.setVolume(
        clampVolume(lerp(startVolumes.original, target.original))
      );
      mastered.setVolume(
        clampVolume(lerp(startVolumes.mastered, target.mastered))
      );
      if (t < 1) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  }, [bypass]);

  useEffect(() => {
    if (spectrogramOriginal && spectrogramMastered) {
      setLimitingErrorSpectrogram(
        diffSpectrogram(spectrogramOriginal, spectrogramMastered)
      );
    }
  }, [spectrogramOriginal, spectrogramMastered]);

  const metricMap = useMemo(() => {
    const map = new Map<string, { original: string; mastered: string }>();
    statsRows.forEach((metric) =>
      map.set(metric.name, {
        original: metric.original,
        mastered: metric.mastered,
      })
    );
    return map;
  }, [statsRows]);

  const loudnessOrig = parseMetricValue(
    metricMap.get("Loudness")?.original ?? "0"
  );
  const loudnessMaster = parseMetricValue(
    metricMap.get("Loudness")?.mastered ?? "0"
  );
  const rmsOrig = parseMetricValue(metricMap.get("RMS")?.original ?? "0");
  const rmsMaster = parseMetricValue(metricMap.get("RMS")?.mastered ?? "0");
  const peakOrig = parseMetricValue(metricMap.get("Peak")?.original ?? "0");
  const peakMaster = parseMetricValue(metricMap.get("Peak")?.mastered ?? "0");

  const waveformData = useMemo(
    () => ({
      labels: [
        "LUFS",
        "RMS",
        "Peak",
        "Range",
        "True Peak",
        "Space",
        "Dynamics",
        "Entropy",
      ],
      datasets: [
        {
          label: "Original",
          data: [
            Math.abs(loudnessOrig),
            Math.abs(rmsOrig),
            Math.abs(peakOrig),
            Math.abs(
              parseMetricValue(metricMap.get("Loudness Range")?.original ?? "0")
            ),
            Math.abs(
              parseMetricValue(metricMap.get("True Peak")?.original ?? "0")
            ),
            Math.abs(parseMetricValue(metricMap.get("Space")?.original ?? "0")),
            Math.abs(
              parseMetricValue(metricMap.get("Micro Dynamics")?.original ?? "0")
            ),
            Math.abs(
              parseMetricValue(
                metricMap.get("Acoustic Entropy")?.original ?? "0"
              )
            ),
          ],
          borderColor: "#55b6ff",
          backgroundColor: "rgba(85, 182, 255, 0.2)",
        },
        {
          label: "Mastered",
          data: [
            Math.abs(loudnessMaster),
            Math.abs(rmsMaster),
            Math.abs(peakMaster),
            Math.abs(
              parseMetricValue(metricMap.get("Loudness Range")?.mastered ?? "0")
            ),
            Math.abs(
              parseMetricValue(metricMap.get("True Peak")?.mastered ?? "0")
            ),
            Math.abs(parseMetricValue(metricMap.get("Space")?.mastered ?? "0")),
            Math.abs(
              parseMetricValue(metricMap.get("Micro Dynamics")?.mastered ?? "0")
            ),
            Math.abs(
              parseMetricValue(
                metricMap.get("Acoustic Entropy")?.mastered ?? "0"
              )
            ),
          ],
          borderColor: "#ffbb3b",
          backgroundColor: "rgba(255, 187, 59, 0.2)",
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
  );

  const spectrumProfileOriginal = useMemo(
    () =>
      spectrogramOriginal
        ? averageSpectrum(spectrogramOriginal)
        : Array.from({ length: SPECTROGRAM_ROWS }, () => 0),
    [spectrogramOriginal]
  );

  const spectrumProfileMastered = useMemo(
    () =>
      spectrogramMastered
        ? averageSpectrum(spectrogramMastered)
        : Array.from({ length: SPECTROGRAM_ROWS }, () => 0),
    [spectrogramMastered]
  );

  const spectrumLabels = useMemo(
    () =>
      Array.from({ length: SPECTROGRAM_ROWS }, (_, index) => `${index + 1}`),
    []
  );

  const spectrumData = useMemo(
    () => ({
      labels: spectrumLabels,
      datasets: [
        {
          label: "Original",
          data: spectrumProfileOriginal.map((value) => Math.round(value * 100)),
          borderColor: "#55b6ff",
          backgroundColor: "rgba(85, 182, 255, 0.2)",
        },
        {
          label: "Mastered",
          data: spectrumProfileMastered.map((value) => Math.round(value * 100)),
          borderColor: "#ffbb3b",
          backgroundColor: "rgba(255, 187, 59, 0.2)",
        },
      ],
    }),
    [spectrumLabels, spectrumProfileOriginal, spectrumProfileMastered]
  );

  const spectrumDistributionData = useMemo(() => {
    const tilt = (levels: number[]) =>
      levels.map((value, index) => {
        const factor = 1 + (index / Math.max(1, levels.length - 1)) * 0.35;
        return Math.round(Math.min(1, value * factor) * 100);
      });
    return {
      labels: spectrumLabels,
      datasets: [
        {
          label: "Original",
          data: tilt(spectrumProfileOriginal),
          borderColor: "#55b6ff",
          backgroundColor: "rgba(85, 182, 255, 0.15)",
        },
        {
          label: "Mastered",
          data: tilt(spectrumProfileMastered),
          borderColor: "#ffbb3b",
          backgroundColor: "rgba(255, 187, 59, 0.15)",
        },
      ],
    };
  }, [spectrumLabels, spectrumProfileOriginal, spectrumProfileMastered]);

  const histogramData = useMemo(
    () => ({
      labels: ["LUFS", "RMS", "Peak", "TP", "Range", "Space"],
      datasets: [
        {
          label: "Original",
          data: [
            Math.abs(loudnessOrig),
            Math.abs(rmsOrig),
            Math.abs(peakOrig),
            Math.abs(
              parseMetricValue(metricMap.get("True Peak")?.original ?? "0")
            ),
            Math.abs(
              parseMetricValue(metricMap.get("Loudness Range")?.original ?? "0")
            ),
            Math.abs(parseMetricValue(metricMap.get("Space")?.original ?? "0")),
          ],
          backgroundColor: "rgba(111, 243, 255, 0.4)",
        },
        {
          label: "Mastered",
          data: [
            Math.abs(loudnessMaster),
            Math.abs(rmsMaster),
            Math.abs(peakMaster),
            Math.abs(
              parseMetricValue(metricMap.get("True Peak")?.mastered ?? "0")
            ),
            Math.abs(
              parseMetricValue(metricMap.get("Loudness Range")?.mastered ?? "0")
            ),
            Math.abs(parseMetricValue(metricMap.get("Space")?.mastered ?? "0")),
          ],
          backgroundColor: "rgba(255, 187, 59, 0.5)",
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
  );

  const chartOptions = useMemo<ChartOptions<"line" | "bar">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: "#cbd5f5",
          },
        },
      },
      scales: {
        x: {
          ticks: { color: "#94a3b8" },
          grid: { color: "rgba(148, 163, 184, 0.15)" },
        },
        y: {
          ticks: { color: "#94a3b8" },
          grid: { color: "rgba(148, 163, 184, 0.15)" },
        },
      },
    }),
    []
  );

  const openAudio = async () => {
    const result = await Dialogs.OpenFile({
      AllowsMultipleSelection: false,
      Filters: [
        { DisplayName: "Audio", Pattern: "*.wav;*.mp3;*.flac;*.aiff;*.m4a" },
      ],
      Title: "Select Audio File",
    });
    if (typeof result === "string" && result) {
      setSelectedAudio(result);
      setSelectedAudioUrl("");
      setMasteredAudio("");
      setMasteredAudioUrl("");
      setSpectrogramOriginal(null);
      setSpectrogramMastered(null);
      setLimitingErrorSpectrogram(null);
      setIsPlaying(false);
      setBypass(false);
      try {
        const url = await AudioService.GetAudioDataURL(result);
        setSelectedAudioUrl(url);
      } catch (error) {
        setStatus("Failed to load audio for preview");
        console.log(error);
      }
    }
  };

  const chooseOutputDir = async () => {
    const result = await Dialogs.OpenFile({
      CanChooseDirectories: true,
      CanChooseFiles: false,
      Title: "Select Output Directory",
    });
    if (typeof result === "string" && result) {
      setOutputDir(result);
    }
  };

  const startMastering = async () => {
    if (!selectedAudio) {
      setStatus("Select an audio file first");
      return;
    }
    if (!outputDir) {
      setStatus("Select an output directory first");
      return;
    }
    setStatus("Starting...");
    setProgress(1);
    try {
      const id = await AudioService.StartMastering({
        inputPath: selectedAudio,
        outputDir: outputDir,
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
        },
      });
      setJobId(id);
      jobIdRef.current = id;
    } catch (error) {
      setStatus("Failed to start mastering");
      console.log(error);
    }
  };

  const togglePlay = () => {
    const original = wavesurferOriginal.current;
    const mastered = wavesurferMastered.current;
    if (!original || !mastered) {
      return;
    }
    audioContextRef.current?.resume().catch(() => null);
    const shouldPause = original.isPlaying() || mastered.isPlaying();
    if (shouldPause) {
      original.pause();
      mastered.pause();
      setIsPlaying(false);
    } else {
      original.play();
      mastered.play();
      setIsPlaying(true);
    }
  };

  const downloadMastered = async () => {
    if (!masteredAudio) {
      setStatus("Mastered file not ready");
      return;
    }
    const savePath = await Dialogs.SaveFile({
      Filename: "decibelist_mastered.wav",
    });
    if (savePath) {
      await AudioService.ExportFile(masteredAudio, savePath);
      setStatus(`Exported to ${savePath}`);
    }
  };

  const downloadReport = async () => {
    if (!jobId) {
      setStatus("No report available yet");
      return;
    }
    const savePath = await Dialogs.SaveFile({
      Filename: "decibelist_report.json",
    });
    if (savePath) {
      await AudioService.ExportReport(jobId, savePath);
      setStatus(`Report saved to ${savePath}`);
    }
  };

  const loadJob = async (job: MasteringJob) => {
    if (!job.inputUrl || !job.outputUrl) {
      setStatus("Preview unavailable for this job");
      return;
    }
    setSelectedAudio(job.inputPath || "");
    setSelectedAudioUrl(job.inputUrl);
    setMasteredAudio(job.outputPath || "");
    setMasteredAudioUrl(job.outputUrl);
    setJobId(job.id);
    jobIdRef.current = job.id;
    setSpectrogramOriginal(null);
    setSpectrogramMastered(null);
    setLimitingErrorSpectrogram(null);
    setIsPlaying(false);
    setBypass(false);
    setActiveRack("Preview");
  };

  return (
    <div className="rack min-h-screen p-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <header className="flex items-center justify-between gap-4 border-b border-white/5 pb-3">
          <div className="flex items-center gap-3">
            <img
              src="/appicon.png"
              alt="Decibelist"
              className="w-[28px] h-[28px] object-contain"
            />
            <div className="flex flex-col">
              <h1 className="text-lg font-bold tracking-tight text-white leading-none">
                Offline Mastering Rack
              </h1>
              <p className="text-[9px] uppercase tracking-[0.4em] text-slate-500 font-mono mt-1">
                Decibelist
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="segment text-[9px] px-2 py-0.5 opacity-60 font-mono">
              SID:{jobId ? jobId.slice(0, 8) : "---"}
            </div>
            <Fan
              width={28}
              height={28}
              isSpinning={
                progress > 0 &&
                progress < 100 &&
                !status.toLowerCase().includes("error") &&
                !status.toLowerCase().includes("failed")
              }
            />
          </div>
        </header>

        <div className="flex items-center justify-between">
          <RackTabs
            active={activeRack}
            onChange={(value) => setActiveRack(value as RackId)}
            tabs={rackTabs}
          />
        </div>

        <div className="relative">
          {activeRack === "Mastering" && (
            <MasteringRack
              selectedAudio={selectedAudio}
              onOpenAudio={openAudio}
              engine={engine}
              engineOptions={engineOptions}
              onEngineChange={setEngine}
              targetMode={targetMode}
              targetModeOptions={targetModeOptions}
              onTargetModeChange={(value) =>
                setTargetMode(value as "Loudness" | "YouTube")
              }
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
              progress={progress}
              status={status}
              onStartMastering={startMastering}
              outputDir={outputDir}
              onChooseOutputDir={chooseOutputDir}
            />
          )}

          {activeRack === "Analysis" && (
            <AnalysisRack
              summaryItems={summaryItems}
              statsRows={statsRows}
              waveformData={waveformData}
              histogramData={histogramData}
              spectrumData={spectrumData}
              spectrumDistributionData={spectrumDistributionData}
              chartOptions={chartOptions}
              spectrogramOriginal={spectrogramOriginal}
              spectrogramMastered={spectrogramMastered}
              limitingErrorSpectrogram={limitingErrorSpectrogram}
            />
          )}

          {activeRack === "Jobs" && (
            <JobsRack jobs={jobs} activeJobId={jobId} onLoadJob={loadJob} />
          )}

          <div
            className={
              activeRack === "Preview"
                ? "relative"
                : "absolute inset-0 pointer-events-none opacity-0"
            }
            aria-hidden={activeRack !== "Preview"}
          >
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
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
