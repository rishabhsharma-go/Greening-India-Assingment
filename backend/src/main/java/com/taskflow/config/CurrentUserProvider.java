package com.taskflow.config;

import com.taskflow.user.User;
import com.taskflow.user.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class CurrentUserProvider {

    private final UserRepository userRepository;

    public CurrentUserProvider(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User getCurrentUser() {
        UserDetails userDetails = (UserDetails) SecurityContextHolder
                .getContext().getAuthentication().getPrincipal();
        UUID userId = UUID.fromString(userDetails.getUsername());
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found in DB"));
    }

    public UUID getCurrentUserId() {
        return getCurrentUser().getId();
    }
}

