import { Test, TestingModule } from '@nestjs/testing';
import { TasksAdminController } from './tasks-admin.controller';
import { TasksAdminService } from '../../services/admin/tasks-admin.service';
import { DataSource } from 'typeorm';
import { UpdateTaskDto } from '../../dto/update-task.dto';

describe('TasksAdminController', () => {
  let controller: TasksAdminController;
  let service: jest.Mocked<Partial<TasksAdminService>>;

  beforeEach(async () => {
    service = {
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksAdminController],
      providers: [
        { provide: TasksAdminService, useValue: service },
        {
          provide: DataSource,
          useValue: { getRepository: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<TasksAdminController>(TasksAdminController);
  });

  it('should call service.update', async () => {
    const dto = { title: 'Admin Update' };
    await controller.update('t1', dto as unknown as UpdateTaskDto);
    expect(service.update).toHaveBeenCalledWith('t1', dto);
  });

  it('should call service.remove', async () => {
    await controller.remove('t1');
    expect(service.remove).toHaveBeenCalledWith('t1');
  });
});
