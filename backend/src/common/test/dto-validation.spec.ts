import { validate } from 'class-validator';
import { RegisterDto, LoginDto } from '../../auth/dto/auth.dto';
import { CreateProjectDto } from '../../projects/dto/create-project.dto';
import { UpdateProjectDto } from '../../projects/dto/update-project.dto';
import { CreateTaskDto } from '../../tasks/dto/create-task.dto';
import { UpdateTaskDto } from '../../tasks/dto/update-task.dto';
import { CreateUserDto } from '../../users/dto/create-user.dto';
import { UpdateUserDto } from '../../users/dto/update-user.dto';
import { TaskPriority, TaskStatus } from '../../tasks/entities/task.entity';

describe('DTO Validation', () => {
  describe('LoginDto', () => {
    it('should validate correctly with valid data', async () => {
      const dto = new LoginDto();
      dto.email = 'test@example.com';
      dto.password = 'password123';
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail with invalid email', async () => {
      const dto = new LoginDto();
      dto.email = 'invalid-email';
      dto.password = 'password123';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('RegisterDto', () => {
    it('should validate correctly', async () => {
      const dto = new RegisterDto();
      dto.name = 'Test User';
      dto.email = 'test@example.com';
      dto.password = 'password123';
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('CreateProjectDto', () => {
    it('should validate correctly', async () => {
      const dto = new CreateProjectDto();
      dto.name = 'Test Project';
      dto.description = 'Test Description';
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('UpdateProjectDto', () => {
    it('should validate correctly', async () => {
      const dto = new UpdateProjectDto();
      dto.name = 'Updated Project';
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('CreateTaskDto', () => {
    it('should validate correctly', async () => {
      const dto = new CreateTaskDto();
      dto.title = 'Test Task';
      dto.priority = TaskPriority.HIGH;
      dto.status = TaskStatus.TODO;
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('UpdateTaskDto', () => {
    it('should validate correctly', async () => {
      const dto = new UpdateTaskDto();
      dto.title = 'Updated Task';
      dto.status = TaskStatus.DONE;
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('CreateUserDto', () => {
    it('should validate correctly', async () => {
      const dto = new CreateUserDto();
      dto.name = 'John Doe';
      dto.email = 'john@example.com';
      dto.password = 'password123';
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('UpdateUserDto', () => {
    it('should validate correctly', async () => {
      const dto = new UpdateUserDto();
      dto.name = 'John Updated';
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });
});
