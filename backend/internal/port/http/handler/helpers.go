package handler

import (
	apperr "github.com/dhruva/taskflow/backend/internal/infra/errors"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func abort(c *gin.Context, err error) {
	_ = c.Error(err)
	c.Abort()
}

func parseUUID(c *gin.Context, param string) (string, error) {
	id := c.Param(param)
	if _, err := uuid.Parse(id); err != nil {
		abort(c, apperr.BadRequest("invalid "+param))
		return "", err
	}
	return id, nil
}
