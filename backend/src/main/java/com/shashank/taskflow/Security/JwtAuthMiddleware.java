package com.shashank.taskflow.Security;

import com.shashank.taskflow.Entites.User;
import com.shashank.taskflow.Repositories.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Slf4j
@RequiredArgsConstructor
public class JwtAuthMiddleware extends OncePerRequestFilter { //Request will go through it before going to Controller

    private final UserRepository userRepository;
    private final JwtAuthUtil jwtAuthUtil;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        try{
            final String requestTokenHeader = request.getHeader("Authorization");

            if(requestTokenHeader == null || !requestTokenHeader.startsWith("Bearer ")) {
                log.info("Token not found");
                filterChain.doFilter(request, response);
                return;
            }

            String token = requestTokenHeader.split("Bearer ")[1];

            String id = jwtAuthUtil.getIdfromToken(token);

            if(id != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                User user = userRepository.findById(id).orElseThrow();
                UsernamePasswordAuthenticationToken token1 = new UsernamePasswordAuthenticationToken(user,null, user.getAuthorities());
                SecurityContextHolder.getContext().setAuthentication(token1);
            }
            filterChain.doFilter(request, response);
        } catch (Exception ex) {
            log.error("JWT ERROR: {}", ex.getMessage());
        }
    }
}
