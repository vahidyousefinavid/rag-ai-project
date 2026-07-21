import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: '*' });
  const port = process.env.PORT ?? 3010;
  await app.listen(port);
  console.log(`Voice Agent Service → http://localhost:${port}`);
}
bootstrap();
