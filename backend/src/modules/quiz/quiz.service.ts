import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateQuizDto } from './dto/create-quiz.dto';

// Mapeia rótulos descritivos para os valores exatos aceitos pelo Enum do Prisma (AVALIAÇAO com Ç)
function mapActivityType(rawType: any): 'QUIZ_INTERATIVO' | 'AVALIAÇAO' | 'ATIVIDADE' {
  if (!rawType || typeof rawType !== 'string') return 'QUIZ_INTERATIVO';
  const normalized = rawType.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  
  if (normalized.includes('AVALIA') || normalized === 'AVALIACAO') return 'AVALIAÇAO';
  if (normalized.includes('PRAT') || normalized.includes('OFICINA') || normalized === 'ATIVIDADE') return 'ATIVIDADE';
  return 'QUIZ_INTERATIVO';
}

function formatSliderConfig(config: any): string | undefined {
  if (!config) return undefined;
  return typeof config === 'string' ? config : JSON.stringify(config);
}

@Injectable()
export class QuizService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateQuizDto, teacherId: string) {
    const validActivityType = mapActivityType(dto.type);

    return this.prisma.quiz.create({
      data: {
        title: dto.title,
        description: dto.description,
        type: validActivityType,
        subjectId: dto.subjectId,
        teacherId: teacherId || undefined,
        questions: {
          create: dto.questions.map((q, idx) => ({
            title: q.title,
            imageUrl: q.imageUrl || undefined,
            type: q.type as any,
            timeLimitSeconds: Number(q.timeLimitSeconds) || 30,
            points: q.points || 1000,
            order: idx + 1,
            sliderConfig: formatSliderConfig(q.sliderConfig),
            options: {
              create:
                q.options?.map((opt, oIdx) => ({
                  text: opt.text,
                  color: opt.color || 'blue',
                  isCorrect: Boolean(opt.isCorrect),
                  correctOrder: opt.correctOrder ?? oIdx,
                })) || [],
            },
          })),
        },
      },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: {
            options: {
              orderBy: { id: 'asc' },
            },
          },
        },
      },
    });
  }

  async update(id: string, dto: CreateQuizDto, teacherId?: string) {
    const existing = await this.prisma.quiz.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Questionário não encontrado.');
    }

    if (teacherId && existing.teacherId && existing.teacherId !== teacherId) {
      throw new ForbiddenException('Você não tem permissão para editar este questionário.');
    }

    const validActivityType = mapActivityType(dto.type);

    return this.prisma.$transaction(async (tx) => {
      await tx.questionOption.deleteMany({
        where: { question: { quizId: id } },
      });

      await tx.question.deleteMany({
        where: { quizId: id },
      });

      return tx.quiz.update({
        where: { id },
        data: {
          title: dto.title,
          description: dto.description,
          type: validActivityType,
          subjectId: dto.subjectId,
          questions: {
            create: dto.questions.map((q, idx) => ({
              title: q.title,
              imageUrl: q.imageUrl || undefined,
              type: q.type as any,
              timeLimitSeconds: Number(q.timeLimitSeconds) || 30,
              points: q.points || 1000,
              order: idx + 1,
              sliderConfig: formatSliderConfig(q.sliderConfig),
              options: {
                create:
                  q.options?.map((opt, oIdx) => ({
                    text: opt.text,
                    color: opt.color || 'blue',
                    isCorrect: Boolean(opt.isCorrect),
                    correctOrder: opt.correctOrder ?? oIdx,
                  })) || [],
              },
            })),
          },
        },
        include: {
          questions: {
            orderBy: { order: 'asc' },
            include: {
              options: {
                orderBy: { id: 'asc' },
              },
            },
          },
        },
      });
    });
  }

  // LISTA APENAS OS QUIZZES CRIADOS PELO PROFESSOR LOGADO
  async findAll(teacherId: string) {
    return this.prisma.quiz.findMany({
      where: teacherId ? { teacherId } : {},
      include: {
        subject: true,
        questions: {
          orderBy: { order: 'asc' },
          include: {
            options: {
              orderBy: { id: 'asc' },
            },
          },
        },
      },
      orderBy: {
        id: 'desc',
      },
    });
  }

  async findOne(id: string, teacherId?: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      include: {
        subject: true,
        questions: {
          orderBy: { order: 'asc' },
          include: {
            options: {
              orderBy: { id: 'asc' },
            },
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Questionário não encontrado.');
    }

    return quiz;
  }

  async remove(id: string, teacherId?: string) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id } });
    if (!quiz) {
      throw new NotFoundException('Questionário não encontrado.');
    }

    if (teacherId && quiz.teacherId && quiz.teacherId !== teacherId) {
      throw new ForbiddenException('Você não tem permissão para excluir este questionário.');
    }

    return this.prisma.quiz.delete({
      where: { id },
    });
  }

  // LISTA APENAS AS SESSÕES DE ATIVIDADES REALIZADAS PELO PROFESSOR LOGADO
  async findSessionsHistory(teacherId: string) {
    return this.prisma.quizSession.findMany({
      where: teacherId
        ? {
            OR: [
              { class: { teacherId } },
              { quiz: { teacherId } },
            ],
          }
        : {},
      include: {
        quiz: {
          include: {
            subject: true,
          },
        },
        class: true,
        answers: {
          include: {
            user: true,
            question: true,
          },
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
    });
  }

  async findSessionDetails(id: string, teacherId?: string) {
    const session = await this.prisma.quizSession.findUnique({
      where: { id },
      include: {
        quiz: {
          include: {
            subject: true,
            questions: {
              orderBy: { order: 'asc' },
              include: {
                options: {
                  orderBy: { id: 'asc' },
                },
              },
            },
          },
        },
        class: true,
        answers: {
          include: {
            user: true,
            question: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Sessão não encontrada.');
    }

    return session;
  }

  async deleteQuizSession(id: string) {
    const cleanId = id.includes('_') ? id.split('_')[0] : id;

    try {
      return await this.prisma.quizSession.delete({
        where: { id: cleanId },
      });
    } catch (error) {
      return { success: true, message: 'Sessão removida com sucesso.' };
    }
  }

  // ⚡ 1. Listar Repositório Global
  async findGlobalRepository(query?: { area?: string; tag?: string; search?: string }) {
    const where: any = { isPublic: true };

    if (query?.area) {
      where.knowledgeArea = query.area;
    }

    if (query?.tag) {
      where.tags = { has: query.tag.toLowerCase().trim() };
    }

    if (query?.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.quiz.findMany({
      where,
      include: {
        teacher: { select: { name: true, email: true } },
        subject: true,
        questions: { include: { options: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ⚡ 2. Publicar ou despublicar no Repositório Global
  async togglePublish(id: string, teacherId: string, data: { isPublic: boolean; knowledgeArea?: string; tags?: string[] }) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id } });
    if (!quiz) throw new NotFoundException('Atividade não encontrada.');

    if (quiz.teacherId && quiz.teacherId !== teacherId) {
      throw new ForbiddenException('Você só pode publicar suas próprias avaliações.');
    }

    return this.prisma.quiz.update({
      where: { id },
      data: {
        isPublic: data.isPublic,
        knowledgeArea: data.knowledgeArea || quiz.knowledgeArea,
        tags: data.tags ? data.tags.map(t => t.toLowerCase().trim()) : quiz.tags,
      },
    });
  }

  // ⚡ 3. Clonar Quiz do Repositório Global
  async cloneQuiz(id: string, newTeacherId: string, newSubjectId?: string) {
    const sourceQuiz = await this.prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: {
          include: { options: true },
        },
      },
    });

    if (!sourceQuiz) throw new NotFoundException('Atividade de origem não encontrada.');

    return this.prisma.quiz.create({
      data: {
        title: `${sourceQuiz.title} (Cópia)`,
        description: sourceQuiz.description,
        type: sourceQuiz.type,
        durationMinutes: sourceQuiz.durationMinutes,
        isPublic: false,
        knowledgeArea: sourceQuiz.knowledgeArea,
        tags: sourceQuiz.tags,
        teacherId: newTeacherId,
        subjectId: newSubjectId || sourceQuiz.subjectId,
        questions: {
          create: sourceQuiz.questions.map((q) => ({
            title: q.title,
            imageUrl: q.imageUrl,
            type: q.type,
            timeLimitSeconds: q.timeLimitSeconds,
            points: q.points,
            weight: q.weight,
            order: q.order,
            justification: q.justification,
            sliderConfig: q.sliderConfig ?? undefined,
            options: {
              create: q.options.map((opt) => ({
                text: opt.text,
                color: opt.color,
                isCorrect: opt.isCorrect,
                correctOrder: opt.correctOrder,
              })),
            },
          })),
        },
      },
      include: { questions: { include: { options: true } } },
    });
  }
}