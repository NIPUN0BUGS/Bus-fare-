import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { brand } from '@buslanka/ui/tokens/brand';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // Security headers
  app.use(helmet({ contentSecurityPolicy: process.env['NODE_ENV'] === 'production' }));

  // Response compression
  app.use(compression());

  // Global API prefix and versioning
  app.setGlobalPrefix('v1');
  app.enableVersioning({ type: VersioningType.URI });

  // CORS
  const origins = (process.env['CORS_ORIGINS'] ?? 'http://localhost:3000').split(',');
  app.enableCors({ origin: origins, credentials: true });

  // Global validation pipe — strip unknown, validate all DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // OpenAPI documentation (non-production)
  if (process.env['NODE_ENV'] !== 'production') {
    const config = new DocumentBuilder()
      .setTitle(`${brand.productName} API`)
      .setDescription('Bus fare and journey planning API for Sri Lanka')
      .setVersion('1.0')
      .addBearerAuth()
      .addApiKey({ type: 'apiKey', name: 'X-Api-Key', in: 'header' }, 'operator-api-key')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  const port = parseInt(process.env['API_PORT'] ?? '3001', 10);
  await app.listen(port);
  console.warn(`BusLanka API running on port ${port}`);
}

void bootstrap();
