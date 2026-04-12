package handlers

import (
	"database/sql"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/taskflow/backend/internal/middleware"
	"github.com/taskflow/backend/internal/models"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	db         *sqlx.DB
	jwtSecret  string
	jwtExpiry  int
	bcryptCost int
}

func NewAuthHandler(db *sqlx.DB, jwtSecret string, jwtExpiry int, bcryptCost int) *AuthHandler {
	return &AuthHandler{
		db:         db,
		jwtSecret:  jwtSecret,
		jwtExpiry:  jwtExpiry,
		bcryptCost: bcryptCost,
	}
}

type RegisterRequest struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type AuthResponse struct {
	Token string              `json:"token"`
	User  models.UserResponse `json:"user"`
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":  "validation failed",
			"fields": parseValidationErrors(err),
		})
		return
	}

	// Normalize email
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	// Check if user already exists
	var existingUser models.User
	err := h.db.Get(&existingUser, "SELECT id FROM users WHERE email = $1", req.Email)
	if err == nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":  "validation failed",
			"fields": map[string]string{"email": "already registered"},
		})
		return
	}
	if err != sql.ErrNoRows {
		slog.Error("Database error checking existing user", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), h.bcryptCost)
	if err != nil {
		slog.Error("Failed to hash password", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	// Create user
	user := models.User{
		ID:        uuid.New(),
		Name:      strings.TrimSpace(req.Name),
		Email:     req.Email,
		Password:  string(hashedPassword),
		CreatedAt: time.Now().UTC(),
	}

	_, err = h.db.Exec(
		"INSERT INTO users (id, name, email, password, created_at) VALUES ($1, $2, $3, $4, $5)",
		user.ID, user.Name, user.Email, user.Password, user.CreatedAt,
	)
	if err != nil {
		slog.Error("Failed to create user", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	// Generate JWT
	token, err := h.generateToken(user)
	if err != nil {
		slog.Error("Failed to generate token", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	slog.Info("User registered successfully", "user_id", user.ID, "email", user.Email)

	c.JSON(http.StatusCreated, AuthResponse{
		Token: token,
		User:  user.ToResponse(),
	})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":  "validation failed",
			"fields": parseValidationErrors(err),
		})
		return
	}

	// Normalize email
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	// Find user
	var user models.User
	err := h.db.Get(&user, "SELECT * FROM users WHERE email = $1", req.Email)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}
	if err != nil {
		slog.Error("Database error finding user", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	// Generate JWT
	token, err := h.generateToken(user)
	if err != nil {
		slog.Error("Failed to generate token", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	slog.Info("User logged in successfully", "user_id", user.ID, "email", user.Email)

	c.JSON(http.StatusOK, AuthResponse{
		Token: token,
		User:  user.ToResponse(),
	})
}

func (h *AuthHandler) generateToken(user models.User) (string, error) {
	claims := middleware.Claims{
		UserID: user.ID,
		Email:  user.Email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(h.jwtExpiry) * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(h.jwtSecret))
}

func parseValidationErrors(err error) map[string]string {
	fields := make(map[string]string)
	errStr := err.Error()
	
	// Simple parsing - in production you'd use validator.ValidationErrors
	if strings.Contains(errStr, "'Name'") || strings.Contains(errStr, "'name'") {
		fields["name"] = "is required"
	}
	if strings.Contains(errStr, "'Email'") || strings.Contains(errStr, "'email'") {
		if strings.Contains(errStr, "email") {
			fields["email"] = "must be a valid email"
		} else {
			fields["email"] = "is required"
		}
	}
	if strings.Contains(errStr, "'Password'") || strings.Contains(errStr, "'password'") {
		if strings.Contains(errStr, "min") {
			fields["password"] = "must be at least 6 characters"
		} else {
			fields["password"] = "is required"
		}
	}
	
	if len(fields) == 0 {
		fields["request"] = "invalid request body"
	}
	
	return fields
}

// ListUsers returns all users (for assignment dropdown)
func (h *AuthHandler) ListUsers(c *gin.Context) {
	var users []models.User
	err := h.db.Select(&users, "SELECT id, name, email, created_at FROM users ORDER BY name")
	if err != nil {
		slog.Error("Failed to fetch users", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	// Convert to response format (without password)
	response := make([]models.UserResponse, len(users))
	for i, u := range users {
		response[i] = u.ToResponse()
	}

	c.JSON(http.StatusOK, gin.H{"users": response})
}
