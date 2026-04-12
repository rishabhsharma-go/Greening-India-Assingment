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
import { PROJECT_MESSAGES } from './../src/projects/constants/project-messages';
import { ApiResponse } from './../src/common/interfaces/api-response.interface';

jest.setTimeout(30000);

describe('Projects (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

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
      new ValidationPipe({ whitelist: true, transform: true }),
    );

    await app.init();

    const email = `proj_e2e_${Date.now()}@test.com`;
    await request(app.getHttpServer() as string)
      .post('/api/v1/auth/register')
      .send({ name: 'Proj Owner', email, password: 'Password123!' });

    const loginRes = await request(app.getHttpServer() as string)
      .post('/api/v1/auth/login')
      .send({ email, password: 'Password123!' });

    const body = loginRes.body as ApiResponse<{ token: string }>;
    authToken = body.data?.token || '';
  });

  afterAll(async () => {
    await app.close();
  });

  let projectId: string;

  describe('/projects (POST)', () => {
    it('should create a project with auth', () => {
      return request(app.getHttpServer() as string)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'E2E Project', description: 'Testing' })
        .expect(201)
        .expect((res: request.Response) => {
          const body = res.body as ApiResponse<{ id: string }>;
          expect(body.success).toBe(true);
          expect(body.message).toBe(PROJECT_MESSAGES.CREATED);
          expect(body.data?.id).toBeDefined();
          projectId = body.data?.id || '';
        });
    });

    it('should fail without token', () => {
      return request(app.getHttpServer() as string)
        .post('/api/v1/projects')
        .send({ name: 'Fail' })
        .expect(401);
    });
  });

  describe('/projects (GET)', () => {
    it('should list user projects', () => {
      return request(app.getHttpServer() as string)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res: request.Response) => {
          const body = res.body as ApiResponse<{ data: any[] }>;
          expect(body.success).toBe(true);
          expect(body.data?.data.length).toBeGreaterThan(0);
        });
    });
  });

  describe('/projects/:id (GET)', () => {
    it('should get project details', () => {
      return request(app.getHttpServer() as string)
        .get(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res: request.Response) => {
          const body = res.body as ApiResponse<{ id: string }>;
          expect(body.data?.id).toBe(projectId);
        });
    });
  });
});
