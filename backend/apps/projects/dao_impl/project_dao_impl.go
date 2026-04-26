package daoImpl

import (
	projectModels "taskflow/apps/projects/models"
	taskModels "taskflow/apps/tasks/models"

	"gorm.io/gorm"
)

type ProjectDaoImpl struct {
	db *gorm.DB
}

func NewProjectDaoImpl(db *gorm.DB) *ProjectDaoImpl {
	return &ProjectDaoImpl{
		db: db,
	}
}

func (d *ProjectDaoImpl) Create(project *projectModels.Project) error {
	return d.db.Create(project).Error
}

func (d *ProjectDaoImpl) FindByID(id string) (*projectModels.Project, error) {
	var project projectModels.Project
	if err := d.db.Where("id = ?", id).First(&project).Error; err != nil {
		return nil, err
	}
	return &project, nil
}

func (d *ProjectDaoImpl) FindAccessibleByUserID(userID string, page, limit int) ([]projectModels.Project, int64, error) {
	var projects []projectModels.Project
	var total int64

	baseDB := d.db.Model(&projectModels.Project{}).
		Where("owner_id = ? OR id IN (SELECT project_id FROM tasks WHERE assignee_id = ?)", userID, userID)

	if err := baseDB.Session(&gorm.Session{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	err := baseDB.Session(&gorm.Session{}).
		Offset(offset).Limit(limit).
		Order("created_at DESC").
		Find(&projects).Error

	return projects, total, err
}

func (d *ProjectDaoImpl) Update(project *projectModels.Project) error {
	return d.db.Save(project).Error
}

func (d *ProjectDaoImpl) Delete(id string) error {
	return d.db.Where("id = ?", id).Delete(&projectModels.Project{}).Error
}

func (d *ProjectDaoImpl) IsOwner(task taskModels.Task, userID string) (bool, error) {
	if task.AssigneeID != nil && *task.AssigneeID == userID {
		return true, nil
	}
	var count int64
	err := d.db.Model(&projectModels.Project{}).
		Where("id = ? AND owner_id = ?", task.ProjectID, userID).
		Count(&count).Error
	return count > 0, err
}
