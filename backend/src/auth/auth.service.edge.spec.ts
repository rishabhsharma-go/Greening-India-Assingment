import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { User } from '../users/entities/user.entity';

describe('AuthService Edge Cases', () => {
  let service: AuthService;
  let usersService: jest.Mocked<Partial<UsersService>>;
  let jwtService: jest.Mocked<Partial<JwtService>>;

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      findByEmailWithPassword: jest.fn(),
      create: jest.fn(),
    };
    jwtService = {
      signAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('register failure cases', () => {
    it('should throw error if bcrypt hashing fails', async () => {
      jest
        .spyOn(bcrypt, 'hash')
        .mockRejectedValue(new Error('Hashing failed') as never);
      const dto = {
        email: 't@t.com',
        password: 'p',
        name: 'N',
      } as CreateUserDto;

      await expect(service.register(dto)).rejects.toThrow('Hashing failed');
    });

    it('should throw error if jwt signing fails', async () => {
      (usersService.create as jest.Mock).mockResolvedValue({
        id: '1',
        email: 't@t.com',
        role: 'USER',
      });
      (jwtService.signAsync as jest.Mock).mockRejectedValue(
        new Error('JWT failed'),
      );
      const dto = {
        email: 't@t.com',
        password: 'p',
        name: 'N',
      } as CreateUserDto;

      await expect(service.register(dto)).rejects.toThrow('JWT failed');
    });

    it('should throw error if db creation fails', async () => {
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed' as never);
      (usersService.create as jest.Mock).mockRejectedValue(
        new Error('DB Error'),
      );
      const dto = {
        email: 't@t.com',
        password: 'p',
        name: 'N',
      } as CreateUserDto;

      await expect(service.register(dto)).rejects.toThrow('DB Error');
    });
  });

  describe('validateUser failure cases', () => {
    it('should propagate repository errors', async () => {
      (usersService.findByEmailWithPassword as jest.Mock).mockRejectedValue(
        new Error('DB Query Failed'),
      );
      await expect(service.validateUser('t@t.com', 'p')).rejects.toThrow(
        'DB Query Failed',
      );
    });
  });

  describe('login failure cases', () => {
    it('should propagate jwt sign failure', async () => {
      (jwtService.signAsync as jest.Mock).mockRejectedValue(
        new Error('Sign Failed'),
      );
      await expect(service.login({ id: '1' } as User)).rejects.toThrow(
        'Sign Failed',
      );
    });
  });
});
