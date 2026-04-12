package com.taskflow.project;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProjectRepository extends JpaRepository<Project, UUID> {

    List<Project> findByOwnerId(UUID ownerId);

    // Projects the user owns OR has tasks assigned to them
    @Query("""
        SELECT DISTINCT p FROM Project p
        WHERE p.owner.id = :userId
        OR EXISTS (
            SELECT t FROM Task t
            WHERE t.project.id = p.id AND t.assignee.id = :userId
        )
        ORDER BY p.createdAt DESC
    """)
    List<Project> findAccessibleByUserId(@Param("userId") UUID userId);
}

