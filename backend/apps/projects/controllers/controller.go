package controllers

import (
	"strconv"

	serviceInterfaces "taskflow/apps/projects/service_interfaces"
	"taskflow/pkg/logger"

	"github.com/gin-gonic/gin"
)

type ProjectController struct {
	projectService serviceInterfaces.IProjectService
	logger         logger.ILogger
}

func NewProjectController(projectService serviceInterfaces.IProjectService, log logger.ILogger) *ProjectController {
	return &ProjectController{projectService: projectService, logger: log}
}

func queryInt(ctx *gin.Context, key string, defaultVal int) int {
	v, err := strconv.Atoi(ctx.DefaultQuery(key, strconv.Itoa(defaultVal)))
	if err != nil || v < 1 {
		return defaultVal
	}
	return v
}
