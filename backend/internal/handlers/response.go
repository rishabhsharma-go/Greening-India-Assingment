package handlers

import (
	"encoding/json"
	"net/http"
)

// respondJSON serialises v to JSON and writes it with the given status code.
func respondJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		// If encoding fails after the header has been written there's nothing
		// useful we can do — the partial response is already gone.
		return
	}
}

// respondError writes a simple {"error": msg} JSON body.
func respondError(w http.ResponseWriter, status int, msg string) {
	respondJSON(w, status, map[string]string{"error": msg})
}

// respondValidationError writes a 400 with {"error": "validation failed", "fields": {...}}.
func respondValidationError(w http.ResponseWriter, fields map[string]string) {
	respondJSON(w, http.StatusBadRequest, map[string]interface{}{
		"error":  "validation failed",
		"fields": fields,
	})
}
