package com.shashank.taskflow.Dtos;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SignUpRequestDto {
    @NotNull(message = "is required")
    @Email(message = "Invalid email")
    private String email;
    private String name;
    @NotNull(message = "is required")
    private String password;
}
