package dependencyInjection

import (
	authControllers "taskflow/apps/auth/controllers"
	authDaoImpl "taskflow/apps/auth/dao_impl"
	authDaoInterfaces "taskflow/apps/auth/dao_interfaces"
	authServiceInterfaces "taskflow/apps/auth/service_interfaces"
	authServices "taskflow/apps/auth/services"

	projectControllers "taskflow/apps/projects/controllers"
	projectDaoImpl "taskflow/apps/projects/dao_impl"
	projectDaoInterfaces "taskflow/apps/projects/dao_interfaces"
	projectServiceInterfaces "taskflow/apps/projects/service_interfaces"
	projectServices "taskflow/apps/projects/services"

	taskControllers "taskflow/apps/tasks/controllers"
	taskDaoImpl "taskflow/apps/tasks/dao_impl"
	taskDaoInterfaces "taskflow/apps/tasks/dao_interfaces"
	taskServiceInterfaces "taskflow/apps/tasks/service_interfaces"
	taskServices "taskflow/apps/tasks/services"

	"taskflow/pkg/config"
	"taskflow/pkg/database"
	"taskflow/pkg/logger"

	"go.uber.org/fx"
)

var configModule = fx.Options(
	fx.Provide(config.LoadConfig),
)

var loggerModule = fx.Options(
	fx.Provide(logger.NewLogger),
)

var databaseModule = fx.Options(
	fx.Provide(database.NewDatabase),
)

var authModule = fx.Options(
	fx.Provide(
		fx.Annotate(authDaoImpl.NewUserDaoImpl, fx.As(new(authDaoInterfaces.IUserDAO))),
		fx.Annotate(authServices.NewAuthService, fx.As(new(authServiceInterfaces.IAuthService))),
		authControllers.NewAuthController,
	),
)

var projectModule = fx.Options(
	fx.Provide(
		fx.Annotate(projectDaoImpl.NewProjectDaoImpl, fx.As(new(projectDaoInterfaces.IProjectDAO))),
		fx.Annotate(projectServices.NewProjectService, fx.As(new(projectServiceInterfaces.IProjectService))),
		projectControllers.NewProjectController,
	),
)

var taskModule = fx.Options(
	fx.Provide(
		fx.Annotate(taskDaoImpl.NewTaskDaoImpl, fx.As(new(taskDaoInterfaces.ITaskDAO))),
		fx.Annotate(taskServices.NewTaskService, fx.As(new(taskServiceInterfaces.ITaskService))),
		taskControllers.NewTaskController,
	),
)
