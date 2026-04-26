package daoInterfaces

import (
	"taskflow/apps/tasks/dto"
	taskModels "taskflow/apps/tasks/models"
)

type ITaskDAO interface {
	Create(task *taskModels.Task) error
	FindByID(id string) (*taskModels.Task, error)
	ListByProject(projectID string, filters dto.TaskFilters, page, limit int) ([]taskModels.Task, int64, error)
	Update(task *taskModels.Task) error
	Delete(id string) error
}
