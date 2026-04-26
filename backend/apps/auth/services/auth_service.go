package services

import (
	"errors"
	"time"

	daoInterfaces "taskflow/apps/auth/dao_interfaces"
	authModels "taskflow/apps/auth/models"
	authRequests "taskflow/apps/auth/requests"
	responseCollator "taskflow/apps/auth/response_collator"
	serviceInterfaces "taskflow/apps/auth/service_interfaces"
	"taskflow/constants"
	customError "taskflow/pkg/custom_error"
	"taskflow/pkg/config"
	"taskflow/pkg/logger"

	"github.com/golang-jwt/jwt/v4"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type jwtClaims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

type AuthService struct {
	userDAO daoInterfaces.IUserDAO
	cfg     *config.Config
	logger  logger.ILogger
}

func NewAuthService(userDAO daoInterfaces.IUserDAO, cfg *config.Config, log logger.ILogger) serviceInterfaces.IAuthService {
	return &AuthService{userDAO: userDAO, cfg: cfg, logger: log}
}

func (s *AuthService) Register(req authRequests.RegisterRequest) responseCollator.AuthResponse {
	existing, err := s.userDAO.FindByEmail(req.Email)
	if err == nil && existing != nil {
		s.logger.Warnf("Register: email already taken: %s", req.Email)
		panic(customError.NewCustomError(
			errors.New(constants.ERR_EMAIL_TAKEN),
			constants.VALIDATION_ERROR_CODE,
			400,
		))
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
	if err != nil {
		s.logger.Errorf("Register: bcrypt error: %v", err)
		panic(customError.ErrInternal())
	}

	user := &authModels.User{
		ID:       uuid.New().String(),
		Name:     req.Name,
		Email:    req.Email,
		Password: string(hashed),
	}

	if err := s.userDAO.CreateUser(user); err != nil {
		s.logger.Errorf("Register: create user error: %v", err)
		panic(customError.ErrInternal())
	}

	token, err := generateToken(user, s.cfg.JWTSecret)
	if err != nil {
		s.logger.Errorf("Register: jwt sign error: %v", err)
		panic(customError.ErrInternal())
	}

	s.logger.Infof("Register: user registered successfully, email=%s", req.Email)
	return responseCollator.PrepareAuthResponse(token, user)
}

func (s *AuthService) Login(req authRequests.LoginRequest) responseCollator.AuthResponse {
	user, err := s.userDAO.FindByEmail(req.Email)
	if err != nil || user == nil {
		s.logger.Warnf("Login: user not found for email=%s", req.Email)
		panic(customError.NewCustomError(
			errors.New(constants.ERR_INVALID_CREDENTIALS),
			constants.UNAUTHORIZED_ERROR_CODE,
			401,
		))
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		s.logger.Warnf("Login: invalid password for email=%s", req.Email)
		panic(customError.NewCustomError(
			errors.New(constants.ERR_INVALID_CREDENTIALS),
			constants.UNAUTHORIZED_ERROR_CODE,
			401,
		))
	}

	token, err := generateToken(user, s.cfg.JWTSecret)
	if err != nil {
		s.logger.Errorf("Login: jwt sign error: %v", err)
		panic(customError.ErrInternal())
	}

	s.logger.Infof("Login: user authenticated successfully, email=%s", req.Email)
	return responseCollator.PrepareAuthResponse(token, user)
}

func generateToken(user *authModels.User, secret string) (string, error) {
	claims := jwtClaims{
		UserID: user.ID,
		Email:  user.Email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}
