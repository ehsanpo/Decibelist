package main

import (
	"os"
	"path/filepath"
	"strings"
)

func toolsBaseDir() string {
	return filepath.Join(resolveBaseDir(), "tools", platformDir())
}

func toolPath(relative string) string {
	return filepath.Join(toolsBaseDir(), platformBinary(relative))
}

func toolExists(relative string) bool {
	_, err := os.Stat(toolPath(relative))
	return err == nil
}

func ensureDir(path string) error {
	return os.MkdirAll(path, 0o755)
}

func parseSampleRate(value string) int {
	normalized := strings.ToLower(strings.TrimSpace(value))
	switch {
	case strings.Contains(normalized, "48"):
		return 48000
	case strings.Contains(normalized, "44"):
		return 44100
	default:
		return 0
	}
}
