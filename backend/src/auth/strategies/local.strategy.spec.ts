import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { LocalStrategy } from './local.strategy';
import { AuthService } from '../auth.service';
import { AUTH_MESSAGES } from '../constants/auth-messages';

describe('LocalStrategy', () => {
  let strategy: LocalStrategy;
  let authService: Partial<AuthService>;

  beforeEach(async () => {
    authService = {
      validateUser: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStrategy,
        {
          provide: AuthService,
          useValue: authService,
        },
      ],
    }).compile();

    strategy = module.get<LocalStrategy>(LocalStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return user if credentials are valid', async () => {
      const user = { id: 'uuid', email: 'test@example.com' };
      (authService.validateUser as jest.Mock).mockResolvedValue(user);

      const result = await strategy.validate('test@example.com', 'password');
      expect(result).toEqual(user);
    });

    it('should throw UnauthorizedException if credentials are invalid', async () => {
      (authService.validateUser as jest.Mock).mockResolvedValue(null);

      await expect(strategy.validate('test@example.com', 'wrong'))
        .rejects.toThrow(new UnauthorizedException(AUTH_MESSAGES.INVALID_CREDENTIALS));
    });
  });
});
