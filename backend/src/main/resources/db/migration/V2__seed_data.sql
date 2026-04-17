-- USERS
INSERT INTO users (id, name, email, password)
VALUES
    (
        'f71e73c9-0f11-4c8f-b3cc-ae9f3012ace1',
        'Shashank',
        'Shashank@hotmail.com',
        '$2a$10$l8xRAfAEMBo23ZbiyFvO5eOs7g.si7zToMiRsgit2L2G6OUaBkgkS'
    ),
    (
        '76f7d234-09c1-4f83-af24-44694e69c55f',
        'Deepak',
        'Deepak@gmail.com',
        '$2a$10$/iMfQxlJFY8InlP2WhAXX.wpr5He607JO46kdik9IlSP2qlLKfuzS'
    );

-- PROJECT
INSERT INTO projects (id, name, description, owner_id)
VALUES (
           '7b223b2f-aa70-460b-b743-cf9aeb5affe5',
           'Backend Development',
           'Build secure and scalable system',
           'f71e73c9-0f11-4c8f-b3cc-ae9f3012ace1'
       );

-- TASKS
INSERT INTO tasks (id, title, description, status, priority, project_id, assignee_id, due_date)
VALUES
    (
        'b7507231-9c0c-4cfb-b1bc-f5221a4ac3ae',
        'Configure Server',
        'Installing Nginx',
        'todo',
        'high',
        '7b223b2f-aa70-460b-b743-cf9aeb5affe5',
        'f71e73c9-0f11-4c8f-b3cc-ae9f3012ace1',
        CURRENT_DATE + INTERVAL '2 days'
    ),
    (
        'fa9af9a5-4c9d-4e5d-9fbc-a029ed3bcd97',
        'Collect data',
        'Make google forms for collecting data.',
        'in_progress',
        'medium',
        '7b223b2f-aa70-460b-b743-cf9aeb5affe5',
        '76f7d234-09c1-4f83-af24-44694e69c55f',
        CURRENT_DATE + INTERVAL '5 days'
    ),
    (
        '1e9f23a1-af84-4e44-8efa-f1196a3391b3',
        'Domain purchase',
        'Buy domain from Hostinger.',
        'done',
        'high',
        '7b223b2f-aa70-460b-b743-cf9aeb5affe5',
        'f71e73c9-0f11-4c8f-b3cc-ae9f3012ace1',
        CURRENT_DATE + INTERVAL '7 days'
    );