package controllers

import (
	"errors"
	"net/http"
	taskRequests "taskflow/apps/tasks/requests"
	responseCollator "taskflow/apps/tasks/response_collator"
	taskValidators "taskflow/apps/tasks/validators"

	"taskflow/constants"
	customError "taskflow/pkg/custom_error"
	"taskflow/routers/middleware"

	"github.com/gin-gonic/gin"
)

func (c *TaskController) UpdateTask(ctx *gin.Context) {
	defer customError.HandleErrorPanics(ctx)
	requestID, _ := ctx.Request.Context().Value(constants.REQUEST_ID).(string)

	taskID := ctx.Param("id")
	userID := middleware.CurrentUserID(ctx)
	c.logger.Infof("[%s] UpdateTask: request received, taskID=%s, userID=%s", requestID, taskID, userID)

	updateTaskReq := taskRequests.UpdateTaskRequest{}
	if err := ctx.ShouldBindJSON(&updateTaskReq); err != nil {
		c.logger.Warnf("[%s] UpdateTask: invalid JSON body", requestID)
		panic(customError.NewCustomError(
			errors.New(constants.ERR_INVALID_JSON),
			constants.VALIDATION_ERROR_CODE,
			400,
		))
	}

	validator := taskValidators.UpdateTaskRequestValidator{}
	validator.Validate(updateTaskReq, requestID)

	response := c.taskService.UpdateTask(taskID, userID, updateTaskReq)

	c.logger.Infof("[%s] UpdateTask: task updated successfully, taskID=%s", requestID, taskID)
	finalData := responseCollator.PrepareTaskResponse(response, requestID)
	ctx.JSON(http.StatusOK, finalData)
}
