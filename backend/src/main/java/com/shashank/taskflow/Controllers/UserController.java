package com.shashank.taskflow.Controllers;

import com.shashank.taskflow.Dtos.LoginResponseDto;
import com.shashank.taskflow.Dtos.SignUpRequestDto;
import com.shashank.taskflow.Dtos.UserDto;
import com.shashank.taskflow.Services.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/user/{id}")
        public ResponseEntity<UserDto> getUser (@PathVariable String id) {
            return userService.getUser(id);
    }

    @PostMapping("/auth/login")
        public ResponseEntity<LoginResponseDto> login(@RequestBody SignUpRequestDto loginRequestDto) {
            return userService.login(loginRequestDto);
    }

    @PostMapping("/auth/register")
        public ResponseEntity<LoginResponseDto> register(@RequestBody SignUpRequestDto signUpRequestDto){
            return userService.register(signUpRequestDto);
    }
}
