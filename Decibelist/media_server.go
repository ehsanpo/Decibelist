package main

import (
	"net/http"
	"strings"

	"github.com/wailsapp/wails/v3/pkg/application"
)

func mediaMiddleware(audioService *AudioService) application.Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
			if !strings.HasPrefix(req.URL.Path, "/media/") {
				next.ServeHTTP(rw, req)
				return
			}

			if req.Method != http.MethodGet && req.Method != http.MethodHead {
				rw.WriteHeader(http.StatusMethodNotAllowed)
				return
			}

			token := strings.TrimPrefix(req.URL.Path, "/media/")
			if token == "" {
				http.NotFound(rw, req)
				return
			}

			path, ok := audioService.resolveMedia(token)
			if !ok {
				http.NotFound(rw, req)
				return
			}

			if rw.Header().Get("Content-Type") == "" {
				rw.Header().Set("Content-Type", mimeFromPath(path))
			}
			rw.Header().Set("Cache-Control", "no-store")
			http.ServeFile(rw, req, path)
		})
	}
}
