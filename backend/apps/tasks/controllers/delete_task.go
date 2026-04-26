package controllers

import (
	"net/http"
	"taskflow/constants"
	customError "taskflow/pkg/custom_error"
	"taskflow/routers/middleware"

	"github.com/gin-gonic/gin"
)

func (c *TaskController) DeleteTask(ctx *gin.Context) {
	defer customError.HandleErrorPanics(ctx)
	requestID, _ := ctx.Request.Context().Value(constants.REQUEST_ID).(string)

	taskID := ctx.Param("id")
	userID := middleware.CurrentUserID(ctx)
	c.logger.Infof("[%s] DeleteTask: request received, taskID=%s, userID=%s", requestID, taskID, userID)

	c.taskService.DeleteTask(taskID, userID)
	c.logger.Infof("[%s] DeleteTask: task deleted successfully, taskID=%s", requestID, taskID)
	ctx.JSON(http.StatusNoContent, nil)
}
