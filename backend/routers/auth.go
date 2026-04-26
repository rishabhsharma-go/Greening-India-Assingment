package routers

import (
	authControllers "taskflow/apps/auth/controllers"

	"github.com/gin-gonic/gin"
)

func RegisterAuthRoutes(rg *gin.RouterGroup, ctrl *authControllers.AuthController) {
	rg.POST("/register", ctrl.Register)
	rg.POST("/login", ctrl.Login)
}
