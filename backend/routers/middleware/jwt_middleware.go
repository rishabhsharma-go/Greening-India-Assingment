package middleware

import (
	"net/http"
	"strings"
	"taskflow/constants"
	"taskflow/pkg/config"
	"taskflow/pkg/logger"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v4"
)

type Claims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

func JWTMiddleware(cfg *config.Config, log logger.ILogger) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		requestID, _ := ctx.Request.Context().Value(constants.REQUEST_ID).(string)

		authHeader := ctx.GetHeader("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			log.Warnf("[%s] JWTMiddleware: missing or malformed authorization header", requestID)
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": constants.ERR_UNAUTHORIZED})
			return
		}

		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")

		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(cfg.JWTSecret), nil
		})

		if err != nil || !token.Valid {
			log.Warnf("[%s] JWTMiddleware: token validation failed: %v", requestID, err)
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": constants.ERR_UNAUTHORIZED})
			return
		}

		ctx.Set(constants.CURRENT_USER_ID, claims.UserID)
		ctx.Set(constants.CURRENT_USER_EMAIL, claims.Email)
		ctx.Next()
	}
}
