package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"golang.org/x/crypto/bcrypt"

	"github.com/swaroop/taskflow/internal/auth"
	"github.com/swaroop/taskflow/internal/database"
)

// AuthHandler groups the authentication endpoints.
type AuthHandler struct {
	db     *database.DB
	secret string
	expiry int
	log    *slog.Logger
}

// NewAuthHandler wires up the handler's dependencies.
func NewAuthHandler(db *database.DB, secret string, expiry int, log *slog.Logger) *AuthHandler {
	return &AuthHandler{db: db, secret: secret, expiry: expiry, log: log}
}

// Register handles POST /auth/register
//
// Request:  {"name":"...", "email":"...", "password":"..."}
// Response: 201 {"token":"<jwt>", "user":{...}}
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name     string `json:"name"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	fields := make(map[string]string)
	req.Name = strings.TrimSpace(req.Name)
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))

	if req.Name == "" {
		fields["name"] = "is required"
	}
	if req.Email == "" {
		fields["email"] = "is required"
	} else if !strings.Contains(req.Email, "@") {
		fields["email"] = "is not a valid email"
	}
	if len(req.Password) < 8 {
		fields["password"] = "must be at least 8 characters"
	}
	if len(fields) > 0 {
		respondValidationError(w, fields)
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
	if err != nil {
		h.log.Error("bcrypt failed", "error", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	user, err := h.db.CreateUser(r.Context(), req.Name, req.Email, string(hash))
	if err != nil {
		if errors.Is(err, database.ErrDuplicateEmail) {
			respondValidationError(w, map[string]string{"email": "already in use"})
			return
		}
		h.log.Error("create user", "error", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	token, err := auth.GenerateToken(user.ID, user.Email, h.secret, h.expiry)
	if err != nil {
		h.log.Error("generate token", "error", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	respondJSON(w, http.StatusCreated, map[string]interface{}{
		"token": token,
		"user":  user,
	})
}

// Login handles POST /auth/login
//
// Request:  {"email":"...", "password":"..."}
// Response: 200 {"token":"<jwt>", "user":{...}}
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	fields := make(map[string]string)
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))

	if req.Email == "" {
		fields["email"] = "is required"
	}
	if req.Password == "" {
		fields["password"] = "is required"
	}
	if len(fields) > 0 {
		respondValidationError(w, fields)
		return
	}

	user, hash, err := h.db.GetUserByEmail(r.Context(), req.Email)
	if err != nil {
		// Timing-safe: always do the bcrypt work even for unknown emails
		_ = bcrypt.CompareHashAndPassword([]byte("$2a$12$dummyhashfortimingatk"), []byte(req.Password))
		respondError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(req.Password)); err != nil {
		respondError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	token, err := auth.GenerateToken(user.ID, user.Email, h.secret, h.expiry)
	if err != nil {
		h.log.Error("generate token", "error", err)
		respondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"token": token,
		"user":  user,
	})
}
