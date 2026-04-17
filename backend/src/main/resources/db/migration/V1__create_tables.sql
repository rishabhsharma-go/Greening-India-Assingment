-- USERS TABLE
CREATE TABLE users (
                       id VARCHAR(36) PRIMARY KEY,
                       name VARCHAR(255) NOT NULL UNIQUE,
                       email VARCHAR(255) UNIQUE,
                       password VARCHAR(255) NOT NULL,
                       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PROJECTS TABLE
CREATE TABLE projects (
                          id VARCHAR(36) PRIMARY KEY,
                          name VARCHAR(255) NOT NULL,
                          description TEXT,
                          owner_id VARCHAR(36) NOT NULL,
                          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                          CONSTRAINT fk_project_owner
                              FOREIGN KEY (owner_id)
                                  REFERENCES users(id)
                                  ON DELETE CASCADE
);

-- TASKS TABLE
CREATE TABLE tasks (
                       id VARCHAR(36) PRIMARY KEY,
                       title VARCHAR(255) NOT NULL,
                       description TEXT,
                       status VARCHAR(50),
                       priority VARCHAR(50),
                       project_id VARCHAR(36) NOT NULL,
                       assignee_id VARCHAR(36),
                       due_date DATE,
                       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                       CONSTRAINT fk_task_project
                           FOREIGN KEY (project_id)
                               REFERENCES projects(id)
                               ON DELETE CASCADE,

                       CONSTRAINT fk_task_user
                           FOREIGN KEY (assignee_id)
                               REFERENCES users(id)
                               ON DELETE SET NULL
);