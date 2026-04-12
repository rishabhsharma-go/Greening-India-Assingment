import { Test, TestingModule } from '@nestjs/testing';
import { AllExceptionsFilter } from './http-exception.filter';
import { HttpException, HttpStatus, ArgumentsHost } from '@nestjs/common';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AllExceptionsFilter],
    }).compile();

    filter = module.get<AllExceptionsFilter>(AllExceptionsFilter);
  });

  const mockJson = jest.fn();
  const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
  const mockGetResponse = jest.fn().mockReturnValue({ status: mockStatus });
  const mockGetRequest = jest
    .fn()
    .mockReturnValue({ url: '/test', method: 'GET' });
  const mockHost = {
    switchToHttp: () => ({
      getResponse: mockGetResponse,
      getRequest: mockGetRequest,
    }),
  } as unknown as ArgumentsHost;

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  it('should catch HttpException and format response', () => {
    const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Test error',
      }),
    );
  });

  it('should catch other errors and return 500', () => {
    const exception = new Error('Generic error');

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      }),
    );
  });

  it('should handle error without message (branch 28)', () => {
    const exception = new Error();
    delete (exception as unknown as { message?: string }).message;

    filter.catch(exception, mockHost);

    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Internal server error',
      }),
    );
  });

  it('should handle object message without message property (branch 43)', () => {
    const exception = new HttpException(
      { error: 'Some error' },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, mockHost);

    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        message: { error: 'Some error' },
      }),
    );
  });
});
