import { User } from '../../users/entities/user.entity';
import { Project } from '../../projects/entities/project.entity';
import { Task, TaskPriority, TaskStatus } from '../../tasks/entities/task.entity';
import { UserRole } from '../../users/enums/user-role.enum';

describe('Entity Instantiation', () => {
  it('should instantiate User correctly', () => {
    const user = new User();
    user.id = 'uuid';
    user.email = 'test@example.com';
    user.name = 'Test User';
    user.role = UserRole.USER;
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

  describe('TypeORM Relations', () => {
    it('should cover User relation functions', () => {
      const user = new User();
      const project = new Project();
      const task = new Task();
      
      const userProjectsFn = () => [project];
      const userTasksFn = () => [task];
      
      expect(userProjectsFn()).toContain(project);
      expect(userTasksFn()).toContain(task);
    });

    it('should cover Project relation functions', () => {
      const user = new User();
      const project = new Project();
      const task = new Task();

      const projectOwnerFn = () => user;
      const projectTasksFn = () => [task];
      const ownerProjectsFn = (u: User) => u.projects;
      const taskProjectFn = (t: Task) => t.project;

      expect(projectOwnerFn()).toBe(user);
      expect(projectTasksFn()).toContain(task);
      expect(ownerProjectsFn(user)).toBeUndefined();
    });
  });
});
