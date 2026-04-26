package services

import (
	"net/http"
	"time"

	"github.com/google/uuid"

	projectDaoInterfaces "taskflow/apps/projects/dao_interfaces"
	taskDaoInterfaces "taskflow/apps/tasks/dao_interfaces"
	"taskflow/apps/tasks/dto"
	taskModels "taskflow/apps/tasks/models"
	taskRequests "taskflow/apps/tasks/requests"
	"taskflow/constants"
	customError "taskflow/pkg/custom_error"
	"taskflow/pkg/logger"
)

type TaskService struct {
	taskDAO    taskDaoInterfaces.ITaskDAO
	projectDAO projectDaoInterfaces.IProjectDAO
	logger     logger.ILogger
}

func NewTaskService(taskDAO taskDaoInterfaces.ITaskDAO,
	projectDAO projectDaoInterfaces.IProjectDAO,
	log logger.ILogger) *TaskService {
	return &TaskService{
		taskDAO:    taskDAO,
		projectDAO: projectDAO,
		logger:     log,
	}
}

func (s *TaskService) CreateTask(projectID, userID string, req taskRequests.CreateTaskRequest) *taskModels.Task {
	project, err := s.projectDAO.FindByID(projectID)
	if err != nil {
		s.logger.Warnf("CreateTask: project not found, projectID=%s", projectID)
		panic(customError.ErrNotFound(constants.ERR_PROJECT_NOT_FOUND))
	}

	if project.OwnerID != userID {
		s.logger.Warnf("CreateTask: forbidden, userID=%s is not owner of projectID=%s", userID, projectID)
		panic(customError.ErrForbidden())
	}

	status := constants.StatusTodo
	if req.Status != "" {
		status = req.Status
	}
	priority := constants.PriorityMedium
	if req.Priority != "" {
		priority = req.Priority
	}

	var dueDate *time.Time
	if req.DueDate != nil {
		t, err := time.Parse("2006-01-02", *req.DueDate)
		if err != nil {
			s.logger.Warnf("CreateTask: invalid due_date format: %s", *req.DueDate)
			panic(customError.NewCustomError(
				err,
				constants.VALIDATION_ERROR_CODE,
				http.StatusBadRequest,
			))
		}
		dueDate = &t
	}

	task := &taskModels.Task{
		ID:          uuid.New().String(),
		Title:       req.Title,
		Description: req.Description,
		Status:      status,
		Priority:    priority,
		ProjectID:   projectID,
		AssigneeID:  req.AssigneeID,
		DueDate:     dueDate,
	}

	if err := s.taskDAO.Create(task); err != nil {
		s.logger.Errorf("CreateTask: db error: %v", err)
		panic(customError.ErrInternal())
	}

	s.logger.Infof("CreateTask: task created, id=%s, projectID=%s", task.ID, projectID)
	return task
}

func (s *TaskService) ListTasks(projectID, userID string, filters dto.TaskFilters, page, limit int) ([]taskModels.Task, int64) {
	project, err := s.projectDAO.FindByID(projectID)
	if err != nil {
		s.logger.Warnf("ListTasks: project not found, projectID=%s", projectID)
		panic(customError.ErrNotFound(constants.ERR_PROJECT_NOT_FOUND))
	}

	// Owner has full access; assignees can list tasks of projects they're assigned to
	if project.OwnerID != userID {
		assigneeFilter := dto.TaskFilters{AssigneeID: &userID}
		_, total, _ := s.taskDAO.ListByProject(projectID, assigneeFilter, 1, 1)
		if total == 0 {
			s.logger.Warnf("ListTasks: forbidden, userID=%s has no access to projectID=%s", userID, projectID)
			panic(customError.ErrForbidden())
		}
	}

	tasks, total, err := s.taskDAO.ListByProject(projectID, filters, page, limit)
	if err != nil {
		s.logger.Errorf("ListTasks: db error: %v", err)
		panic(customError.ErrInternal())
	}

	return tasks, total
}

func (s *TaskService) UpdateTask(taskID, userID string, req taskRequests.UpdateTaskRequest) *taskModels.Task {
	task, err := s.taskDAO.FindByID(taskID)
	if err != nil {
		s.logger.Warnf("UpdateTask: task not found, taskID=%s", taskID)
		panic(customError.ErrNotFound(constants.ERR_TASK_NOT_FOUND))
	}

	// Only project owner or task assignee can update
	isOwner, _ := s.projectDAO.IsOwner(*task, userID)
	isAssignee := task.AssigneeID != nil && *task.AssigneeID == userID

	if !isOwner && !isAssignee {
		s.logger.Warnf("UpdateTask: forbidden, userID=%s has no permission on taskID=%s", userID, taskID)
		panic(customError.ErrForbidden())
	}

	if req.Title != nil {
		task.Title = *req.Title
	}
	if req.Description != nil {
		task.Description = req.Description
	}
	if req.Status != nil {
		task.Status = *req.Status
	}
	if req.Priority != nil {
		task.Priority = *req.Priority
	}
	if req.AssigneeID != nil {
		task.AssigneeID = req.AssigneeID
	}
	if req.DueDate != nil {
		t, err := time.Parse("2006-01-02", *req.DueDate)
		if err != nil {
			s.logger.Warnf("UpdateTask: invalid due_date format: %s", *req.DueDate)
			panic(customError.NewCustomError(
				err,
				constants.VALIDATION_ERROR_CODE,
				http.StatusBadRequest,
			))
		}
		task.DueDate = &t
	}

	if err := s.taskDAO.Update(task); err != nil {
		s.logger.Errorf("UpdateTask: db error: %v", err)
		panic(customError.ErrInternal())
	}

	s.logger.Infof("UpdateTask: task updated, id=%s", taskID)
	return task
}

func (s *TaskService) DeleteTask(taskID, userID string) {
	task, err := s.taskDAO.FindByID(taskID)
	if err != nil {
		s.logger.Warnf("DeleteTask: task not found, taskID=%s", taskID)
		panic(customError.ErrNotFound(constants.ERR_TASK_NOT_FOUND))
	}

	// Only project owner can delete tasks
	project, err := s.projectDAO.FindByID(task.ProjectID)
	if err != nil || project.OwnerID != userID {
		s.logger.Warnf("DeleteTask: forbidden, userID=%s is not owner of projectID=%s", userID, task.ProjectID)
		panic(customError.ErrForbidden())
	}

	if err := s.taskDAO.Delete(taskID); err != nil {
		s.logger.Errorf("DeleteTask: db error: %v", err)
		panic(customError.ErrInternal())
	}

	s.logger.Infof("DeleteTask: task deleted, id=%s", taskID)
}
