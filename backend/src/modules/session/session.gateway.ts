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
  answersHistory: { [userId: string]: { [questionIndex: number]: boolean } };
  scores: {
    [userId: string]: {
      userId: string;
      userName: string;
      score: number;
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
        answersHistory: {},
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

      // Sincroniza a questão ativa se o aluno reconectar durante a rodada
      if (room.currentQuestionState) {
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
    room.currentTotalTime = Number(data.timeLimitSeconds) || 30;
    room.currentQuestionIndex = Number(data.questionIndex) || 0;

    // ⚡ Isola o gabarito oficial ordenando rigorosamente pelo correctOrder ou índice original
    const originalOptions = [...(data.options || [])].sort(
      (a, b) => (a.correctOrder ?? 0) - (b.correctOrder ?? 0),
    );

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
      options: data.options || [], // Envia para o front gerenciar a visualização
      originalOptions: originalOptions, // 👈 Salva o gabarito puro e perfeitamente ordenado no servidor
      sliderConfig: data.sliderConfig || null,
      questions: data.questions || undefined,
      launchedAt: Date.now(),
    };

    room.currentQuestionState = questionPayload;

    if (room.currentQuestionIndex === 0) {
      room.answersHistory = {};
      Object.keys(room.scores).forEach((uid) => {
        room.scores[uid].score = 0;
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

    let isCorrect = Boolean(data.isCorrect);

    // ⚡ Validação definitiva do Puzzle comparando a lista enviada pelo aluno com o originalOptions limpo e ordenado
    if (room.currentQuestionState && room.currentQuestionState.type === 'PUZZLE') {
      const originalOptions = room.currentQuestionState.originalOptions || room.currentQuestionState.options || [];
      const correctTexts = originalOptions.map((o: any) => o.text.trim().toLowerCase());
      
      const studentTexts = data.puzzleOrder || [];

      if (correctTexts.length > 0 && studentTexts.length === correctTexts.length) {
        // Compara posição por posição de forma exata com o gabarito oficial
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
      pointsThisRound = Math.round(500 + 500 * speedRatio);

      room.scores[uid].score += pointsThisRound;
      room.scores[uid].totalCorrect += 1;
      room.scores[uid].lastRoundScore = pointsThisRound;
      room.scores[uid].lastRoundCorrect = true;
    } else {
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
    },
  ) {
    const room = this.getOrCreateRoom(data.classId);
    const quizId = room.currentQuestionState?.quizId;
    room.currentQuestionState = null;

    const totalQuestions = Number(data.totalQuestions) || (room.currentQuestionIndex + 1) || 1;

    // ⚡ Busca as questões do quiz para salvar o detalhamento de cada questão na submissão
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

      // ⚡ Persiste o resultado e a lista de respostas detalhadas de cada questão
      if (quizId && data.classId) {
        try {
          const answersToCreate = quizQuestions.map((q, idx) => ({
            questionId: q.id,
            studentAnswer: completeAnswersMatrix[idx] ? 'Correto' : 'Incorreto',
            isCorrect: completeAnswersMatrix[idx] === true,
            pointsAwarded: completeAnswersMatrix[idx] === true ? (Number(q.weight) || 1.0) : 0,
          }));

          await this.prisma.examSubmission.create({
            data: {
              quizId,
              userId: s.userId,
              classId: data.classId,
              totalScore: calculatedGrade,
              totalCorrect: calculatedCorrectCount,
              totalQuestions,
              isApproved: calculatedGrade >= 7.0,
              timeSpentSeconds: 0,
              answers: answersToCreate.length > 0 ? {
                create: answersToCreate,
              } : undefined,
            },
          });
        } catch (err) {
          console.error('Erro ao salvar submissão da atividade:', err);
        }
      }

      return {
        rank: 1,
        userId: s.userId,
        userName: s.userName,
        teamName: room.students[s.userId]?.teamName || s.teamName || null,
        teamColor: room.students[s.userId]?.teamColor || s.teamColor || null,
        score: s.score,
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
    });
  }

  @SubscribeMessage('reset_leaderboard')
  handleResetLeaderboard(@MessageBody() data: { classId: string }) {
    const room = this.getOrCreateRoom(data.classId);
    room.currentQuestionState = null;
    room.scores = {};
    room.answersHistory = {};

    Object.keys(room.students).forEach((uid) => {
      room.scores[uid] = {
        userId: uid,
        userName: room.students[uid].userName,
        score: 0,
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