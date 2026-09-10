import { Module } from '@nestjs/common';
import { AcademicController } from './academic.controller';
import { AcademicService } from './academic.service';
import { LessonController } from './lesson.controller'; // 👈 Importe o controller de aulas
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AcademicController, LessonController], // 👈 Adicione aqui
  providers: [AcademicService],
})
export class AcademicModule {}