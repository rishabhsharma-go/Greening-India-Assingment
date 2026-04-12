import { User } from '../../users/entities/user.entity';
import { Project } from '../../projects/entities/project.entity';
import { Task, TaskPriority, TaskStatus } from '../../tasks/entities/task.entity';
import { UserRole } from '../../users/enums/user-role.enum';
import { Role } from '../../users/entities/role.entity';

describe('Entity Instantiation', () => {
  it('should instantiate User correctly', () => {
    const user = new User();
    user.id = 'uuid';
    user.email = 'test@example.com';
    user.name = 'Test User';
    user.role = { id: 'r1', slug: UserRole.USER } as any;
    expect(user.id).toBe('uuid');
    expect(user.email).toBe('test@example.com');
  });

  it('should instantiate Project correctly', () => {
    const project = new Project();
    project.id = 'uuid';
    project.name = 'Test Project';
    project.description = 'Test Description';
    expect(project.name).toBe('Test Project');
  });

  it('should instantiate Task correctly', () => {
    const task = new Task();
    task.id = 'uuid';
    task.title = 'Test Task';
    task.priority = TaskPriority.MEDIUM;
    task.status = TaskStatus.TODO;
    expect(task.title).toBe('Test Task');
  });

  describe('Role Entity', () => {
    it('should lowercase slug before insert/update', () => {
      const role = new Role();
      role.slug = 'ADMIN' as any;
      role.toLowerCaseSlug();
      expect(role.slug).toBe('admin');
    });
  });

  describe('TypeORM Relations', () => {
    it('should cover User relation functions', () => {
      const user = new User();
      const project = new Project();
      const task = new Task();
      const role = new Role();
      
      // These tests purely check if the objects can hold these types
      user.projects = [project];
      user.tasks = [task];
      user.role = role;
      
      expect(user.projects).toContain(project);
      expect(user.tasks).toContain(task);
      expect(user.role).toBe(role);
    });

    it('should cover Project and Task relation functions', () => {
      const user = new User();
      const project = new Project();
      const task = new Task();

      project.owner = user;
      project.tasks = [task];
      task.project = project;
      task.assignee = user;

      expect(project.owner).toBe(user);
      expect(project.tasks).toContain(task);
      expect(task.project).toBe(project);
      expect(task.assignee).toBe(user);
    });
  });
});
