package controllers

import (
	"errors"
	"net/http"
	"taskflow/apps/projects/requests"
	responseCollator "taskflow/apps/projects/response_collator"
	"taskflow/constants"
	customError "taskflow/pkg/custom_error"
	"taskflow/routers/middleware"

	"github.com/gin-gonic/gin"
)

func (c *ProjectController) UpdateProject(ctx *gin.Context) {
	defer customError.HandleErrorPanics(ctx)
	requestID, _ := ctx.Request.Context().Value(constants.REQUEST_ID).(string)

	projectID := ctx.Param("id")
	userID := middleware.CurrentUserID(ctx)
	c.logger.Infof("[%s] UpdateProject: request received, projectID=%s, userID=%s", requestID, projectID, userID)

	updateProjectReq := requests.UpdateProjectRequest{}
	if err := ctx.ShouldBindJSON(&updateProjectReq); err != nil {
		c.logger.Warnf("[%s] UpdateProject: invalid JSON body", requestID)
		panic(customError.NewCustomError(
			errors.New(constants.ERR_INVALID_JSON),
			constants.VALIDATION_ERROR_CODE,
			http.StatusBadRequest,
		))
	}

	response := c.projectService.UpdateProject(projectID, userID, updateProjectReq)
	c.logger.Infof("[%s] UpdateProject: project updated successfully, projectID=%s", requestID, projectID)
	finalData := responseCollator.PrepareProjectResponse(response, requestID)
	ctx.JSON(http.StatusOK, finalData)
}
