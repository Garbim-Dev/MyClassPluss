import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { AuthGuard } from '@nestjs/passport';
import * as fs from 'fs';

// ⚡ Garante que o diretório 'uploads' exista na raiz do backend
const uploadDir = join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

@Controller('upload')
@UseGuards(AuthGuard('jwt'))
export class UploadController {
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: uploadDir,
        filename: (req, file, callback) => {
          // Remove acentos e caracteres especiais para evitar quebra no navegador mobile
          const cleanOriginalName = file.originalname
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9.-]/g, '_');

          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const extension = extname(cleanOriginalName) || '.pdf';
          callback(null, `doc-${uniqueSuffix}${extension}`);
        },
      }),
      limits: {
        fileSize: 100 * 1024 * 1024, // ⚡ Aumentado para 100MB (adequado para PDFs e apresentações)
      },
      fileFilter: (req, file, callback) => {
        // ⚡ Permite Imagens, PDFs e Apresentações
        const allowedMimes = [
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/gif',
          'application/pdf',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ];

        const isAllowedExtension = file.originalname.match(/\.(jpg|jpeg|png|webp|gif|pdf|ppt|pptx)$/i);

        if (allowedMimes.includes(file.mimetype) || isAllowedExtension) {
          return callback(null, true);
        }

        return callback(
          new BadRequestException('Formato de arquivo não suportado! Envie imagens (JPG/PNG) ou documentos (PDF/PPT).'),
          false,
        );
      },
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado ou campo inválido.');
    }

    // ⚡ Retorna caminho relativo padronizado '/uploads/nome-do-arquivo.ext'
    const relativeUrl = `/uploads/${file.filename}`;

    return {
      success: true,
      url: relativeUrl,
      fileUrl: relativeUrl,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
    };
  }
}