package com.taskflow.auth.dto;

import java.util.UUID;

public class AuthResponse {
    private String token;
    private UserDto user;

    public AuthResponse() {}
    public AuthResponse(String token, UserDto user) { this.token = token; this.user = user; }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public UserDto getUser() { return user; }
    public void setUser(UserDto user) { this.user = user; }

    public static Builder builder() { return new Builder(); }
    public static class Builder {
        private String token; private UserDto user;
        public Builder token(String t) { this.token = t; return this; }
        public Builder user(UserDto u) { this.user = u; return this; }
        public AuthResponse build() { return new AuthResponse(token, user); }
    }

    public static class UserDto {
        private UUID id; private String name; private String email;
        public UserDto() {}
        public UserDto(UUID id, String name, String email) { this.id = id; this.name = name; this.email = email; }
        public UUID getId() { return id; }
        public String getName() { return name; }
        public String getEmail() { return email; }
        public void setId(UUID id) { this.id = id; }
        public void setName(String name) { this.name = name; }
        public void setEmail(String email) { this.email = email; }

        public static UserDtoBuilder builder() { return new UserDtoBuilder(); }
        public static class UserDtoBuilder {
            private UUID id; private String name; private String email;
            public UserDtoBuilder id(UUID id) { this.id = id; return this; }
            public UserDtoBuilder name(String n) { this.name = n; return this; }
            public UserDtoBuilder email(String e) { this.email = e; return this; }
            public UserDto build() { return new UserDto(id, name, email); }
        }
    }
}

