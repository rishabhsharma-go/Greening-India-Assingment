package requests

type CreateTaskRequest struct {
	Title       string  `json:"title"       validate:"required"`
	Description *string `json:"description"`
	Status      string  `json:"status"      validate:"omitempty,oneof=todo in_progress done"`
	Priority    string  `json:"priority"    validate:"omitempty,oneof=low medium high"`
	AssigneeID  *string `json:"assignee_id" validate:"omitempty,uuid"`
	DueDate     *string `json:"due_date"`
}
