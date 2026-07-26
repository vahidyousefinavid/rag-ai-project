import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: '*' });
  const port = Number(process.env.PORT) || 3011;
  await app.listen(port);
  console.log(`Vehicle CRM Service → http://localhost:${port}`);
}
bootstrap();
