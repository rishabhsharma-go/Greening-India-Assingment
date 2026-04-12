package com.taskflow.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Automatically configures the datasource on Railway by converting the
 * standard {@code DATABASE_PUBLIC_URL} or {@code DATABASE_URL} environment
 * variables (format: {@code postgresql://user:pass@host:port/db}) to the
 * JDBC properties expected by Spring Boot.
 *
 * <p>Priority order:
 * <ol>
 *   <li>{@code SPRING_DATASOURCE_URL} – used as-is when explicitly set</li>
 *   <li>{@code DATABASE_PUBLIC_URL}   – Railway's public TCP-proxy URL</li>
 *   <li>{@code DATABASE_URL}          – Railway's internal network URL</li>
 *   <li>{@code PGHOST / PGPORT / PGDATABASE / PGUSER / PGPASSWORD} – individual Railway PG vars</li>
 * </ol>
 *
 * <p>This processor runs before the application context is refreshed and
 * injects the resolved properties at the highest priority so they override
 * anything declared in {@code application-prod.yml}.
 */
public class RailwayDatabaseEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    private static final String SOURCE_NAME = "railwayDatasourceConfig";
    private static final String DS_URL      = "spring.datasource.url";
    private static final String DS_USER     = "spring.datasource.username";
    private static final String DS_PASS     = "spring.datasource.password";

    @Override
    public int getOrder() {
        return Ordered.LOWEST_PRECEDENCE - 10; // run late so all env vars are visible
    }

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment,
                                       SpringApplication application) {

        // 1. If SPRING_DATASOURCE_URL is already set as an env var, honour it and stop.
        String explicitUrl = System.getenv("SPRING_DATASOURCE_URL");
        if (explicitUrl != null && !explicitUrl.isBlank()) {
            // Already handled by the YAML placeholder — nothing to do.
            return;
        }

        // 2. Try DATABASE_PUBLIC_URL  (works outside Railway private network)
        String rawUrl = System.getenv("DATABASE_PUBLIC_URL");

        // 3. Fall back to DATABASE_URL  (Railway internal network)
        if (rawUrl == null || rawUrl.isBlank()) {
            rawUrl = System.getenv("DATABASE_URL");
        }

        if (rawUrl != null && !rawUrl.isBlank()) {
            applyParsedUrl(environment, rawUrl);
            return;
        }

        // 4. Fall back to individual PG* variables injected by Railway's Postgres plugin
        String pgHost = System.getenv("PGHOST");
        String pgPort = System.getenv("PGPORT");
        String pgDb   = System.getenv("PGDATABASE");
        String pgUser = System.getenv("PGUSER");
        String pgPass = System.getenv("PGPASSWORD");

        if (pgHost != null && !pgHost.isBlank()) {
            String port = (pgPort != null && !pgPort.isBlank()) ? pgPort : "5432";
            String db   = (pgDb   != null && !pgDb.isBlank())   ? pgDb   : "railway";

            Map<String, Object> props = new LinkedHashMap<>();
            props.put(DS_URL,  "jdbc:postgresql://" + pgHost + ":" + port + "/" + db);
            if (pgUser != null) props.put(DS_USER, pgUser);
            if (pgPass != null) props.put(DS_PASS, pgPass);

            inject(environment, props);
        }
    }

    /**
     * Parses a {@code postgresql://user:pass@host:port/db} URL and injects
     * the equivalent JDBC datasource properties into the environment.
     */
    private void applyParsedUrl(ConfigurableEnvironment environment, String rawUrl) {
        try {
            // Strip scheme
            String rest = rawUrl.replaceFirst("^postgres(?:ql)?://", "");

            // Split into user-info and host+path
            int atIdx = rest.indexOf('@');
            if (atIdx < 0) {
                // No credentials in the URL — just prefix it
                inject(environment, Map.of(DS_URL, "jdbc:postgresql://" + rest));
                return;
            }

            String userInfo  = rest.substring(0, atIdx);
            String hostAndDb = rest.substring(atIdx + 1);

            String user = userInfo;
            String pass = "";
            int colonIdx = userInfo.indexOf(':');
            if (colonIdx >= 0) {
                user = userInfo.substring(0, colonIdx);
                pass = userInfo.substring(colonIdx + 1);
            }

            Map<String, Object> props = new LinkedHashMap<>();
            props.put(DS_URL,  "jdbc:postgresql://" + hostAndDb);
            props.put(DS_USER, user);
            props.put(DS_PASS, pass);

            inject(environment, props);

        } catch (Exception ex) {
            // Let the application fail with its original error — don't swallow it silently.
            System.err.println("[RailwayDatabaseEnvironmentPostProcessor] Failed to parse DB URL: " + ex.getMessage());
        }
    }

    private void inject(ConfigurableEnvironment environment, Map<String, Object> props) {
        environment.getPropertySources()
                   .addFirst(new MapPropertySource(SOURCE_NAME, props));
    }
}

