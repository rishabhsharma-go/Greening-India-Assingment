package router

import (
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	"github.com/taskflow/backend/internal/config"
	"github.com/taskflow/backend/internal/handlers"
	"github.com/taskflow/backend/internal/middleware"
	"github.com/taskflow/backend/internal/websocket"
)

func Setup(cfg *config.Config, db *sqlx.DB) *gin.Engine {
	r := gin.Default()

	// CORS middleware
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization")
		c.Header("Access-Control-Max-Age", "86400")
		
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// Initialize WebSocket hub
	wsHub := websocket.NewHub()
	go wsHub.Run()
	wsHandler := websocket.NewHandler(wsHub)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(db, cfg.JWTSecret, cfg.JWTExpiryHours, cfg.BcryptCost)
	projectHandler := handlers.NewProjectHandler(db, wsHub)
	taskHandler := handlers.NewTaskHandler(db, wsHub)

	// Auth routes (no auth required)
	auth := r.Group("/auth")
	{
		auth.POST("/register", authHandler.Register)
		auth.POST("/login", authHandler.Login)
	}

	// WebSocket endpoint (requires auth via query param)
	r.GET("/ws/projects/:id", wsHandler.HandleWebSocket)
	r.GET("/ws/user/:id", wsHandler.HandleUserWebSocket)  // User-level notifications

	// Protected routes
	api := r.Group("")
	api.Use(middleware.AuthMiddleware(cfg.JWTSecret))
	{
		// Projects
		api.GET("/projects", projectHandler.ListProjects)
		api.POST("/projects", projectHandler.CreateProject)
		api.GET("/projects/:id", projectHandler.GetProject)
		api.PATCH("/projects/:id", projectHandler.UpdateProject)
		api.DELETE("/projects/:id", projectHandler.DeleteProject)
		api.GET("/projects/:id/stats", projectHandler.GetProjectStats) // Bonus

		// Tasks
		api.GET("/projects/:id/tasks", taskHandler.ListTasks)
		api.POST("/projects/:id/tasks", taskHandler.CreateTask)
		api.PATCH("/tasks/:id", taskHandler.UpdateTask)
		api.DELETE("/tasks/:id", taskHandler.DeleteTask)

		// Users
		api.GET("/users", authHandler.ListUsers)
	}

	return r
}
