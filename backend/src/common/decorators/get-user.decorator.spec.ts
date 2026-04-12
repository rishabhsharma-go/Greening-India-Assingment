import { ExecutionContext } from '@nestjs/common';
import { GetUser } from './get-user.decorator';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';

function getParamDecoratorFactory(decorator: Function) {
  class Test {
    public test(@decorator() value: unknown) {}
  }
  const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
  return args[Object.keys(args)[0]].factory;
}

describe('GetUserDecorator', () => {
  it('should return the user from the request', () => {
    const factory = getParamDecoratorFactory(GetUser);
    const mockUser = { id: 'uuid', email: 'test@example.com' };
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: mockUser,
        }),
      }),
    } as unknown as ExecutionContext;

    const result = factory(null, mockContext);
    expect(result).toBe(mockUser);
  });
});
