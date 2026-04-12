import { NestFactory } from '@nestjs/core';
import {
  ValidationPipe,
  VersioningType,
  Logger as NestLogger,
} from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger as PinoLogger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Use nestjs-pino for structured logging
  app.useLogger(app.get(PinoLogger));

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'api/v',
  });

  const config = new DocumentBuilder()
    .setTitle('TaskFlow API')
    .setDescription('The TaskFlow API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // Generate swagger spec for external tools
  fs.writeFileSync('./swagger-spec.json', JSON.stringify(document));

  app.useGlobalFilters(new AllExceptionsFilter());

  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors();

  app.enableShutdownHooks();

  const bootstrapLogger = new NestLogger('Bootstrap');
  const port = process.env.PORT || 3000;
  await app.listen(port);
  bootstrapLogger.log(
    `Application is running on: http://localhost:${port}/api/v1`,
  );
}
bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
