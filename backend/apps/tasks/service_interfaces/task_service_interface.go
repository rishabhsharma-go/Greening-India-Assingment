package serviceInterfaces

import (
	"taskflow/apps/tasks/dto"
	taskModels "taskflow/apps/tasks/models"
	taskRequests "taskflow/apps/tasks/requests"
)

type ITaskService interface {
	CreateTask(projectID, userID string, req taskRequests.CreateTaskRequest) *taskModels.Task
	ListTasks(projectID, userID string, filters dto.TaskFilters, page, limit int) ([]taskModels.Task, int64)
	UpdateTask(taskID, userID string, req taskRequests.UpdateTaskRequest) *taskModels.Task
	DeleteTask(taskID, userID string)
}
