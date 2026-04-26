package routers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func RegisterHealthRoutes(rg *gin.RouterGroup) {
	rg.GET("/health", func(ctx *gin.Context) {
		ctx.JSON(http.StatusOK, gin.H{"status": "ok"})
	})
}
