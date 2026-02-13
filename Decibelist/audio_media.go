package main

import (
	"encoding/base64"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
)

func (s *AudioService) GetAudioDataURL(path string) (string, error) {
	if path == "" {
		return "", errors.New("path is required")
	}
	inline := false
	if strings.HasPrefix(path, "inline:") {
		inline = true
		path = strings.TrimPrefix(path, "inline:")
	}
	absPath, err := filepath.Abs(path)
	if err != nil {
		return "", err
	}
	if _, err := os.Stat(absPath); err != nil {
		return "", err
	}
	if inline {
		data, err := os.ReadFile(absPath)
		if err != nil {
			return "", err
		}
		mime := mimeFromPath(absPath)
		encoded := base64.StdEncoding.EncodeToString(data)
		return fmt.Sprintf("data:%s;base64,%s", mime, encoded), nil
	}

	s.mediaMu.Lock()
	defer s.mediaMu.Unlock()

	if token, ok := s.mediaByPath[absPath]; ok {
		return fmt.Sprintf("/media/%s", token), nil
	}

	token := uuid.NewString()
	s.mediaByPath[absPath] = token
	s.mediaByToken[token] = absPath
	return fmt.Sprintf("/media/%s", token), nil
}

func (s *AudioService) resolveMedia(token string) (string, bool) {
	s.mediaMu.RLock()
	defer s.mediaMu.RUnlock()
	path, ok := s.mediaByToken[token]
	return path, ok
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
