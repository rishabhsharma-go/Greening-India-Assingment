package com.shashank.taskflow.Dtos;

import com.shashank.taskflow.Enums.PriorityEnum;
import com.shashank.taskflow.Enums.StatusEnum;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class TaskUpdateRequestDto {
    private String title;
    private String description;
    private StatusEnum status;
    private PriorityEnum priority;
    private String assignee;
    private LocalDate due_date;
}
