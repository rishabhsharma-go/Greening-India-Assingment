package models

type User struct {
	ID       string
	Name     string
	Email    string
	Password string
}

type Project struct {
	ID          string
	Name        string
	Description string
	OwnerID     string
}

type Task struct {
	ID         string
	Title      string
	Status     string
	Priority   string
	ProjectID  string
	AssigneeID *string
}