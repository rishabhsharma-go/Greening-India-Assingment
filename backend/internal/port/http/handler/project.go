package handler

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/dhruva/taskflow/backend/internal/domain"
	apperr "github.com/dhruva/taskflow/backend/internal/infra/errors"
	"github.com/dhruva/taskflow/backend/internal/infra/util"
	"github.com/dhruva/taskflow/backend/internal/service"
	"github.com/gin-gonic/gin"
)

type ProjectHandler struct {
	projectService *service.ProjectService
}

func NewProjectHandler(projectService *service.ProjectService) *ProjectHandler {
	return &ProjectHandler{projectService: projectService}
}

type createProjectRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
}

type updateProjectRequest struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
}

type projectResponse struct {
	ID          string         `json:"id"`
	Name        string         `json:"name"`
	Description string         `json:"description"`
	OwnerID     string         `json:"owner_id"`
	CreatedAt   string         `json:"created_at"`
	Tasks       []taskResponse `json:"tasks,omitempty"`
}

func mapProjectResponse(p *domain.Project) projectResponse {
	resp := projectResponse{
		ID:          p.ID,
		Name:        p.Name,
		Description: p.Description,
		OwnerID:     p.OwnerID,
		CreatedAt:   p.CreatedAt.Format("2006-01-02T15:04:05Z"),
	}
	if p.Tasks != nil {
		resp.Tasks = make([]taskResponse, len(p.Tasks))
		for i, t := range p.Tasks {
			resp.Tasks[i] = mapTaskResponse(&t)
		}
	}
	return resp
}

func (h *ProjectHandler) List(c *gin.Context) {
	userID, ok := util.GetUserID(c)
	if !ok {
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

	projects, total, err := h.projectService.List(c.Request.Context(), userID, page, limit)
	if err != nil {
		abort(c, apperr.Server("failed to list projects", err))
		return
	}

	resp := make([]projectResponse, len(projects))
	for i, p := range projects {
		resp[i] = mapProjectResponse(&p)
	}

	c.JSON(http.StatusOK, gin.H{
		"projects": resp,
		"total":    total,
		"page":     page,
		"limit":    limit,
	})
}

func (h *ProjectHandler) Get(c *gin.Context) {
	id, err := parseUUID(c, "id")
	if err != nil {
		return
	}

	project, err := h.projectService.GetByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			abort(c, apperr.NotFound("not found"))
			return
		}
		abort(c, apperr.Server("failed to get project", err))
		return
	}

	c.JSON(http.StatusOK, mapProjectResponse(project))
}

func (h *ProjectHandler) Create(c *gin.Context) {
	userID, ok := util.GetUserID(c)
	if !ok {
		return
	}

	var req createProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		abort(c, err)
		return
	}

	project, err := h.projectService.Create(c.Request.Context(), domain.CreateProjectParams{
		Name:        req.Name,
		Description: req.Description,
		OwnerID:     userID,
	})
	if err != nil {
		abort(c, apperr.Server("failed to create project", err))
		return
	}

	c.JSON(http.StatusCreated, mapProjectResponse(project))
}

func (h *ProjectHandler) Update(c *gin.Context) {
	userID, ok := util.GetUserID(c)
	if !ok {
		return
	}

	id, err := parseUUID(c, "id")
	if err != nil {
		return
	}

	var req updateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		abort(c, err)
		return
	}

	project, err := h.projectService.Update(c.Request.Context(), id, userID, domain.UpdateProjectParams{
		Name:        req.Name,
		Description: req.Description,
	})
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			abort(c, apperr.NotFound("not found"))
			return
		}
		if errors.Is(err, domain.ErrForbidden) {
			abort(c, apperr.Forbidden("forbidden"))
			return
		}
		abort(c, apperr.Server("failed to update project", err))
		return
	}

	c.JSON(http.StatusOK, mapProjectResponse(project))
}

func (h *ProjectHandler) Delete(c *gin.Context) {
	userID, ok := util.GetUserID(c)
	if !ok {
		return
	}

	id, err := parseUUID(c, "id")
	if err != nil {
		return
	}

	if err := h.projectService.Delete(c.Request.Context(), id, userID); err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			abort(c, apperr.NotFound("not found"))
			return
		}
		if errors.Is(err, domain.ErrForbidden) {
			abort(c, apperr.Forbidden("forbidden"))
			return
		}
		abort(c, apperr.Server("failed to delete project", err))
		return
	}

	c.Status(http.StatusNoContent)
}

func (h *ProjectHandler) Stats(c *gin.Context) {
	id, err := parseUUID(c, "id")
	if err != nil {
		return
	}

	stats, err := h.projectService.GetStats(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			abort(c, apperr.NotFound("not found"))
			return
		}
		abort(c, apperr.Server("failed to get stats", err))
		return
	}

	c.JSON(http.StatusOK, stats)
}

func (h *ProjectHandler) Members(c *gin.Context) {
	id, err := parseUUID(c, "id")
	if err != nil {
		return
	}

	members, err := h.projectService.ListMembers(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			abort(c, apperr.NotFound("not found"))
			return
		}
		abort(c, apperr.Server("failed to get members", err))
		return
	}

	type memberResponse struct {
		ID   string `json:"id"`
		Name string `json:"name"`
	}
	resp := make([]memberResponse, len(members))
	for i, m := range members {
		resp[i] = memberResponse{ID: m.ID, Name: m.Name}
	}
	c.JSON(http.StatusOK, gin.H{"members": resp})
}

func (h *ProjectHandler) RegisterRoutes(rg *gin.RouterGroup) {
	rg.GET("", h.List)
	rg.POST("", h.Create)
	rg.GET("/:id", h.Get)
	rg.PATCH("/:id", h.Update)
	rg.DELETE("/:id", h.Delete)
	rg.GET("/:id/stats", h.Stats)
	rg.GET("/:id/members", h.Members)
}
