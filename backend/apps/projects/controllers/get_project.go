package controllers

import (
	"net/http"
	responseCollator "taskflow/apps/projects/response_collator"
	"taskflow/constants"
	customError "taskflow/pkg/custom_error"
	"taskflow/routers/middleware"

	"github.com/gin-gonic/gin"
)

func (c *ProjectController) GetProjects(ctx *gin.Context) {
	defer customError.HandleErrorPanics(ctx)
	requestID, _ := ctx.Request.Context().Value(constants.REQUEST_ID).(string)

	userID := middleware.CurrentUserID(ctx)
	page := queryInt(ctx, "page", constants.DEFAULT_PAGE)
	limit := queryInt(ctx, "limit", constants.DEFAULT_LIMIT)
	if limit > constants.MAX_LIMIT {
		limit = constants.MAX_LIMIT
	}
	c.logger.Infof("[%s] GetProjects: request received, userID=%s, page=%d, limit=%d", requestID, userID, page, limit)

	response, total := c.projectService.GetProjects(userID, page, limit)

	c.logger.Infof("[%s] GetProjects: returning %d projects, total=%d", requestID, len(response), total)
	finalData := responseCollator.PrepareProjectListResponse(response, page, limit, total, requestID)
	ctx.JSON(http.StatusOK, finalData)
}
