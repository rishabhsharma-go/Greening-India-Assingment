package http

import (
	"time"

	"github.com/dhruva/taskflow/backend/internal/port/http/handler"
	"github.com/dhruva/taskflow/backend/internal/port/http/middleware"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

type Handlers struct {
	Auth    *handler.AuthHandler
	Project *handler.ProjectHandler
	Task    *handler.TaskHandler
	User    *handler.UserHandler
}

func SetupRouter(r *gin.Engine, h Handlers, authMiddleware *middleware.AuthMiddleware, corsOrigin string) {
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{corsOrigin},
		AllowMethods:     []string{"GET", "POST", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))
	r.Use(middleware.RequestLogger())
	r.Use(middleware.ErrorHandler())

	auth := r.Group("/auth")
	h.Auth.RegisterRoutes(auth)

	protected := r.Group("")
	protected.Use(authMiddleware.RequireAuth())
	{
		projects := protected.Group("/projects")
		h.Project.RegisterRoutes(projects)

		tasks := protected.Group("/tasks")
		h.Task.RegisterRoutes(projects, tasks)

		users := protected.Group("/users")
		h.User.RegisterRoutes(users)
	}
}
