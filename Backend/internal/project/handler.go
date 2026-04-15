package project

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/you/taskflow/backend/internal/auth"
	"github.com/you/taskflow/backend/internal/models"
	"github.com/you/taskflow/backend/internal/task"
)

type Handler struct {
	svc     *Service
	taskSvc *task.Service
}

func NewHandler(svc *Service, taskSvc *task.Service) *Handler {
	return &Handler{svc: svc, taskSvc: taskSvc}
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
// 	userID, _ := auth.GetUserID(r.Context())
// 	projects, err := h.svc.ListForUser(r.Context(), userID)
// 	if err != nil {
// 		slog.Error("list projects", "err", err)
// 		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
// 		return
// 	}
// 	if projects == nil {
// 		projects = []models.Project{}
// 	}
// 	writeJSON(w, http.StatusOK, map[string]any{"projects": projects})
// }

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	userID, _ := auth.GetUserID(r.Context())
	projects, err := h.svc.ListForUser(r.Context(), userID)
	if err != nil {
		slog.Error("list projects", "err", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}
	if projects == nil {
		projects = []models.Project{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"projects": projects})
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	userID, _ := auth.GetUserID(r.Context())

	var body struct {
		Name        string  `json:"name"`
		Description *string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	if body.Name == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"error":  "validation failed",
			"fields": map[string]string{"name": "is required"},
		})
		return
	}

	p, err := h.svc.Create(r.Context(), body.Name, body.Description, userID)
	if err != nil {
		slog.Error("create project", "err", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}
	writeJSON(w, http.StatusCreated, p)
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid project id"})
		return
	}

	p, err := h.svc.GetByID(r.Context(), id)
	if errors.Is(err, ErrNotFound) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
		return
	}
	if err != nil {
		slog.Error("get project", "err", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}

	// Attach tasks
	tasks, err := h.taskSvc.ListForProject(r.Context(), id, "", uuid.Nil)
	if err != nil {
		slog.Error("list tasks for project", "err", err)
	} else {
		p.Tasks = tasks
	}

	writeJSON(w, http.StatusOK, p)
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	userID, _ := auth.GetUserID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid project id"})
		return
	}

	var body struct {
		Name        string  `json:"name"`
		Description *string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}
	if body.Name == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"error":  "validation failed",
			"fields": map[string]string{"name": "is required"},
		})
		return
	}

	p, err := h.svc.Update(r.Context(), id, userID, body.Name, body.Description)
	if errors.Is(err, ErrNotFound) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
		return
	}
	if errors.Is(err, ErrForbidden) {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "forbidden"})
		return
	}
	if err != nil {
		slog.Error("update project", "err", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}
	writeJSON(w, http.StatusOK, p)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, _ := auth.GetUserID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid project id"})
		return
	}

	err = h.svc.Delete(r.Context(), id, userID)
	if errors.Is(err, ErrNotFound) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
		return
	}
	if errors.Is(err, ErrForbidden) {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "forbidden"})
		return
	}
	if err != nil {
		slog.Error("delete project", "err", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
