import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../users/enums/user-role.enum';
import { User } from '../users/entities/user.entity';
import { Role } from '../users/entities/role.entity';
import { CreateUserDto } from '../users/dto/create-user.dto';

describe('AuthService', () => {
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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user without password on success', async () => {
      const user = {
        id: '1',
        email: 'test@test.com',
        password: 'hashedPassword',
      } as User;
      (usersService.findByEmailWithPassword as jest.Mock).mockResolvedValue(
        user,
      );
      (jest.spyOn(bcrypt, 'compare') as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@test.com', 'password');
      expect(result).toEqual({ id: '1', email: 'test@test.com' });
    });

    it('should return null on invalid password', async () => {
      const user = {
        id: '1',
        email: 'test@test.com',
        password: 'hashedPassword',
      } as User;
      (usersService.findByEmailWithPassword as jest.Mock).mockResolvedValue(
        user,
      );
      (jest.spyOn(bcrypt, 'compare') as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('test@test.com', 'wrong');
      expect(result).toBeNull();
    });

    it('should return null if user not found', async () => {
      (usersService.findByEmailWithPassword as jest.Mock).mockResolvedValue(
        null,
      );
      const result = await service.validateUser('none@test.com', 'pass');
      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return access token and user', async () => {
      const user = { 
        id: '1', 
        email: 'test@test.com', 
        role: { slug: UserRole.USER } as unknown as Role
      };
      (jwtService.signAsync as jest.Mock).mockResolvedValue('token');

      const result = await service.login(user as unknown as User);
      expect(result).toEqual({ 
        token: 'token', 
        user: { ...user, role: UserRole.USER } 
      });
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: user.id,
        user_id: user.id,
        email: user.email,
        role: UserRole.USER,
      });
    });
  });

  describe('register', () => {
    it('should create user, sign token and return {token, user}', async () => {
      const dto = { name: 'Test', email: 'test@test.com', password: 'pass' };
      const hashedPass = 'hashed';
      const createdUser = {
        id: '1',
        ...dto,
        password: hashedPass,
        role: { slug: UserRole.USER } as unknown as User,
      } as unknown as User;

      (jest.spyOn(bcrypt, 'hash') as jest.Mock).mockResolvedValue(hashedPass);
      (usersService.create as jest.Mock).mockResolvedValue(createdUser);
      (jwtService.signAsync as jest.Mock).mockResolvedValue('token');

      const result = await service.register(dto as CreateUserDto);

      expect(result).toEqual({
        token: 'token',
        user: {
          id: '1',
          name: 'Test',
          email: 'test@test.com',
          role: UserRole.USER,
        },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('pass', 12);
    });
  });
});
