package daoImpl

import (
	daoInterfaces "taskflow/apps/tasks/dao_interfaces"
	"taskflow/apps/tasks/dto"
	taskModels "taskflow/apps/tasks/models"

	"gorm.io/gorm"
)

type TaskDaoImpl struct {
	db *gorm.DB
}

func NewTaskDaoImpl(db *gorm.DB) daoInterfaces.ITaskDAO {
	return &TaskDaoImpl{db: db}
}

func (d *TaskDaoImpl) Create(task *taskModels.Task) error {
	return d.db.Create(task).Error
}

func (d *TaskDaoImpl) FindByID(id string) (*taskModels.Task, error) {
	var task taskModels.Task
	if err := d.db.Where("id = ?", id).First(&task).Error; err != nil {
		return nil, err
	}
	return &task, nil
}

func (d *TaskDaoImpl) ListByProject(projectID string, filters dto.TaskFilters, page, limit int) ([]taskModels.Task, int64, error) {
	var tasks []taskModels.Task
	var total int64

	baseDB := d.db.Model(&taskModels.Task{}).Where("project_id = ?", projectID)
	if filters.Status != nil {
		baseDB = baseDB.Where("status = ?", *filters.Status)
	}
	if filters.AssigneeID != nil {
		baseDB = baseDB.Where("assignee_id = ?", *filters.AssigneeID)
	}

	if err := baseDB.Session(&gorm.Session{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	err := baseDB.Session(&gorm.Session{}).
		Offset(offset).Limit(limit).
		Order("created_at ASC").
		Find(&tasks).Error

	return tasks, total, err
}

func (d *TaskDaoImpl) Update(task *taskModels.Task) error {
	return d.db.Save(task).Error
}

func (d *TaskDaoImpl) Delete(id string) error {
	return d.db.Where("id = ?", id).Delete(&taskModels.Task{}).Error
}
