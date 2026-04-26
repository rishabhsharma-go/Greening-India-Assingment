package routers

import (
	projectControllers "taskflow/apps/projects/controllers"
	taskControllers "taskflow/apps/tasks/controllers"

	"github.com/gin-gonic/gin"
)

func RegisterProjectRoutes(
	rg *gin.RouterGroup,
	projectCtrl *projectControllers.ProjectController,
	taskCtrl *taskControllers.TaskController,
	jwtMW gin.HandlerFunc,
) {
	protected := rg.Group("")
	protected.Use(jwtMW)

	protected.GET("", projectCtrl.GetProjects)
	protected.POST("", projectCtrl.CreateProject)
	protected.GET("/:id", projectCtrl.GetProjectByID)
	protected.PATCH("/:id", projectCtrl.UpdateProject)
	protected.DELETE("/:id", projectCtrl.DeleteProject)
	protected.GET("/:id/stats", projectCtrl.GetProjectStats)
	protected.GET("/:id/tasks", taskCtrl.ListTasks)
	protected.POST("/:id/tasks", taskCtrl.CreateTask)
}
