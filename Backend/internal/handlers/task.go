package handlers

import (
	"context"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"taskflow/internal/db"
)

func CreateTask(c *gin.Context) {
	projectID := c.Param("id")

	var req struct {
		Title string
	}

	c.BindJSON(&req)

	id := uuid.New().String()

	db.DB.Exec(context.Background(),
		"INSERT INTO tasks(id,title,project_id,status,priority) VALUES($1,$2,$3,'todo','medium')",
		id, req.Title, projectID,
	)

	c.JSON(201, gin.H{"id": id})
}