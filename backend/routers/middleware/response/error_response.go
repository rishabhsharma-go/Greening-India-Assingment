package response

import "github.com/gin-gonic/gin"

func ErrorResponse(c *gin.Context, errorMsg string, statusCode int) {
	c.JSON(statusCode, gin.H{"error": errorMsg})
	c.Abort()
}
