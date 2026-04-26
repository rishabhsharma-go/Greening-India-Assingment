package responseCollator

import (
	projectModels "taskflow/apps/projects/models"
	taskModels "taskflow/apps/tasks/models"
	taskResponseCollator "taskflow/apps/tasks/response_collator"
	"time"
)

type ProjectResponse struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description *string   `json:"description,omitempty"`
	OwnerID     string    `json:"owner_id"`
	CreatedAt   time.Time `json:"created_at"`
}

type ProjectListResponse struct {
	Projects   []ProjectResponse `json:"projects"`
	TotalCount int               `json:"total_count,omitempty"`
	Page       int               `json:"page,omitempty"`
	PageSize   int               `json:"page_size,omitempty"`
	TotalPages int               `json:"total_pages,omitempty"`
}

type ProjectDetailResponse struct {
	ID          string                              `json:"id"`
	Name        string                              `json:"name"`
	Description *string                             `json:"description,omitempty"`
	OwnerID     string                              `json:"owner_id"`
	CreatedAt   time.Time                           `json:"created_at"`
	Tasks       []taskResponseCollator.TaskResponse `json:"tasks"`
}

type ProjectStatsResponse struct {
	ByStatus   map[string]int64 `json:"by_status"`
	ByAssignee map[string]int64 `json:"by_assignee"`
}

func PrepareProjectResponse(p projectModels.Project, requestID string) ProjectResponse {
	return ProjectResponse{
		ID:          p.ID,
		Name:        p.Name,
		Description: p.Description,
		OwnerID:     p.OwnerID,
		CreatedAt:   p.CreatedAt,
	}
}

func PrepareProjectListResponse(projects []projectModels.Project, page, pageSize int, total int64, requestID string) ProjectListResponse {
	responses := make([]ProjectResponse, len(projects))
	for i := range projects {
		responses[i] = PrepareProjectResponse(projects[i], requestID)
	}

	totalPages := 0
	if pageSize > 0 {
		totalPages = int(total) / pageSize
		if int(total)%pageSize != 0 {
			totalPages++
		}
	}

	return ProjectListResponse{
		Projects:   responses,
		TotalCount: int(total),
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	}
}

func PrepareProjectDetailResponse(p projectModels.Project, tasks []taskModels.Task, requestID string) ProjectDetailResponse {
	taskResponses := make([]taskResponseCollator.TaskResponse, len(tasks))
	for i := range tasks {
		taskResponses[i] = taskResponseCollator.PrepareTaskResponse(&tasks[i], requestID)
	}

	if taskResponses == nil {
		taskResponses = []taskResponseCollator.TaskResponse{}
	}
	return ProjectDetailResponse{
		ID:          p.ID,
		Name:        p.Name,
		Description: p.Description,
		OwnerID:     p.OwnerID,
		CreatedAt:   p.CreatedAt,
		Tasks:       taskResponses,
	}
}

func PrepareProjectStatsResponse(tasks []taskModels.Task, requestID string) ProjectStatsResponse {
	byStatus := make(map[string]int64)
	byAssignee := make(map[string]int64)

	for _, t := range tasks {
		byStatus[t.Status]++
		if t.AssigneeID != nil {
			byAssignee[*t.AssigneeID]++
		}
	}

	return ProjectStatsResponse{
		ByStatus:   byStatus,
		ByAssignee: byAssignee,
	}
}
