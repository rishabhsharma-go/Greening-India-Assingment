package controllers

import (
	"net/http"
	"taskflow/constants"
	customError "taskflow/pkg/custom_error"
	"taskflow/routers/middleware"

	"github.com/gin-gonic/gin"
)

func (c *ProjectController) DeleteProject(ctx *gin.Context) {
	defer customError.HandleErrorPanics(ctx)
	requestID, _ := ctx.Request.Context().Value(constants.REQUEST_ID).(string)

	projectID := ctx.Param("id")
	userID := middleware.CurrentUserID(ctx)
	c.logger.Infof("[%s] DeleteProject: request received, projectID=%s, userID=%s", requestID, projectID, userID)

	c.projectService.DeleteProject(projectID, userID)
	c.logger.Infof("[%s] DeleteProject: project deleted successfully, projectID=%s", requestID, projectID)
	ctx.JSON(http.StatusNoContent, nil)
}
