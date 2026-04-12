import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { User } from '../users/entities/user.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

describe('ProjectsController', () => {
  let controller: ProjectsController;
  let service: jest.Mocked<Partial<ProjectsService>>;

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      getStats: jest.fn(),
    } as jest.Mocked<Partial<ProjectsService>>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [{ provide: ProjectsService, useValue: service }],
    }).compile();

    controller = module.get<ProjectsController>(ProjectsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create()', async () => {
    const user = { id: '1' } as User;
    const dto = { name: 'P', description: 'Desc' } as CreateProjectDto;
    await controller.create(dto, user);
    expect(service.create).toHaveBeenCalledWith(dto, user);
  });

  it('findAll()', async () => {
    const user = { id: '1' } as User;
    await controller.findAll(user, 1, 10);
    expect(service.findAll).toHaveBeenCalledWith(user, 1, 10);
  });

  it('findOne()', async () => {
    await controller.findOne('1');
    expect(service.findOne).toHaveBeenCalledWith('1');
  });

  it('update()', async () => {
    const user = { id: '1' } as User;
    const dto = { name: 'P' } as UpdateProjectDto;
    await controller.update('1', dto, user);
    expect(service.update).toHaveBeenCalledWith('1', dto, user);
  });

  it('remove()', async () => {
    const user = { id: '1' } as User;
    await controller.remove('1', user);
    expect(service.remove).toHaveBeenCalledWith('1', user);
  });

  it('getStats()', async () => {
    await controller.getStats('1');
    expect(service.getStats).toHaveBeenCalledWith('1');
  });
});
