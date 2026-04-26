package controllers

import (
	"net/http"
	"taskflow/apps/tasks/dto"
	responseCollator "taskflow/apps/tasks/response_collator"
	"taskflow/constants"
	customError "taskflow/pkg/custom_error"
	"taskflow/routers/middleware"

	"github.com/gin-gonic/gin"
)

func (c *TaskController) ListTasks(ctx *gin.Context) {
	defer customError.HandleErrorPanics(ctx)
	requestID, _ := ctx.Request.Context().Value(constants.REQUEST_ID).(string)

	projectID := ctx.Param("id")
	userID := middleware.CurrentUserID(ctx)

	page := queryInt(ctx, "page", constants.DEFAULT_PAGE)
	limit := queryInt(ctx, "limit", constants.DEFAULT_LIMIT)
	if limit > constants.MAX_LIMIT {
		limit = constants.MAX_LIMIT
	}
	c.logger.Infof("[%s] ListTasks: request received, projectID=%s, userID=%s, page=%d, limit=%d", requestID, projectID, userID, page, limit)

	var filters dto.TaskFilters
	if status := ctx.Query("status"); status != "" {
		filters.Status = &status
	}
	if assigneeID := ctx.Query("assignee_id"); assigneeID != "" {
		filters.AssigneeID = &assigneeID
	}

	tasksList, totalTasks := c.taskService.ListTasks(projectID, userID, filters, page, limit)

	c.logger.Infof("[%s] ListTasks: returning %d tasks, total=%d", requestID, len(tasksList), totalTasks)
	finalData := responseCollator.PrepareTaskListResponse(tasksList, page, limit, totalTasks, requestID)
	ctx.JSON(http.StatusOK, finalData)
}
