import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { Response } from 'express';
import * as fs from 'fs';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('academic')
export class LessonController {
  constructor(private prisma: PrismaService) {}

  @Get('subjects/:subjectId/lessons')
  async getLessonsBySubject(@Param('subjectId') subjectId: string) {
    return this.prisma.lesson.findMany({
      where: { subjectId },
      orderBy: { createdAt: 'asc' },
    });
  }

  @Post('lessons')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          // ⚡ Salva na pasta 'uploads/slides' na raiz do backend
          const uploadPath = join(process.cwd(), 'uploads', 'slides');
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          callback(null, `slide-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async createLesson(
    @Body() body: { subjectId: string; classId?: string; title: string; description?: string },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const fileUrl = file ? `/uploads/slides/${file.filename}` : null;

    const lesson = await this.prisma.lesson.create({
      data: {
        subjectId: body.subjectId,
        classId: body.classId || null,
        title: body.title,
        description: body.description || '',
        fileUrl,
      },
    });

    return lesson;
  }

  @Delete('lessons/:id')
  @UseGuards(AuthGuard('jwt'))
  async deleteLesson(@Param('id') id: string) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (lesson && lesson.fileUrl) {
      const filePath = join(process.cwd(), lesson.fileUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath); // Remove o arquivo físico da pasta
      }
    }

    await this.prisma.lesson.delete({
      where: { id },
    });
    return { message: 'Aula removida com sucesso.' };
  }
}