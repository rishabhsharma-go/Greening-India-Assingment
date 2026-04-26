package middleware

import (
	"context"
	"taskflow/constants"
	"taskflow/pkg/logger"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func SetRequestContext() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		requestID := uuid.New().String()
		ctx.Set(constants.REQUEST_ID, requestID)

		reqCtx := context.WithValue(ctx.Request.Context(), constants.REQUEST_ID, requestID)
		ctx.Request = ctx.Request.WithContext(reqCtx)

		logger.GetLogger().Infof("[%s] incoming request: %s %s", requestID, ctx.Request.Method, ctx.Request.URL.Path)

		ctx.Next()
	}
}

func CurrentUserID(ctx *gin.Context) string {
	userID, _ := ctx.Get(constants.CURRENT_USER_ID)
	if id, ok := userID.(string); ok {
		return id
	}
	return ""
}

func CurrentUserEmail(ctx *gin.Context) string {
	email, _ := ctx.Get(constants.CURRENT_USER_EMAIL)
	if e, ok := email.(string); ok {
		return e
	}
	return ""
}
