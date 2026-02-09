package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"time"
)

type SummaryReport struct {
	JobID       string            `json:"jobId"`
	GeneratedAt string            `json:"generatedAt"`
	InputPath   string            `json:"inputPath"`
	OutputPath  string            `json:"outputPath"`
	Summary     []SummaryItem     `json:"summary"`
	Metrics     []Metric          `json:"metrics"`
	Diagnostics EngineDiagnostics `json:"diagnostics"`
	Warnings    []string          `json:"warnings"`
}

func WriteSummaryReport(path string, report SummaryReport) error {
	if err := ensureDir(filepath.Dir(path)); err != nil {
		return err
	}
	data, err := json.MarshalIndent(report, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o644)
}

func newReport(job *MasteringJob, inputPath string) SummaryReport {
	result := SummaryReport{
		JobID:       job.ID,
		GeneratedAt: time.Now().Format(time.RFC3339),
		InputPath:   inputPath,
	}
	if job.Result != nil {
		result.OutputPath = job.Result.OutputPath
		result.Summary = job.Result.Summary
		result.Metrics = job.Result.Metrics
		result.Diagnostics = job.Result.Diagnostics
		result.Warnings = job.Result.Warnings
	}
	return result
}
