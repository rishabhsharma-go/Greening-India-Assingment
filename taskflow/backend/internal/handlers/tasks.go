package handlers

import (
	"database/sql"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/taskflow/backend/internal/middleware"
	"github.com/taskflow/backend/internal/models"
	"github.com/taskflow/backend/internal/websocket"
)

type TaskHandler struct {
	db    *sqlx.DB
	wsHub *websocket.Hub
}

func NewTaskHandler(db *sqlx.DB, wsHub *websocket.Hub) *TaskHandler {
	return &TaskHandler{db: db, wsHub: wsHub}
}

// ListTasks returns tasks for a project with optional filters
func (h *TaskHandler) ListTasks(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	projectID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid project id"})
		return
	}

	// Verify project exists
	var project models.Project
	err = h.db.Get(&project, "SELECT * FROM projects WHERE id = $1", projectID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if err != nil {
		slog.Error("Failed to fetch project", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	// Build query with filters
	query := "SELECT * FROM tasks WHERE project_id = $1"
	args := []interface{}{projectID}
	argIndex := 2

	// Non-owners can only see tasks assigned to them
	isOwner := project.OwnerID == userID
	if !isOwner {
		query += " AND assignee_id = $" + strconv.Itoa(argIndex)
		args = append(args, userID)
		argIndex++
	}

	// Status filter
	if status := c.Query("status"); status != "" {
		if !models.ValidateStatus(models.TaskStatus(status)) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":  "validation failed",
				"fields": map[string]string{"status": "must be todo, in_progress, or done"},
			})
			return
		}
		query += " AND status = $" + strconv.Itoa(argIndex)
		args = append(args, status)
		argIndex++
	}

	// Assignee filter (only meaningful for owners, since non-owners already filtered)
	if assignee := c.Query("assignee"); assignee != "" && isOwner {
		assigneeID, err := uuid.Parse(assignee)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":  "validation failed",
				"fields": map[string]string{"assignee": "must be a valid UUID"},
			})
			return
		}
		query += " AND assignee_id = $" + strconv.Itoa(argIndex)
		args = append(args, assigneeID)
		argIndex++
	}

	// Pagination (bonus)
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}
	offset := (page - 1) * limit

	query += " ORDER BY created_at DESC LIMIT $" + strconv.Itoa(argIndex) + " OFFSET $" + strconv.Itoa(argIndex+1)
	args = append(args, limit, offset)

	var tasks []models.Task
	if err := h.db.Select(&tasks, query, args...); err != nil {
		slog.Error("Failed to fetch tasks", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"tasks": tasks,
		"page":  page,
		"limit": limit,
	})
}

// CreateTask creates a new task in a project (owner only)
func (h *TaskHandler) CreateTask(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	projectID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid project id"})
		return
	}

	// Verify project exists
	var project models.Project
	err = h.db.Get(&project, "SELECT * FROM projects WHERE id = $1", projectID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if err != nil {
		slog.Error("Failed to fetch project", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	// Only project owner can create tasks
	if project.OwnerID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	var req models.CreateTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":  "validation failed",
			"fields": map[string]string{"title": "is required"},
		})
		return
	}

	// Validate status if provided
	if req.Status != "" && !models.ValidateStatus(req.Status) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":  "validation failed",
			"fields": map[string]string{"status": "must be todo, in_progress, or done"},
		})
		return
	}

	// Validate priority if provided
	if req.Priority != "" && !models.ValidatePriority(req.Priority) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":  "validation failed",
			"fields": map[string]string{"priority": "must be low, medium, or high"},
		})
		return
	}

	// Set defaults
	status := req.Status
	if status == "" {
		status = models.StatusTodo
	}
	priority := req.Priority
	if priority == "" {
		priority = models.PriorityMedium
	}

	// Parse due date if provided
	var dueDate *time.Time
	if req.DueDate != nil && *req.DueDate != "" {
		parsed, err := time.Parse("2006-01-02", *req.DueDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":  "validation failed",
				"fields": map[string]string{"due_date": "must be in YYYY-MM-DD format"},
			})
			return
		}
		dueDate = &parsed
	}

	// Validate assignee exists if provided
	if req.AssigneeID != nil {
		var assignee models.User
		err = h.db.Get(&assignee, "SELECT id FROM users WHERE id = $1", req.AssigneeID)
		if err == sql.ErrNoRows {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":  "validation failed",
				"fields": map[string]string{"assignee_id": "user not found"},
			})
			return
		}
	}

	now := time.Now().UTC()
	task := models.Task{
		ID:          uuid.New(),
		Title:       strings.TrimSpace(req.Title),
		Description: req.Description,
		Status:      status,
		Priority:    priority,
		ProjectID:   projectID,
		AssigneeID:  req.AssigneeID,
		CreatorID:   userID,
		DueDate:     dueDate,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	_, err = h.db.Exec(`
		INSERT INTO tasks (id, title, description, status, priority, project_id, assignee_id, creator_id, due_date, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`, task.ID, task.Title, task.Description, task.Status, task.Priority, task.ProjectID, task.AssigneeID, task.CreatorID, task.DueDate, task.CreatedAt, task.UpdatedAt)
	if err != nil {
		slog.Error("Failed to create task", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	// Broadcast task creation via WebSocket
	if h.wsHub != nil {
		h.wsHub.Broadcast(projectID.String(), websocket.MessageTypeTaskCreated, task)
		
		// If task is assigned to someone, notify them about the new project assignment
		if task.AssigneeID != nil && *task.AssigneeID != userID {
			h.wsHub.BroadcastToUser(task.AssigneeID.String(), websocket.MessageTypeProjectAssigned, gin.H{
				"project_id": projectID.String(),
				"task":       task,
			})
		}
	}

	slog.Info("Task created", "task_id", task.ID, "project_id", projectID, "creator_id", userID)
	c.JSON(http.StatusCreated, task)
}

// UpdateTask updates a task
func (h *TaskHandler) UpdateTask(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	taskID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid task id"})
		return
	}

	// Get existing task
	var task models.Task
	err = h.db.Get(&task, "SELECT * FROM tasks WHERE id = $1", taskID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if err != nil {
		slog.Error("Failed to fetch task", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	// Store old assignee to detect changes
	var oldAssigneeID *uuid.UUID
	if task.AssigneeID != nil {
		copied := *task.AssigneeID
		oldAssigneeID = &copied
	}

	// Get project to check ownership
	var project models.Project
	err = h.db.Get(&project, "SELECT * FROM projects WHERE id = $1", task.ProjectID)
	if err != nil {
		slog.Error("Failed to fetch project", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	isOwner := project.OwnerID == userID

	// Non-owners can only update tasks assigned to them
	if !isOwner && (task.AssigneeID == nil || *task.AssigneeID != userID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	var req models.UpdateTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":  "validation failed",
			"fields": map[string]string{"request": "invalid request body"},
		})
		return
	}

	// Non-owners cannot change assignee
	if !isOwner && req.AssigneeID != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "only project owner can assign tasks"})
		return
	}

	// Update fields
	if req.Title != nil {
		task.Title = strings.TrimSpace(*req.Title)
	}
	if req.Description != nil {
		task.Description = req.Description
	}
	if req.Status != nil {
		if !models.ValidateStatus(*req.Status) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":  "validation failed",
				"fields": map[string]string{"status": "must be todo, in_progress, or done"},
			})
			return
		}
		task.Status = *req.Status
	}
	if req.Priority != nil {
		if !models.ValidatePriority(*req.Priority) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":  "validation failed",
				"fields": map[string]string{"priority": "must be low, medium, or high"},
			})
			return
		}
		task.Priority = *req.Priority
	}
	if req.AssigneeID != nil {
		// Validate assignee exists
		var assignee models.User
		err = h.db.Get(&assignee, "SELECT id FROM users WHERE id = $1", req.AssigneeID)
		if err == sql.ErrNoRows {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":  "validation failed",
				"fields": map[string]string{"assignee_id": "user not found"},
			})
			return
		}
		task.AssigneeID = req.AssigneeID
	}
	if req.DueDate != nil {
		if *req.DueDate == "" {
			task.DueDate = nil
		} else {
			parsed, err := time.Parse("2006-01-02", *req.DueDate)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{
					"error":  "validation failed",
					"fields": map[string]string{"due_date": "must be in YYYY-MM-DD format"},
				})
				return
			}
			task.DueDate = &parsed
		}
	}

	task.UpdatedAt = time.Now().UTC()

	_, err = h.db.Exec(`
		UPDATE tasks SET title = $1, description = $2, status = $3, priority = $4, 
		assignee_id = $5, due_date = $6, updated_at = $7 WHERE id = $8
	`, task.Title, task.Description, task.Status, task.Priority, task.AssigneeID, task.DueDate, task.UpdatedAt, task.ID)
	if err != nil {
		slog.Error("Failed to update task", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	// Broadcast task update via WebSocket
	if h.wsHub != nil {
		h.wsHub.Broadcast(task.ProjectID.String(), websocket.MessageTypeTaskUpdated, task)
		
		// If assignee changed, notify the new assignee about project assignment
		assigneeChanged := (oldAssigneeID == nil && task.AssigneeID != nil) ||
			(oldAssigneeID != nil && task.AssigneeID == nil) ||
			(oldAssigneeID != nil && task.AssigneeID != nil && *oldAssigneeID != *task.AssigneeID)
		
		if assigneeChanged {
			// Notify new assignee
			if task.AssigneeID != nil && *task.AssigneeID != userID {
				h.wsHub.BroadcastToUser(task.AssigneeID.String(), websocket.MessageTypeProjectAssigned, gin.H{
					"project_id": task.ProjectID.String(),
					"task":       task,
				})
			}
			
			// Check if old assignee still has tasks in this project
			if oldAssigneeID != nil && *oldAssigneeID != project.OwnerID {
				var remainingTasks int
				err = h.db.Get(&remainingTasks, "SELECT COUNT(*) FROM tasks WHERE project_id = $1 AND assignee_id = $2", task.ProjectID, oldAssigneeID)
				if err == nil && remainingTasks == 0 {
					// Old assignee no longer has any tasks - notify them
					h.wsHub.BroadcastToUser(oldAssigneeID.String(), websocket.MessageTypeProjectRemoved, gin.H{
						"project_id": task.ProjectID.String(),
					})
				}
			}
		}
	}

	slog.Info("Task updated", "task_id", task.ID, "user_id", userID)
	c.JSON(http.StatusOK, task)
}

// DeleteTask deletes a task (project owner only)
func (h *TaskHandler) DeleteTask(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	taskID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid task id"})
		return
	}

	// Get existing task
	var task models.Task
	err = h.db.Get(&task, "SELECT * FROM tasks WHERE id = $1", taskID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if err != nil {
		slog.Error("Failed to fetch task", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	// Get project to check ownership
	var project models.Project
	err = h.db.Get(&project, "SELECT * FROM projects WHERE id = $1", task.ProjectID)
	if err != nil {
		slog.Error("Failed to fetch project", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	// Only project owner can delete tasks
	if project.OwnerID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	_, err = h.db.Exec("DELETE FROM tasks WHERE id = $1", taskID)
	if err != nil {
		slog.Error("Failed to delete task", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	// Broadcast task deletion via WebSocket
	if h.wsHub != nil {
		h.wsHub.Broadcast(task.ProjectID.String(), websocket.MessageTypeTaskDeleted, gin.H{"id": taskID})
		
		// If the deleted task had an assignee (who is not the owner), check if they still have tasks in this project
		if task.AssigneeID != nil && *task.AssigneeID != project.OwnerID {
			var remainingTasks int
			err = h.db.Get(&remainingTasks, "SELECT COUNT(*) FROM tasks WHERE project_id = $1 AND assignee_id = $2", task.ProjectID, task.AssigneeID)
			if err == nil && remainingTasks == 0 {
				// User no longer has any tasks in this project - notify them to remove it from their list
				h.wsHub.BroadcastToUser(task.AssigneeID.String(), websocket.MessageTypeProjectRemoved, gin.H{
					"project_id": task.ProjectID.String(),
				})
			}
		}
	}

	slog.Info("Task deleted", "task_id", taskID, "user_id", userID)
	c.Status(http.StatusNoContent)
}
