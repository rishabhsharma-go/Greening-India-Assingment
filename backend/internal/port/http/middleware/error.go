package middleware

import (
	"errors"
	"log/slog"
	"net/http"

	apperr "github.com/dhruva/taskflow/backend/internal/infra/errors"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

func ErrorHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		if len(c.Errors) == 0 {
			return
		}

		err := c.Errors.Last().Err

		var appErr *apperr.AppError
		if errors.As(err, &appErr) {
			if appErr.Err != nil {
				slog.Error("app error",
					"method", c.Request.Method,
					"path", c.Request.URL.Path,
					"status", appErr.Code,
					"error", appErr.Err,
				)
			}
			c.JSON(appErr.Code, gin.H{"error": appErr.Message})
			return
		}

		var validationErrs validator.ValidationErrors
		if errors.As(err, &validationErrs) {
			fields := make(gin.H, len(validationErrs))
			for _, fe := range validationErrs {
				fields[fe.Field()] = formatValidationField(fe)
			}
			c.JSON(http.StatusBadRequest, gin.H{"error": "validation failed", "fields": fields})
			return
		}

		var serverErr *apperr.ServerError
		if errors.As(err, &serverErr) {
			slog.Error("server error",
				"method", c.Request.Method,
				"path", c.Request.URL.Path,
				"message", serverErr.Message,
				"error", serverErr.Err,
			)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
			return
		}

		slog.Error("unhandled error",
			"method", c.Request.Method,
			"path", c.Request.URL.Path,
			"error", err,
		)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
	}
}

func formatValidationField(fe validator.FieldError) string {
	switch fe.Tag() {
	case "required":
		return "is required"
	case "email":
		return "must be a valid email"
	case "min":
		return "must be at least " + fe.Param() + " characters"
	case "max":
		return "must be at most " + fe.Param() + " characters"
	case "oneof":
		return "must be one of: " + fe.Param()
	default:
		return "failed on " + fe.Tag() + " validation"
	}
}
