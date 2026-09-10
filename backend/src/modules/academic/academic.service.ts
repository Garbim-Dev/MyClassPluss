import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as QRCode from 'qrcode';
import * as os from 'os';

function getLocalNetworkIp(preferredIp?: string): string {
  if (preferredIp && preferredIp !== 'localhost' && preferredIp !== '127.0.0.1') {
    return preferredIp;
  }

  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      // Procura por IPv4 que não seja interno e comece com redes locais comuns (192.168.x.x, 10.x.x.x, 172.x.x.x)
      if (iface.family === 'IPv4' && !iface.internal) {
        if (
          iface.address.startsWith('192.168.') ||
          iface.address.startsWith('10.') ||
          iface.address.startsWith('172.')
        ) {
          return iface.address;
        }
      }
    }
  }

  // Fallback para o primeiro endereço válido encontrado
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }

  return 'localhost';
}

@Injectable()
export class AcademicService {
  constructor(private prisma: PrismaService) {}

  // ⚡ Listar todas as instituições do professor logado
  async listInstitutions(teacherId: string) {
    return this.prisma.institution.findMany({
      where: { teacherId },
      include: {
        courses: {
          include: {
            classes: {
              include: {
                modules: { include: { subject: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ⚡ Criar nova Instituição
  async createInstitution(data: any, teacherId: string) {
    return this.prisma.institution.create({
      data: {
        name: data.name,
        location: data.location || '',
        description: data.description || '',
        teacherId,
      },
    });
  }

  // ⚡ Atualizar Instituição
  async updateInstitution(id: string, data: any, teacherId: string) {
    const institution = await this.prisma.institution.findUnique({
      where: { id },
    });

    if (!institution) {
      throw new NotFoundException('Instituição não encontrada.');
    }

    return this.prisma.institution.update({
      where: { id },
      data: {
        name: data.name,
        location: data.location,
        description: data.description,
      },
    });
  }

  // ⚡ Excluir Instituição e seus cursos/turmas em cascata
  async deleteInstitution(id: string) {
    const institution = await this.prisma.institution.findUnique({
      where: { id },
    });

    if (!institution) {
      throw new NotFoundException('Instituição não encontrada.');
    }

    return this.prisma.institution.delete({
      where: { id },
    });
  }

  // ⚡ Listar Cursos por Instituição
  async listCoursesByInstitution(institutionId: string) {
    return this.prisma.course.findMany({
      where: { institutionId },
      include: {
        classes: {
          include: {
            modules: { include: { subject: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  // ⚡ Criar Novo Curso vinculado a uma Instituição
  async createCourse(data: { name: string; workload: number; institutionId: string }) {
    return this.prisma.course.create({
      data: {
        name: data.name,
        workload: Number(data.workload) || 1200,
        institutionId: data.institutionId,
      },
    });
  }

  // ⚡ Atualizar Curso
  async updateCourse(id: string, data: { name: string; workload: number }) {
    return this.prisma.course.update({
      where: { id },
      data: {
        name: data.name,
        workload: Number(data.workload),
      },
    });
  }

  // ⚡ Excluir Curso
  async deleteCourse(id: string) {
    return this.prisma.course.delete({
      where: { id },
    });
  }

  // ⚡ Criar nova Disciplina
  async createSubject(data: { name: string; workload: number }) {
    return this.prisma.subject.create({
      data: {
        name: data.name,
        workload: Number(data.workload) || 40,
      },
    });
  }

  // ⚡ Atualizar Disciplina
  async updateSubject(id: string, data: { name: string; workload: number }) {
    return this.prisma.subject.update({
      where: { id },
      data: {
        name: data.name,
        workload: Number(data.workload),
      },
    });
  }

  // ⚡ Excluir Disciplina
  async deleteSubject(id: string) {
    return this.prisma.subject.delete({
      where: { id },
    });
  }

  // ⚡ Criar Turma / Demanda completa
  async createDemand(data: any, teacherId: string) {
    const academicClass = await this.prisma.class.create({
      data: {
        code: data.classCode,
        courseId: data.courseId,
        teacherId: teacherId || undefined,
      },
    });

    let subjectId = data.subjectId;
    if (!subjectId && data.subjectName) {
      let subject = await this.prisma.subject.findFirst({
        where: { name: data.subjectName },
      });
      if (!subject) {
        subject = await this.prisma.subject.create({
          data: {
            name: data.subjectName,
            workload: Number(data.subjectWorkload) || 40,
          },
        });
      }
      subjectId = subject.id;
    }

    if (subjectId) {
      await this.prisma.classModule.create({
        data: {
          classId: academicClass.id,
          subjectId,
          room: data.room || 'Sala Principal',
          shift: data.shift || 'MATUTINO',
          startTime: data.startTime || '07:30',
          endTime: data.endTime || '11:30',
          startDate: data.startDate ? new Date(data.startDate) : new Date(),
          endDate: data.endDate ? new Date(data.endDate) : new Date(),
        },
      });
    }

    return this.prisma.class.findUnique({
      where: { id: academicClass.id },
      include: {
        course: true,
        modules: { include: { subject: true } },
      },
    });
  }

  // ⚡ Atualizar dados de uma turma/demanda existente
  async updateDemand(classId: string, data: any, teacherId: string) {
    const academicClass = await this.prisma.class.findUnique({
      where: { id: classId },
    });

    if (!academicClass) {
      throw new NotFoundException('Turma não encontrada.');
    }

    await this.prisma.class.update({
      where: { id: classId },
      data: {
        code: data.classCode,
        courseId: data.courseId || undefined,
      },
    });

    if (data.subjectId || data.room) {
      const existingModule = await this.prisma.classModule.findFirst({
        where: { classId },
      });

      if (existingModule) {
        await this.prisma.classModule.update({
          where: { id: existingModule.id },
          data: {
            subjectId: data.subjectId || existingModule.subjectId,
            room: data.room || existingModule.room,
            shift: data.shift || existingModule.shift,
            startTime: data.startTime || existingModule.startTime,
            endTime: data.endTime || existingModule.endTime,
            startDate: data.startDate ? new Date(data.startDate) : undefined,
            endDate: data.endDate ? new Date(data.endDate) : undefined,
          },
        });
      } else if (data.subjectId) {
        await this.prisma.classModule.create({
          data: {
            classId,
            subjectId: data.subjectId,
            room: data.room || 'Sala Principal',
            shift: data.shift || 'MATUTINO',
            startTime: data.startTime || '07:30',
            endTime: data.endTime || '11:30',
            startDate: data.startDate ? new Date(data.startDate) : new Date(),
            endDate: data.endDate ? new Date(data.endDate) : new Date(),
          },
        });
      }
    }

    return this.prisma.class.findUnique({
      where: { id: classId },
      include: {
        course: true,
        modules: { include: { subject: true } },
      },
    });
  }

  // ⚡ Excluir turma e limpar dados em cascata com segurança
  async deleteDemand(classId: string) {
    const academicClass = await this.prisma.class.findUnique({
      where: { id: classId },
    });

    if (!academicClass) {
      throw new NotFoundException('Turma não encontrada.');
    }

    await this.prisma.examSubmission.deleteMany({ where: { classId } });
    await this.prisma.enrollment.deleteMany({ where: { classId } });
    await this.prisma.classModule.deleteMany({ where: { classId } });

    await this.prisma.class.delete({
      where: { id: classId },
    });

    return { message: 'Turma e todos os seus registros associados foram removidos com sucesso.' };
  }

  async listRooms() {
    return this.prisma.room.findMany({ orderBy: { name: 'asc' } });
  }

  async createRoom(data: { name: string; capacity?: number; description?: string }) {
    return this.prisma.room.create({
      data: {
        name: data.name,
        capacity: Number(data.capacity) || 0,
        description: data.description || '',
      },
    });
  }

  async updateRoom(id: string, data: { name: string; capacity?: number; description?: string }) {
    return this.prisma.room.update({
      where: { id },
      data: {
        name: data.name,
        capacity: Number(data.capacity) || 0,
        description: data.description || '',
      },
    });
  }

  async deleteRoom(id: string) {
    return this.prisma.room.delete({
      where: { id },
    });
  }

  async listClasses(teacherId: string) {
    return this.prisma.class.findMany({
      where: teacherId ? { teacherId } : {},
      include: {
        course: true,
        modules: { include: { subject: true } },
        enrollments: { include: { user: true } },
      },
      orderBy: {
        id: 'desc',
      },
    });
  }

  // Listar alunos matriculados em uma turma específica
  async listClassStudents(classId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { classId },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
    return enrollments.map((e) => ({
      enrollmentId: e.id,
      studentId: e.user.id,
      name: e.user.name,
      email: e.user.email,
      joinedAt: e.createdAt,
    }));
  }

  async updateStudent(studentId: string, data: { name: string; email: string }) {
    return this.prisma.user.update({
      where: { id: studentId },
      data: {
        name: data.name,
        email: data.email,
      },
    });
  }

  // Matricular aluno manualmente pelo professor
  async enrollStudentManual(classId: string, data: { name: string; email: string }) {
    let student = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!student) {
      student = await this.prisma.user.create({
        data: {
          name: data.name,
          email: data.email,
          passwordHash: '$2b$10$DefaultHashedPasswordForTeacherAddedStudents...',
          role: 'ALUNO',
        },
      });
    }

    return this.prisma.enrollment.upsert({
      where: {
        userId_classId: {
          userId: student.id,
          classId,
        },
      },
      update: {},
      create: {
        userId: student.id,
        classId,
      },
      include: { user: true },
    });
  }

  // Remover matrícula do aluno
  async removeStudentEnrollment(enrollmentId: string) {
    return this.prisma.enrollment.delete({
      where: { id: enrollmentId },
    });
  }

  async listSubjects() {
    return this.prisma.subject.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async getClassPerformance(classId: string) {
    const classData = await this.prisma.class.findUnique({
      where: { id: classId },
      include: {
        course: true,
        enrollments: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!classData) {
      throw new NotFoundException('Turma não encontrada.');
    }

    const examSubmissions = await this.prisma.examSubmission.findMany({
      where: { classId },
      include: {
        quiz: true,
      },
    });

    const studentsReport = classData.enrollments.map((enrollment) => {
      const student = enrollment.user;
      const studentSubmissions = examSubmissions.filter(
        (sub) => sub.userId === student.id
      );

      const totalActivities = studentSubmissions.length;
      let totalCorrect = 0;
      let totalQuestionsAnswered = 0;
      let sumGrades = 0;

      studentSubmissions.forEach((sub) => {
        const grade = sub.totalQuestions > 0 ? (sub.totalCorrect / sub.totalQuestions) * 10 : 0;
        sumGrades += grade;
        totalCorrect += Number(sub.totalCorrect || 0);
        totalQuestionsAnswered += Number(sub.totalQuestions || 1);
      });

      const finalGrade = totalActivities > 0 ? Number((sumGrades / totalActivities).toFixed(1)) : 0.0;
      const precision = totalQuestionsAnswered > 0 
        ? Math.round((totalCorrect / totalQuestionsAnswered) * 100) 
        : 0;

      const isApproved = finalGrade >= 7.0;

      return {
        id: student.id,
        enrollmentNumber: student.email ? student.email.split('@')[0].toUpperCase() : 'MAT-100',
        name: student.name,
        email: student.email,
        activitiesCount: totalActivities,
        correctCount: totalCorrect,
        accuracyRate: precision,
        averageGrade: finalGrade,
        isApproved,
      };
    });

    const totalStudents = studentsReport.length;
    const approvedCount = studentsReport.filter((s) => s.isApproved).length;
    const classAverage = totalStudents > 0 
      ? Number((studentsReport.reduce((acc, s) => acc + s.averageGrade, 0) / totalStudents).toFixed(1)) 
      : 0.0;
    const overallPrecision = totalStudents > 0
      ? Math.round(studentsReport.reduce((acc, s) => acc + s.accuracyRate, 0) / totalStudents)
      : 0;

    return {
      classInfo: {
        code: classData.code,
        courseName: classData.course?.name || 'Treinamento Técnico',
      },
      summary: {
        enrolledCount: totalStudents,
        classAverage,
        approvedCount,
        approvalRate: overallPrecision,
      },
      students: studentsReport,
    };
  }

  async generateQrCode(classId: string, serverIp?: string) {
    const classItem = await this.prisma.class.findUnique({
      where: { id: classId },
      include: { course: true },
    });

    if (!classItem) throw new NotFoundException('Turma não encontrada.');

    const resolvedHost = getLocalNetworkIp(serverIp);
    const joinUrl = `http://${resolvedHost}:5173/join?classId=${classItem.id}`;
    
    const qrCodeImage = await QRCode.toDataURL(joinUrl, {
      width: 400,
      margin: 2,
      color: { dark: '#020617', light: '#ffffff' },
    });

    return {
      classId: classItem.id,
      classCode: classItem.code,
      courseName: classItem.course.name,
      joinUrl,
      qrCodeImage,
    };
  }

 async joinClassByCode(classCode: string, name: string, email: string) {
  // ⚡ Alterado de findUnique para findFirst, já que code não é unique no Prisma
  const classEntity = await this.prisma.class.findFirst({
    where: { code: classCode },
  });

  if (!classEntity) {
    throw new NotFoundException('Turma não encontrada com este código. Verifique e tente novamente.');
  }

  // Resto do código continua igual...
  let user = await this.prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    user = await this.prisma.user.create({
      data: {
        name,
        email,
        role: 'ALUNO',
        passwordHash: '$2b$10$TemporaryPasswordHashToAutoRegisterStudentSafely',
      },
    });
  }

  const existingEnrollment = await this.prisma.enrollment.findFirst({
    where: {
      classId: classEntity.id,
      userId: user.id,
    },
  });

  if (existingEnrollment) {
    return {
      success: true,
      message: 'Você já está matriculado nesta turma!',
      classId: classEntity.id,
      userId: user.id,
    };
  }

  const enrollment = await this.prisma.enrollment.create({
    data: {
      classId: classEntity.id,
      userId: user.id,
    },
  });

  return {
    success: true,
    message: 'Matrícula realizada com sucesso!',
    classId: classEntity.id,
    userId: user.id,
    enrollmentId: enrollment.id,
  };
}

  async submitFormalExam(body: {
    quizId: string;
    userId: string;
    classId: string;
    timeSpentSeconds: number;
    answers: {
      questionId: string;
      answerValue: any;
    }[];
  }) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: body.quizId },
      include: {
        questions: {
          include: {
            options: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!quiz) {
      throw new Error('Avaliação não encontrada.');
    }

    let totalExamWeight = 0;
    let earnedWeight = 0;
    let correctCount = 0;

    const evaluatedAnswers = quiz.questions.map((q) => {
      const weight = Number(q.weight) || 1.0;
      totalExamWeight += weight;

      const studentAns = body.answers?.find((a) => a.questionId === q.id);
      const rawValue = studentAns?.answerValue;

      let isCorrect = false;
      const isBlank =
        rawValue === undefined ||
        rawValue === null ||
        rawValue === '' ||
        (Array.isArray(rawValue) && rawValue.length === 0);

      if (!isBlank) {
        if (q.type === 'TRUE_FALSE' || q.type === 'MULTIPLE_CHOICE') {
          const matchedById = q.options.find((opt) => opt.id === String(rawValue));
          if (matchedById) {
            isCorrect = Boolean(matchedById.isCorrect);
          } else {
            const numericIdx = Number(rawValue);
            if (!isNaN(numericIdx) && q.options[numericIdx]) {
              isCorrect = Boolean(q.options[numericIdx].isCorrect);
            }
          }
        }
      }

      if (isCorrect) {
        earnedWeight += weight;
        correctCount += 1;
      }

      return {
        questionId: q.id,
        title: q.title,
        type: q.type,
        weight,
        justification: q.justification,
        isCorrect,
        studentAnswer: isBlank ? 'Em branco' : String(rawValue),
        pointsAwarded: isCorrect ? weight : 0,
      };
    });

    const finalGrade = Number(
      (totalExamWeight > 0 ? (earnedWeight / totalExamWeight) * 10 : 0).toFixed(1)
    );
    const isApproved = finalGrade >= 7.0;

    const submission = await this.prisma.examSubmission.create({
      data: {
        quizId: body.quizId,
        userId: body.userId,
        classId: body.classId,
        totalScore: finalGrade,
        totalCorrect: correctCount,
        totalQuestions: quiz.questions.length,
        isApproved,
        timeSpentSeconds: body.timeSpentSeconds || 0,
        answers: {
          create: evaluatedAnswers.map((ea) => ({
            questionId: ea.questionId,
            studentAnswer: ea.studentAnswer,
            isCorrect: ea.isCorrect,
            pointsAwarded: ea.pointsAwarded,
          })),
        },
      },
    });

    return {
      submissionId: submission.id,
      finalGrade,
      isApproved,
      totalCorrect: correctCount,
      totalQuestions: quiz.questions.length,
      evaluatedAnswers,
    };
  }

  async getExamDossier(quizId: string, classId: string) {
    const classEnrollments = await this.prisma.enrollment.findMany({
      where: { classId },
      select: { userId: true },
    });
    const enrolledStudentIds = new Set(classEnrollments.map((e) => e.userId));

    const submissions = await this.prisma.examSubmission.findMany({
      where: { quizId, classId },
      include: {
        user: true,
        answers: {
          include: { question: true },
          orderBy: { question: { order: 'asc' } },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    const uniqueUserSubmissions = new Map<string, typeof submissions[0]>();
    for (const sub of submissions) {
      if (enrolledStudentIds.has(sub.userId) && !uniqueUserSubmissions.has(sub.userId)) {
        uniqueUserSubmissions.set(sub.userId, sub);
      }
    }

    const uniqueList = Array.from(uniqueUserSubmissions.values());
    uniqueList.sort((a, b) => b.totalScore - a.totalScore);

    return uniqueList.map((sub, index) => {
      const answersMatrix: { [key: number]: boolean } = {};
      sub.answers.forEach((ans, aIdx) => {
        answersMatrix[aIdx] = ans.isCorrect;
      });

      return {
        rank: index + 1,
        userId: sub.userId,
        userName: sub.user?.name || 'Aluno',
        score: Math.round(sub.totalScore * 100),
        totalGrade: sub.totalScore,
        isApproved: sub.isApproved,
        totalCorrect: sub.totalCorrect,
        totalQuestions: sub.totalQuestions,
        answersMatrix,
      };
    });
  }

  async getStudentGrades(userId: string) {
    const submissions = await this.prisma.examSubmission.findMany({
      where: { userId },
      include: {
        quiz: { include: { subject: true } },
        class: { include: { course: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });

    return submissions.map((sub) => ({
      id: sub.id,
      quizTitle: sub.quiz.title,
      subjectName: sub.quiz.subject?.name || 'Geral',
      courseName: sub.class.course?.name || 'Geral',
      classCode: sub.class.code,
      date: new Date(sub.submittedAt).toLocaleDateString('pt-BR'),
      totalCorrect: sub.totalCorrect,
      totalQuestions: sub.totalQuestions,
      speedScore: Math.round(sub.totalScore * 100),
      finalGrade: sub.totalScore,
      isApproved: sub.isApproved,
    }));
  }

  // ⚡ Salvar ou atualizar a chamada de uma turma em uma data
  // ⚡ Salvar ou atualizar a chamada diária da turma
  async saveAttendance(classId: string, date: string, records: { userId: string; status: 'PRESENTE' | 'FALTA' | 'JUSTIFICADO' }[]) {
    const attendanceDate = new Date(date);

    // Salva ou atualiza a frequência de cada aluno de forma otimizada
    const operations = records.map((record) =>
      this.prisma.attendance.upsert({
        where: {
          classId_userId_date: {
            classId,
            userId: record.userId,
            date: attendanceDate,
          },
        },
        update: {
          status: record.status,
        },
        create: {
          classId,
          userId: record.userId,
          date: attendanceDate,
          status: record.status,
        },
      })
    );

    await this.prisma.$transaction(operations);
    return { success: true, message: 'Chamada salva com sucesso!' };
  }

  // ⚡ Listar a chamada de uma turma em uma data específica
  async getAttendance(classId: string, date: string) {
    const classDate = new Date(date);
    classDate.setHours(0, 0, 0, 0);

    return this.prisma.attendance.findMany({
      where: {
        classId,
        date: classDate,
      },
      include: {
        user: true,
      },
    });
  }

  // ⚡ Buscar chamadas realizadas em uma determinada data
  async getClassAttendanceByDate(classId: string, date: string) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.prisma.attendance.findMany({
      where: {
        classId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });
  }

  async getSessionHistory() {
    const submissions = await this.prisma.examSubmission.findMany({
      include: {
        quiz: {
          include: { subject: true },
        },
        class: {
          include: { course: true },
        },
        user: true,
        answers: {
          include: { question: true },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    const sessionsMap: { [key: string]: any } = {};

    submissions.forEach((sub) => {
      const key = `${sub.quizId}_${sub.classId}`;
      if (!sessionsMap[key]) {
        sessionsMap[key] = {
          id: key,
          startedAt: sub.submittedAt,
          quiz: {
            id: sub.quizId,
            title: sub.quiz?.title || 'Avaliação / Atividade',
            type: sub.quiz?.type || 'AVALIACAO',
            subject: { name: sub.quiz?.subject?.name || 'Geral' },
          },
          class: {
            id: sub.classId,
            code: sub.class?.code || sub.classId.substring(0, 8).toUpperCase(),
          },
          answers: [],
        };
      }

      sessionsMap[key].answers.push({
        userId: sub.userId,
        userName: sub.user?.name || 'Aluno',
        isCorrect: sub.isApproved,
        scoreEarned: sub.totalScore,
        finalGrade: sub.totalScore, // Nota de 0 a 10 já calculada na submissão
        timeSpentSeconds: sub.timeSpentSeconds,
        question: sub.answers?.[0]?.question || null,
      });
    });

    return Object.values(sessionsMap);
  }
  
  async deleteQuizSession(id: string) {
    try {
      // Se o ID for composto (quizId_classId gerado no histórico)
      if (id.includes('_')) {
        const [quizId, classId] = id.split('_');
        // Deleta as submissões de exames/atividades vinculadas a este quiz nesta turma
        await this.prisma.examSubmission.deleteMany({
          where: { quizId, classId },
        });
        return { success: true, message: 'Sessão e registros removidos com sucesso.' };
      }

      // Se for um ID de sessão direto
      return await this.prisma.quizSession.delete({
        where: { id },
      });
    } catch (error) {
      // Caso já tenha sido apagado ou não exista fisicamente, retorna sucesso para limpar a tela
      return { success: true, message: 'Registro removido com sucesso.' };
    }
  }
}