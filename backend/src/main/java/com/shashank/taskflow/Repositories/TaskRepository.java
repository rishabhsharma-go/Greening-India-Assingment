package com.shashank.taskflow.Repositories;

import com.shashank.taskflow.Entites.Project;
import com.shashank.taskflow.Entites.Task;
import com.shashank.taskflow.Entites.User;
import com.shashank.taskflow.Enums.StatusEnum;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TaskRepository extends JpaRepository<Task, String> {

    List<Task> findAllByProjectAndStatusAndUser(Project project, StatusEnum status, User assignedUser);

    List<Task> findAllByProjectAndStatus(Project project, StatusEnum status);

    List<Task> findAllByProject(Project project);

    List<Task> findAllByProjectAndUser(Project project, User assignedUser);

    List<Task> findAllByProjectUserId(String id);

    List<Task> findAllByProjectId(String id);

    List<Task> findAllByUserId(String id);

    List<Task> findAllByUser_Id(String id);

    List<Task> findAllByProject_Id(String id);
}
