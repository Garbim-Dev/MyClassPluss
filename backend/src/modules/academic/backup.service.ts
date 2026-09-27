import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BackupService {
  constructor(private prisma: PrismaService) {}

  // 1. Exporta todas as tabelas essenciais em um JSON estruturado
  async exportFullBackup() {
    const [
      institutions,
      courses,
      subjects,
      classes,
      classModules,
      students,
      attendance,
      quizzes,
      questions,
      options,
      submissions,
    ] = await Promise.all([
      this.prisma.institution.findMany(),
      this.prisma.course.findMany(), // ⚡ Corrigido: 'course' em vez de 'globalCourse'
      this.prisma.subject.findMany(),
      this.prisma.class.findMany(),
      this.prisma.classModule.findMany(),
      this.prisma.user.findMany({ where: { role: 'ALUNO' } }),
      this.prisma.attendance.findMany(),
      this.prisma.quiz.findMany(),
      this.prisma.question.findMany(),
      this.prisma.questionOption.findMany(),
      this.prisma.examSubmission.findMany({ include: { answers: true } }),
    ]);

    return {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      system: 'MyClassPluss',
      data: {
        institutions,
        courses,
        subjects,
        classes,
        classModules,
        students,
        attendance,
        quizzes,
        questions,
        options,
        submissions,
      },
    };
  }

  // 2. Restaura o banco a partir do payload JSON
  async restoreBackup(backupPayload: any) {
    if (!backupPayload?.data || backupPayload?.system !== 'MyClassPluss') {
      throw new BadRequestException('Arquivo de backup inválido ou incompatível.');
    }

    const {
      institutions = [],
      courses = [],
      subjects = [],
      classes = [],
      classModules = [],
      students = [],
      attendance = [],
      quizzes = [],
      questions = [],
      options = [],
      submissions = [],
    } = backupPayload.data;

    return this.prisma.$transaction(async (tx) => {
      // Upsert de Instituições
      for (const inst of institutions) {
        await tx.institution.upsert({
          where: { id: inst.id },
          create: inst,
          update: inst,
        });
      }

      // ⚡ Upsert de Cursos corrigido para tx.course
      for (const c of courses) {
        await tx.course.upsert({
          where: { id: c.id },
          create: c,
          update: c,
        });
      }

      // Upsert de Disciplinas
      for (const s of subjects) {
        await tx.subject.upsert({
          where: { id: s.id },
          create: s,
          update: s,
        });
      }

      // Upsert de Turmas
      for (const cl of classes) {
        await tx.class.upsert({
          where: { id: cl.id },
          create: cl,
          update: cl,
        });
      }

      // Upsert de Módulos das Turmas
      for (const cm of classModules) {
        await tx.classModule.upsert({
          where: { id: cm.id },
          create: cm,
          update: cm,
        });
      }

      // Upsert de Alunos
      for (const st of students) {
        await tx.user.upsert({
          where: { id: st.id },
          create: st,
          update: st,
        });
      }

      // Upsert de Frequência
      for (const att of attendance) {
        await tx.attendance.upsert({
          where: { id: att.id },
          create: att,
          update: att,
        });
      }

      // Upsert de Quizzes e Questões
      for (const qz of quizzes) {
        await tx.quiz.upsert({
          where: { id: qz.id },
          create: qz,
          update: qz,
        });
      }

      for (const q of questions) {
        await tx.question.upsert({
          where: { id: q.id },
          create: q,
          update: q,
        });
      }

      for (const opt of options) {
        await tx.questionOption.upsert({
          where: { id: opt.id },
          create: opt,
          update: opt,
        });
      }

      // Upsert de Submissões e Notas
      for (const sub of submissions) {
        const { answers, ...subData } = sub;
        await tx.examSubmission.upsert({
          where: { id: subData.id },
          create: subData,
          update: subData,
        });
      }

      return { success: true, restoredAt: new Date().toISOString() };
    });
  }
}