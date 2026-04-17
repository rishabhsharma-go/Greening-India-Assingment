package com.shashank.taskflow.Controllers;

import com.shashank.taskflow.Dtos.*;
import com.shashank.taskflow.Enums.StatusEnum;
import com.shashank.taskflow.Services.TaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;

    @GetMapping("/projects/{id}/tasks")
        public ResponseEntity<List<TaskResponseDto>> getTasks(@PathVariable String id, @RequestParam(required = false) StatusEnum status, @RequestParam(required = false) String assignee) {
            return taskService.getTasks(id, status, assignee);
    }

    @GetMapping("/task/{taskId}/assign/{userId}")
        public ResponseEntity<StandardResponseDto> assignTask(@PathVariable String taskId, @PathVariable String userId) {
            return taskService.assignTask(taskId,userId);
    }

    @GetMapping("/task/{id}")
        public ResponseEntity<TaskDetailDto> taskDetails(@PathVariable String id) {
            return taskService.taskDetails(id);
    }

    @PostMapping("/projects/{id}/tasks")
        public ResponseEntity<TaskResponseDto> createTask(@PathVariable String id, @RequestBody TaskRequestDto taskRequestDto) {
            return taskService.createTask(id, taskRequestDto);
    }

    @PatchMapping("/tasks/{id}")
        public ResponseEntity<StandardResponseDto> patchTask(@PathVariable String id, @RequestBody TaskUpdateRequestDto taskUpdateRequestDto) {
            return taskService.patchTask(id, taskUpdateRequestDto);
    }

    @DeleteMapping("/tasks/{id}")
        public ResponseEntity<StandardResponseDto> delete(@PathVariable String id) {
            return taskService.delete(id);
    }





























}
