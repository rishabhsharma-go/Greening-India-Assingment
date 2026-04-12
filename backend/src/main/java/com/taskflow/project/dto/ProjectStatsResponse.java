package com.taskflow.project.dto;

import com.taskflow.task.TaskStatus;

import java.util.Map;
import java.util.UUID;

public class ProjectStatsResponse {
    private UUID projectId;
    private Map<TaskStatus, Long> byStatus;
    private Map<UUID, Long> byAssignee;

    public ProjectStatsResponse() {}

    public UUID getProjectId() { return projectId; }
    public void setProjectId(UUID projectId) { this.projectId = projectId; }
    public Map<TaskStatus, Long> getByStatus() { return byStatus; }
    public void setByStatus(Map<TaskStatus, Long> byStatus) { this.byStatus = byStatus; }
    public Map<UUID, Long> getByAssignee() { return byAssignee; }
    public void setByAssignee(Map<UUID, Long> byAssignee) { this.byAssignee = byAssignee; }

    public static Builder builder() { return new Builder(); }
    public static class Builder {
        private final ProjectStatsResponse r = new ProjectStatsResponse();
        public Builder projectId(UUID v) { r.projectId = v; return this; }
        public Builder byStatus(Map<TaskStatus, Long> v) { r.byStatus = v; return this; }
        public Builder byAssignee(Map<UUID, Long> v) { r.byAssignee = v; return this; }
        public ProjectStatsResponse build() { return r; }
    }
}

