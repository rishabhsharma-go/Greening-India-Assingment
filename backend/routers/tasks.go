package routers

import (
	taskControllers "taskflow/apps/tasks/controllers"

	"github.com/gin-gonic/gin"
)

func RegisterTaskRoutes(
	rg *gin.RouterGroup,
	taskCtrl *taskControllers.TaskController,
	jwtMW gin.HandlerFunc,
) {
	protected := rg.Group("")
	protected.Use(jwtMW)

	protected.PATCH("/:id", taskCtrl.UpdateTask)
	protected.DELETE("/:id", taskCtrl.DeleteTask)
}
