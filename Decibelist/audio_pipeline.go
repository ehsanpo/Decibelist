package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"
)

func (s *AudioService) runEnginePipeline(ctx context.Context, jobID string, req MasteringRequest) (*MasteringResult, error) {
	engine := req.Engine
	binaries := requiredBinaries(engine)
	binaryStatus, binDir := checkBinaries(binaries)
	diagnostics := EngineDiagnostics{
		Engine:    engine,
		Binaries:  binaryStatus,
		Simulated: false,
		Notes:     []string{},
		Command:   EngineCommand{},
	}

	if missingBinaries(binaryStatus) {
		diagnostics.Notes = append(diagnostics.Notes, fmt.Sprintf("Missing binaries under %s", binDir))
	}

	outputDir := req.OutputDir
	if outputDir == "" {
		outputDir = filepath.Join(resolveBaseDir(), "output")
	}
	if err := ensureDir(outputDir); err != nil {
		return nil, err
	}

	workDir := filepath.Join(outputDir, "work", jobID)
	if err := ensureDir(workDir); err != nil {
		return nil, err
	}

	s.emitProgress(jobID, 6, "Preparing audio")
	inputWav := filepath.Join(workDir, "input.wav")
	if err := convertToWav(ctx, req.InputPath, inputWav, engine, req.Options); err != nil {
		return nil, err
	}

	s.emitProgress(jobID, 30, fmt.Sprintf("Running %s engine", engineDisplayName(engine)))
	engineOutput := filepath.Join(workDir, "engine.wav")
	engineSimulated := false
	var engineCmd EngineCommand
	switch engine {
	case EngineClassic:
		var err error
		engineCmd, err = runPhaselimiter(ctx, inputWav, engineOutput, req.Options)
		if err != nil {
			return nil, err
		}
	case EngineHybrid:
		fallthrough
	default:
		var err error
		engineCmd, engineSimulated, err = runMasterMe(ctx, inputWav, engineOutput, req.Options, workDir)
		if err != nil {
			diagnostics.Notes = append(diagnostics.Notes, "master_me failed, using input audio: "+err.Error())
			engineOutput = inputWav
			engineSimulated = true
		}
	}

	diagnostics.Command = engineCmd
	if engineSimulated {
		diagnostics.Simulated = true
		diagnostics.Notes = append(diagnostics.Notes, "Hybrid engine ran in pass-through mode")
	}

	s.emitProgress(jobID, 58, "Applying normalization (LUFS)")
	normalizedPath := filepath.Join(workDir, "normalized.wav")
	normalization, err := NormalizeToLUFS(ctx, engineOutput, normalizedPath, req.Options)
	if err != nil {
		return nil, err
	}

	s.emitProgress(jobID, 72, "Rendering mastered file")
	outputPath := filepath.Join(outputDir, "mastered."+defaultExtension(req.Options.OutputFormat))
	if err := finalizeOutput(ctx, normalizedPath, outputPath, req.Options, req.InputPath); err != nil {
		return nil, err
	}

	s.emitProgress(jobID, 86, "Computing analytics")
	originalStats, warnOriginal := ComputeStats(ctx, req.InputPath)
	masteredStats, warnMastered := ComputeStats(ctx, outputPath)
	diagnostics.Notes = append(diagnostics.Notes, warnOriginal...)
	diagnostics.Notes = append(diagnostics.Notes, warnMastered...)

	metrics := buildMetrics(originalStats, masteredStats)
	summary := buildSummary(req, normalization)

	s.emitProgress(jobID, 100, "Finalizing")

	result := &MasteringResult{
		OutputPath:  outputPath,
		Summary:     summary,
		Metrics:     metrics,
		Warnings:    diagnostics.Notes,
		Diagnostics: diagnostics,
	}
	_ = WriteSummaryReport(filepath.Join(outputDir, "summary_report.json"), SummaryReport{
		JobID:       jobID,
		GeneratedAt: time.Now().Format(time.RFC3339),
		InputPath:   req.InputPath,
		OutputPath:  outputPath,
		Summary:     summary,
		Metrics:     metrics,
		Diagnostics: diagnostics,
		Warnings:    diagnostics.Notes,
	})
	return result, nil
}

func convertToWav(ctx context.Context, inputPath, outputPath string, engine MasteringEngine, opts MasteringOptions) error {
	ffmpeg := toolPath("ffmpeg/ffmpeg")
	sampleRate := parseSampleRate(opts.SampleRate)
	if engine == EngineClassic && sampleRate == 0 {
		sampleRate = 44100
	}
	args := []string{"-y", "-hide_banner", "-nostats", "-i", inputPath}
	if sampleRate > 0 {
		args = append(args, "-ar", fmt.Sprintf("%d", sampleRate))
	}
	args = append(args, "-ac", "2", "-c:a", "pcm_s16le", outputPath)
	_, err := RunAndCapture(ctx, ExecRequest{
		Path: ffmpeg,
		Args: args,
	})
	return err
}

func runPhaselimiter(ctx context.Context, inputPath, outputPath string, opts MasteringOptions) (EngineCommand, error) {
	path := toolPath("phaselimiter/bin/phase_limiter")
	ffmpeg := toolPath("ffmpeg/ffmpeg")
	oversample := 1
	if strings.Contains(opts.Oversampling, "2") {
		oversample = 2
	}

	targetLoudness := resolveTargetLoudness(opts)
	referenceMode := "loudness"
	if strings.Contains(strings.ToLower(opts.TargetLoudnessMode), "youtube") {
		referenceMode = "youtube_loudness"
	}

	ceilingMode := "true_peak"
	if strings.Contains(strings.ToLower(opts.CeilingMode), "peak") && !strings.Contains(strings.ToLower(opts.CeilingMode), "true") {
		ceilingMode = "peak"
	}
	if strings.Contains(strings.ToLower(opts.CeilingMode), "lowpass") {
		ceilingMode = "lowpass_true_peak"
	}

	sampleRate := parseSampleRate(opts.SampleRate)
	if sampleRate == 0 {
		sampleRate = 44100
	}

	ceiling := resolveCeiling(opts)
	args := []string{
		fmt.Sprintf("-input=%s", inputPath),
		fmt.Sprintf("-output=%s", outputPath),
		fmt.Sprintf("-reference=%.2f", targetLoudness),
		fmt.Sprintf("-reference_mode=%s", referenceMode),
		fmt.Sprintf("-ceiling=%.2f", ceiling),
		fmt.Sprintf("-ceiling_mode=%s", ceilingMode),
		fmt.Sprintf("-low_cut_freq=%.2f", opts.LowCutHz),
		fmt.Sprintf("-high_cut_freq=%.2f", opts.HighCutHz),
		fmt.Sprintf("-limiter_internal_oversample=%d", oversample),
		fmt.Sprintf("-limiter_external_oversample=%d", oversample),
		fmt.Sprintf("-output_format=wav"),
		fmt.Sprintf("-sample_rate=%d", sampleRate),
		fmt.Sprintf("-ffmpeg=%s", ffmpeg),
		"-quick_exit=true",
	}

	if opts.AutomaticMastering {
		args = append(args, "-mastering_mode=mastering5")
		args = append(args, fmt.Sprintf("-mastering5_mastering_level=%.2f", opts.AutomaticLevel))
	}

	err := RunWithProgress(ctx, ExecRequest{
		Path: path,
		Args: args,
	}, func(progress ExecProgress) {})
	return EngineCommand{Path: path, Args: args}, err
}

func runMasterMe(ctx context.Context, inputPath, outputPath string, opts MasteringOptions, workDir string) (EngineCommand, bool, error) {
	path := toolPath("master_me/master_me")
	if _, err := os.Stat(path); err != nil {
		return EngineCommand{}, true, fmt.Errorf("master_me binary not found: %s", path)
	}

	paramsPath := filepath.Join(workDir, "master_me_params.json")
	params := map[string]any{
		"targetLoudness":     opts.TargetLoudness,
		"targetLoudnessMode": opts.TargetLoudnessMode,
		"ceiling":            opts.Ceiling,
		"ceilingMode":        opts.CeilingMode,
		"oversampling":       opts.Oversampling,
		"autoLevel":          opts.AutomaticLevel,
		"lowCutHz":           opts.LowCutHz,
		"highCutHz":          opts.HighCutHz,
	}
	if data, err := json.MarshalIndent(params, "", "  "); err == nil {
		_ = os.WriteFile(paramsPath, data, 0o644)
	}

	args, configured := resolveMasterMeArgs(inputPath, outputPath, paramsPath)
	if !configured {
		return EngineCommand{Path: path, Args: []string{}}, true, fmt.Errorf("master_me CLI args not configured")
	}

	err := RunWithProgress(ctx, ExecRequest{
		Path: path,
		Args: args,
	}, func(progress ExecProgress) {})

	return EngineCommand{Path: path, Args: args}, false, err
}

func resolveMasterMeArgs(inputPath, outputPath, paramsPath string) ([]string, bool) {
	template := strings.TrimSpace(os.Getenv("DECIBELIST_MASTERME_ARGS"))
	if template == "" {
		configPath := filepath.Join(toolsBaseDir(), "master_me", "cli_args.txt")
		if data, err := os.ReadFile(configPath); err == nil {
			template = strings.TrimSpace(string(data))
		}
	}
	if template == "" {
		return nil, false
	}
	parts := strings.Fields(template)
	args := make([]string, 0, len(parts))
	for _, part := range parts {
		replaced := strings.ReplaceAll(part, "{input}", inputPath)
		replaced = strings.ReplaceAll(replaced, "{output}", outputPath)
		replaced = strings.ReplaceAll(replaced, "{params}", paramsPath)
		args = append(args, replaced)
	}
	return args, true
}

func finalizeOutput(ctx context.Context, inputPath, outputPath string, opts MasteringOptions, metadataSource string) error {
	ffmpeg := toolPath("ffmpeg/ffmpeg")
	format := strings.ToLower(opts.OutputFormat)
	codec := ""
	extra := []string{}
	switch format {
	case "wav-24", "wav-24bit", "wav-24-bit":
		codec = "pcm_s24le"
	case "wav-32", "wav-32bit", "wav-32-bit", "wav-32bit-float", "wav-32-bit-float":
		codec = "pcm_f32le"
	case "mp3-320", "mp3":
		codec = "libmp3lame"
		extra = append(extra, "-b:a", "320k")
	default:
		codec = "pcm_s16le"
	}

	args := []string{"-y", "-hide_banner", "-nostats", "-i", inputPath}
	if metadataSource != "" {
		args = append(args, "-i", metadataSource, "-map", "0:a", "-map_metadata", "1")
	}
	if codec != "" {
		args = append(args, "-c:a", codec)
	}
	args = append(args, extra...)
	args = append(args, outputPath)

	_, err := RunAndCapture(ctx, ExecRequest{
		Path: ffmpeg,
		Args: args,
	})
	return err
}

func copyFile(source, destination string) error {
	if source == destination {
		return nil
	}
	in, err := os.Open(source)
	if err != nil {
		return err
	}
	defer in.Close()

	if err := ensureDir(filepath.Dir(destination)); err != nil {
		return err
	}
	out, err := os.Create(destination)
	if err != nil {
		return err
	}
	defer out.Close()

	if _, err := io.Copy(out, in); err != nil {
		return err
	}
	return out.Sync()
}

func buildSummary(req MasteringRequest, norm NormalizationResult) []SummaryItem {
	mode := "Custom Mastering"
	algorithm := engineDisplayName(req.Engine)
	loudnessMode := req.Options.TargetLoudnessMode
	if loudnessMode == "" {
		loudnessMode = "Loudness"
	}
	oversampling := req.Options.Oversampling
	if oversampling == "" {
		oversampling = "1x"
	}
	outputFormat := req.Options.OutputFormat
	if outputFormat == "" {
		outputFormat = "wav-16"
	}
	outputLabel := formatOutputLabel(outputFormat)
	sampleRate := req.Options.SampleRate
	if sampleRate == "" {
		sampleRate = "Same as original"
	}
	ceiling := resolveCeiling(req.Options)

	return []SummaryItem{
		{Label: "Status", Value: "Succeeded"},
		{Label: "Time", Value: time.Now().Format("02 Jan 2006 15:04")},
		{Label: "Mode", Value: mode},
		{Label: "Mastering Algorithm", Value: algorithm},
		{Label: "Target Loudness", Value: fmt.Sprintf("%.1f dB", norm.AfterLUFS)},
		{Label: "Target Loudness Mode", Value: loudnessMode},
		{Label: "Automatic Mastering", Value: boolLabel(req.Options.AutomaticMastering)},
		{Label: "Automatic Mastering Level", Value: fmt.Sprintf("%.2f", req.Options.AutomaticLevel)},
		{Label: "Low Cut Freq", Value: fmt.Sprintf("%.0f Hz", req.Options.LowCutHz)},
		{Label: "High Cut Freq", Value: fmt.Sprintf("%.0f Hz", req.Options.HighCutHz)},
		{Label: "Ceiling Mode", Value: req.Options.CeilingMode},
		{Label: "Ceiling", Value: fmt.Sprintf("%.1f dB", ceiling)},
		{Label: "Oversampling", Value: oversampling},
		{Label: "Output Format", Value: outputLabel},
		{Label: "Sampling Rate", Value: sampleRate},
		{Label: "Bass Preservation", Value: boolLabel(req.Options.PreserveBass)},
	}
}

func boolLabel(value bool) string {
	if value {
		return "Enabled"
	}
	return "Disabled"
}

func buildMetrics(original, mastered AudioStats) []Metric {
	return []Metric{
		metricValue("Loudness", original.IntegratedLUFS, mastered.IntegratedLUFS, -24, -3, "db"),
		metricValue("RMS", original.RMS, mastered.RMS, -30, 0, "db"),
		metricValue("Peak", original.Peak, mastered.Peak, -12, 0, "db"),
		metricSimple("True Peak", original.TruePeak, mastered.TruePeak, " dB"),
		metricSimple("True Peak (15kHz lowpass)", original.TruePeakLP, mastered.TruePeakLP, " dB"),
		metricValue("Loudness Range", original.LoudnessRange, mastered.LoudnessRange, 0, 20, "db"),
		metricValue("YouTube Loudness", original.IntegratedLUFS, mastered.IntegratedLUFS, -24, -3, "db"),
		metricSimple("YouTube Loudness Compensation", original.YouTubeComp, mastered.YouTubeComp, " dB"),
		metricValue("Micro Dynamics", original.MicroDynamics, mastered.MicroDynamics, 0, 8, "db"),
		metricValue("Space", original.Space, mastered.Space, -20, 6, "db"),
		metricSimple("Professionality", original.Professionality, mastered.Professionality, " %"),
		metricSimple("Professionality2", original.Professionality2, mastered.Professionality2, " %"),
		metricSimple("Acoustic Entropy", original.AcousticEntropy, mastered.AcousticEntropy, " bit"),
		metricSimple("Ear Damage", original.EarDamage, mastered.EarDamage, " dB"),
		metricSimple("Dissonance", original.Dissonance, mastered.Dissonance, ""),
	}
}
