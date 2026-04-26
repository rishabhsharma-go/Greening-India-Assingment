package requests

type CreateProjectRequest struct {
	Name        string  `json:"name"        validate:"required"`
	Description *string `json:"description"`
}
