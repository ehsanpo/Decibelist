package main

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
)

type loudnormAnalysis struct {
	InputI       float64 `json:"input_i,string"`
	InputTP      float64 `json:"input_tp,string"`
	InputLRA     float64 `json:"input_lra,string"`
	InputThresh  float64 `json:"input_thresh,string"`
	TargetOffset float64 `json:"target_offset,string"`
}

func NormalizeToLUFS(ctx context.Context, inputPath, outputPath string, opts MasteringOptions) (NormalizationResult, error) {
	ffmpeg := toolPath("ffmpeg/ffmpeg")
	target := resolveTargetLoudness(opts)
	ceiling := resolveCeiling(opts)
	lra := 7.0

	analysis, err := runLoudnormAnalysis(ctx, ffmpeg, inputPath, target, ceiling, lra)
	if err != nil {
		return NormalizationResult{}, err
	}

	filter := fmt.Sprintf(
		"loudnorm=I=%.2f:TP=%.2f:LRA=%.2f:measured_I=%.2f:measured_TP=%.2f:measured_LRA=%.2f:measured_thresh=%.2f:offset=%.2f:linear=true:print_format=summary",
		target, ceiling, lra,
		analysis.InputI, analysis.InputTP, analysis.InputLRA, analysis.InputThresh, analysis.TargetOffset,
	)

	_, err = RunAndCapture(ctx, ExecRequest{
		Path: ffmpeg,
		Args: []string{"-y", "-hide_banner", "-nostats", "-i", inputPath, "-af", filter, outputPath},
	})
	if err != nil {
		return NormalizationResult{}, err
	}

	return NormalizationResult{
		BeforeLUFS:    analysis.InputI,
		AfterLUFS:     target,
		GainApplied:   analysis.TargetOffset,
		TruePeak:      analysis.InputTP,
		TruePeakTP:    analysis.InputTP,
		LoudnessRange: analysis.InputLRA,
	}, nil
}

func runLoudnormAnalysis(ctx context.Context, ffmpegPath, inputPath string, target, ceiling, lra float64) (loudnormAnalysis, error) {
	filter := fmt.Sprintf("loudnorm=I=%.2f:TP=%.2f:LRA=%.2f:print_format=json", target, ceiling, lra)
	output, err := RunAndCapture(ctx, ExecRequest{
		Path: ffmpegPath,
		Args: []string{"-hide_banner", "-nostats", "-i", inputPath, "-af", filter, "-f", "null", "-"},
	})
	if err != nil {
		return loudnormAnalysis{}, err
	}

	jsonPayload := extractJSONBlock(output)
	if jsonPayload == "" {
		return loudnormAnalysis{}, fmt.Errorf("failed to parse loudnorm output")
	}

	var parsed loudnormAnalysis
	if err := json.Unmarshal([]byte(jsonPayload), &parsed); err != nil {
		return loudnormAnalysis{}, err
	}
	return parsed, nil
}

func extractJSONBlock(output string) string {
	start := strings.Index(output, "{")
	end := strings.LastIndex(output, "}")
	if start == -1 || end == -1 || end <= start {
		return ""
	}
	return output[start : end+1]
}
