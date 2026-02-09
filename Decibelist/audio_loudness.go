package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

type LoudnessAnalysis struct {
	Integrated float64
	Range      float64
	ShortTerm  []float64
	Momentary  []float64
}

type essentiaLoudnessOutput struct {
	Loudness struct {
		Integrated    float64   `json:"integrated"`
		LoudnessRange float64   `json:"loudness_range"`
		Momentary     []float64 `json:"momentary"`
		ShortTerm     []float64 `json:"short_term"`
	} `json:"loudness_ebu128"`
}

func AnalyzeLoudness(ctx context.Context, inputPath string) (LoudnessAnalysis, error) {
	tool := toolPath("essentia/standard_loudnessebur128")
	if _, err := os.Stat(tool); err != nil {
		return LoudnessAnalysis{}, fmt.Errorf("essentia loudness tool not found: %s", tool)
	}

	tempFile := filepath.Join(os.TempDir(), fmt.Sprintf("decibelist_loudness_%d.json", time.Now().UnixNano()))
	defer os.Remove(tempFile)

	_, err := RunAndCapture(ctx, ExecRequest{
		Path: tool,
		Args: []string{inputPath, tempFile},
	})
	if err != nil {
		return LoudnessAnalysis{}, err
	}

	data, err := os.ReadFile(tempFile)
	if err != nil {
		return LoudnessAnalysis{}, err
	}

	var parsed essentiaLoudnessOutput
	if err := json.Unmarshal(data, &parsed); err != nil {
		return LoudnessAnalysis{}, err
	}

	return LoudnessAnalysis{
		Integrated: parsed.Loudness.Integrated,
		Range:      parsed.Loudness.LoudnessRange,
		ShortTerm:  parsed.Loudness.ShortTerm,
		Momentary:  parsed.Loudness.Momentary,
	}, nil
}
