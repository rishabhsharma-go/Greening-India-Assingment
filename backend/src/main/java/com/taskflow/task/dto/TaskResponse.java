package com.taskflow.task.dto;

import com.taskflow.task.TaskPriority;
import com.taskflow.task.TaskStatus;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public class TaskResponse {
    private UUID id;
    private String title;
    private String description;
    private TaskStatus status;
    private TaskPriority priority;
    private UUID projectId;
    private UUID assigneeId;
    private String assigneeName;
    private LocalDate dueDate;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public TaskResponse() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public TaskStatus getStatus() { return status; }
    public void setStatus(TaskStatus status) { this.status = status; }
    public TaskPriority getPriority() { return priority; }
    public void setPriority(TaskPriority priority) { this.priority = priority; }
    public UUID getProjectId() { return projectId; }
    public void setProjectId(UUID projectId) { this.projectId = projectId; }
    public UUID getAssigneeId() { return assigneeId; }
    public void setAssigneeId(UUID assigneeId) { this.assigneeId = assigneeId; }
    public String getAssigneeName() { return assigneeName; }
    public void setAssigneeName(String assigneeName) { this.assigneeName = assigneeName; }
    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private final TaskResponse r = new TaskResponse();
        public Builder id(UUID v) { r.id = v; return this; }
        public Builder title(String v) { r.title = v; return this; }
        public Builder description(String v) { r.description = v; return this; }
        public Builder status(TaskStatus v) { r.status = v; return this; }
        public Builder priority(TaskPriority v) { r.priority = v; return this; }
        public Builder projectId(UUID v) { r.projectId = v; return this; }
        public Builder assigneeId(UUID v) { r.assigneeId = v; return this; }
        public Builder assigneeName(String v) { r.assigneeName = v; return this; }
        public Builder dueDate(LocalDate v) { r.dueDate = v; return this; }
        public Builder createdAt(OffsetDateTime v) { r.createdAt = v; return this; }
        public Builder updatedAt(OffsetDateTime v) { r.updatedAt = v; return this; }
        public TaskResponse build() { return r; }
    }
}

