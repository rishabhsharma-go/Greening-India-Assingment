import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { AllExceptionsFilter } from './../src/common/filters/http-exception.filter';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor';
import { AUTH_MESSAGES } from './../src/auth/constants/auth-messages';
import { ApiResponse } from './../src/common/interfaces/api-response.interface';

jest.setTimeout(30000);

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
      prefix: 'api/v',
    });

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const testUser = {
    name: 'E2E User',
    email: `e2e_${Date.now()}@test.com`,
    password: 'Password123!',
  };

  describe('/auth/register (POST)', () => {
    it('should register a new user', () => {
      return request(app.getHttpServer() as string)
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201)
        .expect((res: request.Response) => {
          const body = res.body as ApiResponse<{
            user: { email: string };
            token: string;
          }>;
          expect(body.success).toBe(true);
          expect(body.data?.user.email).toBe(testUser.email);
          expect(body.data?.token).toBeDefined();
        });
    });

    it('should fail with duplicate email', async () => {
      await request(app.getHttpServer() as string)
        .post('/api/v1/auth/register')
        .send(testUser);

      return request(app.getHttpServer() as string)
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(409)
        .expect((res: request.Response) => {
          const body = res.body as ApiResponse<unknown> & {
            statusCode: number;
          };
          expect(body.success).toBe(false);
          expect(body.statusCode).toBe(409);
        });
    });
  });

  describe('/auth/login (POST)', () => {
    it('should login successfully', () => {
      return request(app.getHttpServer() as string)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200)
        .expect((res: request.Response) => {
          const body = res.body as ApiResponse<{ token: string }>;
          expect(body.success).toBe(true);
          expect(body.message).toBe(AUTH_MESSAGES.LOGIN_SUCCESS);
          expect(body.data?.token).toBeDefined();
        });
    });

    it('should fail with wrong password', () => {
      return request(app.getHttpServer() as string)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'wrong',
        })
        .expect(401)
        .expect((res: request.Response) => {
          const body = res.body as ApiResponse<unknown>;
          expect(body.success).toBe(false);
        });
    });
  });
});
