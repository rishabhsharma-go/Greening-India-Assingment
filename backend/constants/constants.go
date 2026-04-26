package constants

const (
	// Task statuses
	StatusTodo       = "todo"
	StatusInProgress = "in_progress"
	StatusDone       = "done"

	// Task priorities
	PriorityLow    = "low"
	PriorityMedium = "medium"
	PriorityHigh   = "high"

	// Gin context keys
	REQUEST_ID          = "request_id"
	CURRENT_USER_ID     = "current_user_id"
	CURRENT_USER_EMAIL  = "current_user_email"

	// Pagination defaults
	DEFAULT_PAGE  = 1
	DEFAULT_LIMIT = 20
	MAX_LIMIT     = 100
)
