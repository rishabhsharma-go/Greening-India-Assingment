package daoInterfaces

import (
	projectModels "taskflow/apps/projects/models"
	taskModels "taskflow/apps/tasks/models"
)

type IProjectDAO interface {
	Create(project *projectModels.Project) error
	FindByID(id string) (*projectModels.Project, error)
	FindAccessibleByUserID(userID string, page, limit int) ([]projectModels.Project, int64, error)
	Update(project *projectModels.Project) error
	Delete(id string) error
	IsOwner(task taskModels.Task, userID string) (bool, error)
}
