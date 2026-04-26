package serviceInterfaces

import (
	authRequests "taskflow/apps/auth/requests"
	responseCollator "taskflow/apps/auth/response_collator"
)

type IAuthService interface {
	Register(req authRequests.RegisterRequest) responseCollator.AuthResponse
	Login(req authRequests.LoginRequest) responseCollator.AuthResponse
}
