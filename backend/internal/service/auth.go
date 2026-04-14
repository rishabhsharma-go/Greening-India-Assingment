package service

import (
	"context"
	"errors"
	"time"

	"github.com/dhruva/taskflow/backend/internal/domain"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type AuthResult struct {
	Token string
	User  *domain.User
}

type RegisterParams struct {
	Name     string
	Email    string
	Password string
}

type LoginParams struct {
	Email    string
	Password string
}

type AuthService struct {
	users     domain.UserRepository
	jwtSecret []byte
}

func NewAuthService(users domain.UserRepository, jwtSecret string) *AuthService {
	return &AuthService{
		users:     users,
		jwtSecret: []byte(jwtSecret),
	}
}

func (s *AuthService) Register(ctx context.Context, params RegisterParams) (*AuthResult, error) {
	existing, err := s.users.GetByEmail(ctx, params.Email)
	if err != nil {
		if !errors.Is(err, domain.ErrNotFound) {
			return nil, err
		}
	} else if existing != nil {
		return nil, domain.ErrEmailExists
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(params.Password), 12)
	if err != nil {
		return nil, err
	}

	user, err := s.users.Create(ctx, domain.CreateUserParams{
		Name:     params.Name,
		Email:    params.Email,
		Password: string(hash),
	})
	if err != nil {
		return nil, err
	}

	token, err := s.generateToken(user)
	if err != nil {
		return nil, err
	}

	return &AuthResult{Token: token, User: user}, nil
}

func (s *AuthService) Login(ctx context.Context, params LoginParams) (*AuthResult, error) {
	user, err := s.users.GetByEmail(ctx, params.Email)
	if err != nil {
		return nil, domain.ErrInvalidCredentials
	}

	if err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(params.Password)); err != nil {
		return nil, domain.ErrInvalidCredentials
	}

	token, err := s.generateToken(user)
	if err != nil {
		return nil, err
	}

	return &AuthResult{Token: token, User: user}, nil
}

func (s *AuthService) ValidateToken(tokenStr string) (string, string, error) {
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return s.jwtSecret, nil
	})
	if err != nil || !token.Valid {
		return "", "", domain.ErrInvalidCredentials
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", "", domain.ErrInvalidCredentials
	}

	userID, _ := claims["user_id"].(string)
	email, _ := claims["email"].(string)
	if userID == "" || email == "" {
		return "", "", domain.ErrInvalidCredentials
	}

	return userID, email, nil
}

func (s *AuthService) generateToken(user *domain.User) (string, error) {
	claims := jwt.MapClaims{
		"user_id": user.ID,
		"email":   user.Email,
		"exp":     time.Now().Add(24 * time.Hour).Unix(),
		"iat":     time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}
