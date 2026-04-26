package integration

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	authControllers "taskflow/apps/auth/controllers"
	authDaoImpl "taskflow/apps/auth/dao_impl"
	authServices "taskflow/apps/auth/services"
	projectControllers "taskflow/apps/projects/controllers"
	projectDaoImpl "taskflow/apps/projects/dao_impl"
	projectServices "taskflow/apps/projects/services"
	taskControllers "taskflow/apps/tasks/controllers"
	taskDaoImpl "taskflow/apps/tasks/dao_impl"
	taskServices "taskflow/apps/tasks/services"
	"taskflow/pkg/config"
	"taskflow/pkg/database"
	"taskflow/pkg/logger"
	"taskflow/routers"
)

// Shared state across tests (tests run in declaration order)
var (
	testRouter    *gin.Engine
	testDB        *gorm.DB
	userOneToken  string
	userTwoToken  string
	testProjectID string
	testTaskID    string
)

func TestMain(m *testing.M) {
	gin.SetMode(gin.TestMode)

	// Navigate to backend root so Viper can find .env
	if err := os.Chdir("../../"); err != nil {
		log.Printf("could not chdir to backend root: %v (continuing with env vars)", err)
	}

	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	log := logger.NewLogger(cfg)

	db, err := database.NewDatabase(cfg, log)
	if err != nil {
		fmt.Printf("SKIP: database unavailable: %v\n", err)
		os.Exit(0)
	}
	testDB = db

	// Wire dependencies manually (no FX in tests)
	userDAO := authDaoImpl.NewUserDaoImpl(db)
	authSvc := authServices.NewAuthService(userDAO, cfg, log)
	authCtrl := authControllers.NewAuthController(authSvc, log)

	projectDAO := projectDaoImpl.NewProjectDaoImpl(db)
	taskDAO := taskDaoImpl.NewTaskDaoImpl(db)
	projectSvc := projectServices.NewProjectService(projectDAO, taskDAO, log)
	projectCtrl := projectControllers.NewProjectController(projectSvc, log)

	taskSvc := taskServices.NewTaskService(taskDAO, projectDAO, log)
	taskCtrl := taskControllers.NewTaskController(taskSvc, log)

	testRouter = routers.NewRouter(cfg, log, authCtrl, projectCtrl, taskCtrl)

	code := m.Run()

	// Cleanup integration test data
	testDB.Exec("DELETE FROM tasks WHERE title LIKE 'INT:%'")
	testDB.Exec("DELETE FROM projects WHERE name LIKE 'INT:%'")
	testDB.Exec("DELETE FROM users WHERE email LIKE '%@int.test'")

	os.Exit(code)
}

// ── helpers ──────────────────────────────────────────────────────────────────

func do(method, path, token string, body interface{}) *httptest.ResponseRecorder {
	var reqBody *bytes.Buffer
	if body != nil {
		b, _ := json.Marshal(body)
		reqBody = bytes.NewBuffer(b)
	} else {
		reqBody = bytes.NewBuffer(nil)
	}

	req, _ := http.NewRequest(method, path, reqBody)
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	w := httptest.NewRecorder()
	testRouter.ServeHTTP(w, req)
	return w
}

func parseBody(w *httptest.ResponseRecorder) map[string]interface{} {
	var m map[string]interface{}
	_ = json.Unmarshal(w.Body.Bytes(), &m)
	return m
}

// ── auth tests ────────────────────────────────────────────────────────────────

func TestAuth_Register_UserOne(t *testing.T) {
	w := do("POST", "/auth/register", "", map[string]interface{}{
		"name":     "Int User One",
		"email":    "one@int.test",
		"password": "password123",
	})
	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}
	body := parseBody(w)
	token, ok := body["token"].(string)
	if !ok || token == "" {
		t.Fatal("expected token in response")
	}
	userOneToken = token
}

func TestAuth_Register_UserTwo(t *testing.T) {
	w := do("POST", "/auth/register", "", map[string]interface{}{
		"name":     "Int User Two",
		"email":    "two@int.test",
		"password": "password123",
	})
	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}
	body := parseBody(w)
	token, ok := body["token"].(string)
	if !ok || token == "" {
		t.Fatal("expected token in response")
	}
	userTwoToken = token
}

func TestAuth_Register_DuplicateEmail(t *testing.T) {
	w := do("POST", "/auth/register", "", map[string]interface{}{
		"name":     "Duplicate",
		"email":    "one@int.test",
		"password": "password123",
	})
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

func TestAuth_Register_ValidationErrors(t *testing.T) {
	w := do("POST", "/auth/register", "", map[string]interface{}{
		"name":     "",
		"email":    "not-an-email",
		"password": "short",
	})
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
	body := parseBody(w)
	fields, ok := body["fields"].(map[string]interface{})
	if !ok || len(fields) == 0 {
		t.Fatalf("expected fields map in response, got: %s", w.Body.String())
	}
}

func TestAuth_Login_Success(t *testing.T) {
	w := do("POST", "/auth/login", "", map[string]interface{}{
		"email":    "one@int.test",
		"password": "password123",
	})
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	body := parseBody(w)
	if _, ok := body["token"]; !ok {
		t.Fatal("expected token in login response")
	}
}

func TestAuth_Login_InvalidCredentials(t *testing.T) {
	w := do("POST", "/auth/login", "", map[string]interface{}{
		"email":    "one@int.test",
		"password": "wrongpassword",
	})
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d: %s", w.Code, w.Body.String())
	}
}

func TestAuth_Protected_NoToken(t *testing.T) {
	w := do("GET", "/projects", "", nil)
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

// ── project tests ─────────────────────────────────────────────────────────────

func TestProjects_Create(t *testing.T) {
	if userOneToken == "" {
		t.Skip("userOneToken not set")
	}
	desc := "Integration test project"
	w := do("POST", "/projects", userOneToken, map[string]interface{}{
		"name":        "INT: Test Project",
		"description": desc,
	})
	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}
	body := parseBody(w)
	id, ok := body["id"].(string)
	if !ok || id == "" {
		t.Fatalf("expected project id in response, got: %s", w.Body.String())
	}
	testProjectID = id
}

func TestProjects_Create_Validation(t *testing.T) {
	if userOneToken == "" {
		t.Skip("userOneToken not set")
	}
	w := do("POST", "/projects", userOneToken, map[string]interface{}{})
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

func TestProjects_List(t *testing.T) {
	if userOneToken == "" {
		t.Skip("userOneToken not set")
	}
	w := do("GET", "/projects?page=1&limit=10", userOneToken, nil)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	body := parseBody(w)
	if _, ok := body["projects"]; !ok {
		t.Fatal("expected projects array in response")
	}
}

func TestProjects_GetByID(t *testing.T) {
	if userOneToken == "" || testProjectID == "" {
		t.Skip("prerequisites not set")
	}
	w := do("GET", "/projects/"+testProjectID, userOneToken, nil)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	body := parseBody(w)
	if body["id"] != testProjectID {
		t.Fatalf("expected project id %s, got %v", testProjectID, body["id"])
	}
	if _, ok := body["tasks"]; !ok {
		t.Fatal("expected tasks array in project detail")
	}
}

func TestProjects_GetByID_NotFound(t *testing.T) {
	if userOneToken == "" {
		t.Skip("userOneToken not set")
	}
	w := do("GET", "/projects/00000000-0000-0000-0000-000000000000", userOneToken, nil)
	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d: %s", w.Code, w.Body.String())
	}
}

func TestProjects_Update_NonOwner_Forbidden(t *testing.T) {
	if userTwoToken == "" || testProjectID == "" {
		t.Skip("prerequisites not set")
	}
	w := do("PATCH", "/projects/"+testProjectID, userTwoToken, map[string]interface{}{
		"name": "Hijacked Name",
	})
	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d: %s", w.Code, w.Body.String())
	}
}

func TestProjects_Update_Owner(t *testing.T) {
	if userOneToken == "" || testProjectID == "" {
		t.Skip("prerequisites not set")
	}
	w := do("PATCH", "/projects/"+testProjectID, userOneToken, map[string]interface{}{
		"name": "INT: Updated Project",
	})
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	body := parseBody(w)
	if body["name"] != "INT: Updated Project" {
		t.Fatalf("expected updated name, got %v", body["name"])
	}
}

func TestProjects_Stats(t *testing.T) {
	if userOneToken == "" || testProjectID == "" {
		t.Skip("prerequisites not set")
	}
	w := do("GET", "/projects/"+testProjectID+"/stats", userOneToken, nil)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	body := parseBody(w)
	if _, ok := body["by_status"]; !ok {
		t.Fatal("expected by_status in stats response")
	}
}

// ── task tests ────────────────────────────────────────────────────────────────

func TestTasks_Create(t *testing.T) {
	if userOneToken == "" || testProjectID == "" {
		t.Skip("prerequisites not set")
	}
	w := do("POST", "/projects/"+testProjectID+"/tasks", userOneToken, map[string]interface{}{
		"title":    "INT: First Task",
		"status":   "todo",
		"priority": "high",
	})
	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}
	body := parseBody(w)
	id, ok := body["id"].(string)
	if !ok || id == "" {
		t.Fatalf("expected task id in response, got: %s", w.Body.String())
	}
	testTaskID = id
}

func TestTasks_Create_NonOwner_Forbidden(t *testing.T) {
	if userTwoToken == "" || testProjectID == "" {
		t.Skip("prerequisites not set")
	}
	w := do("POST", "/projects/"+testProjectID+"/tasks", userTwoToken, map[string]interface{}{
		"title": "INT: Unauthorized Task",
	})
	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d: %s", w.Code, w.Body.String())
	}
}

func TestTasks_List(t *testing.T) {
	if userOneToken == "" || testProjectID == "" {
		t.Skip("prerequisites not set")
	}
	w := do("GET", "/projects/"+testProjectID+"/tasks", userOneToken, nil)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	body := parseBody(w)
	if _, ok := body["tasks"]; !ok {
		t.Fatal("expected tasks array in response")
	}
}

func TestTasks_List_WithStatusFilter(t *testing.T) {
	if userOneToken == "" || testProjectID == "" {
		t.Skip("prerequisites not set")
	}
	w := do("GET", "/projects/"+testProjectID+"/tasks?status=todo", userOneToken, nil)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	body := parseBody(w)
	tasks, ok := body["tasks"].([]interface{})
	if !ok {
		t.Fatal("expected tasks array")
	}
	for _, raw := range tasks {
		task := raw.(map[string]interface{})
		if task["status"] != "todo" {
			t.Fatalf("expected all tasks to have status=todo, got %v", task["status"])
		}
	}
}

func TestTasks_Update(t *testing.T) {
	if userOneToken == "" || testTaskID == "" {
		t.Skip("prerequisites not set")
	}
	w := do("PATCH", "/tasks/"+testTaskID, userOneToken, map[string]interface{}{
		"status":   "in_progress",
		"priority": "medium",
	})
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	body := parseBody(w)
	if body["status"] != "in_progress" {
		t.Fatalf("expected status=in_progress, got %v", body["status"])
	}
}

func TestTasks_Update_InvalidStatus(t *testing.T) {
	if userOneToken == "" || testTaskID == "" {
		t.Skip("prerequisites not set")
	}
	w := do("PATCH", "/tasks/"+testTaskID, userOneToken, map[string]interface{}{
		"status": "invalid_status",
	})
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

func TestTasks_Delete_NonOwner_Forbidden(t *testing.T) {
	if userTwoToken == "" || testTaskID == "" {
		t.Skip("prerequisites not set")
	}
	w := do("DELETE", "/tasks/"+testTaskID, userTwoToken, nil)
	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d: %s", w.Code, w.Body.String())
	}
}

func TestTasks_Delete_Owner(t *testing.T) {
	if userOneToken == "" || testTaskID == "" {
		t.Skip("prerequisites not set")
	}
	w := do("DELETE", "/tasks/"+testTaskID, userOneToken, nil)
	if w.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d: %s", w.Code, w.Body.String())
	}
}

// ── cleanup ───────────────────────────────────────────────────────────────────

func TestProjects_Delete(t *testing.T) {
	if userOneToken == "" || testProjectID == "" {
		t.Skip("prerequisites not set")
	}
	w := do("DELETE", "/projects/"+testProjectID, userOneToken, nil)
	if w.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d: %s", w.Code, w.Body.String())
	}
}
