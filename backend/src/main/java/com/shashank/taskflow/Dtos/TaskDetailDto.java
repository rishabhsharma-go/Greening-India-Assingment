package com.shashank.taskflow.Dtos;

import com.shashank.taskflow.Enums.PriorityEnum;
import com.shashank.taskflow.Enums.StatusEnum;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TaskDetailDto {
    private String title;
    private String description;
    private StatusEnum status;
    private PriorityEnum priority;
    private String assignee_id;
    private LocalDate due_date;
    private LocalDateTime createdAt;
    private LocalDateTime updated_at;
}
