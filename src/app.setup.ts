import { ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

/**
 * Request-handling setup shared by main.ts and the e2e tests, so tests exercise
 * the same prefix, validation and error handling as production.
 */
export function configureApp(app: NestExpressApplication): void {
  // Behind Heroku's router: trust one proxy hop so req.ip is the real client and can't be spoofed further
  app.set('trust proxy', 1);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter(app.get(HttpAdapterHost)));

  app.setGlobalPrefix('api/v1');
}
