package service

import (
	"context"
	"errors"

	"github.com/dhruva/taskflow/backend/internal/domain"
)

type ProjectService struct {
	projects domain.ProjectRepository
	tasks    domain.TaskRepository
	users    domain.UserRepository
}

func NewProjectService(projects domain.ProjectRepository, tasks domain.TaskRepository, users domain.UserRepository) *ProjectService {
	return &ProjectService{projects: projects, tasks: tasks, users: users}
}

func (s *ProjectService) List(ctx context.Context, userID string, page, limit int) ([]domain.Project, int, error) {
	return s.projects.ListByUser(ctx, userID, page, limit)
}

func (s *ProjectService) GetByID(ctx context.Context, id string) (*domain.Project, error) {
	project, err := s.projects.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	tasks, _, err := s.tasks.ListByProject(ctx, id, domain.TaskFilter{Page: 1, Limit: 1000})
	if err != nil {
		return nil, err
	}
	project.Tasks = tasks

	return project, nil
}

func (s *ProjectService) Create(ctx context.Context, params domain.CreateProjectParams) (*domain.Project, error) {
	return s.projects.Create(ctx, params)
}

func (s *ProjectService) Update(ctx context.Context, id, userID string, params domain.UpdateProjectParams) (*domain.Project, error) {
	project, err := s.projects.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if project.OwnerID != userID {
		return nil, domain.ErrForbidden
	}
	return s.projects.Update(ctx, id, params)
}

func (s *ProjectService) Delete(ctx context.Context, id, userID string) error {
	project, err := s.projects.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if project.OwnerID != userID {
		return domain.ErrForbidden
	}
	return s.projects.Delete(ctx, id)
}

func (s *ProjectService) GetStats(ctx context.Context, id string) (*domain.ProjectStats, error) {
	_, err := s.projects.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return s.tasks.GetStatsByProject(ctx, id)
}

func (s *ProjectService) ListMembers(ctx context.Context, projectID string) ([]domain.User, error) {
	_, err := s.projects.GetByID(ctx, projectID)
	if err != nil {
		return nil, err
	}
	return s.users.ListByProject(ctx, projectID)
}
