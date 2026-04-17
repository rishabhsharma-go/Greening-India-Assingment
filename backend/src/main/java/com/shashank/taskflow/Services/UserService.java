package com.shashank.taskflow.Services;

import com.shashank.taskflow.Dtos.LoginResponseDto;
import com.shashank.taskflow.Dtos.SignUpRequestDto;
import com.shashank.taskflow.Dtos.UserDto;
import com.shashank.taskflow.Entites.User;
import com.shashank.taskflow.Repositories.UserRepository;
import com.shashank.taskflow.Security.JwtAuthUtil;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.PathVariable;

@Service
@RequiredArgsConstructor
public class UserService {

    private final AuthenticationManager authenticationManager;
    private final JwtAuthUtil jwtAuthUtil;
    private final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;
    private final ModelMapper modelMapper;

    public ResponseEntity<LoginResponseDto> login(SignUpRequestDto loginRequestDto) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequestDto.getName(), loginRequestDto.getPassword())
        );
        User user = (User) authentication.getPrincipal();
        String jwt = jwtAuthUtil.generateJwtSecretKey(user);
        return new ResponseEntity<>(new LoginResponseDto(jwt), HttpStatus.OK);
    }

    public ResponseEntity<LoginResponseDto> register(SignUpRequestDto signUpRequestDto) {
        User user = userRepo.findByEmail(signUpRequestDto.getEmail()).orElse(null);

        if (user != null ) throw new IllegalArgumentException("User already exists");

        User savedUser = userRepo.save(User.builder()
                    .name(signUpRequestDto.getName())
                    .email(signUpRequestDto.getEmail())
                    .password(passwordEncoder.encode(signUpRequestDto.getPassword()))
                    .build());

        String jwt = jwtAuthUtil.generateJwtSecretKey(savedUser);

        return new ResponseEntity<>(new LoginResponseDto(jwt), HttpStatus.OK);
    }

    public ResponseEntity<UserDto> getUser (String id) {
        User user = userRepo.findById(id).orElseThrow();
        UserDto userDto = modelMapper.map(user, UserDto.class);
        return ResponseEntity.ok(userDto);
    }
}
