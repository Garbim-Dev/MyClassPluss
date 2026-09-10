import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { AcademicModule } from './modules/academic/academic.module';
import { QuizModule } from './modules/quiz/quiz.module';
import { SessionModule } from './modules/session/session.module';
import { StudentModule } from './modules/student/student.module';
import { UploadModule } from './modules/uploads/upload.module'; // ⚡ Importado com sucesso

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AcademicModule,
    QuizModule,
    SessionModule,
    StudentModule,
    UploadModule, // ⚡ Adicionado aos imports do NestJS
  ],
})
export class AppModule {}