package com.shashank.taskflow.Services;

import com.shashank.taskflow.Dtos.*;
import com.shashank.taskflow.Entites.Project;
import com.shashank.taskflow.Entites.Task;
import com.shashank.taskflow.Entites.User;
import com.shashank.taskflow.Repositories.ProjectRepository;
import com.shashank.taskflow.Repositories.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProjectService {

    private final ModelMapper modelMapper;
    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;

    public ResponseEntity<List<ProjectDetailsResponseDto>> getProjects() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User user = null;
        if (authentication != null && authentication.isAuthenticated()) {
            user = (User) authentication.getPrincipal(); // your entity
        }
        List<Project> list = projectRepository.findAllByUserId(Objects.requireNonNull(user).getId());
        log.info("list: {}", list);

        //All projects the user has tasks in

        List<Task> listOfTasks = taskRepository.findAllByUser_Id(user.getId());
        log.info("listOfTasks: {}", listOfTasks);

        List<Project> list2 = listOfTasks.stream().map(Task::getProject).toList();
        log.info("list2: {}", list2);

        List<Project> uniqueList2 = list2.stream().distinct().toList();
        log.info("uniqueList2: {}", uniqueList2);

        //merging both lists

        list.addAll(uniqueList2);
        log.info("list after add all: {}", list);

        List<Project> response = list.stream().distinct().toList();
        log.info("response: {}", response);




        return ResponseEntity.ok(response.stream().map(project -> {
            return modelMapper.map(project, ProjectDetailsResponseDto.class);
        }).toList());

//        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
//        User user = null;
//
//        if (authentication != null && authentication.isAuthenticated()) {
//            user = (User) authentication.getPrincipal();
//        }
//
//        String userId = Objects.requireNonNull(user).getId();
//
//        List<Project> ownedProjects = projectRepository.findAllByUserId(userId);
//
//        List<Project> taskProjects = taskRepository.findAllByProjectUserId(userId)
//                .stream()
//                .map(Task::getProject)
//                .toList();
//
//        // Merge + deduplicate in ONE step
//        List<Project> response = Stream.concat(ownedProjects.stream(), taskProjects.stream())
//                .distinct()
//                .toList();
//
//        return ResponseEntity.ok(
//                response.stream()
//                        .map(project -> modelMapper.map(project, ProjectDetailsResponseDto.class))
//                        .toList()
//        );
    }

    public ResponseEntity<ProjectDetailsResponseDto> getProjectDetails( String id) {
        Project project = projectRepository.findById(id).orElseThrow();
        List<Task> listOfTasks = taskRepository.findAllByProjectId(id);

        List<TaskResponseDto> listOfTaskResponseDto = listOfTasks.stream().map(task -> {
            return modelMapper.map(task, TaskResponseDto.class);
        }).toList();

        ProjectDetailsResponseDto projectDetailsResponseDto = modelMapper.map(project, ProjectDetailsResponseDto.class);

        projectDetailsResponseDto.setTasks(listOfTaskResponseDto);

        return ResponseEntity.ok(projectDetailsResponseDto);
    }

    public ResponseEntity<ProjectResponseDto> createProject(ProjectRequestDto projectRequestDto) {
            Project project = modelMapper.map(projectRequestDto, Project.class);
            //Getting User from Security Context Holder
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.isAuthenticated()) {
                User user = (User) authentication.getPrincipal(); // your entity
                project.setUser(user);
            }
            projectRepository.save(project);
            return ResponseEntity.ok(new ProjectResponseDto(project.getId()));
    }

    public ResponseEntity<StandardResponseDto> patchProject(String id, ProjectPatchDto projectPatchDto) {
        Project project = projectRepository.findById(id).orElseThrow();
        User projectOwner = project.getUser();
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()) {
            User user = (User) authentication.getPrincipal(); // your entity
            if(!user.getId().equals(projectOwner.getId())) {
                return new ResponseEntity<>(new StandardResponseDto("Unauthorised"), HttpStatus.UNAUTHORIZED);
            }
        }
        if(projectPatchDto.getName() != null) {
            project.setName(projectPatchDto.getName());
        }
        if(projectPatchDto.getDescription() != null) {
            project.setDescription(projectPatchDto.getDescription());
        }

        projectRepository.save(project);
        return new ResponseEntity<>(new StandardResponseDto("SUCCESS"), HttpStatus.OK);
    }

    public ResponseEntity<StandardResponseDto> deleteProject(String id) {
        Project project = projectRepository.findById(id).orElseThrow();
        User projectOwner = project.getUser();
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()) {
            User user = (User) authentication.getPrincipal(); // your entity
            if(!user.getId().equals(projectOwner.getId())) {
                return new ResponseEntity<>(new StandardResponseDto("Unauthorised"), HttpStatus.UNAUTHORIZED);
            }
        }
        //Delete all the tasks of the project
        List<Task> list = taskRepository.findAllByProject_Id(project.getId());
        for(Task task : list) {
            taskRepository.delete(task);
        }
        projectRepository.delete(project);
        return new ResponseEntity<>(new StandardResponseDto("SUCCESS"), HttpStatus.OK);
    }
}
