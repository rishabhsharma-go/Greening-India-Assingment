import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { UsersService } from '../../users/users.service';
import { UserRole } from '../../users/enums/user-role.enum';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let usersService: Partial<UsersService>;

  beforeEach(async () => {
    usersService = {
      findOne: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('secret'),
          },
        },
        {
          provide: UsersService,
          useValue: usersService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return user if found', async () => {
      const user = { id: 'uuid', email: 'test@example.com' };
      (usersService.findOne as jest.Mock).mockResolvedValue(user);

      const result = await strategy.validate({ sub: 'uuid', email: 'test@example.com', role: UserRole.USER });
      expect(result).toEqual(user);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      (usersService.findOne as jest.Mock).mockResolvedValue(null);

      await expect(strategy.validate({ sub: 'uuid', email: 'test@example.com', role: UserRole.USER }))
        .rejects.toThrow(UnauthorizedException);
    });
  });
});
