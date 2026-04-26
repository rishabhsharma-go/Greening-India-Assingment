package responseCollator

import (
	"time"
	authModels "taskflow/apps/auth/models"
)

type UserResponse struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"created_at"`
}

type AuthResponse struct {
	Token string       `json:"token"`
	User  UserResponse `json:"user"`
}

func PrepareAuthResponse(token string, user *authModels.User) AuthResponse {
	return AuthResponse{
		Token: token,
		User: UserResponse{
			ID:        user.ID,
			Name:      user.Name,
			Email:     user.Email,
			CreatedAt: user.CreatedAt,
		},
	}
}
