package util

import (
	apperr "github.com/dhruva/taskflow/backend/internal/infra/errors"

	"github.com/gin-gonic/gin"
)

func GetUserID(c *gin.Context) (string, bool) {
	userID, exists := c.Get("userID")
	if !exists {
		_ = c.Error(apperr.Server("user_id not found in context", nil))
		c.Abort()
		return "", false
	}
	id, ok := userID.(string)
	if !ok {
		_ = c.Error(apperr.Server("invalid user_id type in context", nil))
		c.Abort()
		return "", false
	}
	return id, true
}

func GetUserEmail(c *gin.Context) (string, bool) {
	email, exists := c.Get("userEmail")
	if !exists {
		_ = c.Error(apperr.Server("user_email not found in context", nil))
		c.Abort()
		return "", false
	}
	e, ok := email.(string)
	if !ok {
		_ = c.Error(apperr.Server("invalid user_email type in context", nil))
		c.Abort()
		return "", false
	}
	return e, true
}
