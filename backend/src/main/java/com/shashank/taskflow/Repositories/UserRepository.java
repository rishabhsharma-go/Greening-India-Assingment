package com.shashank.taskflow.Repositories;

import com.shashank.taskflow.Entites.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByName(String username);

    Optional<User> findByEmail(String email);
}
