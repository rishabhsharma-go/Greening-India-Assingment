package task

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/you/taskflow/backend/internal/auth"
	"github.com/you/taskflow/backend/internal/models"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	projectID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid project id"})
		return
	}

	status := r.URL.Query().Get("status")
	assigneeStr := r.URL.Query().Get("assignee")
	assigneeID := uuid.Nil
	if assigneeStr != "" {
		assigneeID, _ = uuid.Parse(assigneeStr)
	}

	tasks, err := h.svc.ListForProject(r.Context(), projectID, status, assigneeID)
	if err != nil {
		slog.Error("list tasks", "err", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"tasks": tasks})
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	projectID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid project id"})
		return
	}
	callerID, _ := auth.GetUserID(r.Context())

	var body struct {
		Title       string              `json:"title"`
		Description *string             `json:"description"`
		Status      models.TaskStatus   `json:"status"`
		Priority    models.TaskPriority `json:"priority"`
		AssigneeID  *uuid.UUID          `json:"assignee_id"`
		DueDate     *time.Time          `json:"due_date"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}
	if body.Title == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"error":  "validation failed",
			"fields": map[string]string{"title": "is required"},
		})
		return
	}

	t := models.Task{
		Title:       body.Title,
		Description: body.Description,
		Status:      body.Status,
		Priority:    body.Priority,
		ProjectID:   projectID,
		AssigneeID:  body.AssigneeID,
		CreatorID:   callerID,
		DueDate:     body.DueDate,
	}

	created, err := h.svc.Create(r.Context(), t)
	if err != nil {
		slog.Error("create task", "err", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}
	writeJSON(w, http.StatusCreated, created)
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	callerID, _ := auth.GetUserID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid task id"})
		return
	}

	var body struct {
		Title       string              `json:"title"`
		Description *string             `json:"description"`
		Status      models.TaskStatus   `json:"status"`
		Priority    models.TaskPriority `json:"priority"`
		AssigneeID  *uuid.UUID          `json:"assignee_id"`
		DueDate     *time.Time          `json:"due_date"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	updates := models.Task{
		ID:          id,
		Title:       body.Title,
		Description: body.Description,
		Status:      body.Status,
		Priority:    body.Priority,
		AssigneeID:  body.AssigneeID,
		DueDate:     body.DueDate,
	}

	updated, err := h.svc.Update(r.Context(), id, callerID, updates)
	if errors.Is(err, ErrNotFound) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
		return
	}
	if errors.Is(err, ErrForbidden) {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "forbidden"})
		return
	}
	if err != nil {
		slog.Error("update task", "err", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	callerID, _ := auth.GetUserID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid task id"})
		return
	}

	err = h.svc.Delete(r.Context(), id, callerID)
	if errors.Is(err, ErrNotFound) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
		return
	}
	if errors.Is(err, ErrForbidden) {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "forbidden"})
		return
	}
	if err != nil {
		slog.Error("delete task", "err", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
