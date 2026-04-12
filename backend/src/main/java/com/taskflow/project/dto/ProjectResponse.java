package com.taskflow.project.dto;

import com.taskflow.task.dto.TaskResponse;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public class ProjectResponse {
    private UUID id;
    private String name;
    private String description;
    private UUID ownerId;
    private OffsetDateTime createdAt;
    private List<TaskResponse> tasks;

    public ProjectResponse() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public UUID getOwnerId() { return ownerId; }
    public void setOwnerId(UUID ownerId) { this.ownerId = ownerId; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public List<TaskResponse> getTasks() { return tasks; }
    public void setTasks(List<TaskResponse> tasks) { this.tasks = tasks; }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private final ProjectResponse r = new ProjectResponse();
        public Builder id(UUID v) { r.id = v; return this; }
        public Builder name(String v) { r.name = v; return this; }
        public Builder description(String v) { r.description = v; return this; }
        public Builder ownerId(UUID v) { r.ownerId = v; return this; }
        public Builder createdAt(OffsetDateTime v) { r.createdAt = v; return this; }
        public Builder tasks(List<TaskResponse> v) { r.tasks = v; return this; }
        public ProjectResponse build() { return r; }
    }
}

