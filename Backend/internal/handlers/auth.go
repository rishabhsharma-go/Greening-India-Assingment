package handlers

import (
	"context"
	"net/http"

	"taskflow/internal/db"
	"taskflow/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func Register(c *gin.Context) {
	var req struct {
		Name     string
		Email    string
		Password string
	}

	if c.BindJSON(&req) != nil {
		c.JSON(400, gin.H{"error": "validation failed"})
		return
	}

	hash, _ := utils.HashPassword(req.Password)
	id := uuid.New().String()

	_, err := db.DB.Exec(context.Background(),
		"INSERT INTO users(id,name,email,password) VALUES($1,$2,$3,$4)",
		id, req.Name, req.Email, hash,
	)

	if err != nil {
		c.JSON(400, gin.H{"error": "email exists"})
		return
	}

	c.JSON(201, gin.H{"id": id})
}

func Login(c *gin.Context) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, 400, "validation failed", nil)
		return
	}

	var id, hash string

	err := db.DB.QueryRow(context.Background(),
		"SELECT id,password FROM users WHERE email=$1",
		req.Email,
	).Scan(&id, &hash)

	if err != nil || !utils.CheckPassword(hash, req.Password) {
		utils.Error(c, 401, "invalid credentials", nil)
		return
	}

	cfg := config.Load()

	token, err := utils.GenerateToken(id, req.Email, cfg.JWTSecret)
	if err != nil {
		utils.Error(c, 500, "token generation failed", nil)
		return
	}

	c.JSON(200, gin.H{
		"token": token,
		"user": gin.H{
			"id":    id,
			"email": req.Email,
		},
	})
}