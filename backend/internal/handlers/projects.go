package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/swaroop/taskflow/internal/database"
	"github.com/swaroop/taskflow/internal/middleware"
)

// ProjectHandler groups project-related HTTP handlers.
type ProjectHandler struct {
	db  *database.DB
	log *slog.Logger
}

// NewProjectHandler wires up the project handler.
func NewProjectHandler(db *database.DB, log *slog.Logger) *ProjectHandler {
	return &ProjectHandler{db: db, log: log}
}

// List handles GET /projects
//
// Optional query params: ?page=1&limit=20
func (h *ProjectHandler) List(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFrom(r)
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))

	result, err := h.db.ListProjects(r.Context(), database.ListProjectsParams{
		UserID: claims.UserID,
		Page:   page,
		Limit:  limit,
	})
	if err != nil {
		h.log.Error("list projects", "error", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"projects": result.Projects,
		"meta": map[string]interface{}{
			"page":     max(page, 1),
			"limit":    max(limit, 20),
			"total":    result.Total,
			"has_next": result.Total > max(page, 1)*max(limit, 20),
		},
	})
}

// Create handles POST /projects
//
// Request:  {"name":"...", "description":"..."}
// Response: 201 project object
func (h *ProjectHandler) Create(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFrom(r)

	var req struct {
		Name        string  `json:"name"`
		Description *string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		respondValidationError(w, map[string]string{"name": "is required"})
		return
	}

	project, err := h.db.CreateProject(r.Context(), req.Name, req.Description, claims.UserID)
	if err != nil {
		h.log.Error("create project", "error", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	respondJSON(w, http.StatusCreated, project)
}

// Get handles GET /projects/:id — returns project with embedded tasks.
func (h *ProjectHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		respondError(w, http.StatusNotFound, "not found")
		return
	}

	project, err := h.db.GetProjectByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, database.ErrNotFound) {
			respondError(w, http.StatusNotFound, "not found")
			return
		}
		h.log.Error("get project", "error", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	respondJSON(w, http.StatusOK, project)
}

// Update handles PATCH /projects/:id — owner only.
//
// Request:  {"name":"...", "description":"..."} (both optional)
func (h *ProjectHandler) Update(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFrom(r)

	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		respondError(w, http.StatusNotFound, "not found")
		return
	}

	// Verify ownership before any mutation
	existing, err := h.db.GetProjectByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, database.ErrNotFound) {
			respondError(w, http.StatusNotFound, "not found")
			return
		}
		h.log.Error("get project for update", "error", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	if existing.OwnerID != claims.UserID {
		respondError(w, http.StatusForbidden, "forbidden")
		return
	}

	var req struct {
		Name        *string `json:"name"`
		Description *string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Merge with existing values for fields not supplied
	newName := existing.Name
	if req.Name != nil {
		newName = strings.TrimSpace(*req.Name)
		if newName == "" {
			respondValidationError(w, map[string]string{"name": "cannot be empty"})
			return
		}
	}
	newDesc := existing.Description
	if req.Description != nil {
		newDesc = req.Description
	}

	updated, err := h.db.UpdateProject(r.Context(), id, newName, newDesc)
	if err != nil {
		h.log.Error("update project", "error", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	respondJSON(w, http.StatusOK, updated)
}

// Delete handles DELETE /projects/:id — owner only, cascades to tasks.
func (h *ProjectHandler) Delete(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFrom(r)

	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		respondError(w, http.StatusNotFound, "not found")
		return
	}

	existing, err := h.db.GetProjectByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, database.ErrNotFound) {
			respondError(w, http.StatusNotFound, "not found")
			return
		}
		h.log.Error("get project for delete", "error", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	if existing.OwnerID != claims.UserID {
		respondError(w, http.StatusForbidden, "forbidden")
		return
	}

	if err := h.db.DeleteProject(r.Context(), id); err != nil {
		h.log.Error("delete project", "error", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// Stats handles GET /projects/:id/stats — bonus endpoint.
func (h *ProjectHandler) Stats(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		respondError(w, http.StatusNotFound, "not found")
		return
	}

	// Ensure the project exists
	if _, err := h.db.GetProjectByID(r.Context(), id); err != nil {
		if errors.Is(err, database.ErrNotFound) {
			respondError(w, http.StatusNotFound, "not found")
			return
		}
		h.log.Error("get project for stats", "error", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	stats, err := h.db.GetProjectStats(r.Context(), id)
	if err != nil {
		h.log.Error("project stats", "error", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	respondJSON(w, http.StatusOK, stats)
}

// parseUUID is a small helper that returns a 404-safe error on bad input.
func parseUUID(s string) (uuid.UUID, error) {
	return uuid.Parse(s)
}

