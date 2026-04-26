package controllers

import (
	"net/http"
	responseCollator "taskflow/apps/projects/response_collator"
	"taskflow/constants"
	customError "taskflow/pkg/custom_error"
	"taskflow/routers/middleware"

	"github.com/gin-gonic/gin"
)

func (c *ProjectController) GetProjectByID(ctx *gin.Context) {
	defer customError.HandleErrorPanics(ctx)
	requestID, _ := ctx.Request.Context().Value(constants.REQUEST_ID).(string)

	projectID := ctx.Param("id")
	userID := middleware.CurrentUserID(ctx)
	c.logger.Infof("[%s] GetProjectByID: request received, projectID=%s, userID=%s", requestID, projectID, userID)

	project, tasks := c.projectService.GetProjectByID(projectID, userID)

	c.logger.Infof("[%s] GetProjectByID: success, projectID=%s, taskCount=%d", requestID, projectID, len(tasks))
	finalData := responseCollator.PrepareProjectDetailResponse(project, tasks, requestID)
	ctx.JSON(http.StatusOK, finalData)
}
