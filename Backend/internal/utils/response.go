package utils

import "github.com/gin-gonic/gin"

func Error(c *gin.Context, status int, msg string, fields map[string]string) {
	res := gin.H{"error": msg}
	if fields != nil {
		res["fields"] = fields
	}
	c.JSON(status, res)
}