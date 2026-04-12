package com.taskflow.task;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TaskRepository extends JpaRepository<Task, UUID> {

    List<Task> findByProjectId(UUID projectId);

    List<Task> findByProjectIdAndStatus(UUID projectId, TaskStatus status);

    List<Task> findByProjectIdAndAssigneeId(UUID projectId, UUID assigneeId);

    List<Task> findByProjectIdAndStatusAndAssigneeId(UUID projectId, TaskStatus status, UUID assigneeId);

    @Query("""
        SELECT t.status AS status, COUNT(t) AS count
        FROM Task t
        WHERE t.project.id = :projectId
        GROUP BY t.status
    """)
    List<TaskStatusCount> countByProjectIdGroupByStatus(@Param("projectId") UUID projectId);

    @Query("""
        SELECT t.assignee.id AS assigneeId, COUNT(t) AS count
        FROM Task t
        WHERE t.project.id = :projectId AND t.assignee IS NOT NULL
        GROUP BY t.assignee.id
    """)
    List<TaskAssigneeCount> countByProjectIdGroupByAssignee(@Param("projectId") UUID projectId);

    interface TaskStatusCount {
        TaskStatus getStatus();
        Long getCount();
    }

    interface TaskAssigneeCount {
        UUID getAssigneeId();
        Long getCount();
    }
}

