package main

import (
	"encoding/base64"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

func (s *AudioService) GetAudioDataURL(path string) (string, error) {
	if path == "" {
		return "", errors.New("path is required")
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	mime := mimeFromPath(path)
	encoded := base64.StdEncoding.EncodeToString(data)
	return fmt.Sprintf("data:%s;base64,%s", mime, encoded), nil
}

func mimeFromPath(path string) string {
	switch strings.ToLower(filepath.Ext(path)) {
	case ".wav":
		return "audio/wav"
	case ".mp3":
		return "audio/mpeg"
	case ".flac":
		return "audio/flac"
	case ".aiff", ".aif":
		return "audio/aiff"
	case ".m4a":
		return "audio/mp4"
	default:
		return "application/octet-stream"
	}
}
