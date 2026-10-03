import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StudentService {
  constructor(private prisma: PrismaService) {}

  // Retorna as turmas e cursos em que o aluno está matriculado
  async getMyClasses(userId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId },
      include: {
        class: {
          include: {
            course: true,
            modules: {
              include: {
                subject: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return enrollments.map((e) => ({
      enrollmentId: e.id,
      classId: e.class.id,
      classCode: e.class.code,
      courseName: e.class.course.name,
      enrolledAt: e.createdAt,
      subjects: e.class.modules.map((m) => ({
        id: m.subject.id,
        name: m.subject.name,
        workload: m.subject.workload,
        room: m.room,
        shift: m.shift,
      })),
    }));
  }

  // Retorna o boletim e histórico detalhado de todas as avaliações respondidas pelo aluno
  async getMyGrades(userId: string, classId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Aluno não encontrado.');
    }

    const answers = await this.prisma.studentAnswer.findMany({
      where: {
        userId,
        ...(classId ? { session: { classId } } : {}),
      },
      include: {
        question: true,
        session: {
          include: {
            quiz: {
              include: {
                subject: true,
                questions: true,
              },
            },
            class: {
              include: {
                course: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Agrupa as respostas por sessão de Quiz
    const sessionsMap = new Map();

    answers.forEach((ans) => {
      const sessId = ans.sessionId;
      if (!sessionsMap.has(sessId)) {
        const totalQuestions = Math.max(1, ans.session.quiz.questions.length);
        sessionsMap.set(sessId, {
          sessionId: sessId,
          quizTitle: ans.session.quiz.title,
          subjectName: ans.session.quiz?.subject?.name || 'Geral',
          classCode: ans.session.class?.code || 'Turma Avulsa',
          courseName: ans.session.class?.course?.name || 'Treinamento Técnico',
          date: ans.session.startedAt,
          totalQuestions,
          maxPointsPerQuestion: 10.0 / totalQuestions,
          totalGrade: 0,
          correctCount: 0,
          answersDetail: [],
        });
      }

      const currentSession = sessionsMap.get(sessId)!;
      let gradeEarned = 0;

      if (ans.isCorrect) {
        gradeEarned = currentSession.maxPointsPerQuestion;
        currentSession.correctCount++;
      } else if (ans.scoreEarned > 0) {
        gradeEarned = (ans.scoreEarned / 1000) * currentSession.maxPointsPerQuestion;
      }

      currentSession.totalGrade = Number(Math.min(10.0, currentSession.totalGrade + gradeEarned).toFixed(1));
      currentSession.answersDetail.push({
        questionTitle: ans.question.title,
        questionType: ans.question.type,
        isCorrect: ans.isCorrect,
        scoreEarned: ans.scoreEarned,
        timeRemaining: ans.timeRemaining,
      });
    });

    const historyList = Array.from(sessionsMap.values()).map((sess) => ({
      ...sess,
      isApproved: sess.totalGrade >= 7.0,
    }));

    const totalActivities = historyList.length;
    const approvedActivities = historyList.filter((h) => h.isApproved).length;
    const generalAverage =
      totalActivities > 0
        ? Number((historyList.reduce((acc, h) => acc + h.totalGrade, 0) / totalActivities).toFixed(1))
        : 0;

    return {
      studentName: user.name,
      studentEmail: user.email,
      overallStats: {
        totalActivities,
        approvedActivities,
        generalAverage,
        isGeneralApproved: generalAverage >= 7.0,
      },
      history: historyList,
    };
  }
}