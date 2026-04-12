package handlers

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"taskflow/internal/db"
)

type Project struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

//
// ✅ GET /projects
//
func GetProjects(c *gin.Context) {
	rows, err := db.DB.Query(context.Background(),
		"SELECT id, name, description FROM projects",
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to fetch projects",
		})
		return
	}

	defer rows.Close()

	var projects []Project

	for rows.Next() {
		var p Project

		err := rows.Scan(&p.ID, &p.Name, &p.Description)
		if err != nil {
			c.JSON(500, gin.H{"error": "scan failed"})
			return
		}

		projects = append(projects, p)
	}

	c.JSON(http.StatusOK, projects)
}

//
// ✅ POST /projects
//
func CreateProject(c *gin.Context) {
	var req struct {
		Name        string `json:"name"`
		Description string `json:"description"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "invalid input"})
		return
	}

	if req.Name == "" {
		c.JSON(400, gin.H{"error": "name is required"})
		return
	}

	id := uuid.New().String()

	_, err := db.DB.Exec(context.Background(),
		"INSERT INTO projects (id, name, description) VALUES ($1, $2, $3)",
		id, req.Name, req.Description,
	)

	if err != nil {
		c.JSON(500, gin.H{"error": "failed to create project"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":          id,
		"name":        req.Name,
		"description": req.Description,
	})
}