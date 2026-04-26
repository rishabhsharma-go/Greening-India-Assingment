package routers

import (
	authControllers "taskflow/apps/auth/controllers"
	projectControllers "taskflow/apps/projects/controllers"
	taskControllers "taskflow/apps/tasks/controllers"
	"taskflow/pkg/config"
	"taskflow/pkg/logger"
	"taskflow/routers/middleware"

	"github.com/gin-gonic/gin"
)

func NewRouter(
	cfg *config.Config,
	log logger.ILogger,
	authCtrl *authControllers.AuthController,
	projectCtrl *projectControllers.ProjectController,
	taskCtrl *taskControllers.TaskController,
) *gin.Engine {
	if cfg.LogLevel != "debug" {
		gin.SetMode(gin.ReleaseMode)
	}

	engine := gin.New()
	engine.RedirectTrailingSlash = false
	engine.Use(gin.Recovery())
	engine.Use(middleware.CORSMiddleware())
	engine.Use(middleware.SetRequestContext())

	jwtMW := middleware.JWTMiddleware(cfg, log)

	RegisterHealthRoutes(engine.Group("/"))
	RegisterAuthRoutes(engine.Group("/auth"), authCtrl)
	RegisterProjectRoutes(engine.Group("/projects"), projectCtrl, taskCtrl, jwtMW)
	RegisterTaskRoutes(engine.Group("/tasks"), taskCtrl, jwtMW)

	return engine
}
