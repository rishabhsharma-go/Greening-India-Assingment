package com.taskflow.task;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class TaskControllerIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    private String authToken;
    private String projectId;

    @BeforeEach
    void setUp() throws Exception {
        // Register + login
        String registerResponse = mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {
                              "name": "Task Tester",
                              "email": "task-%d@example.com".formatted(System.currentTimeMillis()),
                              "password": "secret123"
                            }
                        """.formatted(System.currentTimeMillis())))
                .andReturn().getResponse().getContentAsString();

        Map<?, ?> registerMap = objectMapper.readValue(registerResponse, Map.class);
        authToken = (String) registerMap.get("token");

        // Create a project
        String projectResponse = mockMvc.perform(post("/projects")
                        .header("Authorization", "Bearer " + authToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            { "name": "Test Project" }
                        """))
                .andReturn().getResponse().getContentAsString();

        Map<?, ?> projectMap = objectMapper.readValue(projectResponse, Map.class);
        projectId = (String) projectMap.get("id");
    }

    @Test
    void createTask_withAuth_returns201() throws Exception {
        mockMvc.perform(post("/projects/" + projectId + "/tasks")
                        .header("Authorization", "Bearer " + authToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            { "title": "My Task", "priority": "high" }
                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("My Task"))
                .andExpect(jsonPath("$.status").value("todo"));
    }

    @Test
    void createTask_withoutAuth_returns401() throws Exception {
        mockMvc.perform(post("/projects/" + projectId + "/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            { "title": "Unauthorized Task" }
                        """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void deleteTask_byNonOwner_returns403() throws Exception {
        // Create a task
        String taskResponse = mockMvc.perform(post("/projects/" + projectId + "/tasks")
                        .header("Authorization", "Bearer " + authToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            { "title": "Task to delete" }
                        """))
                .andReturn().getResponse().getContentAsString();

        Map<?, ?> taskMap = objectMapper.readValue(taskResponse, Map.class);
        String taskId = (String) taskMap.get("id");

        // Register a second user
        String anotherRegister = mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {
                              "name": "Other User",
                              "email": "other-%d@example.com".formatted(System.currentTimeMillis()),
                              "password": "secret123"
                            }
                        """.formatted(System.currentTimeMillis())))
                .andReturn().getResponse().getContentAsString();

        Map<?, ?> otherMap = objectMapper.readValue(anotherRegister, Map.class);
        String otherToken = (String) otherMap.get("token");

        // Other user tries to delete → 403
        mockMvc.perform(delete("/tasks/" + taskId)
                        .header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isForbidden());
    }
}

