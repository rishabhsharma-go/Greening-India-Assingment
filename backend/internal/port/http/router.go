package http

import (
	"reflect"
	"strings"
	"time"

	"github.com/dhruva/taskflow/backend/internal/port/http/handler"
	"github.com/dhruva/taskflow/backend/internal/port/http/middleware"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/gin-gonic/gin/binding"
	"github.com/go-playground/validator/v10"
)

type Handlers struct {
	Auth    *handler.AuthHandler
	Project *handler.ProjectHandler
	Task    *handler.TaskHandler
	User    *handler.UserHandler
}

func SetupRouter(r *gin.Engine, h Handlers, authMiddleware *middleware.AuthMiddleware, corsOrigins []string, allowCredentials bool) {
	if v, ok := binding.Validator.Engine().(*validator.Validate); ok {
		v.RegisterTagNameFunc(func(field reflect.StructField) string {
			name := strings.Split(field.Tag.Get("json"), ",")[0]
			if name == "" || name == "-" {
				return field.Name
			}
			return name
		})
	}

	r.Use(cors.New(cors.Config{
		AllowOrigins:     corsOrigins,
		AllowMethods:     []string{"GET", "POST", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: allowCredentials,
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
