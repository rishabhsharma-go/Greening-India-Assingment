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
import { ApiResponse } from './../src/common/interfaces/api-response.interface';

jest.setTimeout(30000);

describe('Tasks (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let projectId: string;

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

    // Setup Flow
    const email = `task_e2e_${Date.now()}@test.com`;
    await request(app.getHttpServer() as string)
      .post('/api/v1/auth/register')
      .send({ name: 'Task Owner', email, password: 'Password123!' });

    const loginRes = await request(app.getHttpServer() as string)
      .post('/api/v1/auth/login')
      .send({ email, password: 'Password123!' });

    const loginBody = loginRes.body as ApiResponse<{ token: string }>;
    authToken = loginBody.data?.token || '';

    const projRes = await request(app.getHttpServer() as string)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Task Project' });

    const projBody = projRes.body as ApiResponse<{ id: string }>;
    projectId = projBody.data?.id || '';
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/projects/:projectId/tasks (POST)', () => {
    it('should create a task in project', () => {
      return request(app.getHttpServer() as string)
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'E2E Task',
          description: 'Testing integrated flow',
          status: 'todo',
          priority: 'high',
        })
        .expect(201)
        .expect((res: request.Response) => {
          const body = res.body as ApiResponse<{ title: string }>;
          expect(body.success).toBe(true);
          expect(body.data?.title).toBe('E2E Task');
        });
    });
  });

  describe('/projects/:projectId/tasks (GET)', () => {
    it('should list tasks for project', () => {
      return request(app.getHttpServer() as string)
        .get(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res: request.Response) => {
          const body = res.body as ApiResponse<{ data: any[] }>;
          expect(body.success).toBe(true);
          expect(body.data?.data.length).toBeGreaterThan(0);
        });
    });
  });
});
