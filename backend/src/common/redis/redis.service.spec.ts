import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from './redis.service';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

jest.mock('ioredis', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      quit: jest.fn().mockResolvedValue('OK'),
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
    })),
  };
});

describe('RedisService', () => {
  let service: RedisService;
  let mockConfigService: { get: jest.Mock };
  let mockRedisClient: {
    on: jest.Mock;
    quit: jest.Mock;
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
    keys: jest.Mock;
  };

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn(
        (key: string, defaultValue: unknown) => defaultValue as string,
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
    service.onModuleInit();
    mockRedisClient = (service as unknown as { client: typeof mockRedisClient })
      .client;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should initialize redis client', () => {
      expect(Redis).toHaveBeenCalled();
      expect(mockRedisClient.on).toHaveBeenCalledWith(
        'connect',
        expect.any(Function),
      );
      expect(mockRedisClient.on).toHaveBeenCalledWith(
        'error',
        expect.any(Function),
      );
    });
  });

  describe('onModuleDestroy', () => {
    it('should quit redis client', async () => {
      await service.onModuleDestroy();
      expect(mockRedisClient.quit).toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('should return value from redis', async () => {
      mockRedisClient.get.mockResolvedValue('value');
      const result = await service.get('key');
      expect(result).toBe('value');
      expect(mockRedisClient.get).toHaveBeenCalledWith('key');
    });
  });

  describe('set', () => {
    it('should set value without TTL', async () => {
      await service.set('key', 'value');
      expect(mockRedisClient.set).toHaveBeenCalledWith('key', 'value');
    });

    it('should set value with TTL', async () => {
      await service.set('key', 'value', 10);
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'key',
        'value',
        'EX',
        10,
      );
    });
  });

  describe('del', () => {
    it('should delete key', async () => {
      await service.del('key');
      expect(mockRedisClient.del).toHaveBeenCalledWith('key');
    });
  });

  describe('delByPrefix', () => {
    it('should delete keys by prefix', async () => {
      mockRedisClient.keys.mockResolvedValue(['key1', 'key2']);
      await service.delByPrefix('pref');
      expect(mockRedisClient.keys).toHaveBeenCalledWith('pref*');
      expect(mockRedisClient.del).toHaveBeenCalledWith('key1', 'key2');
    });

    it('should do nothing if no keys found', async () => {
      mockRedisClient.keys.mockResolvedValue([]);
      await service.delByPrefix('pref');
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });
  });
});
