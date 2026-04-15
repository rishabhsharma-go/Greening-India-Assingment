package task

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/you/taskflow/backend/internal/models"
)

var ErrForbidden = errors.New("forbidden")

type ProjectOwnerChecker interface {
	GetOwnerID(ctx context.Context, projectID uuid.UUID) (uuid.UUID, error)
}

type Service struct {
	repo    *Repository
	checker ProjectOwnerChecker
}

func NewService(repo *Repository, checker ProjectOwnerChecker) *Service {
	return &Service{repo: repo, checker: checker}
}

func (s *Service) ListForProject(ctx context.Context, projectID uuid.UUID, status string, assigneeID uuid.UUID) ([]models.Task, error) {
	tasks, err := s.repo.ListForProject(ctx, projectID, status, assigneeID)
	if tasks == nil {
		tasks = []models.Task{}
	}
	return tasks, err
}

func (s *Service) Create(ctx context.Context, t models.Task) (models.Task, error) {
	if t.Status == "" {
		t.Status = models.StatusTodo
	}
	if t.Priority == "" {
		t.Priority = models.PriorityMedium
	}
	return s.repo.Create(ctx, t)
}

func (s *Service) Update(ctx context.Context, id uuid.UUID, callerID uuid.UUID, updates models.Task) (models.Task, error) {
	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return existing, err
	}

	// Apply partial updates — only override if the field is set in the request
	if updates.Title != "" {
		existing.Title = updates.Title
	}
	if updates.Description != nil {
		existing.Description = updates.Description
	}
	if updates.Status != "" {
		existing.Status = updates.Status
	}
	if updates.Priority != "" {
		existing.Priority = updates.Priority
	}
	if updates.AssigneeID != nil {
		existing.AssigneeID = updates.AssigneeID
	}
	if updates.DueDate != nil {
		existing.DueDate = updates.DueDate
	}

	return s.repo.Update(ctx, existing)
}

func (s *Service) Delete(ctx context.Context, id uuid.UUID, callerID uuid.UUID) error {
	task, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	// Allow deletion by task creator OR project owner
	if task.CreatorID == callerID {
		return s.repo.Delete(ctx, id)
	}

	ownerID, err := s.checker.GetOwnerID(ctx, task.ProjectID)
	if err != nil {
		return err
	}
	if ownerID != callerID {
		return ErrForbidden
	}

	return s.repo.Delete(ctx, id)
}
