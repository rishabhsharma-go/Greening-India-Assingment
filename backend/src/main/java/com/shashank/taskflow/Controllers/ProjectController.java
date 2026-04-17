package com.shashank.taskflow.Controllers;

import com.shashank.taskflow.Dtos.*;
import com.shashank.taskflow.Services.ProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    @GetMapping
    public ResponseEntity<List<ProjectDetailsResponseDto>> getProjects() {
        return projectService.getProjects();
    }

    @GetMapping("/{id}")
        public ResponseEntity<ProjectDetailsResponseDto> getProjectDetails(@PathVariable String id) {
            return projectService.getProjectDetails(id);
    }

    @PostMapping
    public ResponseEntity<ProjectResponseDto> createProject(@RequestBody ProjectRequestDto projectRequestDto) {
        return projectService.createProject(projectRequestDto);
    }

    @PatchMapping("/{id}")
        public ResponseEntity<StandardResponseDto> patchProject(@PathVariable String id, @RequestBody ProjectPatchDto projectPatchDto) {
            return projectService.patchProject(id, projectPatchDto);
    }

    @DeleteMapping("/{id}")
        public ResponseEntity<StandardResponseDto> deleteProject(@PathVariable String id) {
            return projectService.deleteProject(id);
    }
}
