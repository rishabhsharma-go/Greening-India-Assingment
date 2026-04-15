package project

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/you/taskflow/backend/internal/models"
)

var ErrForbidden = errors.New("forbidden")

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) ListForUser(ctx context.Context, userID uuid.UUID) ([]models.Project, error) {
	return s.repo.ListForUser(ctx, userID)
}

func (s *Service) Create(ctx context.Context, name string, description *string, ownerID uuid.UUID) (models.Project, error) {
	return s.repo.Create(ctx, name, description, ownerID)
}

func (s *Service) GetByID(ctx context.Context, id uuid.UUID) (models.Project, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *Service) Update(ctx context.Context, id uuid.UUID, callerID uuid.UUID, name string, description *string) (models.Project, error) {
	project, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return project, err
	}
	if project.OwnerID != callerID {
		return project, ErrForbidden
	}
	return s.repo.Update(ctx, id, name, description)
}

func (s *Service) Delete(ctx context.Context, id uuid.UUID, callerID uuid.UUID) error {
	project, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if project.OwnerID != callerID {
		return ErrForbidden
	}
	return s.repo.Delete(ctx, id)
}
