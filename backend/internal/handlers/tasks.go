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
	"github.com/swaroop/taskflow/internal/models"
)

// TaskHandler groups task-related HTTP handlers.
type TaskHandler struct {
	db  *database.DB
	log *slog.Logger
}

// NewTaskHandler wires up the task handler.
func NewTaskHandler(db *database.DB, log *slog.Logger) *TaskHandler {
	return &TaskHandler{db: db, log: log}
}

// List handles GET /projects/:id/tasks
//
// Optional query params: ?status=todo|in_progress|done  ?assignee=<uuid>  ?page=1  ?limit=50
func (h *TaskHandler) List(w http.ResponseWriter, r *http.Request) {
	projectID, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		respondError(w, http.StatusNotFound, "not found")
		return
	}

	// Ensure project exists (and implicitly gives a 404 vs 200-empty)
	if _, err := h.db.GetProjectByID(r.Context(), projectID); err != nil {
		if errors.Is(err, database.ErrNotFound) {
			respondError(w, http.StatusNotFound, "not found")
			return
		}
		h.log.Error("get project for task list", "error", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	q := r.URL.Query()
	status := q.Get("status")
	if status != "" && !models.IsValidStatus(status) {
		respondValidationError(w, map[string]string{"status": "must be todo, in_progress, or done"})
		return
	}

	page, _ := strconv.Atoi(q.Get("page"))
	limit, _ := strconv.Atoi(q.Get("limit"))

	result, err := h.db.ListTasks(r.Context(), projectID, database.ListTasksParams{
		Status:     status,
		AssigneeID: q.Get("assignee"),
		Page:       page,
		Limit:      limit,
	})
	if err != nil {
		h.log.Error("list tasks", "error", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"tasks": result.Tasks,
		"meta": map[string]interface{}{
			"page":     max(page, 1),
			"limit":    max(limit, 50),
			"total":    result.Total,
			"has_next": result.Total > max(page, 1)*max(limit, 50),
		},
	})
}

// Create handles POST /projects/:id/tasks
//
// Request:  {"title":"...", "description":"...", "priority":"high",
//
//	"assignee_id":"uuid", "due_date":"2026-04-15"}
//
// Response: 201 task object
func (h *TaskHandler) Create(w http.ResponseWriter, r *http.Request) {
	projectID, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		respondError(w, http.StatusNotFound, "not found")
		return
	}

	// Ensure project exists
	if _, err := h.db.GetProjectByID(r.Context(), projectID); err != nil {
		if errors.Is(err, database.ErrNotFound) {
			respondError(w, http.StatusNotFound, "not found")
			return
		}
		h.log.Error("get project for task create", "error", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	var req struct {
		Title       string  `json:"title"`
		Description *string `json:"description"`
		Priority    string  `json:"priority"`
		AssigneeID  *string `json:"assignee_id"`
		DueDate     *string `json:"due_date"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	fields := make(map[string]string)
	req.Title = strings.TrimSpace(req.Title)
	if req.Title == "" {
		fields["title"] = "is required"
	}
	if req.Priority != "" && !models.IsValidPriority(req.Priority) {
		fields["priority"] = "must be low, medium, or high"
	}

	var assigneeID *uuid.UUID
	if req.AssigneeID != nil && *req.AssigneeID != "" {
		parsed, err := uuid.Parse(*req.AssigneeID)
		if err != nil {
			fields["assignee_id"] = "must be a valid UUID"
		} else {
			assigneeID = &parsed
		}
	}

	if len(fields) > 0 {
		respondValidationError(w, fields)
		return
	}

	priority := models.PriorityMedium
	if req.Priority != "" {
		priority = models.TaskPriority(req.Priority)
	}

	task, err := h.db.CreateTask(r.Context(), database.CreateTaskParams{
		Title:       req.Title,
		Description: req.Description,
		Priority:    priority,
		ProjectID:   projectID,
		AssigneeID:  assigneeID,
		DueDate:     req.DueDate,
	})
	if err != nil {
		h.log.Error("create task", "error", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	respondJSON(w, http.StatusCreated, task)
}

// Update handles PATCH /tasks/:id — all fields optional.
func (h *TaskHandler) Update(w http.ResponseWriter, r *http.Request) {
	taskID, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		respondError(w, http.StatusNotFound, "not found")
		return
	}

	// Use a raw map so we can distinguish "field not provided" from "field set to null"
	var raw map[string]json.RawMessage
	if err := json.NewDecoder(r.Body).Decode(&raw); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	fields := make(map[string]string)
	params := database.UpdateTaskParams{}

	if v, ok := raw["title"]; ok {
		var s string
		if err := json.Unmarshal(v, &s); err != nil || strings.TrimSpace(s) == "" {
			fields["title"] = "cannot be empty"
		} else {
			s = strings.TrimSpace(s)
			params.Title = &s
		}
	}
	if v, ok := raw["description"]; ok {
		var s string
		_ = json.Unmarshal(v, &s)
		params.Description = &s
	}
	if v, ok := raw["status"]; ok {
		var s string
		_ = json.Unmarshal(v, &s)
		if !models.IsValidStatus(s) {
			fields["status"] = "must be todo, in_progress, or done"
		} else {
			st := models.TaskStatus(s)
			params.Status = &st
		}
	}
	if v, ok := raw["priority"]; ok {
		var s string
		_ = json.Unmarshal(v, &s)
		if !models.IsValidPriority(s) {
			fields["priority"] = "must be low, medium, or high"
		} else {
			pr := models.TaskPriority(s)
			params.Priority = &pr
		}
	}
	if v, ok := raw["assignee_id"]; ok {
		// Explicit null clears the assignee
		if string(v) == "null" {
			params.ClearAssignee = true
		} else {
			var s string
			_ = json.Unmarshal(v, &s)
			parsed, err := uuid.Parse(s)
			if err != nil {
				fields["assignee_id"] = "must be a valid UUID or null"
			} else {
				params.AssigneeID = &parsed
			}
		}
	}
	if v, ok := raw["due_date"]; ok {
		if string(v) == "null" {
			params.ClearDueDate = true
		} else {
			var s string
			_ = json.Unmarshal(v, &s)
			params.DueDate = &s
		}
	}

	if len(fields) > 0 {
		respondValidationError(w, fields)
		return
	}

	task, err := h.db.UpdateTask(r.Context(), taskID, params)
	if err != nil {
		if errors.Is(err, database.ErrNotFound) {
			respondError(w, http.StatusNotFound, "not found")
			return
		}
		h.log.Error("update task", "error", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	respondJSON(w, http.StatusOK, task)
}

// Delete handles DELETE /tasks/:id — project owner or task assignee.
func (h *TaskHandler) Delete(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFrom(r)

	taskID, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		respondError(w, http.StatusNotFound, "not found")
		return
	}

	task, err := h.db.GetTaskByID(r.Context(), taskID)
	if err != nil {
		if errors.Is(err, database.ErrNotFound) {
			respondError(w, http.StatusNotFound, "not found")
			return
		}
		h.log.Error("get task for delete", "error", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	// Only the project owner may delete a task
	project, err := h.db.GetProjectByID(r.Context(), task.ProjectID)
	if err != nil {
		h.log.Error("get project for task delete", "error", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	isOwner := project.OwnerID == claims.UserID
	isAssignee := task.AssigneeID != nil && *task.AssigneeID == claims.UserID
	if !isOwner && !isAssignee {
		respondError(w, http.StatusForbidden, "forbidden")
		return
	}

	if err := h.db.DeleteTask(r.Context(), taskID); err != nil {
		h.log.Error("delete task", "error", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
