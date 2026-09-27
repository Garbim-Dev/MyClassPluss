import { Module } from '@nestjs/common';
import { AcademicController } from './academic.controller';
import { AcademicService } from './academic.service';
import { LessonController } from './lesson.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { NetworkService } from './network.service';
import { BackupService } from './backup.service';

@Module({
  imports: [
    PrismaModule,
    // outros módulos já importados...
  ],
  controllers: [AcademicController],
  providers: [
    AcademicService,
    NetworkService, // ⚡ Registre aqui para resolver a injeção
    BackupService,
  ],
  exports: [
    AcademicService,
    NetworkService, // ⚡ Opcional, caso outro módulo precise usar
    BackupService,
  ],
})
export class AcademicModule {}