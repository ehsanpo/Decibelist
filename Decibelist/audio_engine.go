package main

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
)

func requiredBinaries(engine MasteringEngine) []string {
	switch engine {
	case EngineHybrid:
		return []string{"essentia/standard_loudnessebur128", "master_me/master_me", "ffmpeg/ffmpeg"}
	case EngineClassic:
		return []string{"phaselimiter/bin/phase_limiter", "ffmpeg/ffmpeg"}
	default:
		return []string{"essentia/standard_loudnessebur128", "master_me/master_me", "ffmpeg/ffmpeg"}
	}
}

func engineDisplayName(engine MasteringEngine) string {
	switch engine {
	case EngineHybrid:
		return "Hybrid"
	case EngineClassic:
		return "Classic"
	default:
		return "Hybrid"
	}
}

func engineCommand(engine MasteringEngine, binDir string) EngineCommand {
	switch engine {
	case EngineClassic:
		return EngineCommand{
			Path: filepath.Join(binDir, platformBinary("phaselimiter/bin/phase_limiter")),
			Args: []string{"--help"},
		}
	case EngineHybrid:
		fallthrough
	default:
		return EngineCommand{
			Path: filepath.Join(binDir, platformBinary("master_me/master_me")),
			Args: []string{"--help"},
		}
	}
}

func checkBinaries(names []string) (map[string]bool, string) {
	results := map[string]bool{}
	binDir := filepath.Join(resolveBaseDir(), "tools", platformDir())
	for _, name := range names {
		path := filepath.Join(binDir, platformBinary(name))
		_, err := os.Stat(path)
		results[name] = err == nil
	}
	return results, binDir
}

func missingBinaries(results map[string]bool) bool {
	for _, ok := range results {
		if !ok {
			return true
		}
	}
	return false
}

func resolveBaseDir() string {
	exe, err := os.Executable()
	if err == nil {
		dir := filepath.Dir(exe)
		if filepath.Base(dir) == "bin" {
			return filepath.Dir(dir)
		}
		if filepath.Base(dir) == "tools" {
			return filepath.Dir(dir)
		}
		if _, err := os.Stat(filepath.Join(dir, "tools")); err == nil {
			return dir
		}
	}
	cwd, err := os.Getwd()
	if err == nil {
		if filepath.Base(cwd) == "bin" {
			return filepath.Dir(cwd)
		}
		if filepath.Base(cwd) == "tools" {
			return filepath.Dir(cwd)
		}
		return cwd
	}
	return "."
}

func platformDir() string {
	switch runtime.GOOS {
	case "windows":
		return "windows"
	case "darwin":
		return "darwin"
	default:
		return "linux"
	}
}

func platformBinary(name string) string {
	if runtime.GOOS == "windows" && !strings.HasSuffix(name, ".exe") {
		return name + ".exe"
	}
	return name
}

func defaultExtension(format string) string {
	switch strings.ToLower(format) {
	case "wav-24", "wav-24bit", "wav-24bit-float", "wav-24-bit":
		return "wav"
	case "wav-32", "wav-32bit", "wav-32bit-float", "wav-32-bit":
		return "wav"
	case "mp3-320", "mp3":
		return "mp3"
	default:
		return "wav"
	}
}
