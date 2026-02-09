package main

import (
	"context"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
)

type AudioStats struct {
	IntegratedLUFS float64
	LoudnessRange  float64
	RMS            float64
	Peak           float64
	TruePeak       float64
	TruePeakLP     float64
	MicroDynamics  float64
	Space          float64
	EarDamage      float64
	Professionality float64
	Professionality2 float64
	AcousticEntropy float64
	Dissonance      float64
	YouTubeComp     float64
}

func ComputeStats(ctx context.Context, inputPath string) (AudioStats, []string) {
	var warnings []string
	stats := AudioStats{}

	loudness, err := AnalyzeLoudness(ctx, inputPath)
	if err != nil {
		warnings = append(warnings, "loudness analysis failed: "+err.Error())
	} else {
		stats.IntegratedLUFS = loudness.Integrated
		stats.LoudnessRange = loudness.Range
		stats.MicroDynamics = stdDev(loudness.ShortTerm)
	}

	rms, peak, err := AnalyzeAStats(ctx, inputPath, "")
	if err != nil {
		warnings = append(warnings, "astats analysis failed: "+err.Error())
	} else {
		stats.RMS = rms
		stats.Peak = peak
	}

	truePeak, err := AnalyzeTruePeak(ctx, inputPath, 0)
	if err != nil {
		warnings = append(warnings, "true peak analysis failed: "+err.Error())
	} else {
		stats.TruePeak = truePeak
	}

	truePeakLP, err := AnalyzeTruePeak(ctx, inputPath, 15000)
	if err != nil {
		warnings = append(warnings, "lowpass true peak analysis failed: "+err.Error())
	} else {
		stats.TruePeakLP = truePeakLP
	}

	earDamage, err := AnalyzeBandRMS(ctx, inputPath, 2000, 8000)
	if err != nil {
		warnings = append(warnings, "ear damage analysis failed: "+err.Error())
	} else {
		stats.EarDamage = earDamage
	}

	space, err := AnalyzeMidSideSpace(ctx, inputPath)
	if err != nil {
		warnings = append(warnings, "space analysis failed: "+err.Error())
	} else {
		stats.Space = space
	}

	stats.YouTubeComp = -14.0 - stats.IntegratedLUFS
	stats.Professionality = clamp(100-(math.Abs(stats.IntegratedLUFS+9)*8)-(stats.LoudnessRange*2), 0, 100)
	stats.Professionality2 = clamp(100-(math.Abs(stats.Peak-stats.RMS)*8), 0, 100)
	stats.AcousticEntropy = 100 + (stats.MicroDynamics * 25)
	stats.Dissonance = clamp((stats.EarDamage+30)/6, 0, 10)

	return stats, warnings
}

func AnalyzeAStats(ctx context.Context, inputPath, extraFilter string) (float64, float64, error) {
	ffmpeg := toolPath("ffmpeg/ffmpeg")
	filter := "astats=metadata=1:reset=1"
	if extraFilter != "" {
		filter = extraFilter + "," + filter
	}
	output, err := RunAndCapture(ctx, ExecRequest{
		Path: ffmpeg,
		Args: []string{"-hide_banner", "-nostats", "-i", inputPath, "-af", filter, "-f", "null", "-"},
	})
	if err != nil {
		return 0, 0, err
	}

	rms, _ := parseLastFloat(output, "RMS level dB:")
	peak, _ := parseLastFloat(output, "Peak level dB:")
	return rms, peak, nil
}

func AnalyzeTruePeak(ctx context.Context, inputPath string, lowpassHz int) (float64, error) {
	ffmpeg := toolPath("ffmpeg/ffmpeg")
	filter := "ebur128=peak=true"
	if lowpassHz > 0 {
		filter = fmt.Sprintf("lowpass=f=%d,ebur128=peak=true", lowpassHz)
	}
	output, err := RunAndCapture(ctx, ExecRequest{
		Path: ffmpeg,
		Args: []string{"-hide_banner", "-nostats", "-i", inputPath, "-af", filter, "-f", "null", "-"},
	})
	if err != nil {
		return 0, err
	}

	value, err := parseLastFloat(output, "Peak:")
	if err != nil {
		return 0, err
	}
	return value, nil
}

func AnalyzeBandRMS(ctx context.Context, inputPath string, lowHz, highHz int) (float64, error) {
	filter := fmt.Sprintf("highpass=f=%d,lowpass=f=%d", lowHz, highHz)
	rms, _, err := AnalyzeAStats(ctx, inputPath, filter)
	return rms, err
}

func AnalyzeMidSideSpace(ctx context.Context, inputPath string) (float64, error) {
	ffmpeg := toolPath("ffmpeg/ffmpeg")
	tempDir, err := os.MkdirTemp("", "decibelist_ms_")
	if err != nil {
		return 0, err
	}
	defer os.RemoveAll(tempDir)

	midPath := filepath.Join(tempDir, "mid.wav")
	sidePath := filepath.Join(tempDir, "side.wav")

	filter := "[0:a]pan=mono|c0=0.5*c0+0.5*c1[mid];[0:a]pan=mono|c0=0.5*c0-0.5*c1[side]"
	_, err = RunAndCapture(ctx, ExecRequest{
		Path: ffmpeg,
		Args: []string{"-y", "-hide_banner", "-nostats", "-i", inputPath, "-filter_complex", filter, "-map", "[mid]", midPath, "-map", "[side]", sidePath},
	})
	if err != nil {
		return 0, err
	}

	midRMS, _, err := AnalyzeAStats(ctx, midPath, "")
	if err != nil {
		return 0, err
	}
	sideRMS, _, err := AnalyzeAStats(ctx, sidePath, "")
	if err != nil {
		return 0, err
	}

	return sideRMS - midRMS, nil
}

func parseLastFloat(output, label string) (float64, error) {
	re := regexp.MustCompile(regexp.QuoteMeta(label) + `\s*([-+]?[0-9]*\.?[0-9]+)`)
	matches := re.FindAllStringSubmatch(output, -1)
	if len(matches) == 0 {
		return 0, fmt.Errorf("label not found: %s", label)
	}
	last := matches[len(matches)-1]
	return strconv.ParseFloat(last[1], 64)
}

func stdDev(values []float64) float64 {
	if len(values) == 0 {
		return 0
	}
	var sum float64
	for _, v := range values {
		sum += v
	}
	mean := sum / float64(len(values))
	var variance float64
	for _, v := range values {
		diff := v - mean
		variance += diff * diff
	}
	return math.Sqrt(variance / float64(len(values)))
}

func clamp(value, min, max float64) float64 {
	if value < min {
		return min
	}
	if value > max {
		return max
	}
	return value
}

func formatDb(value float64) string {
	return fmt.Sprintf("%.1f dB", value)
}

func formatDbWithPercent(value float64, percent int) string {
	return fmt.Sprintf("%.1f dB (%d%%)", value, percent)
}

func percentFromRange(value, min, max float64) int {
	if max == min {
		return 0
	}
	percent := int(math.Round((value - min) / (max - min) * 100))
	if percent < 0 {
		return 0
	}
	if percent > 100 {
		return 100
	}
	return percent
}

func metricValue(name string, original, mastered float64, min, max float64, unit string) Metric {
	origPercent := percentFromRange(original, min, max)
	mastPercent := percentFromRange(mastered, min, max)
	origValue := formatDbWithPercent(original, origPercent)
	mastValue := formatDbWithPercent(mastered, mastPercent)
	if unit != "db" {
		origValue = fmt.Sprintf("%.2f %s (%d%%)", original, unit, origPercent)
		mastValue = fmt.Sprintf("%.2f %s (%d%%)", mastered, unit, mastPercent)
	}
	return Metric{
		Name:            name,
		Original:        origValue,
		Mastered:        mastValue,
		PercentOriginal: origPercent,
		PercentMastered: mastPercent,
	}
}

func metricSimple(name string, original, mastered float64, suffix string) Metric {
	return Metric{
		Name:     name,
		Original: fmt.Sprintf("%.2f%s", original, suffix),
		Mastered: fmt.Sprintf("%.2f%s", mastered, suffix),
	}
}
