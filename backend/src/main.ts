import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import type { Request, Response } from 'express';

async function bootstrap() {
  const databaseTarget = process.env.DB_SOCKET_PATH
    ? `unix:${process.env.DB_SOCKET_PATH}`
    : `tcp:${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '3306'}`;
  console.log(`API bootstrap: PORT=${process.env.PORT || process.env.APP_PORT || 3000}, database=${process.env.DB_DATABASE || 'seo_platform'}, user=${process.env.DB_USERNAME || 'root'}, target=${databaseTarget}`);
  const app = await NestFactory.create(AppModule);
  const express = app.getHttpAdapter().getInstance();
  express.disable('x-powered-by');
  express.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 1));
  app.use(helmet());
  express.get('/healthz', (_request: Request, response: Response) => response.status(200).send('ok'));

  app.setGlobalPrefix('api/v1');

  const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:8088').split(',').map(value => value.trim()).filter(Boolean);
  app.enableCors({ origin: allowedOrigins, credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = process.env.PORT || process.env.APP_PORT || 3000;
  await app.listen(port);
  console.log(`Server running on http://localhost:${port}`);
}

bootstrap().catch(error => {
  console.error('NestJS bootstrap failed:', error);
  process.exit(1);
});
