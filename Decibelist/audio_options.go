package main

import "strings"

func resolveTargetLoudness(opts MasteringOptions) float64 {
	target := opts.TargetLoudness
	mode := strings.ToLower(opts.TargetLoudnessMode)
	if strings.Contains(mode, "youtube") && target == 0 {
		target = -14
	}
	if target == 0 {
		target = -9
	}
	return target
}

func resolveCeiling(opts MasteringOptions) float64 {
	if opts.Ceiling == 0 {
		return -1
	}
	return opts.Ceiling
}

func formatOutputLabel(format string) string {
	switch strings.ToLower(format) {
	case "wav-24", "wav-24bit", "wav-24-bit":
		return "WAV (24bit)"
	case "wav-32", "wav-32bit", "wav-32-bit", "wav-32bit-float", "wav-32-bit-float":
		return "WAV (32bit float)"
	case "mp3-320", "mp3":
		return "MP3 (320kbps)"
	default:
		return "WAV (16bit)"
	}
}
