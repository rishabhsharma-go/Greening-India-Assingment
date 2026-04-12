package com.taskflow.project;

import com.taskflow.config.CurrentUserProvider;
import com.taskflow.exception.ForbiddenException;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.project.dto.*;
import com.taskflow.task.Task;
import com.taskflow.task.TaskRepository;
import com.taskflow.task.dto.TaskResponse;
import com.taskflow.user.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class ProjectService {

    private static final Logger log = LoggerFactory.getLogger(ProjectService.class);

    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final CurrentUserProvider currentUserProvider;

    public ProjectService(ProjectRepository projectRepository, TaskRepository taskRepository,
                          CurrentUserProvider currentUserProvider) {
        this.projectRepository = projectRepository;
        this.taskRepository = taskRepository;
        this.currentUserProvider = currentUserProvider;
    }

    public List<ProjectResponse> getAccessibleProjects() {
        UUID userId = currentUserProvider.getCurrentUserId();
        log.debug("Fetching projects for user: {}", userId);
        return projectRepository.findAccessibleByUserId(userId).stream()
                .map(p -> toResponse(p, null))
                .collect(Collectors.toList());
    }

    @Transactional
    public ProjectResponse createProject(CreateProjectRequest request) {
        User owner = currentUserProvider.getCurrentUser();
        log.info("Creating project '{}' for user: {}", request.getName(), owner.getId());

        Project project = Project.builder()
                .name(request.getName())
                .description(request.getDescription())
                .owner(owner)
                .build();

        return toResponse(projectRepository.save(project), null);
    }

    public ProjectResponse getProjectWithTasks(UUID projectId) {
        Project project = findById(projectId);
        List<Task> tasks = taskRepository.findByProjectId(projectId);
        return toResponse(project, tasks);
    }

    @Transactional
    public ProjectResponse updateProject(UUID projectId, UpdateProjectRequest request) {
        Project project = findById(projectId);
        requireOwner(project);

        if (StringUtils.hasText(request.getName())) {
            project.setName(request.getName());
        }
        if (request.getDescription() != null) {
            project.setDescription(request.getDescription());
        }

        log.info("Updated project: {}", projectId);
        return toResponse(projectRepository.save(project), null);
    }

    @Transactional
    public void deleteProject(UUID projectId) {
        Project project = findById(projectId);
        requireOwner(project);
        projectRepository.delete(project);
        log.info("Deleted project: {}", projectId);
    }

    public ProjectStatsResponse getProjectStats(UUID projectId) {
        findById(projectId); // verify exists and user has access

        Map<com.taskflow.task.TaskStatus, Long> byStatus = taskRepository
                .countByProjectIdGroupByStatus(projectId)
                .stream()
                .collect(Collectors.toMap(
                        TaskRepository.TaskStatusCount::getStatus,
                        TaskRepository.TaskStatusCount::getCount
                ));

        Map<UUID, Long> byAssignee = taskRepository
                .countByProjectIdGroupByAssignee(projectId)
                .stream()
                .collect(Collectors.toMap(
                        TaskRepository.TaskAssigneeCount::getAssigneeId,
                        TaskRepository.TaskAssigneeCount::getCount
                ));

        return ProjectStatsResponse.builder()
                .projectId(projectId)
                .byStatus(byStatus)
                .byAssignee(byAssignee)
                .build();
    }

    private Project findById(UUID id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found: " + id));
    }

    private void requireOwner(Project project) {
        UUID currentUserId = currentUserProvider.getCurrentUserId();
        if (!project.getOwner().getId().equals(currentUserId)) {
            throw new ForbiddenException("Only the project owner can perform this action");
        }
    }

    private ProjectResponse toResponse(Project project, List<Task> tasks) {
        List<TaskResponse> taskResponses = tasks == null ? null :
                tasks.stream().map(this::toTaskResponse).collect(Collectors.toList());

        return ProjectResponse.builder()
                .id(project.getId())
                .name(project.getName())
                .description(project.getDescription())
                .ownerId(project.getOwner().getId())
                .createdAt(project.getCreatedAt())
                .tasks(taskResponses)
                .build();
    }

    private TaskResponse toTaskResponse(Task task) {
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

