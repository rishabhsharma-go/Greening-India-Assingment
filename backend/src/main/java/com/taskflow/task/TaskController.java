package com.taskflow.task;

import com.taskflow.task.dto.CreateTaskRequest;
import com.taskflow.task.dto.TaskResponse;
import com.taskflow.task.dto.UpdateTaskRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Tag(name = "Tasks", description = "Create and manage tasks within a project — JWT required")
@RestController
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @Operation(summary = "List tasks in a project", description = "Optionally filter by status (todo | in_progress | done) or assignee UUID.")
    @ApiResponse(responseCode = "200", description = "Task list returned")
    @GetMapping("/projects/{projectId}/tasks")
    public ResponseEntity<Map<String, List<TaskResponse>>> listTasks(
            @PathVariable UUID projectId,
            @Parameter(description = "Filter by status: todo | in_progress | done") @RequestParam(required = false) String status,
            @Parameter(description = "Filter by assignee UUID") @RequestParam(required = false) String assignee) {
        return ResponseEntity.ok(Map.of("tasks", taskService.getTasks(projectId, status, assignee)));
    }

    @Operation(summary = "Create a task in a project")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Task created"),
        @ApiResponse(responseCode = "400", description = "Validation error")
    })
    @PostMapping("/projects/{projectId}/tasks")
    public ResponseEntity<TaskResponse> createTask(
            @PathVariable UUID projectId,
            @Valid @RequestBody CreateTaskRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(taskService.createTask(projectId, request));
    }

    @Operation(summary = "Update a task", description = "Partial update — send only the fields you want to change.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Task updated"),
        @ApiResponse(responseCode = "403", description = "Not owner or assignee"),
        @ApiResponse(responseCode = "404", description = "Task not found")
    })
    @PatchMapping("/tasks/{id}")
    public ResponseEntity<TaskResponse> updateTask(
            @PathVariable UUID id,
            @RequestBody UpdateTaskRequest request) {
        return ResponseEntity.ok(taskService.updateTask(id, request));
    }

    @Operation(summary = "Delete a task", description = "Only the project owner or task assignee can delete.")
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "Deleted"),
        @ApiResponse(responseCode = "403", description = "Not owner or assignee")
    })
    @DeleteMapping("/tasks/{id}")
    public ResponseEntity<Void> deleteTask(@PathVariable UUID id) {
        taskService.deleteTask(id);
        return ResponseEntity.noContent().build();
    }
}



