package controllers

import (
	"strconv"

	serviceInterfaces "taskflow/apps/tasks/service_interfaces"
	"taskflow/pkg/logger"

	"github.com/gin-gonic/gin"
)

type TaskController struct {
	taskService serviceInterfaces.ITaskService
	logger      logger.ILogger
}

func NewTaskController(taskService serviceInterfaces.ITaskService, log logger.ILogger) *TaskController {
	return &TaskController{taskService: taskService, logger: log}
}

func queryInt(ctx *gin.Context, key string, defaultVal int) int {
	v, err := strconv.Atoi(ctx.DefaultQuery(key, strconv.Itoa(defaultVal)))
	if err != nil || v < 1 {
		return defaultVal
	}
	return v
}
