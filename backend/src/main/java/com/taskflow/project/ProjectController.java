package com.taskflow.project;

import com.taskflow.project.dto.*;
import io.swagger.v3.oas.annotations.Operation;
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

@Tag(name = "Projects", description = "Create and manage projects — JWT required")
@RestController
@RequestMapping("/projects")
public class ProjectController {

    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @Operation(summary = "List all accessible projects", description = "Returns projects owned by or shared with the current user.")
    @ApiResponse(responseCode = "200", description = "Project list returned")
    @GetMapping
    public ResponseEntity<Map<String, List<ProjectResponse>>> listProjects() {
        return ResponseEntity.ok(Map.of("projects", projectService.getAccessibleProjects()));
    }

    @Operation(summary = "Create a project")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Project created"),
        @ApiResponse(responseCode = "400", description = "Validation error")
    })
    @PostMapping
    public ResponseEntity<ProjectResponse> createProject(@Valid @RequestBody CreateProjectRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(projectService.createProject(request));
    }

    @Operation(summary = "Get a project with its tasks")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Project found"),
        @ApiResponse(responseCode = "404", description = "Project not found")
    })
    @GetMapping("/{id}")
    public ResponseEntity<ProjectResponse> getProject(@PathVariable UUID id) {
        return ResponseEntity.ok(projectService.getProjectWithTasks(id));
    }

    @Operation(summary = "Update a project", description = "Owner only — update name or description.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Project updated"),
        @ApiResponse(responseCode = "403", description = "Not the owner")
    })
    @PatchMapping("/{id}")
    public ResponseEntity<ProjectResponse> updateProject(
            @PathVariable UUID id,
            @RequestBody UpdateProjectRequest request) {
        return ResponseEntity.ok(projectService.updateProject(id, request));
    }

    @Operation(summary = "Delete a project", description = "Owner only — also deletes all tasks in the project.")
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "Deleted"),
        @ApiResponse(responseCode = "403", description = "Not the owner")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProject(@PathVariable UUID id) {
        projectService.deleteProject(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Get project task statistics", description = "Returns task counts grouped by status and assignee.")
    @ApiResponse(responseCode = "200", description = "Stats returned")
    @GetMapping("/{id}/stats")
    public ResponseEntity<ProjectStatsResponse> getProjectStats(@PathVariable UUID id) {
        return ResponseEntity.ok(projectService.getProjectStats(id));
    }
}



