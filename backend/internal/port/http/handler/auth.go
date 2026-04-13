package handler

import (
	"errors"
	"net/http"

	"github.com/dhruva/taskflow/backend/internal/domain"
	apperr "github.com/dhruva/taskflow/backend/internal/infra/errors"
	"github.com/dhruva/taskflow/backend/internal/service"
	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	authService *service.AuthService
}

func NewAuthHandler(authService *service.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

type registerRequest struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

type loginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type authResponse struct {
	Token string       `json:"token"`
	User  userResponse `json:"user"`
}

type userResponse struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req registerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		abort(c, err)
		return
	}

	result, err := h.authService.Register(c.Request.Context(), service.RegisterParams{
		Name:     req.Name,
		Email:    req.Email,
		Password: req.Password,
	})
	if err != nil {
		if errors.Is(err, domain.ErrEmailExists) {
			abort(c, apperr.Conflict("email already registered"))
			return
		}
		abort(c, apperr.Server("failed to register", err))
		return
	}

	c.JSON(http.StatusCreated, authResponse{
		Token: result.Token,
		User: userResponse{
			ID:    result.User.ID,
			Name:  result.User.Name,
			Email: result.User.Email,
		},
	})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		abort(c, err)
		return
	}

	result, err := h.authService.Login(c.Request.Context(), service.LoginParams{
		Email:    req.Email,
		Password: req.Password,
	})
	if err != nil {
		if errors.Is(err, domain.ErrInvalidCredentials) {
			abort(c, apperr.Unauthorized("invalid credentials"))
			return
		}
		abort(c, apperr.Server("failed to login", err))
		return
	}

	c.JSON(http.StatusOK, authResponse{
		Token: result.Token,
		User: userResponse{
			ID:    result.User.ID,
			Name:  result.User.Name,
			Email: result.User.Email,
		},
	})
}

func (h *AuthHandler) RegisterRoutes(rg *gin.RouterGroup) {
	rg.POST("/register", h.Register)
	rg.POST("/login", h.Login)
}
