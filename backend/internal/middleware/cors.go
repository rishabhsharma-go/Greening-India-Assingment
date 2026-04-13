package middleware

import (
	"net/http"
	"os"
)

// CORS adds permissive cross-origin headers for local development.
// In production, replace the wildcard origin with your actual domain.
func CORS(next http.Handler) http.Handler {
	allowed := os.Getenv("CORS_ORIGIN")
	if allowed == "" {
		allowed = "*"
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", allowed)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
		w.Header().Set("Access-Control-Max-Age", "86400")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
