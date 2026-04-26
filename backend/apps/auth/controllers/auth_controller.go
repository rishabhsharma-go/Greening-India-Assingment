package controllers

import (
	"errors"
	"net/http"
	"strings"

	authRequests "taskflow/apps/auth/requests"
	serviceInterfaces "taskflow/apps/auth/service_interfaces"
	"taskflow/apps/common/validators"
	"taskflow/constants"
	customError "taskflow/pkg/custom_error"
	"taskflow/pkg/logger"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

type AuthController struct {
	authService serviceInterfaces.IAuthService
	logger      logger.ILogger
}

func NewAuthController(authService serviceInterfaces.IAuthService, log logger.ILogger) *AuthController {
	return &AuthController{authService: authService, logger: log}
}

func (c *AuthController) Register(ctx *gin.Context) {
	defer customError.HandleErrorPanics(ctx)
	requestID, _ := ctx.Request.Context().Value(constants.REQUEST_ID).(string)
	c.logger.Infof("[%s] Register: request received", requestID)

	var req authRequests.RegisterRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		c.logger.Warnf("[%s] Register: invalid JSON body", requestID)
		panic(customError.NewCustomError(
			errors.New(constants.ERR_INVALID_JSON),
			constants.VALIDATION_ERROR_CODE,
			400,
		))
	}

	v := validator.New()
	if err := v.Struct(req); err != nil {
		fields := make(map[string]string)
		for _, fe := range err.(validator.ValidationErrors) {
			fields[strings.ToLower(fe.Field())] = validators.ValidationMessage(fe)
		}
		c.logger.Warnf("[%s] Register: validation failed, fields=%v", requestID, fields)
		panic(customError.NewValidationError(errors.New(constants.ERR_VALIDATION_FAILED), fields))
	}

	response := c.authService.Register(req)
	c.logger.Infof("[%s] Register: success, email=%s", requestID, req.Email)
	ctx.JSON(http.StatusCreated, response)
}

func (c *AuthController) Login(ctx *gin.Context) {
	defer customError.HandleErrorPanics(ctx)
	requestID, _ := ctx.Request.Context().Value(constants.REQUEST_ID).(string)
	c.logger.Infof("[%s] Login: request received", requestID)

	var req authRequests.LoginRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		c.logger.Warnf("[%s] Login: invalid JSON body", requestID)
		panic(customError.NewCustomError(
			errors.New(constants.ERR_INVALID_JSON),
			constants.VALIDATION_ERROR_CODE,
			400,
		))
	}

	v := validator.New()
	if err := v.Struct(req); err != nil {
		fields := make(map[string]string)
		for _, fe := range err.(validator.ValidationErrors) {
			fields[strings.ToLower(fe.Field())] = validators.ValidationMessage(fe)
		}
		c.logger.Warnf("[%s] Login: validation failed, fields=%v", requestID, fields)
		panic(customError.NewValidationError(errors.New(constants.ERR_VALIDATION_FAILED), fields))
	}

	response := c.authService.Login(req)
	c.logger.Infof("[%s] Login: success, email=%s", requestID, req.Email)
	ctx.JSON(http.StatusOK, response)
}
