import { Test, TestingModule } from '@nestjs/testing';
import { TransformInterceptor } from './transform.interceptor';
import { of } from 'rxjs';
import { ExecutionContext, CallHandler } from '@nestjs/common';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<unknown>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TransformInterceptor],
    }).compile();

    interceptor =
      module.get<TransformInterceptor<unknown>>(TransformInterceptor);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should transform response', (done) => {
    const data = { id: 1 };
    const context = {} as ExecutionContext;
    const next = {
      handle: () => of(data),
    } as CallHandler;

    interceptor.intercept(context, next).subscribe((result) => {
      expect(result).toEqual({
        success: true,
        message: 'Request successful',
        data: data,
      });
      done();
    });
  });
});
