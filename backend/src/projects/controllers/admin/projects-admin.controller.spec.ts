import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsAdminController } from './projects-admin.controller';
import { ProjectsAdminService } from '../../services/admin/projects-admin.service';
import { DataSource } from 'typeorm';

describe('ProjectsAdminController', () => {
  let controller: ProjectsAdminController;
  let service: jest.Mocked<Partial<ProjectsAdminService>>;

  beforeEach(async () => {
    service = {
      getSystemStats: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsAdminController],
      providers: [
        { provide: ProjectsAdminService, useValue: service },
        {
          provide: DataSource,
          useValue: { getRepository: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<ProjectsAdminController>(ProjectsAdminController);
  });

  it('should call service.getSystemStats', async () => {
    await controller.getSystemStats();
    expect(service.getSystemStats).toHaveBeenCalled();
  });

  it('should call service.findAll', async () => {
    await controller.findAll(2, 20);
    expect(service.findAll).toHaveBeenCalledWith(2, 20);
  });

  it('should call service.update', async () => {
    const dto = { name: 'Admin Edit' };
    await controller.update('p1', dto as any);
    expect(service.update).toHaveBeenCalledWith('p1', dto);
  });

  it('should call service.remove', async () => {
    await controller.remove('p1');
    expect(service.remove).toHaveBeenCalledWith('p1');
  });
});
