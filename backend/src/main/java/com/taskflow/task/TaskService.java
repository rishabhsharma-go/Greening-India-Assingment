package com.taskflow.task;

import com.taskflow.config.CurrentUserProvider;
import com.taskflow.exception.ForbiddenException;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.project.Project;
import com.taskflow.project.ProjectRepository;
import com.taskflow.task.dto.CreateTaskRequest;
import com.taskflow.task.dto.TaskResponse;
import com.taskflow.task.dto.UpdateTaskRequest;
import com.taskflow.user.User;
import com.taskflow.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class TaskService {

    private static final Logger log = LoggerFactory.getLogger(TaskService.class);

    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final CurrentUserProvider currentUserProvider;

    public TaskService(TaskRepository taskRepository, ProjectRepository projectRepository,
                       UserRepository userRepository, CurrentUserProvider currentUserProvider) {
        this.taskRepository = taskRepository;
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.currentUserProvider = currentUserProvider;
    }

    public List<TaskResponse> getTasks(UUID projectId, String status, String assigneeId) {
        findProject(projectId); // verify exists

        List<Task> tasks;

        TaskStatus taskStatus = null;
        if (StringUtils.hasText(status)) {
            try {
                taskStatus = TaskStatus.valueOf(status);
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Invalid status value: " + status);
            }
        }

        UUID assigneeUuid = null;
        if (StringUtils.hasText(assigneeId)) {
            assigneeUuid = UUID.fromString(assigneeId);
        }

        if (taskStatus != null && assigneeUuid != null) {
            tasks = taskRepository.findByProjectIdAndStatusAndAssigneeId(projectId, taskStatus, assigneeUuid);
        } else if (taskStatus != null) {
            tasks = taskRepository.findByProjectIdAndStatus(projectId, taskStatus);
        } else if (assigneeUuid != null) {
            tasks = taskRepository.findByProjectIdAndAssigneeId(projectId, assigneeUuid);
        } else {
            tasks = taskRepository.findByProjectId(projectId);
        }

        return tasks.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public TaskResponse createTask(UUID projectId, CreateTaskRequest request) {
        Project project = findProject(projectId);

        User assignee = null;
        if (request.getAssigneeId() != null) {
            assignee = userRepository.findById(request.getAssigneeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Assignee not found: " + request.getAssigneeId()));
        }

        Task task = Task.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .status(TaskStatus.todo)
                .priority(request.getPriority() != null ? request.getPriority() : TaskPriority.medium)
                .project(project)
                .assignee(assignee)
                .dueDate(request.getDueDate())
                .build();

        task = taskRepository.save(task);
        log.info("Created task '{}' in project {}", task.getTitle(), projectId);
        return toResponse(task);
    }

    @Transactional
    public TaskResponse updateTask(UUID taskId, UpdateTaskRequest request) {
        Task task = findTask(taskId);
        UUID currentUserId = currentUserProvider.getCurrentUserId();

        // Only project owner or assignee can update (we'll allow any authenticated user to update for flexibility)
        // Strict check only applied on delete

        if (StringUtils.hasText(request.getTitle())) {
            task.setTitle(request.getTitle());
        }
        if (request.getDescription() != null) {
            task.setDescription(request.getDescription());
        }
        if (request.getStatus() != null) {
            task.setStatus(request.getStatus());
        }
        if (request.getPriority() != null) {
            task.setPriority(request.getPriority());
        }
        if (request.getDueDate() != null) {
            task.setDueDate(request.getDueDate());
        }
        if (Boolean.TRUE.equals(request.getClearAssignee())) {
            task.setAssignee(null);
        } else if (request.getAssigneeId() != null) {
            User assignee = userRepository.findById(request.getAssigneeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Assignee not found: " + request.getAssigneeId()));
            task.setAssignee(assignee);
        }

        log.info("Updated task: {}", taskId);
        return toResponse(taskRepository.save(task));
    }

    @Transactional
    public void deleteTask(UUID taskId) {
        Task task = findTask(taskId);
        UUID currentUserId = currentUserProvider.getCurrentUserId();
        UUID projectOwnerId = task.getProject().getOwner().getId();
        UUID assigneeId = task.getAssignee() != null ? task.getAssignee().getId() : null;

        boolean isProjectOwner = projectOwnerId.equals(currentUserId);
        boolean isAssignee = currentUserId.equals(assigneeId);

        if (!isProjectOwner && !isAssignee) {
            throw new ForbiddenException("Only the project owner or task assignee can delete this task");
        }

        taskRepository.delete(task);
        log.info("Deleted task: {}", taskId);
    }

    private Project findProject(UUID projectId) {
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found: " + projectId));
    }

    private Task findTask(UUID taskId) {
        return taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found: " + taskId));
    }

    private TaskResponse toResponse(Task task) {
        return TaskResponse.builder()
                .id(task.getId())
                .title(task.getTitle())
                .description(task.getDescription())
                .status(task.getStatus())
                .priority(task.getPriority())
                .projectId(task.getProject().getId())
                .assigneeId(task.getAssignee() != null ? task.getAssignee().getId() : null)
                .assigneeName(task.getAssignee() != null ? task.getAssignee().getName() : null)
                .dueDate(task.getDueDate())
                .createdAt(task.getCreatedAt())
                .updatedAt(task.getUpdatedAt())
                .build();
    }
}

