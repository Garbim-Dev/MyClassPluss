import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as express from 'express';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors();

  // ⚡ Aumenta o limite de tamanho para requisições JSON e URL-encoded
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '200mb', extended: true }));

  // Garante que a pasta 'uploads/slides' e a pasta raiz 'uploads' existam
  const uploadDirSlides = join(process.cwd(), 'uploads', 'slides');
  if (!fs.existsSync(uploadDirSlides)) {
    fs.mkdirSync(uploadDirSlides, { recursive: true });
  }

  const uploadDirRoot = join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDirRoot)) {
    fs.mkdirSync(uploadDirRoot, { recursive: true });
  }

  // ⚡ Configura o servidor estático para servir os arquivos da pasta 'uploads'
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  await app.listen(3000, '0.0.0.0');
  console.log(`[MyClassPluss Backend] Rodando na rede local na porta 3000`);
}
bootstrap();