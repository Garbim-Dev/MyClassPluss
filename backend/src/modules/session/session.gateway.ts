import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../../prisma/prisma.service';

interface TeamItem {
  id: string;
  name: string;
  color: string;
}

interface StudentSession {
  userId: string;
  userName: string;
  socketId: string;
  teamId?: string | null;
  teamName?: string | null;
  teamColor?: string | null;
}

interface ActiveQuestionState {
  quizId: string;
  quizType: string;
  quizTitle: string;
  questionId: string;
  questionIndex: number;
  totalQuestions: number;
  title: string;
  imageUrl?: string | null;
  type: string;
  timeLimitSeconds: number;
  durationMinutes?: number;
  options: any[];
  originalOptions?: any[]; // ⚡ Gabarito puro preservado para conferência exata
  correctIndex?: number;   // ⚡ Índice da alternativa correta (0: Red, 1: Blue, 2: Yellow, 3: Green)
  sliderConfig?: any;
  questions?: any[];
  launchedAt: number;
}

interface RoomState {
  classId: string;
  isTeamMode: boolean;
  teams: TeamItem[];
  students: { [userId: string]: StudentSession };
  currentTotalTime: number;
  currentQuestionIndex: number;
  currentQuestionState: ActiveQuestionState | null;
  activeFormalExam: any | null; // ⚡ Armazena estado de avaliação formal ativa
  answersHistory: { [userId: string]: { [questionIndex: number]: boolean } };
  roundOptionVotes: { [userId: string]: number }; // ⚡ Armazena qual opção (0, 1, 2 ou 3) o aluno votou nesta rodada
  scores: {
    [userId: string]: {
      userId: string;
      userName: string;
      score: number;
      streak: number;
      totalCorrect: number;
      lastRoundScore: number;
      lastRoundCorrect: boolean;
      teamId?: string | null;
      teamName?: string | null;
      teamColor?: string | null;
    };
  };
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  maxHttpBufferSize: 5e7, // ⚡ Suporte a payloads de até 50MB
})
export class SessionGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private rooms: { [classId: string]: RoomState } = {};

  constructor(private prisma: PrismaService) {}

  handleConnection(client: Socket) {}

  handleDisconnect(client: Socket) {
    for (const classId of Object.keys(this.rooms)) {
      const room = this.rooms[classId];
      for (const userId of Object.keys(room.students)) {
        if (room.students[userId].socketId === client.id) {
          delete room.students[userId];
          this.broadcastRoomStatus(classId);
          break;
        }
      }
    }
  }

  private getOrCreateRoom(classId: string): RoomState {
    if (!this.rooms[classId]) {
      this.rooms[classId] = {
        classId,
        isTeamMode: false,
        teams: [],
        students: {},
        currentTotalTime: 30,
        currentQuestionIndex: 0,
        currentQuestionState: null,
        activeFormalExam: null,
        answersHistory: {},
        roundOptionVotes: {},
        scores: {},
      };
    }
    return this.rooms[classId];
  }

  private broadcastRoomStatus(classId: string) {
    const room = this.rooms[classId];
    if (!room) return;

    const studentList = Object.values(room.students);
    this.server.to(classId).emit('room_status', {
      classId,
      isTeamMode: room.isTeamMode,
      students: studentList,
      totalStudents: studentList.length,
    });
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(
    @MessageBody()
    data: {
      classId: string;
      userId: string;
      userName: string;
      role?: string;
      teamId?: string;
      teamName?: string;
      teamColor?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const { classId, userId, userName, role } = data;
    if (!classId || !userId) return;

    client.join(classId);
    const room = this.getOrCreateRoom(classId);

    if (role !== 'PROFESSOR') {
      const uid = String(userId);
      room.students[uid] = {
        userId: uid,
        userName: userName || 'Aluno',
        socketId: client.id,
        teamId: data.teamId || room.students[uid]?.teamId || null,
        teamName: data.teamName || room.students[uid]?.teamName || null,
        teamColor: data.teamColor || room.students[uid]?.teamColor || null,
      };

      if (!room.scores[uid]) {
        room.scores[uid] = {
          userId: uid,
          userName: userName || 'Aluno',
          score: 0,
          streak: 0,
          totalCorrect: 0,
          lastRoundScore: 0,
          lastRoundCorrect: false,
          teamId: room.students[uid].teamId,
          teamName: room.students[uid].teamName,
          teamColor: room.students[uid].teamColor,
        };
      } else {
        room.scores[uid].userName = userName || room.scores[uid].userName;
      }

      // Sincroniza a avaliação formal ativa caso o aluno entre/reconecte com ela em andamento
      if (room.activeFormalExam) {
        client.emit('formal_exam_launched', room.activeFormalExam);
        client.emit('question_launched', room.activeFormalExam);
      } else if (room.currentQuestionState) {
        // Sincroniza o quiz gamificado se estiver ativo
        const elapsedSecs = Math.floor((Date.now() - room.currentQuestionState.launchedAt) / 1000);
        const remainingSecs = Math.max(0, room.currentQuestionState.timeLimitSeconds - elapsedSecs);

        if (remainingSecs > 0) {
          client.emit('question_launched', {
            ...room.currentQuestionState,
            timeLimitSeconds: remainingSecs,
          });
        }
      }
    }

    this.broadcastRoomStatus(classId);
  }

  @SubscribeMessage('configure_teams')
  handleConfigureTeams(
    @MessageBody()
    data: {
      classId: string;
      isTeamMode: boolean;
      teams: TeamItem[];
      autoAssign: boolean;
    },
  ) {
    const room = this.getOrCreateRoom(data.classId);
    room.isTeamMode = data.isTeamMode;
    room.teams = data.teams || [];

    if (data.isTeamMode && data.autoAssign && room.teams.length > 0) {
      const studentKeys = Object.keys(room.students);
      studentKeys.forEach((uid, idx) => {
        const team = room.teams[idx % room.teams.length];
        room.students[uid].teamId = team.id;
        room.students[uid].teamName = team.name;
        room.students[uid].teamColor = team.color;

        if (room.scores[uid]) {
          room.scores[uid].teamId = team.id;
          room.scores[uid].teamName = team.name;
          room.scores[uid].teamColor = team.color;
        }
      });
    }

    this.broadcastRoomStatus(data.classId);
  }

  // ⚡ 1. NOVO HANDLER: Lançamento de Avaliação Formal Contínua
  @SubscribeMessage('launch_formal_exam')
  handleLaunchFormalExam(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      classId: string;
      quizId: string;
      quizType?: string;
      quizTitle?: string;
      durationMinutes?: number;
      totalQuestions?: number;
      questions: any[];
    },
  ) {
    if (!data.classId) return;

    const room = this.getOrCreateRoom(data.classId);

    const examPayload = {
      ...data,
      quizId: data.quizId,
      quizType: 'AVALIACAO',
      quizTitle: data.quizTitle || 'Avaliação Oficial',
      title: data.quizTitle || 'Avaliação Oficial',
      durationMinutes: Number(data.durationMinutes) || 45,
      totalQuestions: data.totalQuestions || data.questions?.length || 1,
      questions: data.questions || [],
      questionIndex: 0,
      type: 'AVALIACAO',
      timeLimitSeconds: (Number(data.durationMinutes) || 45) * 60,
    };

    // Guarda estado ativo para novos alunos que conectarem
    room.activeFormalExam = examPayload;
    room.currentQuestionState = null;

    // Emite para toda a sala da turma
    this.server.to(data.classId).emit('formal_exam_launched', examPayload);
    this.server.to(data.classId).emit('question_launched', examPayload);
  }

  // ⚡ 2. HANDLER: Lançamento de Quiz Gamificado
  @SubscribeMessage('launch_question')
  handleLaunchQuestion(
    @MessageBody()
    data: {
      classId: string;
      quizId: string;
      quizType: string;
      quizTitle?: string;
      questionId: string;
      questionIndex: number;
      totalQuestions: number;
      title: string;
      imageUrl?: string | null;
      type: string;
      timeLimitSeconds: number;
      durationMinutes?: number;
      options: any[];
      sliderConfig?: any;
      questions?: any[];
    },
  ) {
    const room = this.getOrCreateRoom(data.classId);
    room.activeFormalExam = null; // Reseta eventual avaliação formal anterior
    room.currentTotalTime = Number(data.timeLimitSeconds) || 30;
    room.currentQuestionIndex = Number(data.questionIndex) || 0;
    room.roundOptionVotes = {};

    let parsedSliderConfig = data.sliderConfig || null;
    if (typeof parsedSliderConfig === 'string') {
      try {
        parsedSliderConfig = JSON.parse(parsedSliderConfig);
      } catch (e) {
        parsedSliderConfig = null;
      }
    }

    const originalOptions = [...(data.options || [])].sort(
      (a, b) => (a.correctOrder ?? 0) - (b.correctOrder ?? 0),
    );

    let correctIndex: number | undefined = undefined;
    if (Array.isArray(data.options)) {
      const foundIdx = data.options.findIndex((opt: any) => opt.isCorrect === true);
      if (foundIdx !== -1) {
        correctIndex = foundIdx;
      }
    }

    const questionPayload: ActiveQuestionState = {
      quizId: data.quizId,
      quizType: data.quizType || 'QUIZ_INTERATIVO',
      quizTitle: data.quizTitle || data.title,
      questionId: data.questionId,
      questionIndex: room.currentQuestionIndex,
      totalQuestions: data.totalQuestions,
      title: data.title,
      imageUrl: data.imageUrl || null,
      type: data.type,
      timeLimitSeconds: room.currentTotalTime,
      durationMinutes: data.durationMinutes || 45,
      options: data.options || [],
      originalOptions: originalOptions,
      correctIndex,
      sliderConfig: parsedSliderConfig,
      questions: data.questions || undefined,
      launchedAt: Date.now(),
    };

    room.currentQuestionState = questionPayload;

    if (room.currentQuestionIndex === 0) {
      room.answersHistory = {};
      Object.keys(room.scores).forEach((uid) => {
        room.scores[uid].score = 0;
        room.scores[uid].streak = 0;
        room.scores[uid].totalCorrect = 0;
        room.scores[uid].lastRoundScore = 0;
        room.scores[uid].lastRoundCorrect = false;
      });
    }

    this.server.to(data.classId).emit('question_launched', questionPayload);

    this.server.to(data.classId).emit('answer_received_count', {
      classId: data.classId,
      totalAnswers: 0,
    });
  }

  @SubscribeMessage('submit_answer')
  handleSubmitAnswer(
    @MessageBody()
    data: {
      classId: string;
      userId: string;
      userName: string;
      questionIndex: number;
      isCorrect: boolean;
      selectedOptionIndex?: number;
      puzzleOrder?: any[];
      timeRemaining?: number;
      scoreEarned?: number;
      teamId?: string;
    },
  ) {
    const room = this.getOrCreateRoom(data.classId);
    const uid = String(data.userId);
    const qIndex = Number(data.questionIndex) ?? room.currentQuestionIndex;

    if (!room.answersHistory[uid]) {
      room.answersHistory[uid] = {};
    }

    if (data.selectedOptionIndex !== undefined && data.selectedOptionIndex !== null) {
      room.roundOptionVotes[uid] = Number(data.selectedOptionIndex);
    }

    let isCorrect = Boolean(data.isCorrect);

    if (room.currentQuestionState && room.currentQuestionState.type === 'PUZZLE') {
      const originalOptions = room.currentQuestionState.originalOptions || room.currentQuestionState.options || [];
      const correctTexts = originalOptions.map((o: any) => o.text.trim().toLowerCase());
      const studentTexts = data.puzzleOrder || [];

      if (correctTexts.length > 0 && studentTexts.length === correctTexts.length) {
        isCorrect = correctTexts.every((txt: string, idx: number) => txt === studentTexts[idx]);
      } else {
        isCorrect = false;
      }
    }

    room.answersHistory[uid][qIndex] = isCorrect;

    if (!room.scores[uid]) {
      room.scores[uid] = {
        userId: uid,
        userName: data.userName || room.students[uid]?.userName || 'Aluno',
        score: 0,
        streak: 0,
        totalCorrect: 0,
        lastRoundScore: 0,
        lastRoundCorrect: false,
        teamId: data.teamId || room.students[uid]?.teamId || null,
      };
    }

    let pointsThisRound = 0;
    if (isCorrect) {
      const timeRemaining = Number(data.timeRemaining) || 0;
      const totalTime = room.currentTotalTime || 30;
      const speedRatio = Math.max(0, Math.min(1, timeRemaining / totalTime));

      const basePoints = Math.round(500 + 500 * speedRatio);

      room.scores[uid].streak = (room.scores[uid].streak || 0) + 1;
      const currentStreak = room.scores[uid].streak;

      let streakBonus = 0;
      if (currentStreak === 2) streakBonus = 150;
      else if (currentStreak === 3) streakBonus = 300;
      else if (currentStreak >= 4) streakBonus = 500;

      pointsThisRound = basePoints + streakBonus;

      room.scores[uid].score += pointsThisRound;
      room.scores[uid].totalCorrect += 1;
      room.scores[uid].lastRoundScore = pointsThisRound;
      room.scores[uid].lastRoundCorrect = true;
    } else {
      room.scores[uid].streak = 0;
      room.scores[uid].lastRoundScore = 0;
      room.scores[uid].lastRoundCorrect = false;
    }

    const currentQAnswers = Object.values(room.answersHistory).filter(
      (h) => h[qIndex] !== undefined,
    ).length;

    this.server.to(data.classId).emit('answer_received_count', {
      classId: data.classId,
      totalAnswers: currentQAnswers,
    });
  }

  @SubscribeMessage('finish_question')
  async handleFinishQuestion(
    @MessageBody()
    data: {
      classId: string;
      totalQuestions?: number;
      questionIndex?: number;
      isLastQuestion?: boolean;
    },
  ) {
    const room = this.getOrCreateRoom(data.classId);
    const quizId = room.currentQuestionState?.quizId;
    const correctIndex = room.currentQuestionState?.correctIndex;
    const currentQIndex = Number(data.questionIndex) ?? room.currentQuestionIndex;

    const qType = room.currentQuestionState?.type || 'MULTIPLE_CHOICE';

    const totalAnswers = Object.keys(room.answersHistory).filter(
      (uid) => room.answersHistory[uid][currentQIndex] !== undefined,
    ).length;

    const totalCorrect = Object.keys(room.answersHistory).filter(
      (uid) => room.answersHistory[uid][currentQIndex] === true,
    ).length;

    const accuracyRate = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0;

    const votes = Object.values(room.roundOptionVotes);
    const redVotes = votes.filter((v) => v === 0).length;
    const blueVotes = votes.filter((v) => v === 1).length;
    const yellowVotes = votes.filter((v) => v === 2).length;
    const greenVotes = votes.filter((v) => v === 3).length;

    const rawOptions = room.currentQuestionState?.options || [];
    const trueOption = rawOptions.find((o: any) => o.text?.trim().toLowerCase() === 'verdadeiro');
    const isTrueTheCorrectAnswer = Boolean(trueOption?.isCorrect);

    const trueOptionIndex = rawOptions.findIndex((o: any) => o.text?.trim().toLowerCase() === 'verdadeiro');
    const falseOptionIndex = rawOptions.findIndex((o: any) => o.text?.trim().toLowerCase() === 'falso');

    const trueVoteCount = votes.filter((v) => v === (trueOptionIndex !== -1 ? trueOptionIndex : 0)).length;
    const falseVoteCount = votes.filter((v) => v === (falseOptionIndex !== -1 ? falseOptionIndex : 1)).length;

    let activeSlider = room.currentQuestionState?.sliderConfig || null;
    if (typeof activeSlider === 'string') {
      try {
        activeSlider = JSON.parse(activeSlider);
      } catch (e) {
        activeSlider = null;
      }
    }

    const answerStats = {
      type: qType,
      totalAnswers,
      totalCorrect,
      accuracyRate,
      red: redVotes,
      blue: blueVotes,
      yellow: yellowVotes,
      green: greenVotes,
      trueVotes: trueVoteCount,
      falseVotes: falseVoteCount,
      isTrueCorrect: isTrueTheCorrectAnswer,
      sliderTarget: activeSlider?.target !== undefined ? Number(activeSlider.target) : 50,
      sliderMin: activeSlider?.min !== undefined ? Number(activeSlider.min) : 0,
      sliderMax: activeSlider?.max !== undefined ? Number(activeSlider.max) : 100,
      sliderTolerance: activeSlider?.tolerance !== undefined ? Number(activeSlider.tolerance) : 0,
      sliderUnit: activeSlider?.unit || '',
    };

    room.currentQuestionState = null;
    const totalQuestions = Number(data.totalQuestions) || currentQIndex + 1 || 1;

    let quizQuestions: any[] = [];
    if (quizId) {
      try {
        const quizData = await this.prisma.quiz.findUnique({
          where: { id: quizId },
          include: { questions: { orderBy: { order: 'asc' } } },
        });
        quizQuestions = quizData?.questions || [];
      } catch (e) {
        console.warn('Não foi possível carregar as questões do quiz:', e);
      }
    }

    const leaderboardPromises = Object.values(room.scores).map(async (s) => {
      const rawUserHistory = room.answersHistory[s.userId] || {};
      const completeAnswersMatrix: { [questionIndex: number]: boolean } = {};

      let calculatedCorrectCount = 0;

      for (let qIdx = 0; qIdx < totalQuestions; qIdx++) {
        const answeredCorrectly = rawUserHistory[qIdx] === true;
        completeAnswersMatrix[qIdx] = answeredCorrectly;

        if (answeredCorrectly) {
          calculatedCorrectCount += 1;
        }
      }

      const calculatedGrade = Number(
        ((calculatedCorrectCount / totalQuestions) * 10).toFixed(1),
      );

      if (quizId && data.classId) {
        try {
          const enrollments = await this.prisma.enrollment.findMany({
            where: { classId: data.classId },
            include: { user: true },
          });

          let targetUser: any = enrollments.find(
            (e) =>
              e.userId === s.userId ||
              e.user.id === s.userId ||
              e.user.email?.toLowerCase() === s.userId?.toLowerCase() ||
              e.user.name?.trim().toLowerCase() === s.userName?.trim().toLowerCase(),
          )?.user;

          if (!targetUser) {
            targetUser = await this.prisma.user.findFirst({
              where: {
                OR: [
                  { id: s.userId },
                  { email: s.userId },
                  { name: { equals: s.userName, mode: 'insensitive' } },
                ],
              },
            });
          }

          if (targetUser) {
            const classModule = await this.prisma.classModule.findFirst({
              where: { classId: data.classId },
            });

            if (classModule?.subjectId) {
              await this.prisma.quiz.update({
                where: { id: quizId },
                data: { subjectId: classModule.subjectId },
              }).catch(() => {});
            }

            const existingSub = await this.prisma.examSubmission.findFirst({
              where: {
                quizId,
                userId: targetUser.id,
                classId: data.classId,
              },
            });

            if (existingSub) {
              await this.prisma.examSubmission.update({
                where: { id: existingSub.id },
                data: {
                  totalScore: calculatedGrade,
                  totalCorrect: calculatedCorrectCount,
                  totalQuestions,
                  isApproved: calculatedGrade >= 7.0,
                },
              });
            } else {
              await this.prisma.examSubmission.create({
                data: {
                  quizId,
                  userId: targetUser.id,
                  classId: data.classId,
                  totalScore: calculatedGrade,
                  totalCorrect: calculatedCorrectCount,
                  totalQuestions,
                  isApproved: calculatedGrade >= 7.0,
                  timeSpentSeconds: 0,
                },
              });
            }
          }
        } catch (err) {
          console.error('[SessionGateway] Erro ao persistir submissão:', err);
        }
      }

      return {
        rank: 1,
        userId: s.userId,
        userName: s.userName,
        teamName: room.students[s.userId]?.teamName || s.teamName || null,
        teamColor: room.students[s.userId]?.teamColor || s.teamColor || null,
        score: s.score,
        streak: s.streak || 0,
        roundScore: s.lastRoundScore,
        totalCorrect: calculatedCorrectCount,
        totalQuestions,
        totalGrade: calculatedGrade,
        isApproved: calculatedGrade >= 7.0,
        isCorrect: s.lastRoundCorrect,
        answersMap: completeAnswersMatrix,
        answersMatrix: completeAnswersMatrix,
      };
    });

    const leaderboard = await Promise.all(leaderboardPromises);

    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard.forEach((item, index) => {
      item.rank = index + 1;
    });

    this.server.to(data.classId).emit('question_ended', {
      classId: data.classId,
      isTeamMode: room.isTeamMode,
      leaderboard,
      answerStats,
      correctIndex,
    });
  }

  @SubscribeMessage('close_room')
  handleCloseRoom(@MessageBody() data: { classId: string }) {
    if (this.rooms[data.classId]) {
      delete this.rooms[data.classId];
      this.server.to(data.classId).emit('room_closed');
    }
  }

  @SubscribeMessage('reset_leaderboard')
  handleResetLeaderboard(@MessageBody() data: { classId: string }) {
    const room = this.getOrCreateRoom(data.classId);
    room.currentQuestionState = null;
    room.activeFormalExam = null;
    room.scores = {};
    room.answersHistory = {};
    room.roundOptionVotes = {};

    Object.keys(room.students).forEach((uid) => {
      room.scores[uid] = {
        userId: uid,
        userName: room.students[uid].userName,
        score: 0,
        streak: 0,
        totalCorrect: 0,
        lastRoundScore: 0,
        lastRoundCorrect: false,
        teamId: room.students[uid].teamId || null,
      };
    });

    this.server.to(data.classId).emit('leaderboard_reset', {
      classId: data.classId,
    });
  }
}