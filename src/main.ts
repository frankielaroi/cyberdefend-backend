import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { ConfigService } from '@nestjs/config';
import * as compression from 'compression';
import * as helmet from 'helmet';
import * as morgan from 'morgan';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // Security middleware
  app.use(helmet.default());
  app.use(compression());
  app.use(morgan('combined'));

  configureApp(app);

  // Close HTTP server, Bull queues and Prisma cleanly on SIGTERM (Heroku dyno restarts, docker stop)
  app.enableShutdownHooks();

  // CORS configuration
  app.enableCors({
    origin: ['https://www.cyber360.tech', 'http://localhost:5173','https://cyberdefend360.netlify.app'],
    credentials: true,
  });

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('CyberDefend 360 API')
    .setDescription('Backend API for DefendX and DefendX+ Platform')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('defendx', 'Cybersecurity Assessment endpoints')
    .addTag('defendxplus', 'Phishing & Monitoring endpoints')
    .addTag('billing', 'Billing & Subscription endpoints')
    .addTag('admin', 'Admin management endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get('PORT', 3000);
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`CyberDefend 360 API running on port ${port}`);
  logger.log(`API documentation at /api/docs`);
}

bootstrap();