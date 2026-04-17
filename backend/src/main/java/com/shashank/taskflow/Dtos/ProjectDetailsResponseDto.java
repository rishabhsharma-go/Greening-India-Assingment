package com.shashank.taskflow.Dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ProjectDetailsResponseDto {
    private String id;
    private String name;
    private String description;
    private List<TaskResponseDto> tasks;
    private LocalDateTime created_at;
}
