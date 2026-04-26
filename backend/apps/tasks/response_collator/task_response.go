package responseCollator

import (
	taskModels "taskflow/apps/tasks/models"
	"time"
)

type TaskResponse struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	Description *string   `json:"description,omitempty"`
	Status      string    `json:"status"`
	Priority    string    `json:"priority"`
	ProjectID   string    `json:"project_id"`
	AssigneeID  *string   `json:"assignee_id,omitempty"`
	DueDate     *string   `json:"due_date,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type TaskListResponse struct {
	Tasks      []TaskResponse `json:"tasks"`
	TotalCount int            `json:"total_count,omitempty"`
	Page       int            `json:"page,omitempty"`
	PageSize   int            `json:"page_size,omitempty"`
	TotalPages int            `json:"total_pages,omitempty"`
}

func PrepareTaskResponse(t *taskModels.Task, requestID string) TaskResponse {
	var dueDateStr *string
	if t.DueDate != nil {
		s := t.DueDate.Format("2006-01-02")
		dueDateStr = &s
	}
	return TaskResponse{
		ID:          t.ID,
		Title:       t.Title,
		Description: t.Description,
		Status:      t.Status,
		Priority:    t.Priority,
		ProjectID:   t.ProjectID,
		AssigneeID:  t.AssigneeID,
		DueDate:     dueDateStr,
		CreatedAt:   t.CreatedAt,
		UpdatedAt:   t.UpdatedAt,
	}
}

func PrepareTaskListResponse(tasks []taskModels.Task, page, pageSize int, total int64, requestID string) TaskListResponse {
	responses := make([]TaskResponse, len(tasks))
	for i := range tasks {
		responses[i] = PrepareTaskResponse(&tasks[i], requestID)
	}

	totalPages := 0
	if pageSize > 0 {
		totalPages = int(total) / pageSize
		if int(total)%pageSize != 0 {
			totalPages++
		}
	}

	return TaskListResponse{
		Tasks:      responses,
		TotalCount: int(total),
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	}
}
