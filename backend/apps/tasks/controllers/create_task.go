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

func (c *TaskController) CreateTask(ctx *gin.Context) {
	defer customError.HandleErrorPanics(ctx)
	requestID, _ := ctx.Request.Context().Value(constants.REQUEST_ID).(string)

	projectID := ctx.Param("id")
	userID := middleware.CurrentUserID(ctx)
	c.logger.Infof("[%s] CreateTask: request received, projectID=%s, userID=%s", requestID, projectID, userID)

	createTaskReq := taskRequests.CreateTaskRequest{}
	if err := ctx.ShouldBindJSON(&createTaskReq); err != nil {
		c.logger.Warnf("[%s] CreateTask: invalid JSON body", requestID)
		customErr := customError.NewCustomError(
			errors.New(constants.ERR_INVALID_JSON),
			constants.VALIDATION_ERROR_CODE,
			http.StatusBadRequest,
		)
		panic(customErr)
	}
	validator := taskValidators.CreateTaskRequestValidator{}
	validator.Validate(createTaskReq, requestID)

	response := c.taskService.CreateTask(projectID, userID, createTaskReq)

	c.logger.Infof("[%s] CreateTask: task created successfully", requestID)
	finalData := responseCollator.PrepareTaskResponse(response, requestID)
	ctx.JSON(http.StatusCreated, finalData)
}
