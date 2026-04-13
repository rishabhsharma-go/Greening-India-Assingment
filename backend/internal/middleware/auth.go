package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/swaroop/taskflow/internal/auth"
)

type contextKey string

// ClaimsKey is the context key for the authenticated user's JWT claims.
const ClaimsKey contextKey = "claims"

// Authenticate validates the Bearer token and injects claims into the request context.
// Returns 401 if the header is absent or the token is invalid/expired.
func Authenticate(secret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			if header == "" || !strings.HasPrefix(header, "Bearer ") {
				http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
				return
			}

			tokenStr := strings.TrimPrefix(header, "Bearer ")
			claims, err := auth.ValidateToken(tokenStr, secret)
			if err != nil {
				http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), ClaimsKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// ClaimsFrom extracts the authenticated user's claims from the request context.
// Panics if called outside the Authenticate middleware — by design.
func ClaimsFrom(r *http.Request) *auth.Claims {
	claims, ok := r.Context().Value(ClaimsKey).(*auth.Claims)
	if !ok || claims == nil {
		panic("ClaimsFrom called outside authenticated route")
	}
	return claims
}
