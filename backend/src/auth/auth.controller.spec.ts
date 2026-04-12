import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { User } from '../users/entities/user.entity';

describe('AuthController', () => {
  let controller: AuthController;
  let service: jest.Mocked<Partial<AuthService>>;

  beforeEach(async () => {
    service = {
      register: jest.fn(),
      login: jest.fn(),
    } as jest.Mocked<Partial<AuthService>>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: service }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should call authService.register', async () => {
      const dto = {
        name: 'Test',
        email: 't@t.com',
        password: 'p123',
      } as CreateUserDto;
      await controller.register(dto);
      expect(service.register).toHaveBeenCalledWith(dto);
    });
  });

  describe('login', () => {
    it('should call authService.login', async () => {
      const user = { id: '1', email: 't@t.com' } as User;
      await controller.login(user);
      expect(service.login).toHaveBeenCalledWith(user);
    });
  });
});
