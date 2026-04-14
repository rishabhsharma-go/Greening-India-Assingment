package handler

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/dhruva/taskflow/backend/internal/domain"
	apperr "github.com/dhruva/taskflow/backend/internal/infra/errors"
	"github.com/dhruva/taskflow/backend/internal/infra/util"
	"github.com/dhruva/taskflow/backend/internal/service"
	"github.com/gin-gonic/gin"
)

type TaskHandler struct {
	taskService *service.TaskService
}

func NewTaskHandler(taskService *service.TaskService) *TaskHandler {
	return &TaskHandler{taskService: taskService}
}

type createTaskRequest struct {
	Title       string  `json:"title" binding:"required"`
	Description string  `json:"description"`
	Priority    string  `json:"priority" binding:"omitempty,oneof=low medium high"`
	AssigneeID  *string `json:"assignee_id"`
	DueDate     *string `json:"due_date"`
}

type updateTaskRequest struct {
	Title       *string `json:"title"`
	Description *string `json:"description"`
	Status      *string `json:"status" binding:"omitempty,oneof=todo in_progress done"`
	Priority    *string `json:"priority" binding:"omitempty,oneof=low medium high"`
	AssigneeID  *string `json:"assignee_id"`
	DueDate     *string `json:"due_date"`
}

type taskResponse struct {
	ID          string  `json:"id"`
	Title       string  `json:"title"`
	Description string  `json:"description"`
	Status      string  `json:"status"`
	Priority    string  `json:"priority"`
	ProjectID   string  `json:"project_id"`
	AssigneeID  *string `json:"assignee_id"`
	CreatorID   string  `json:"creator_id"`
	DueDate     *string `json:"due_date"`
	CreatedAt   string  `json:"created_at"`
	UpdatedAt   string  `json:"updated_at"`
}

func mapTaskResponse(t *domain.Task) taskResponse {
	resp := taskResponse{
		ID:          t.ID,
		Title:       t.Title,
		Description: t.Description,
		Status:      t.Status,
		Priority:    t.Priority,
		ProjectID:   t.ProjectID,
		AssigneeID:  t.AssigneeID,
		CreatorID:   t.CreatorID,
		CreatedAt:   t.CreatedAt.Format("2006-01-02T15:04:05Z"),
		UpdatedAt:   t.UpdatedAt.Format("2006-01-02T15:04:05Z"),
	}
	if t.DueDate != nil {
		d := t.DueDate.Format("2006-01-02")
		resp.DueDate = &d
	}
	return resp
}

func (h *TaskHandler) List(c *gin.Context) {
	userID, ok := util.GetUserID(c)
	if !ok {
		return
	}

	projectID, err := parseUUID(c, "id")
	if err != nil {
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	filter := domain.TaskFilter{
		Status:   c.Query("status"),
		Priority: c.Query("priority"),
		Assignee: c.Query("assignee"),
		Page:     page,
		Limit:    limit,
	}

	tasks, total, err := h.taskService.List(c.Request.Context(), projectID, userID, filter)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			abort(c, apperr.NotFound("not found"))
			return
		}
		if errors.Is(err, domain.ErrForbidden) {
			abort(c, apperr.Forbidden("forbidden"))
			return
		}
		abort(c, apperr.Server("failed to list tasks", err))
		return
	}

	resp := make([]taskResponse, len(tasks))
	for i, t := range tasks {
		resp[i] = mapTaskResponse(&t)
	}

	c.JSON(http.StatusOK, gin.H{
		"tasks": resp,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

func (h *TaskHandler) Create(c *gin.Context) {
	userID, ok := util.GetUserID(c)
	if !ok {
		return
	}

	projectID, err := parseUUID(c, "id")
	if err != nil {
		return
	}

	var req createTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		abort(c, err)
		return
	}

	priority := req.Priority
	if priority == "" {
		priority = "medium"
	}

	params := domain.CreateTaskParams{
		Title:       req.Title,
		Description: req.Description,
		Priority:    priority,
		ProjectID:   projectID,
		AssigneeID:  req.AssigneeID,
		CreatorID:   userID,
	}

	if req.DueDate != nil {
		t, err := time.Parse("2006-01-02", *req.DueDate)
		if err != nil {
			abort(c, apperr.BadRequest("invalid due_date format, use YYYY-MM-DD"))
			return
		}
		params.DueDate = &t
	}

	task, err := h.taskService.Create(c.Request.Context(), userID, params)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			abort(c, apperr.NotFound("project not found"))
			return
		}
		if errors.Is(err, domain.ErrForbidden) {
			abort(c, apperr.Forbidden("forbidden"))
			return
		}
		abort(c, apperr.Server("failed to create task", err))
		return
	}

	c.JSON(http.StatusCreated, mapTaskResponse(task))
}

func (h *TaskHandler) Update(c *gin.Context) {
	userID, ok := util.GetUserID(c)
	if !ok {
		return
	}

	id, err := parseUUID(c, "id")
	if err != nil {
		return
	}

	var req updateTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		abort(c, err)
		return
	}

	params := domain.UpdateTaskParams{
		Title:       req.Title,
		Description: req.Description,
		Status:      req.Status,
		Priority:    req.Priority,
		AssigneeID:  req.AssigneeID,
	}

	if req.DueDate != nil {
		t, err := time.Parse("2006-01-02", *req.DueDate)
		if err != nil {
			abort(c, apperr.BadRequest("invalid due_date format, use YYYY-MM-DD"))
			return
		}
		params.DueDate = &t
	}

	task, err := h.taskService.Update(c.Request.Context(), id, userID, params)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			abort(c, apperr.NotFound("not found"))
			return
		}
		if errors.Is(err, domain.ErrForbidden) {
			abort(c, apperr.Forbidden("forbidden"))
			return
		}
		abort(c, apperr.Server("failed to update task", err))
		return
	}

	c.JSON(http.StatusOK, mapTaskResponse(task))
}

func (h *TaskHandler) Delete(c *gin.Context) {
	userID, ok := util.GetUserID(c)
	if !ok {
		return
	}

	id, err := parseUUID(c, "id")
	if err != nil {
		return
	}

	if err := h.taskService.Delete(c.Request.Context(), id, userID); err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			abort(c, apperr.NotFound("not found"))
			return
		}
		if errors.Is(err, domain.ErrForbidden) {
			abort(c, apperr.Forbidden("forbidden"))
			return
		}
		abort(c, apperr.Server("failed to delete task", err))
		return
	}

	c.Status(http.StatusNoContent)
}

func (h *TaskHandler) RegisterRoutes(projectGroup *gin.RouterGroup, taskGroup *gin.RouterGroup) {
	projectGroup.GET("/:id/tasks", h.List)
	projectGroup.POST("/:id/tasks", h.Create)
	taskGroup.PATCH("/:id", h.Update)
	taskGroup.DELETE("/:id", h.Delete)
}
