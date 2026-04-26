package services

import (
	"github.com/google/uuid"

	projectDaoInterfaces "taskflow/apps/projects/dao_interfaces"
	projectModels "taskflow/apps/projects/models"
	projectRequests "taskflow/apps/projects/requests"
	taskDaoInterfaces "taskflow/apps/tasks/dao_interfaces"
	tasksDTO "taskflow/apps/tasks/dto"
	"taskflow/apps/tasks/models"
	"taskflow/constants"
	customError "taskflow/pkg/custom_error"
	"taskflow/pkg/logger"
)

type ProjectService struct {
	projectDAO projectDaoInterfaces.IProjectDAO
	taskDAO    taskDaoInterfaces.ITaskDAO
	logger     logger.ILogger
}

func NewProjectService(
	projectDAO projectDaoInterfaces.IProjectDAO,
	taskDAO taskDaoInterfaces.ITaskDAO,
	log logger.ILogger) *ProjectService {
	return &ProjectService{
		projectDAO: projectDAO,
		taskDAO:    taskDAO,
		logger:     log,
	}
}

func (s *ProjectService) GetProjects(userID string, page, limit int) ([]projectModels.Project, int64) {
	projects, total, err := s.projectDAO.FindAccessibleByUserID(userID, page, limit)
	if err != nil {
		s.logger.Errorf("get projects error: %v", err)
		panic(customError.ErrInternal())
	}
	return projects, total
}

func (s *ProjectService) CreateProject(userID string, req projectRequests.CreateProjectRequest) projectModels.Project {
	project := &projectModels.Project{
		ID:          uuid.New().String(),
		Name:        req.Name,
		Description: req.Description,
		OwnerID:     userID,
	}

	if err := s.projectDAO.Create(project); err != nil {
		s.logger.Errorf("CreateProject: db error: %v", err)
		panic(customError.ErrInternal())
	}
	s.logger.Infof("CreateProject: project created, id=%s, ownerID=%s", project.ID, userID)
	return *project
}

func (s *ProjectService) GetProjectByID(projectID, userID string) (projectModels.Project, []models.Task) {
	project, err := s.projectDAO.FindByID(projectID)
	if err != nil {
		s.logger.Warnf("GetProjectByID: project not found, id=%s", projectID)
		panic(customError.ErrNotFound(constants.ERR_PROJECT_NOT_FOUND))
	}

	// Owner always has access; assignees with tasks also have access
	if project.OwnerID != userID {
		assigneeFilter := tasksDTO.TaskFilters{AssigneeID: &userID}
		_, total, _ := s.taskDAO.ListByProject(projectID, assigneeFilter, 1, 1)
		if total == 0 {
			s.logger.Warnf("GetProjectByID: forbidden, userID=%s has no access to projectID=%s", userID, projectID)
			panic(customError.ErrForbidden())
		}
	}

	tasks, _, err := s.taskDAO.ListByProject(projectID, tasksDTO.TaskFilters{}, 1, 1000)
	if err != nil {
		s.logger.Errorf("GetProjectByID: list tasks error: %v", err)
		panic(customError.ErrInternal())
	}

	return *project, tasks
}

func (s *ProjectService) UpdateProject(projectID, userID string, req projectRequests.UpdateProjectRequest) projectModels.Project {
	project, err := s.projectDAO.FindByID(projectID)
	if err != nil {
		s.logger.Warnf("UpdateProject: project not found, id=%s", projectID)
		panic(customError.ErrNotFound(constants.ERR_PROJECT_NOT_FOUND))
	}

	if project.OwnerID != userID {
		s.logger.Warnf("UpdateProject: forbidden, userID=%s is not owner of projectID=%s", userID, projectID)
		panic(customError.ErrForbidden())
	}

	if req.Name != nil {
		project.Name = *req.Name
	}
	if req.Description != nil {
		project.Description = req.Description
	}

	if err := s.projectDAO.Update(project); err != nil {
		s.logger.Errorf("UpdateProject: db error: %v", err)
		panic(customError.ErrInternal())
	}
	s.logger.Infof("UpdateProject: project updated, id=%s", projectID)
	return *project
}

func (s *ProjectService) DeleteProject(projectID, userID string) {
	project, err := s.projectDAO.FindByID(projectID)
	if err != nil {
		s.logger.Warnf("DeleteProject: project not found, id=%s", projectID)
		panic(customError.ErrNotFound(constants.ERR_PROJECT_NOT_FOUND))
	}

	if project.OwnerID != userID {
		s.logger.Warnf("DeleteProject: forbidden, userID=%s is not owner of projectID=%s", userID, projectID)
		panic(customError.ErrForbidden())
	}

	// tasks are also deleted here for a project as fk constraint on delete cascade
	if err := s.projectDAO.Delete(projectID); err != nil {
		s.logger.Errorf("DeleteProject: db error: %v", err)
		panic(customError.ErrInternal())
	}
	s.logger.Infof("DeleteProject: project deleted, id=%s", projectID)
}
