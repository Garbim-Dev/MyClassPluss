import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SessionGateway } from '../session/session.gateway';
import * as QRCode from 'qrcode';
import * as os from 'os';

function getLocalNetworkIp(preferredIp?: string): string {
  if (preferredIp && preferredIp !== 'localhost' && preferredIp !== '127.0.0.1') {
    return preferredIp;
  }

  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
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
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => SessionGateway))
    private sessionGateway: SessionGateway,
  ) {}

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
    const rawWorkload = Number(data.workload);
    const safeWorkload = !isNaN(rawWorkload) && rawWorkload > 0 
      ? Math.min(Math.floor(rawWorkload), 50000) 
      : 1200;

    return this.prisma.course.create({
      data: {
        name: data.name,
        workload: safeWorkload,
        institutionId: data.institutionId,
      },
    });
  }

  // ⚡ Atualizar Curso
  async updateCourse(id: string, data: { name: string; workload: number }) {
    const rawWorkload = Number(data.workload);
    const safeWorkload = !isNaN(rawWorkload) && rawWorkload > 0 
      ? Math.min(Math.floor(rawWorkload), 50000) 
      : 1200;

    return this.prisma.course.update({
      where: { id },
      data: {
        name: data.name,
        workload: safeWorkload,
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
    const academicClass = await this.prisma.class.findFirst({
      where: {
        OR: [{ id: classId }, { code: classId }],
      },
    });

    if (!academicClass) {
      throw new NotFoundException('Turma não encontrada.');
    }

    await this.prisma.class.update({
      where: { id: academicClass.id },
      data: {
        code: data.classCode,
        courseId: data.courseId || undefined,
      },
    });

    if (data.subjectId || data.room) {
      const existingModule = await this.prisma.classModule.findFirst({
        where: { classId: academicClass.id },
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
            classId: academicClass.id,
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
      where: { id: academicClass.id },
      include: {
        course: true,
        modules: { include: { subject: true } },
      },
    });
  }

  // ⚡ Excluir turma e limpar dados em cascata com segurança (e da memória do Socket)
  async deleteDemand(classId: string) {
    const academicClass = await this.prisma.class.findFirst({
      where: {
        OR: [{ id: classId }, { code: classId }],
      },
    });

    if (!academicClass) {
      throw new NotFoundException('Turma não encontrada.');
    }

    const realClassId = academicClass.id;

    // Limpa a memória ativa do WebSocket imediatamente
    try {
      this.sessionGateway.clearRoomMemory(realClassId);
      if (academicClass.code) {
        this.sessionGateway.clearRoomMemory(academicClass.code);
      }
    } catch (e) {}

    await this.prisma.examSubmission.deleteMany({ where: { classId: realClassId } });
    await this.prisma.enrollment.deleteMany({ where: { classId: realClassId } });
    await this.prisma.classModule.deleteMany({ where: { classId: realClassId } });

    await this.prisma.class.delete({
      where: { id: realClassId },
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

  // ⚡ LISTAGEM DE TURMAS COM CONTAGEM REAL DE MATRÍCULAS
  async listClasses(teacherId: string) {
    const classes = await this.prisma.class.findMany({
      where: teacherId ? { teacherId } : {},
      include: {
        course: true,
        modules: { include: { subject: true } },
        enrollments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                document: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: {
        id: 'desc',
      },
    });

    // Filtra para garantir que apenas matrículas com usuários válidos e existentes sejam computadas
    return classes.map((c) => {
      const validEnrollments = c.enrollments.filter((e) => e.user !== null && e.user !== undefined);
      return {
        ...c,
        enrollments: validEnrollments,
      };
    });
  }

  // ⚡ LISTAR ALUNOS MATRICULADOS EM UMA TURMA ESPECÍFICA (Resiliente a UUID e Code)
  async listClassStudents(classId: string) {
    const targetClass = await this.prisma.class.findFirst({
      where: {
        OR: [{ id: classId }, { code: classId }],
      },
      select: { id: true },
    });

    const realClassId = targetClass?.id || classId;

    const enrollments = await this.prisma.enrollment.findMany({
      where: { classId: realClassId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            document: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return enrollments.map((e) => ({
      enrollmentId: e.id,
      studentId: e.user.id,
      name: e.user.name,
      document: (e.user as any).document || null,
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

  // ⚡ MATRICULAR ALUNO MANUALMENTE PELO PROFESSOR
  async enrollStudentManual(classId: string, data: { name: string; email: string }) {
    const targetClass = await this.prisma.class.findFirst({
      where: {
        OR: [{ id: classId }, { code: classId }],
      },
      select: { id: true },
    });

    const realClassId = targetClass?.id || classId;

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
          classId: realClassId,
        },
      },
      update: {},
      create: {
        userId: student.id,
        classId: realClassId,
      },
      include: { user: true },
    });
  }

  // ⚡ REMOVER MATRÍCULA DO ALUNO (LIMPEZA TOTAL DO BANCO E DA SALA AO VIVO)
  async removeStudentEnrollment(enrollmentId: string) {
    // 1. Tenta encontrar a matrícula pelo ID direto
    let enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      select: { id: true, userId: true, classId: true },
    });

    // 2. Se não achar por ID direto (ou se for o userId passado por engano), faz busca ampla
    if (!enrollment) {
      enrollment = await this.prisma.enrollment.findFirst({
        where: {
          OR: [
            { id: enrollmentId },
            { userId: enrollmentId },
          ],
        },
        select: { id: true, userId: true, classId: true },
      });
    }

    if (enrollment) {
      const { userId, classId, id } = enrollment;

      // Limpa da memória WebSocket
      try {
        this.sessionGateway.removeStudentFromMemory(userId, classId);
      } catch (e) {}

      // Remove todas as variações de matrícula desse aluno nessa turma (UUID e Code)
      await this.prisma.enrollment.deleteMany({
        where: {
          userId,
          OR: [
            { classId },
            { class: { code: classId } },
          ],
        },
      });

      return { success: true, message: 'Matrícula removida com sucesso.' };
    }

    return { success: false, message: 'Matrícula não encontrada.' };
  }

  async listSubjects() {
    return this.prisma.subject.findMany({
      orderBy: { name: 'asc' },
    });
  }
  
  // ⚡ QR CODE DE ACESSO À TURMA (COM PIN E CÓDIGO DA TURMA INJETADOS NA URL)
  async getClassQrCode(classId: string, serverIp?: string) {
    const targetClass = await this.prisma.class.findFirst({
      where: {
        OR: [{ id: classId }, { code: classId }],
      },
      include: { course: true },
    });

    if (!targetClass) {
      throw new NotFoundException('Turma não encontrada para geração do QR Code.');
    }

    const host = (serverIp && serverIp.trim() !== '' && serverIp !== 'localhost')
      ? serverIp
      : '192.168.0.10';

    const pinCode = targetClass.code;
    
    const joinUrl = `http://${host}:5173/student/join?code=${encodeURIComponent(pinCode)}&classId=${targetClass.id}`;

    const qrCodeImage = await QRCode.toDataURL(joinUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#020617',
        light: '#ffffff',
      },
    });

    return {
      classId: targetClass.id,
      classCode: pinCode,
      courseName: targetClass.course?.name || 'Curso Técnico',
      joinUrl,
      qrCodeImage,
    };
  }
  
  // =========================================================================
  // ⚡ CÁLCULO DA NOTA CONSOLIDADA COM LEITURA DIRETA DE SUBMISSÕES (ESCALA 0 A 10)
  // =========================================================================
  async getClassPerformance(classId: string, subjectId?: string) {
    const classData = await this.prisma.class.findFirst({
      where: {
        OR: [{ id: classId }, { code: classId }],
      },
      include: {
        course: true,
        modules: { include: { subject: true } },
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

    let targetSubjectId = subjectId;
    if (!targetSubjectId && classData.modules.length > 0) {
      targetSubjectId = classData.modules[0].subjectId;
    }

    const currentSubject = classData.modules.find((m) => m.subjectId === targetSubjectId)?.subject || null;
    const subjectName = currentSubject?.name || 'Conhecimentos Gerais';

    // 2. Busca todas as submissões registradas para esta turma
    const examSubmissions = await this.prisma.examSubmission.findMany({
      where: {
        OR: [
          { classId: classData.id },
          { classId: classData.code },
        ],
      },
      include: {
        quiz: {
          include: { questions: true, subject: true },
        },
        user: true,
      },
      orderBy: { submittedAt: 'desc' },
    });

    // 3. Unifica alunos: quem já está matriculado + quem realizou avaliações/quizzes na sala
    const allUsersMap = new Map<string, any>();

    classData.enrollments.forEach((e) => {
      if (e.user) {
        allUsersMap.set(e.user.id, e.user);
      }
    });

    examSubmissions.forEach((sub) => {
      if (sub.user && !allUsersMap.has(sub.userId)) {
        allUsersMap.set(sub.userId, sub.user);
      }
    });

    const studentsList = Array.from(allUsersMap.values());

    // 4. Consolidação aluno por aluno na escala de 0,0 a 10,0
    const studentsReport = studentsList.map((student, index) => {
      const studentName = student?.name || student?.email || `Aluno #${index + 1}`;

      const studentSubs = examSubmissions.filter(
        (s: any) =>
          s.userId === student.id ||
          s.user?.id === student.id ||
          s.user?.email?.toLowerCase() === student.email?.toLowerCase() ||
          s.user?.name?.trim().toLowerCase() === student.name?.trim().toLowerCase()
      );

      let sumActivityGrades = 0;
      const quizzesCompleted: any[] = [];
      const examsCompleted: any[] = [];
      const practicesCompleted: any[] = [];

      studentSubs.forEach((sub: any) => {
        const correct = Number(sub.totalCorrect ?? 0);
        const totalQ = Number(sub.totalQuestions ?? 1) || 1;
        
        // ⚡ Nota individual de cada atividade (0 a 10)
        let grade = 0.0;
        if (sub.totalScore !== undefined && sub.totalScore !== null) {
          grade = Number(Number(sub.totalScore).toFixed(1));
        } else {
          grade = correct === totalQ ? 10.0 : Number(((correct / totalQ) * 10.0).toFixed(1));
        }
        grade = Math.max(0.0, Math.min(10.0, grade));

        sumActivityGrades += grade;

        const actItem = {
          id: sub.id,
          quizId: sub.quizId,
          title: sub.quiz?.title || 'Avaliação / Atividade',
          type: sub.quiz?.type || 'AVALIACAO',
          scoreOrGrade: grade.toFixed(1),
          date: new Date(sub.submittedAt).toLocaleDateString('pt-BR'),
          isApproved: grade >= 7.0,
          statusLabel: grade >= 7.0 ? 'Concluída com Sucesso' : 'Abaixo da Média',
        };

        const qType = String(sub.quiz?.type || '').toUpperCase();
        if (qType === 'AVALIACAO' || qType === 'AVALIAÇAO') {
          examsCompleted.push(actItem);
        } else if (qType === 'ATIVIDADE') {
          practicesCompleted.push(actItem);
        } else {
          quizzesCompleted.push({
            ...actItem,
            scoreOrGrade: `${Math.round(grade * 100)} pts (${grade.toFixed(1)})`,
          });
        }
      });

      // ⚡⚡ CÁLCULO DA MÉDIA DA DISCIPLINA ⚡⚡
      // Soma de todas as notas / (Qtd de Avaliações + Qtd de Quizzes + Qtd de Atividades)
      const totalActivitiesCount = examsCompleted.length + quizzesCompleted.length + practicesCompleted.length;
      
      const finalGrade = totalActivitiesCount > 0
        ? Number((sumActivityGrades / totalActivitiesCount).toFixed(1))
        : 0.0;

      const isApproved = finalGrade >= 7.0;

      return {
        rank: index + 1,
        userId: student.id,
        userName: studentName,
        name: studentName,
        document: student.document || undefined,
        email: student.email,
        totalGrade: finalGrade,
        isApproved,
        attendancePercentage: 100,
        totalPresences: 20,
        totalAbsences: 0,
        accuracyRate: 100,
        quizzesCompleted,
        examsCompleted,
        practicesCompleted,
      };
    });

    studentsReport.sort((a, b) => b.totalGrade - a.totalGrade);
    studentsReport.forEach((s, idx) => (s.rank = idx + 1));

    const totalStudents = studentsReport.length;
    const approvedCount = studentsReport.filter((s) => s.isApproved).length;
    const classAverage = totalStudents > 0
      ? Number((studentsReport.reduce((acc, s) => acc + s.totalGrade, 0) / totalStudents).toFixed(1))
      : 0.0;

    const totalQuizzesCount = studentsReport.reduce((acc, s) => acc + s.quizzesCompleted.length, 0);
    const totalExamsCount = studentsReport.reduce((acc, s) => acc + s.examsCompleted.length, 0);
    const totalPracticesCount = studentsReport.reduce((acc, s) => acc + s.practicesCompleted.length, 0);

    return {
      classInfo: {
        code: classData.code,
        courseName: classData.course?.name || 'Aprendendo em Casa',
        subjectName,
      },
      activityCounts: {
        totalActivities: totalQuizzesCount + totalExamsCount + totalPracticesCount,
        quizzesCount: totalQuizzesCount,
        examsCount: totalExamsCount,
        practicesCount: totalPracticesCount,
      },
      summary: {
        enrolledCount: totalStudents,
        classAverage,
        approvedCount,
        failedCount: totalStudents - approvedCount,
      },
      students: studentsReport,
    };
  }

  // ⚡ BOLETIM E RELATÓRIO FORMATIVO INDIVIDUAL DO ALUNO (BUSCA ROBUSTA)
  async getStudentReport(userId: string) {
    if (!userId || userId.trim() === '' || userId === 'undefined' || userId === 'null') {
      return { student: null, subjects: [], totalSubmissions: 0 };
    }

    const cleanInput = userId.trim();
    const cleanDoc = cleanInput.replace(/\D/g, '');

    // 1. Encontra o usuário por qualquer identificador possível
    const userRecords = await (this.prisma.user as any).findMany({
      where: {
        OR: [
          { id: cleanInput },
          ...(cleanDoc ? [{ document: cleanDoc }] : []),
          { email: { equals: cleanInput, mode: 'insensitive' } },
          { email: { startsWith: cleanDoc } },
          { name: { equals: cleanInput, mode: 'insensitive' } },
        ],
      },
    });

    const userRecord = userRecords[0] || null;
    const targetUserIds = userRecords.length > 0 
      ? userRecords.map((u: any) => u.id) 
      : [cleanInput];

    // 2. Busca todas as submissões de avaliações, quizzes e práticas deste aluno
    const submissions = await this.prisma.examSubmission.findMany({
      where: {
        userId: { in: targetUserIds },
      },
      include: {
        quiz: {
          include: {
            subject: true,
            questions: {
              include: { options: true },
              orderBy: { order: 'asc' },
            },
          },
        },
        class: {
          include: { course: true },
        },
        answers: {
          include: { question: true },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    // Agrupamento por disciplina
    const subjectsMap = new Map<string, {
      subjectId: string;
      subjectName: string;
      courseName: string;
      exams: any[];
      quizzes: any[];
      practices: any[];
      totalGradeSum: number;
    }>();

    submissions.forEach((sub: any) => {
      const subjectId = sub.quiz?.subjectId || sub.quiz?.subject?.id || 'geral';
      const subjectName = sub.quiz?.subject?.name || 'Conhecimentos Gerais';
      const courseName = sub.class?.course?.name || 'Treinamento Técnico';

      if (!subjectsMap.has(subjectId)) {
        subjectsMap.set(subjectId, {
          subjectId,
          subjectName,
          courseName,
          exams: [],
          quizzes: [],
          practices: [],
          totalGradeSum: 0,
        });
      }

      const group = subjectsMap.get(subjectId)!;
      const grade = Number(Number(sub.totalScore ?? 0).toFixed(1));
      group.totalGradeSum += grade;

      const qType = String(sub.quiz?.type || '').toUpperCase();
      const activityItem = {
        submissionId: sub.id,
        quizId: sub.quizId,
        title: sub.quiz?.title || 'Avaliação / Atividade',
        type: qType || 'AVALIACAO',
        score: grade,
        totalCorrect: sub.totalCorrect,
        totalQuestions: sub.totalQuestions,
        isApproved: grade >= 7.0,
        timeSpentSeconds: sub.timeSpentSeconds,
        submittedAt: sub.submittedAt,
        answers: sub.answers?.map((ans: any) => ({
          questionTitle: ans.question?.title,
          studentAnswer: ans.studentAnswer,
          isCorrect: ans.isCorrect,
          pointsAwarded: ans.pointsAwarded,
          justification: ans.question?.justification,
        })),
      };

      if (qType.includes('AVALIA')) {
        group.exams.push(activityItem);
      } else if (qType.includes('ATIVIDADE') || qType.includes('PRAT')) {
        group.practices.push(activityItem);
      } else {
        group.quizzes.push(activityItem);
      }
    });

    // Consolidação final por disciplina
    const subjectsReport = Array.from(subjectsMap.values()).map((subj) => {
      const totalActivities = subj.exams.length + subj.quizzes.length + subj.practices.length;
      const finalSubjectGrade = totalActivities > 0
        ? Number((subj.totalGradeSum / totalActivities).toFixed(1))
        : 0.0;

      return {
        subjectId: subj.subjectId,
        subjectName: subj.subjectName,
        courseName: subj.courseName,
        totalActivities,
        totalExams: subj.exams.length,
        totalQuizzes: subj.quizzes.length,
        totalPractices: subj.practices.length,
        finalGrade: finalSubjectGrade,
        isApproved: finalSubjectGrade >= 7.0,
        exams: subj.exams,
        quizzes: subj.quizzes,
        practices: subj.practices,
      };
    });

    return {
      student: userRecord || { name: cleanInput, document: cleanDoc },
      subjects: subjectsReport,
      totalSubmissions: submissions.length,
    };
  }

  async generateQrCode(classId: string, serverIp?: string) {
    return this.getClassQrCode(classId, serverIp);
  }

  // ⚡ ENTRADA POR CÓDIGO DA TURMA ISOLADA PELO CLASS_ID
  async joinClassByCode(classCode: string, name: string, email: string) {
    const classEntity = await this.prisma.class.findFirst({
      where: { code: classCode },
    });

    if (!classEntity) {
      throw new NotFoundException('Turma não encontrada com este código. Verifique e tente novamente.');
    }

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

    const existingEnrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_classId: {
          classId: classEntity.id,
          userId: user.id,
        },
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

  // ⚡ SUBMISSÃO DA AVALIAÇÃO FORMAL E ATIVIDADE PRÁTICA (REGRA: 10.0 / TOTAL_QUESTÕES)
  async submitFormalExam(body: {
    quizId: string;
    userId: string;
    classId?: string | null;
    timeSpentSeconds?: number;
    answers: {
      questionId: string;
      answerValue: any;
    }[];
  }) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: body.quizId },
      include: {
        questions: {
          include: { options: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Avaliação não encontrada.');
    }

    // 1. Identifica o usuário
    let userRecord = await (this.prisma.user as any).findFirst({
      where: {
        OR: [
          { id: body.userId },
          { document: body.userId },
          { email: `${body.userId}@aluno.myclasspluss.com` },
        ],
      },
    });

    if (!userRecord) {
      userRecord = await (this.prisma.user as any).create({
        data: {
          name: 'Aluno Avaliado',
          email: `${body.userId || Date.now()}@aluno.myclasspluss.com`,
          passwordHash: '$2b$10$AutoRegisteredStudentDefaultPasswordHash...',
          role: 'ALUNO',
        },
      });
    }
    const targetUserId = userRecord.id;

    // 2. Valida turma se informada
    let validClassId: string | null = null;
    if (body.classId && typeof body.classId === 'string' && body.classId.trim() !== '') {
      const classExists = await this.prisma.class.findFirst({
        where: {
          OR: [
            { id: body.classId.trim() },
            { code: body.classId.trim() },
          ],
        },
      });
      if (classExists) validClassId = classExists.id;
    }

    if (validClassId) {
      await this.prisma.enrollment.upsert({
        where: {
          userId_classId: {
            userId: targetUserId,
            classId: validClassId,
          },
        },
        create: {
          userId: targetUserId,
          classId: validClassId,
        },
        update: {},
      }).catch(() => {});
    }

    // ⚡ 3. TRAVA DE TENTATIVA ÚNICA
    const existingSubmission = await this.prisma.examSubmission.findFirst({
      where: {
        quizId: body.quizId,
        userId: targetUserId,
      },
    });

    if (existingSubmission) {
      throw new BadRequestException('Esta avaliação já foi entregue anteriormente e não pode ser refeita.');
    }

    // ⚡ 4. PONTUAÇÃO UNIFORME: CADA QUESTÃO VALE EXATAMENTE (10.0 / totalQuestions)
    const totalQuestions = quiz.questions.length;
    const valuePerQuestion = totalQuestions > 0 ? Number((10.0 / totalQuestions).toFixed(2)) : 1.0;
    let correctCount = 0;

    const evaluatedAnswers = quiz.questions.map((q) => {
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
        } else if (q.type === 'FAST_ANSWER') {
          const cleanAnswer = String(rawValue).trim().toLowerCase();
          const validKeywords = q.options.map((opt) => opt.text.trim().toLowerCase());
          isCorrect = validKeywords.includes(cleanAnswer);
        } else if (q.type === 'SLIDER') {
          try {
            const conf = typeof q.sliderConfig === 'string' ? JSON.parse(q.sliderConfig) : q.sliderConfig;
            const target = Number(conf?.target ?? 50);
            const tolerance = Number(conf?.tolerance ?? 0);
            const studentVal = Number(rawValue);
            isCorrect = studentVal >= target - tolerance && studentVal <= target + tolerance;
          } catch (e) {
            isCorrect = false;
          }
        } else if (q.type === 'PUZZLE') {
          const correctOrderTexts = [...q.options]
            .sort((a, b) => (a.correctOrder ?? 0) - (b.correctOrder ?? 0))
            .map((opt) => opt.text.trim().toLowerCase());
          const studentOrderTexts = Array.isArray(rawValue)
            ? rawValue.map((item: any) => (typeof item === 'string' ? item : item.text || '').trim().toLowerCase())
            : [];
          isCorrect = correctOrderTexts.length > 0 && correctOrderTexts.every((txt, idx) => txt === studentOrderTexts[idx]);
        }
      }

      if (isCorrect) correctCount += 1;

      const stringifiedAnswer = isBlank 
        ? 'Em branco' 
        : typeof rawValue === 'object' 
        ? JSON.stringify(rawValue) 
        : String(rawValue);

      return {
        questionId: q.id,
        title: q.title,
        type: q.type,
        weight: valuePerQuestion,
        justification: q.justification || '',
        isCorrect,
        studentAnswer: stringifiedAnswer,
        pointsAwarded: isCorrect ? valuePerQuestion : 0,
      };
    });

    // ⚡ 5. NOTA DA ATIVIDADE: 100% de acertos = 10.0 exato
    let finalGrade = 0.0;
    if (totalQuestions > 0) {
      if (correctCount === totalQuestions) {
        finalGrade = 10.0;
      } else {
        finalGrade = Number(((correctCount / totalQuestions) * 10.0).toFixed(1));
      }
    }
    finalGrade = Math.max(0.0, Math.min(10.0, finalGrade));
    const isApproved = finalGrade >= 7.0;

    // 6. Salva a submissão
    const submissionData: any = {
      quizId: body.quizId,
      userId: targetUserId,
      totalScore: finalGrade,
      totalCorrect: correctCount,
      totalQuestions,
      isApproved,
      timeSpentSeconds: Number(body.timeSpentSeconds) || 0,
      answers: {
        create: evaluatedAnswers.map((ea) => ({
          questionId: ea.questionId,
          studentAnswer: ea.studentAnswer,
          isCorrect: ea.isCorrect,
          pointsAwarded: ea.pointsAwarded,
        })),
      },
    };

    if (validClassId) submissionData.classId = validClassId;

    const submission = await (this.prisma.examSubmission as any).create({
      data: submissionData,
    });

    // ⚡ 7. Notificação ao vivo via Socket
    try {
      const roomToNotify = validClassId || body.classId || 'all';
      const livePayload = {
        quizId: body.quizId,
        classId: validClassId,
        userId: targetUserId,
        userName: userRecord.name,
        nickname: userRecord.nickname || userRecord.name,
        document: userRecord.document,
        totalScore: finalGrade,
        totalCorrect: correctCount,
        totalQuestions,
        isApproved,
        timeSpentSeconds: Number(body.timeSpentSeconds) || 0,
        submittedAt: submission.submittedAt || new Date(),
      };

      this.sessionGateway.server.to(roomToNotify).emit('exam_submitted_live', livePayload);
      this.sessionGateway.server.to(`room_${roomToNotify}`).emit('exam_submitted_live', livePayload);
      this.sessionGateway.server.emit('exam_submitted_live', livePayload);
    } catch (e) {}

    return {
      submissionId: submission.id,
      finalGrade,
      isApproved,
      totalCorrect: correctCount,
      totalQuestions,
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
        score: Math.round(Number(sub.totalScore ?? 0) * 100),
        totalGrade: Number(Number(sub.totalScore ?? 0).toFixed(1)),
        isApproved: sub.isApproved,
        totalCorrect: sub.totalCorrect,
        totalQuestions: sub.totalQuestions,
        answersMatrix,
      };
    });
  }

  // ⚡ CONSOLIDAÇÃO DA MATRIZ DE CALOR POR QUESTÃO
  async getEvaluationDossier(quizId: string, classId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: { orderBy: { order: 'asc' } } },
    });

    const submissions = await this.prisma.examSubmission.findMany({
      where: { quizId, classId },
      include: { answers: true, user: true },
    });

    const totalStudents = submissions.length;

    const questionsHeatmap = (quiz?.questions || []).map((q, idx) => {
      const answersForThisQuestion = submissions.flatMap((s) =>
        s.answers.filter((a) => a.questionId === q.id)
      );

      const totalAnswers = answersForThisQuestion.length;
      const totalCorrect = answersForThisQuestion.filter((a) => a.isCorrect).length;
      const accuracyRate = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0;

      let difficultyLevel: 'EASY' | 'MEDIUM' | 'HARD' = 'EASY';
      let diagnosis = 'Conteúdo plenamente assimilado pela turma.';

      if (accuracyRate < 50) {
        difficultyLevel = 'HARD';
        diagnosis = 'Ponto Crítico: Exige revisão imediata de conteúdo pelo instrutor.';
      } else if (accuracyRate <= 74) {
        difficultyLevel = 'MEDIUM';
        diagnosis = 'Ponto de Atenção: Assimilação moderada; recomendado reforço conceitual.';
      }

      return {
        questionNumber: idx + 1,
        questionId: q.id,
        title: q.title,
        type: q.type,
        totalAnswers,
        totalCorrect,
        accuracyRate,
        difficultyLevel,
        diagnosis,
      };
    });

    return {
      quizTitle: quiz?.title,
      totalStudents,
      leaderboard: submissions.map((s) => ({
        userId: s.userId,
        userName: s.user?.name || 'Aluno',
        score: Number(Number(s.totalScore ?? 0).toFixed(1)),
        totalCorrect: s.totalCorrect,
        isApproved: s.isApproved,
      })),
      questionsHeatmap,
    };
  }

  // ⚡ CONSULTA DO BOLETIM RESILIENTE
  async getStudentGrades(userIdentifier: string) {
    if (!userIdentifier) return [];

    const cleanDoc = userIdentifier.replace(/\D/g, '').trim();
    const matchedUsers = await (this.prisma.user as any).findMany({
      where: {
        OR: [
          { id: userIdentifier },
          ...(cleanDoc ? [{ document: cleanDoc }] : []),
          { email: `${userIdentifier}@aluno.myclasspluss.com` },
        ],
      },
      select: { id: true },
    });

    const userIds = matchedUsers.length > 0 ? matchedUsers.map((u: any) => u.id) : [userIdentifier];

    const submissions = await this.prisma.examSubmission.findMany({
      where: {
        userId: { in: userIds },
      },
      include: {
        quiz: {
          include: { subject: true },
        },
        class: {
          include: { course: true },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    return submissions.map((sub: any) => ({
      id: sub.id,
      quizTitle: sub.quiz?.title || 'Avaliação Oficial',
      subjectName: sub.quiz?.subject?.name || 'Conhecimentos Gerais',
      courseName: sub.class?.course?.name || 'Treinamento Técnico',
      classCode: sub.class?.code || 'Avulsa / Sessão Aberta',
      date: new Date(sub.submittedAt).toLocaleDateString('pt-BR'),
      totalCorrect: Number(sub.totalCorrect ?? 0),
      totalQuestions: Number(sub.totalQuestions ?? 0),
      speedScore: Math.round(Number(sub.totalScore ?? 0) * 100),
      finalGrade: Number(Number(sub.totalScore ?? 0).toFixed(1)),
      isApproved: Boolean(sub.isApproved),
    }));
  }

  // ⚡ SALVAR OU ATUALIZAR A CHAMADA DIÁRIA DA TURMA
  async saveAttendance(classId: string, date: string, records: { userId: string; status: 'PRESENTE' | 'FALTA' | 'JUSTIFICADO' }[]) {
    const attendanceDate = new Date(date);

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

  // ⚡ LISTAR CHAMADA DE UMA TURMA EM DATA ESPECÍFICA
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
            code: sub.class?.code || (sub.classId ? sub.classId.substring(0, 8).toUpperCase() : 'AVULSO'),
          },
          answers: [],
        };
      }

      const scoreNum = Number(Number(sub.totalScore ?? 0).toFixed(1));

      sessionsMap[key].answers.push({
        userId: sub.userId,
        userName: sub.user?.name || 'Aluno',
        isCorrect: sub.isApproved,
        scoreEarned: scoreNum,
        finalGrade: scoreNum,
        timeSpentSeconds: sub.timeSpentSeconds,
        question: sub.answers?.[0]?.question || null,
      });
    });

    return Object.values(sessionsMap);
  }

  async getStudentPortalSummary(userId: string) {
    const grades = await this.getStudentGrades(userId);

    const attendances = await this.prisma.attendance.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });

    const totalDays = attendances.length || 1;
    const presentCount = attendances.filter(
      (a) => a.status === 'PRESENTE' || a.status === 'JUSTIFICADO',
    ).length;
    const attendancePercentage = Number(((presentCount / totalDays) * 100).toFixed(1));

    return {
      grades,
      attendance: {
        totalDays: attendances.length,
        presentCount,
        absentCount: attendances.filter((a) => a.status === 'FALTA').length,
        percentage: attendances.length > 0 ? attendancePercentage : 100,
        history: attendances.slice(0, 10),
      },
    };
  }

  // ⚡ RELATÓRIO CONSOLIDADO DE FREQUÊNCIA DA TURMA
  async getConsolidatedAttendanceReport(classId: string) {
    const classData = await this.prisma.class.findFirst({
      where: {
        OR: [{ id: classId }, { code: classId }],
      },
      include: {
        course: true,
        enrollments: {
          include: { user: true },
        },
      },
    });

    if (!classData) {
      throw new NotFoundException('Turma não encontrada.');
    }

    const allAttendances = await this.prisma.attendance.findMany({
      where: { classId: classData.id },
    });

    const uniqueClassDays = new Set(
      allAttendances.map((a) => new Date(a.date).toISOString().split('T')[0])
    ).size;

    const totalDays = uniqueClassDays > 0 ? uniqueClassDays : 1;

    const reportMap = new Map();

    classData.enrollments.forEach((enrollment) => {
      const student = enrollment.user;
      reportMap.set(student.id, {
        studentId: student.id,
        studentName: student.name || student.email,
        email: student.email,
        totalClasses: totalDays,
        presentCount: 0,
        absentCount: 0,
        justifiedCount: 0,
      });
    });

    allAttendances.forEach((att) => {
      const studentRecord = reportMap.get(att.userId);
      if (studentRecord) {
        if (att.status === 'PRESENTE') {
          studentRecord.presentCount += 1;
        } else if (att.status === 'JUSTIFICADO') {
          studentRecord.justifiedCount += 1;
          studentRecord.presentCount += 1;
        } else {
          studentRecord.absentCount += 1;
        }
      }
    });

    const consolidatedList = Array.from(reportMap.values()).map((item) => {
      const percentage = Number(((item.presentCount / totalDays) * 100).toFixed(1));
      return {
        ...item,
        percentage,
        isAtRisk: percentage < 75.0,
      };
    });

    return {
      classId: classData.id,
      className: classData.code,
      courseName: classData.course?.name || 'Treinamento Técnico',
      totalRegisteredDays: uniqueClassDays,
      report: consolidatedList,
    };
  }

  async deleteQuizSession(id: string) {
    try {
      if (id.includes('_')) {
        const [quizId, classId] = id.split('_');
        await this.prisma.examSubmission.deleteMany({
          where: { quizId, classId },
        });
        return { success: true, message: 'Sessão e registros removidos com sucesso.' };
      }

      return await this.prisma.quizSession.delete({
        where: { id },
      });
    } catch (error) {
      return { success: true, message: 'Registro removido com sucesso.' };
    }
  }

  // ⚡ LISTAR QUESTÕES DO BANCO PESSOAL DO PROFESSOR
  async listPersonalQuestions(teacherId: string, search?: string, tag?: string, onlyFavorites?: boolean) {
    const where: any = { teacherId };

    if (onlyFavorites) {
      where.isFavorite = true;
    }

    if (tag) {
      where.tags = { has: tag.toLowerCase() };
    }

    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }

    return this.prisma.personalQuestion.findMany({
      where,
      orderBy: [{ isFavorite: 'desc' }, { createdAt: 'desc' }],
    });
  }

  // ⚡ SALVAR NOVA QUESTÃO NO ACERVO PESSOAL
  async createPersonalQuestion(teacherId: string, data: any) {
    const cleanTags = (data.tags || [])
      .map((t: string) => t.trim().toLowerCase())
      .filter((t: string) => t.length > 0);

    return this.prisma.personalQuestion.create({
      data: {
        teacherId,
        title: data.title,
        imageUrl: data.imageUrl || null,
        type: data.type || 'MULTIPLE_CHOICE',
        weight: Number(data.weight) || 2.5,
        justification: data.justification || '',
        tags: cleanTags,
        isFavorite: Boolean(data.isFavorite),
        options: data.options || [],
        sliderConfig: data.sliderConfig || null,
      },
    });
  }

  // ⚡ ALTERNAR FAVORITO
  async toggleFavoriteQuestion(id: string, teacherId: string) {
    const question = await this.prisma.personalQuestion.findFirst({
      where: { id, teacherId },
    });

    if (!question) throw new NotFoundException('Questão não encontrada.');

    return this.prisma.personalQuestion.update({
      where: { id },
      data: { isFavorite: !question.isFavorite },
    });
  }

  // ⚡ DELETAR QUESTÃO DO ACERVO
  async deletePersonalQuestion(id: string, teacherId: string) {
    return this.prisma.personalQuestion.deleteMany({
      where: { id, teacherId },
    });
  }

  // =========================================================================
  // ⚡ GESTÃO DE AULAS, SLIDES E MATERIAIS DE ESTUDO
  // =========================================================================
  async listLessonsBySubject(subjectId: string) {
    return this.prisma.lesson.findMany({
      where: { subjectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listLessonsByClass(classId: string) {
    const classData = await this.prisma.class.findFirst({
      where: {
        OR: [{ id: classId }, { code: classId }],
      },
      include: {
        modules: {
          select: { subjectId: true },
        },
      },
    });

    if (!classData) return [];

    const subjectIds = classData.modules.map((m) => m.subjectId);

    return this.prisma.lesson.findMany({
      where: {
        OR: [
          { classId: classData.id },
          { subjectId: { in: subjectIds } },
        ],
      },
      include: {
        subject: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createLesson(data: {
    title: string;
    description?: string;
    fileUrl?: string;
    subjectId: string;
    classId?: string | null;
  }) {
    const subject = await this.prisma.subject.findUnique({
      where: { id: data.subjectId },
    });

    if (!subject) {
      throw new NotFoundException('Disciplina não encontrada.');
    }

    let validClassId: string | null = null;
    if (data.classId && typeof data.classId === 'string' && data.classId.trim() !== '') {
      const classExists = await this.prisma.class.findFirst({
        where: {
          OR: [{ id: data.classId.trim() }, { code: data.classId.trim() }],
        },
      });
      if (classExists) {
        validClassId = classExists.id;
      }
    }

    try {
      return await this.prisma.lesson.create({
        data: {
          title: data.title,
          description: data.description || '',
          fileUrl: data.fileUrl || '',
          subjectId: data.subjectId,
          classId: validClassId,
        },
      });
    } catch (err) {
      console.error('[AcademicService] Erro detalhado ao criar Lesson:', err);
      throw err;
    }
  }

  async deleteLesson(id: string) {
    return this.prisma.lesson.delete({
      where: { id },
    });
  }

  // ⚡ Excluir todas as submissões de uma atividade específica de uma turma
  async deleteActivitySubmissionsFromClass(classId: string, quizId: string) {
    const targetClass = await this.prisma.class.findFirst({
      where: {
        OR: [{ id: classId }, { code: classId }],
      },
      select: { id: true, code: true },
    });

    const realClassId = targetClass?.id || classId;
    const realClassCode = targetClass?.code || classId;

    const submissions = await this.prisma.examSubmission.findMany({
      where: {
        quizId,
        OR: [{ classId: realClassId }, { classId: realClassCode }],
      },
      select: { id: true },
    });

    const subIds = submissions.map((s) => s.id);

    if (subIds.length > 0) {
      await (this.prisma as any).examAnswer?.deleteMany({
        where: { submissionId: { in: subIds } },
      }).catch(() => {});

      await this.prisma.examSubmission.deleteMany({
        where: { id: { in: subIds } },
      });
    }

    await (this.prisma as any).answer?.deleteMany({
      where: {
        session: {
          quizId,
          OR: [{ classId: realClassId }, { classId: realClassCode }],
        },
      },
    }).catch(() => {});

    await (this.prisma as any).quizSession?.deleteMany({
      where: {
        quizId,
        OR: [{ classId: realClassId }, { classId: realClassCode }],
      },
    }).catch(() => {});

    return {
      success: true,
      message: 'Submissões da atividade removidas da turma com sucesso.',
      removedCount: subIds.length,
    };
  }

  // ⚡ Exclui uma tentativa específica (por submissionId ou por quizId)
  async deleteStudentSubmission(classId: string, activityIdentifier: string, userId: string) {
    let submission = await this.prisma.examSubmission.findUnique({
      where: { id: activityIdentifier },
      select: { id: true, quizId: true },
    });

    if (submission) {
      await (this.prisma as any).examAnswer?.deleteMany({
        where: { submissionId: submission.id },
      }).catch(() => {});

      await this.prisma.examSubmission.delete({
        where: { id: submission.id },
      });

      return {
        success: true,
        message: 'Tentativa específica removida com sucesso.',
      };
    }

    const targetClass = await this.prisma.class.findFirst({
      where: {
        OR: [{ id: classId }, { code: classId }],
      },
      select: { id: true, code: true },
    });

    const realClassId = targetClass?.id || classId;
    const realClassCode = targetClass?.code || classId;

    const latestSub = await this.prisma.examSubmission.findFirst({
      where: {
        quizId: activityIdentifier,
        userId,
        OR: [{ classId: realClassId }, { classId: realClassCode }],
      },
      orderBy: { submittedAt: 'desc' },
      select: { id: true },
    });

    if (latestSub) {
      await (this.prisma as any).examAnswer?.deleteMany({
        where: { submissionId: latestSub.id },
      }).catch(() => {});

      await this.prisma.examSubmission.delete({
        where: { id: latestSub.id },
      });

      return {
        success: true,
        message: 'Última tentativa da atividade removida com sucesso.',
      };
    }

    await (this.prisma as any).answer?.deleteMany({
      where: {
        userId,
        session: {
          quizId: activityIdentifier,
          OR: [{ classId: realClassId }, { classId: realClassCode }],
        },
      },
    }).catch(() => {});

    return {
      success: true,
      message: 'Registro removido com sucesso.',
    };
  }
}