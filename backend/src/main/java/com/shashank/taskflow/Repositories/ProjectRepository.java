package com.shashank.taskflow.Repositories;

import com.shashank.taskflow.Entites.Project;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProjectRepository extends JpaRepository<Project, String> {

    List<Project> findAllByUserId(String userId);
}
