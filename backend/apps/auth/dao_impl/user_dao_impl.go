package daoImpl

import (
	authModels "taskflow/apps/auth/models"
	daoInterfaces "taskflow/apps/auth/dao_interfaces"

	"gorm.io/gorm"
)

type UserDaoImpl struct {
	db *gorm.DB
}

func NewUserDaoImpl(db *gorm.DB) daoInterfaces.IUserDAO {
	return &UserDaoImpl{db: db}
}

func (d *UserDaoImpl) CreateUser(user *authModels.User) error {
	return d.db.Create(user).Error
}

func (d *UserDaoImpl) FindByEmail(email string) (*authModels.User, error) {
	var user authModels.User
	if err := d.db.Where("email = ?", email).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (d *UserDaoImpl) FindByID(id string) (*authModels.User, error) {
	var user authModels.User
	if err := d.db.Where("id = ?", id).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}
