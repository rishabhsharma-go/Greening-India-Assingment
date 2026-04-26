package controllers

import (
	"errors"
	"net/http"
	"taskflow/apps/projects/requests"
	responseCollator "taskflow/apps/projects/response_collator"
	projectValidators "taskflow/apps/projects/validators"
	"taskflow/constants"
	customError "taskflow/pkg/custom_error"
	"taskflow/routers/middleware"

	"github.com/gin-gonic/gin"
)

func (c *ProjectController) CreateProject(ctx *gin.Context) {
	defer customError.HandleErrorPanics(ctx)
	requestID, _ := ctx.Request.Context().Value(constants.REQUEST_ID).(string)

	userID := middleware.CurrentUserID(ctx)
	c.logger.Infof("[%s] CreateProject: request received, userID=%s", requestID, userID)

	createProjectReq := requests.CreateProjectRequest{}
	if err := ctx.ShouldBindJSON(&createProjectReq); err != nil {
		c.logger.Warnf("[%s] CreateProject: invalid JSON body", requestID)
		panic(customError.NewCustomError(
			errors.New(constants.ERR_INVALID_JSON),
			constants.VALIDATION_ERROR_CODE,
			http.StatusBadRequest,
		))
	}

	validator := projectValidators.CreateTaskRequestValidator{}
	validator.Validate(createProjectReq, requestID)

	response := c.projectService.CreateProject(userID, createProjectReq)

	c.logger.Infof("[%s] CreateProject: project created successfully, projectID=%s", requestID, response.ID)
	finalData := responseCollator.PrepareProjectResponse(response, requestID)
	ctx.JSON(http.StatusCreated, finalData)
}
