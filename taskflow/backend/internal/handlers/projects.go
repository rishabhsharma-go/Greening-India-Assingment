package handlers

import (
	"database/sql"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/taskflow/backend/internal/middleware"
	"github.com/taskflow/backend/internal/models"
	"github.com/taskflow/backend/internal/websocket"
)

type ProjectHandler struct {
	db    *sqlx.DB
	wsHub *websocket.Hub
}

func NewProjectHandler(db *sqlx.DB, wsHub *websocket.Hub) *ProjectHandler {
	return &ProjectHandler{db: db, wsHub: wsHub}
}

// ListProjects returns projects the current user owns or has tasks in
func (h *ProjectHandler) ListProjects(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	query := `
		SELECT DISTINCT p.id, p.name, p.description, p.owner_id, p.created_at
		FROM projects p
		LEFT JOIN tasks t ON t.project_id = p.id
		WHERE p.owner_id = $1 OR t.assignee_id = $1
		ORDER BY p.created_at DESC
	`

	var projects []models.Project
	if err := h.db.Select(&projects, query, userID); err != nil {
		slog.Error("Failed to fetch projects", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"projects": projects})
}

// CreateProject creates a new project
func (h *ProjectHandler) CreateProject(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req models.CreateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":  "validation failed",
			"fields": map[string]string{"name": "is required"},
		})
		return
	}

	project := models.Project{
		ID:          uuid.New(),
		Name:        strings.TrimSpace(req.Name),
		Description: req.Description,
		OwnerID:     userID,
		CreatedAt:   time.Now().UTC(),
	}

	_, err := h.db.Exec(
		"INSERT INTO projects (id, name, description, owner_id, created_at) VALUES ($1, $2, $3, $4, $5)",
		project.ID, project.Name, project.Description, project.OwnerID, project.CreatedAt,
	)
	if err != nil {
		slog.Error("Failed to create project", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	slog.Info("Project created", "project_id", project.ID, "owner_id", userID)

	// Broadcast project created event
	if h.wsHub != nil {
		h.wsHub.Broadcast(project.ID.String(), websocket.MessageTypeProjectCreated, project)
	}

	c.JSON(http.StatusCreated, project)
}

// GetProject returns a project with its tasks
func (h *ProjectHandler) GetProject(c *gin.Context) {
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

	// Get project
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

	// Get tasks based on user role:
	// - Project owner sees ALL tasks
	// - Other users only see tasks assigned to them
	var tasks []models.Task
	if project.OwnerID == userID {
		// Owner sees all tasks
		if err := h.db.Select(&tasks, "SELECT * FROM tasks WHERE project_id = $1 ORDER BY created_at DESC", projectID); err != nil {
			slog.Error("Failed to fetch tasks", "error", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
			return
		}
	} else {
		// Non-owner only sees tasks assigned to them
		if err := h.db.Select(&tasks, "SELECT * FROM tasks WHERE project_id = $1 AND assignee_id = $2 ORDER BY created_at DESC", projectID, userID); err != nil {
			slog.Error("Failed to fetch tasks", "error", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
			return
		}
		
		// If user has no assigned tasks, deny access to the project
		if len(tasks) == 0 {
			c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
			return
		}
	}

	project.Tasks = tasks
	c.JSON(http.StatusOK, project)
}

// UpdateProject updates a project (owner only)
func (h *ProjectHandler) UpdateProject(c *gin.Context) {
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

	// Get existing project
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

	// Check ownership
	if project.OwnerID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	var req models.UpdateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":  "validation failed",
			"fields": map[string]string{"request": "invalid request body"},
		})
		return
	}

	// Update fields
	if req.Name != nil {
		project.Name = strings.TrimSpace(*req.Name)
	}
	if req.Description != nil {
		project.Description = req.Description
	}

	_, err = h.db.Exec(
		"UPDATE projects SET name = $1, description = $2 WHERE id = $3",
		project.Name, project.Description, project.ID,
	)
	if err != nil {
		slog.Error("Failed to update project", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	slog.Info("Project updated", "project_id", project.ID)

	// Broadcast project updated event
	if h.wsHub != nil {
		h.wsHub.Broadcast(project.ID.String(), websocket.MessageTypeProjectUpdated, project)
	}

	c.JSON(http.StatusOK, project)
}

// DeleteProject deletes a project and all its tasks (owner only)
func (h *ProjectHandler) DeleteProject(c *gin.Context) {
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

	// Get existing project
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

	// Check ownership
	if project.OwnerID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	// Delete tasks first (foreign key constraint)
	_, err = h.db.Exec("DELETE FROM tasks WHERE project_id = $1", projectID)
	if err != nil {
		slog.Error("Failed to delete tasks", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	// Delete project
	_, err = h.db.Exec("DELETE FROM projects WHERE id = $1", projectID)
	if err != nil {
		slog.Error("Failed to delete project", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	slog.Info("Project deleted", "project_id", projectID)

	// Broadcast project deleted event
	if h.wsHub != nil {
		h.wsHub.Broadcast(projectID.String(), websocket.MessageTypeProjectDeleted, map[string]string{"id": projectID.String()})
	}

	c.Status(http.StatusNoContent)
}

// GetProjectStats returns task counts by status and assignee (bonus)
func (h *ProjectHandler) GetProjectStats(c *gin.Context) {
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

	// Check project exists and user has access
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

	isOwner := project.OwnerID == userID

	// Verify access for non-owners
	if !isOwner {
		var count int
		h.db.Get(&count, "SELECT COUNT(*) FROM tasks WHERE project_id = $1 AND assignee_id = $2", projectID, userID)
		if count == 0 {
			c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
			return
		}
	}

	// Get counts by status
	type StatusCount struct {
		Status string `db:"status" json:"status"`
		Count  int    `db:"count" json:"count"`
	}
	var statusCounts []StatusCount
	
	// Get counts by assignee
	type AssigneeCount struct {
		AssigneeID   *uuid.UUID `db:"assignee_id" json:"assignee_id"`
		AssigneeName *string    `db:"assignee_name" json:"assignee_name"`
		Count        int        `db:"count" json:"count"`
	}
	var assigneeCounts []AssigneeCount

	if isOwner {
		// Owner sees stats for all tasks
		err = h.db.Select(&statusCounts, `
			SELECT status, COUNT(*) as count 
			FROM tasks 
			WHERE project_id = $1 
			GROUP BY status
		`, projectID)
		if err != nil {
			slog.Error("Failed to get status counts", "error", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
			return
		}

		err = h.db.Select(&assigneeCounts, `
			SELECT t.assignee_id, u.name as assignee_name, COUNT(*) as count 
			FROM tasks t
			LEFT JOIN users u ON u.id = t.assignee_id
			WHERE t.project_id = $1 
			GROUP BY t.assignee_id, u.name
		`, projectID)
	} else {
		// Non-owner only sees stats for their assigned tasks
		err = h.db.Select(&statusCounts, `
			SELECT status, COUNT(*) as count 
			FROM tasks 
			WHERE project_id = $1 AND assignee_id = $2
			GROUP BY status
		`, projectID, userID)
		if err != nil {
			slog.Error("Failed to get status counts", "error", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
			return
		}

		err = h.db.Select(&assigneeCounts, `
			SELECT t.assignee_id, u.name as assignee_name, COUNT(*) as count 
			FROM tasks t
			LEFT JOIN users u ON u.id = t.assignee_id
			WHERE t.project_id = $1 AND t.assignee_id = $2
			GROUP BY t.assignee_id, u.name
		`, projectID, userID)
	}

	if err != nil {
		slog.Error("Failed to get assignee counts", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"project_id":  projectID,
		"by_status":   statusCounts,
		"by_assignee": assigneeCounts,
	})
}
