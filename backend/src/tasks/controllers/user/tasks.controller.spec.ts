import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from './tasks.controller';
import { TasksService } from '../../services/core/tasks.service';
import { CreateTaskDto } from '../../dto/create-task.dto';
import { UpdateTaskDto } from '../../dto/update-task.dto';
import { User } from '../../../users/entities/user.entity';
import { DataSource } from 'typeorm';

describe('TasksController', () => {
  let controller: TasksController;
  let service: jest.Mocked<Partial<TasksService>>;

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    } as jest.Mocked<Partial<TasksService>>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        { provide: TasksService, useValue: service },
        {
          provide: DataSource,
          useValue: { getRepository: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<TasksController>(TasksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create()', async () => {
    const user = { id: 'u1' } as User;
    const dto = { title: 'T' } as CreateTaskDto;
    await controller.create('p1', dto, user);
    expect(service.create).toHaveBeenCalledWith('p1', dto, user);
  });

  it('findAll()', async () => {
    await controller.findAll('p1', undefined, undefined, 1, 10);
    expect(service.findAll).toHaveBeenCalledWith('p1', undefined, undefined, 1, 10);
    await controller.findAll('p1');
    expect(service.findAll).toHaveBeenCalledWith('p1', undefined, undefined, 1, 10);
  });

  it('findOne()', async () => {
    await controller.findOne('t1');
    expect(service.findOne).toHaveBeenCalledWith('t1');
  });

  it('update()', async () => {
    const user = { id: 'u1' } as User;
    const dto = { title: 'T' } as UpdateTaskDto;
    await controller.update('t1', dto, user);
    expect(service.update).toHaveBeenCalledWith('t1', dto, user);
  });

  it('remove()', async () => {
    const user = { id: 'u1' } as User;
    await controller.remove('t1', user);
    expect(service.remove).toHaveBeenCalledWith('t1', user);
  });
});
