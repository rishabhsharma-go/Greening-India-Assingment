package requests

type UpdateProjectRequest struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
}
