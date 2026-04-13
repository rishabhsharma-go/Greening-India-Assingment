package handler

import (
	"net/http"

	"github.com/dhruva/taskflow/backend/internal/domain"
	apperr "github.com/dhruva/taskflow/backend/internal/infra/errors"
	"github.com/gin-gonic/gin"
)

type UserHandler struct {
	users domain.UserRepository
}

func NewUserHandler(users domain.UserRepository) *UserHandler {
	return &UserHandler{users: users}
}

func (h *UserHandler) Search(c *gin.Context) {
	q := c.Query("q")
	if q == "" {
		c.JSON(http.StatusOK, gin.H{"users": []any{}})
		return
	}

	users, err := h.users.Search(c.Request.Context(), q, 10)
	if err != nil {
		abort(c, apperr.Server("failed to search users", err))
		return
	}

	type userResult struct {
		ID    string `json:"id"`
		Name  string `json:"name"`
		Email string `json:"email"`
	}
	resp := make([]userResult, len(users))
	for i, u := range users {
		resp[i] = userResult{ID: u.ID, Name: u.Name, Email: u.Email}
	}
	c.JSON(http.StatusOK, gin.H{"users": resp})
}

func (h *UserHandler) RegisterRoutes(rg *gin.RouterGroup) {
	rg.GET("/search", h.Search)
}
