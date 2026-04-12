import { Test, TestingModule } from '@nestjs/testing';
import { LoggingInterceptor } from './logging.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;

  const mockExecutionContext = {
    switchToHttp: jest.fn().mockReturnThis(),
    getRequest: jest.fn().mockReturnValue({
      method: 'GET',
      url: '/test',
    }),
    getResponse: jest.fn().mockReturnValue({
      statusCode: 200,
    }),
  } as unknown as ExecutionContext;

  const mockCallHandler = {
    handle: jest.fn().mockReturnValue(of('response')),
  } as CallHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoggingInterceptor],
    }).compile();

    interceptor = module.get<LoggingInterceptor>(LoggingInterceptor);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should log request and time taken', (done) => {
    const logSpy = jest
      .spyOn(
        (interceptor as unknown as { logger: { log: jest.Mock } }).logger,
        'log',
      )
      .mockImplementation();

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      next: () => {
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('GET /test 200 - '),
        );
        done();
      },
    });
  });
});
