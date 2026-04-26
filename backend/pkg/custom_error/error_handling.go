package customError

import (
	"fmt"
	"net/http"
	"taskflow/constants"
	"taskflow/pkg/logger"

	"github.com/gin-gonic/gin"
)

func HandleErrorPanics(ctx *gin.Context) {
	if err := recover(); err != nil {
		requestID, _ := ctx.Request.Context().Value(constants.REQUEST_ID).(string)

		if fmt.Sprintf("%T", err) == constants.CUSTOM_ERROR_STRING {
			customErrorObj := err.(*CustomError)
			logger.GetLogger().Warnf("[%s] request error: status=%d error=%s",
				requestID, customErrorObj.GetHttpStatusCode(), customErrorObj.GetErrorField().Error())

			if customErrorObj.GetFields() != nil {
				ctx.JSON(customErrorObj.GetHttpStatusCode(), gin.H{
					"error":  customErrorObj.GetErrorField().Error(),
					"fields": customErrorObj.GetFields(),
				})
			} else {
				ctx.JSON(customErrorObj.GetHttpStatusCode(), gin.H{
					"error": customErrorObj.GetErrorField().Error(),
				})
			}
		} else {
			logger.GetLogger().Errorf("[%s] panic recovered: %v", requestID, err)
			ctx.JSON(http.StatusInternalServerError, gin.H{
				"error": constants.ERR_INTERNAL,
			})
		}
		ctx.Abort()
	}
}

func HandleErrorPanicsInContext() {
	if err := recover(); err != nil {
		if customErrorObj, ok := err.(*CustomError); ok {
			logger.GetLogger().Errorf("context panic: %v", customErrorObj.GetErrorField().Error())
		} else {
			logger.GetLogger().Errorf("context panic: %v", err)
		}
	}
}
