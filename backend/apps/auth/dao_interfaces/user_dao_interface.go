package daoInterfaces

import authModels "taskflow/apps/auth/models"

type IUserDAO interface {
	CreateUser(user *authModels.User) error
	FindByEmail(email string) (*authModels.User, error)
	FindByID(id string) (*authModels.User, error)
}
