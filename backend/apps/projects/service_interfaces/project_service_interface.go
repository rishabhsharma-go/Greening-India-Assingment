package serviceInterfaces

import (
	projectModels "taskflow/apps/projects/models"
	projectRequests "taskflow/apps/projects/requests"
	"taskflow/apps/tasks/models"
)

type IProjectService interface {
	GetProjects(userID string, page, limit int) ([]projectModels.Project, int64)
	CreateProject(userID string, req projectRequests.CreateProjectRequest) projectModels.Project
	GetProjectByID(projectID, userID string) (projectModels.Project, []models.Task)
	UpdateProject(projectID, userID string, req projectRequests.UpdateProjectRequest) projectModels.Project
	DeleteProject(projectID, userID string)
}
