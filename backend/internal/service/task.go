package service

import (
	"context"

	"github.com/dhruva/taskflow/backend/internal/domain"
)

type TaskService struct {
	tasks    domain.TaskRepository
	projects domain.ProjectRepository
}

func NewTaskService(tasks domain.TaskRepository, projects domain.ProjectRepository) *TaskService {
	return &TaskService{tasks: tasks, projects: projects}
}

func (s *TaskService) List(ctx context.Context, projectID string, filter domain.TaskFilter) ([]domain.Task, int, error) {
	_, err := s.projects.GetByID(ctx, projectID)
	if err != nil {
		return nil, 0, err
	}
	return s.tasks.ListByProject(ctx, projectID, filter)
}

func (s *TaskService) Create(ctx context.Context, params domain.CreateTaskParams) (*domain.Task, error) {
	_, err := s.projects.GetByID(ctx, params.ProjectID)
	if err != nil {
		return nil, err
	}
	return s.tasks.Create(ctx, params)
}

func (s *TaskService) Update(ctx context.Context, id string, params domain.UpdateTaskParams) (*domain.Task, error) {
	return s.tasks.Update(ctx, id, params)
}

func (s *TaskService) Delete(ctx context.Context, id, userID string) error {
	task, err := s.tasks.GetByID(ctx, id)
	if err != nil {
		return err
	}

	// task creator can delete
	if task.CreatorID == userID {
		return s.tasks.Delete(ctx, id)
	}

	// project owner can delete
	project, err := s.projects.GetByID(ctx, task.ProjectID)
	if err != nil {
		return err
	}
	if project.OwnerID == userID {
		return s.tasks.Delete(ctx, id)
	}

	return domain.ErrForbidden
}
