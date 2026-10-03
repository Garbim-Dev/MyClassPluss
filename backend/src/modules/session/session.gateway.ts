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

export interface StudentSession {
  userId: string;
  userName: string;       // Nome Completo
  nickname: string;       // Apelido do Telão
  document?: string;      // CPF ou Matrícula
  socketId: string;
  studentSessionId?: string;
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
  originalOptions?: any[];
  correctIndex?: number;
  sliderConfig?: any;
  questions?: any[];
  launchedAt: number;
}

interface RoomState {
  roomKey: string;             // Pode ser classId ou o PINCode de 6 dígitos
  pinCode?: string;
  quizId?: string;
  classId?: string | null;
  isTeamMode: boolean;
  teams: TeamItem[];
  students: { [userId: string]: StudentSession };
  currentTotalTime: number;
  currentQuestionIndex: number;
  currentQuestionState: ActiveQuestionState | null;
  activeFormalExam: any | null;
  answersHistory: { [userId: string]: { [questionIndex: number]: boolean } };
  roundOptionVotes: { [userId: string]: number };
  scores: {
    [userId: string]: {
      userId: string;
      userName: string;
      nickname: string;
      document?: string;
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
  maxHttpBufferSize: 5e7, // 50MB para suportar imagens e schemas
})
export class SessionGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  // Mapa de salas em memória indexadas pela chave da sala (PIN ou classId)
  private rooms: { [roomKey: string]: RoomState } = {};

  constructor(private prisma: PrismaService) {}

  handleConnection(client: Socket) {}

  handleDisconnect(client: Socket) {
    for (const roomKey of Object.keys(this.rooms)) {
      const room = this.rooms[roomKey];
      for (const studentKey of Object.keys(room.students)) {
        if (room.students[studentKey].socketId === client.id) {
          delete room.students[studentKey];
          this.broadcastRoomStatus(roomKey);
          break;
        }
      }
    }
  }

  // ⚡ Remove o aluno da memória ativa quando sua matrícula for excluída pelo professor
  public removeStudentFromMemory(userId: string, classId?: string) {
    for (const roomKey of Object.keys(this.rooms)) {
      const room = this.rooms[roomKey];
      if (!classId || room.classId === classId || roomKey === classId) {
        for (const key of Object.keys(room.students)) {
          const st = room.students[key];
          if (st.userId === userId || key === userId) {
            delete room.students[key];
            delete room.scores[st.userId];
            break;
          }
        }
        this.broadcastRoomStatus(roomKey);
      }
    }
  }

  // ⚡ Limpa todos os alunos da sala em memória
  public clearRoomMemory(classId: string) {
    for (const roomKey of Object.keys(this.rooms)) {
      const room = this.rooms[roomKey];
      if (room.classId === classId || roomKey === classId) {
        room.students = {};
        room.scores = {};
        room.answersHistory = {};
        room.roundOptionVotes = {};
        this.broadcastRoomStatus(roomKey);
      }
    }
  }

  private getOrCreateRoom(roomKey: string): RoomState {
    if (!this.rooms[roomKey]) {
      this.rooms[roomKey] = {
        roomKey,
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
    return this.rooms[roomKey];
  }

  private broadcastRoomStatus(roomKey: string) {
    const room = this.rooms[roomKey];
    if (!room) return;

    const studentList = Object.values(room.students);
    const payload = {
      roomKey,
      classId: room.classId,
      pinCode: room.pinCode,
      isTeamMode: room.isTeamMode,
      students: studentList.map((s) => ({
        userId: s.userId,
        userName: s.userName,
        nickname: s.nickname,
        document: s.document,
        teamName: s.teamName,
        teamColor: s.teamColor,
      })),
      totalStudents: studentList.length,
    };

    this.server.to(roomKey).emit('room_status', payload);
    this.server.to(`room_${roomKey}`).emit('room_status', payload);
  }

  // ⚡ 1. CRIAÇÃO DE SESSÃO INDEPENDENTE VIA PIN
  @SubscribeMessage('create_pin_session')
  async handleCreatePinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { quizId: string; classId?: string },
  ) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: data.quizId },
      include: { questions: { include: { options: true } } },
    });

    if (!quiz) {
      client.emit('error_message', { message: 'Atividade não encontrada.' });
      return;
    }

    let pin = Math.floor(100000 + Math.random() * 900000).toString();
    while (await this.prisma.quizSession.findUnique({ where: { pinCode: pin } })) {
      pin = Math.floor(100000 + Math.random() * 900000).toString();
    }

    const sessionRecord = await this.prisma.quizSession.create({
      data: {
        pinCode: pin,
        quizId: quiz.id,
        classId: data.classId || undefined,
        isLive: true,
      },
    });

    const room = this.getOrCreateRoom(pin);
    room.pinCode = pin;
    room.quizId = quiz.id;
    room.classId = data.classId || null;

    client.join(pin);
    client.join(`room_${pin}`);

    client.emit('session_created', {
      sessionId: sessionRecord.id,
      pinCode: pin,
      quizId: quiz.id,
      quizTitle: quiz.title,
      quizType: quiz.type,
      totalQuestions: quiz.questions.length,
    });
  }

  // ⚡ 2. ENTRADA DO ALUNO (DESDUPLICAÇÃO RIGOROSA E MATRÍCULA NO BANCO)
  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @MessageBody()
    data: {
      roomKey?: string;
      classId?: string;
      pinCode?: string;
      fullName: string;
      nickname: string;
      document?: string;
      userId?: string;
      studentSessionId?: string;
      role?: string;
      teamId?: string;
      teamName?: string;
      teamColor?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    let activeKey = data.pinCode || data.roomKey || data.classId;
    if (!activeKey) return;

    let foundClass = await this.prisma.class.findFirst({
      where: {
        OR: [
          ...(data.classId ? [{ id: data.classId }] : []),
          { id: activeKey },
          { code: activeKey },
        ],
      },
    });

    const resolvedClassId = foundClass?.id || data.classId;

    client.join(activeKey);
    client.join(`room_${activeKey}`);
    if (resolvedClassId && resolvedClassId !== activeKey) {
      client.join(resolvedClassId);
      client.join(`room_${resolvedClassId}`);
    }

    const primaryRoomKey = resolvedClassId || activeKey;
    const room = this.getOrCreateRoom(primaryRoomKey);
    room.classId = primaryRoomKey;
    if (data.pinCode) room.pinCode = data.pinCode;

    if (data.role !== 'PROFESSOR') {
      const cleanDoc = data.document ? data.document.replace(/\D/g, '').trim() : null;
      const cleanName = data.fullName ? data.fullName.trim() : 'Aluno';

      // ⚡ Busca estrita no banco para reusar o mesmo cadastro e impedir múltiplos IDs
      let userRecord = await (this.prisma.user as any).findFirst({
        where: {
          OR: [
            ...(data.userId ? [{ id: data.userId }] : []),
            ...(cleanDoc ? [{ document: cleanDoc }] : []),
            { name: { equals: cleanName, mode: 'insensitive' } },
          ],
        },
      });

      if (!userRecord) {
        const fallbackEmailDoc = cleanDoc || cleanName.toLowerCase().replace(/\s+/g, '.');
        userRecord = await (this.prisma.user as any).create({
          data: {
            name: cleanName,
            nickname: data.nickname ? data.nickname.trim() : cleanName.split(' ')[0],
            document: cleanDoc || undefined,
            email: `${fallbackEmailDoc}@aluno.myclasspluss.com`,
            passwordHash: '$2b$10$DefaultStudentAutoRegisteredPasswordHash...',
            role: 'ALUNO',
          },
        });
      } else {
        userRecord = await (this.prisma.user as any).update({
          where: { id: userRecord.id },
          data: {
            name: cleanName,
            nickname: data.nickname ? data.nickname.trim() : userRecord.nickname,
            document: cleanDoc || userRecord.document,
          },
        }).catch(() => userRecord);
      }

      const effectiveUserId = userRecord.id;

      // ⚡ Garante a matrícula na turma
      if (foundClass) {
        await this.prisma.enrollment.upsert({
          where: {
            userId_classId: {
              userId: effectiveUserId,
              classId: foundClass.id,
            },
          },
          create: {
            userId: effectiveUserId,
            classId: foundClass.id,
          },
          update: {},
        }).catch(() => {});
      }

      // ⚡ PREVENÇÃO DE DUPLICIDADE EM MEMÓRIA:
      // Remove qualquer entrada anterior com mesmo ID, Documento ou Nome
      for (const existingKey of Object.keys(room.students)) {
        const existingStudent = room.students[existingKey];
        if (
          existingStudent.userId === effectiveUserId ||
          existingStudent.userName.toLowerCase() === cleanName.toLowerCase() ||
          (cleanDoc && existingStudent.document === cleanDoc)
        ) {
          delete room.students[existingKey];
        }
      }

      room.students[effectiveUserId] = {
        userId: effectiveUserId,
        userName: cleanName,
        nickname: data.nickname ? data.nickname.trim() : (userRecord.nickname || cleanName.split(' ')[0]),
        document: cleanDoc || userRecord.document || undefined,
        socketId: client.id,
        studentSessionId: data.studentSessionId || `session_${effectiveUserId}`,
        teamId: data.teamId || null,
        teamName: data.teamName || null,
        teamColor: data.teamColor || null,
      };

      if (!room.scores[effectiveUserId]) {
        room.scores[effectiveUserId] = {
          userId: effectiveUserId,
          userName: cleanName,
          nickname: room.students[effectiveUserId].nickname,
          document: cleanDoc || userRecord.document || undefined,
          score: 0,
          streak: 0,
          totalCorrect: 0,
          lastRoundScore: 0,
          lastRoundCorrect: false,
          teamId: data.teamId || null,
          teamName: data.teamName || null,
          teamColor: data.teamColor || null,
        };
      } else {
        room.scores[effectiveUserId].userName = cleanName;
        room.scores[effectiveUserId].nickname = room.students[effectiveUserId].nickname;
        room.scores[effectiveUserId].document = cleanDoc || userRecord.document || undefined;
      }

      if (room.activeFormalExam) {
        client.emit('formal_exam_launched', room.activeFormalExam);
        client.emit('question_launched', room.activeFormalExam);
      } else if (room.currentQuestionState) {
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

    this.broadcastRoomStatus(primaryRoomKey);
    if (activeKey !== primaryRoomKey) {
      this.broadcastRoomStatus(activeKey);
    }
  }

  // ⚡ 3. LANÇAMENTO DA AVALIAÇÃO FORMAL
  @SubscribeMessage('launch_formal_exam')
  async handleLaunchFormalExam(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    const roomKey = data.pinCode || data.roomKey || data.classId;
    if (!roomKey) return;

    const room = this.getOrCreateRoom(roomKey);
    let payload = data;

    if (!data.questions || data.questions.length === 0) {
      const fullExam = await this.prisma.quiz.findUnique({
        where: { id: data.quizId },
        include: {
          questions: {
            orderBy: { order: 'asc' },
            include: { options: true },
          },
        },
      });

      if (!fullExam) {
        client.emit('error_message', { message: 'Avaliação não encontrada.' });
        return;
      }

      payload = {
        roomKey,
        classId: data.classId || undefined,
        quizId: fullExam.id,
        id: fullExam.id,
        quizTitle: fullExam.title,
        title: fullExam.title,
        quizType: 'AVALIACAO',
        type: 'AVALIACAO',
        durationMinutes: fullExam.durationMinutes || 45,
        totalQuestions: fullExam.questions.length,
        questionIndex: 0,
        timeLimitSeconds: (fullExam.durationMinutes || 45) * 60,
        questions: fullExam.questions,
      };
    }

    room.activeFormalExam = payload;
    room.currentQuestionState = null;

    this.server.to(roomKey).emit('formal_exam_launched', payload);
    this.server.to(`room_${roomKey}`).emit('formal_exam_launched', payload);
    this.server.to(roomKey).emit('question_launched', payload);
    this.server.to(`room_${roomKey}`).emit('question_launched', payload);
  }

  // ⚡ 4. LANÇAMENTO DE QUIZ GAMIFICADO
  @SubscribeMessage('launch_question')
  handleLaunchQuestion(
    @MessageBody()
    data: {
      roomKey?: string;
      classId?: string;
      pinCode?: string;
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
    const roomKey = data.pinCode || data.roomKey || data.classId;
    if (!roomKey) return;

    const room = this.getOrCreateRoom(roomKey);
    room.activeFormalExam = null;
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

    this.server.to(roomKey).emit('question_launched', questionPayload);
    this.server.to(`room_${roomKey}`).emit('question_launched', questionPayload);

    this.server.to(roomKey).emit('answer_received_count', {
      roomKey,
      totalAnswers: 0,
    });
  }

  // ⚡ 5. ENVIO DE RESPOSTA
  @SubscribeMessage('submit_answer')
  handleSubmitAnswer(
    @MessageBody()
    data: {
      roomKey?: string;
      classId?: string;
      pinCode?: string;
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
    const roomKey = data.pinCode || data.roomKey || data.classId;
    if (!roomKey) return;

    const room = this.getOrCreateRoom(roomKey);
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
        nickname: room.students[uid]?.nickname || 'Jogador',
        document: room.students[uid]?.document,
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

    this.server.to(roomKey).emit('answer_received_count', {
      roomKey,
      totalAnswers: currentQAnswers,
    });
  }

  // ⚡ 6. FINALIZAR QUESTÃO / PLACAR COM CONSOLIDAÇÃO NA ESCALA OFICIAL (0,0 A 10,0)
  @SubscribeMessage('finish_question')
  async handleFinishQuestion(
    @MessageBody()
    data: {
      roomKey?: string;
      classId?: string;
      pinCode?: string;
      totalQuestions?: number;
      questionIndex?: number;
      isLastQuestion?: boolean;
    },
  ) {
    const roomKey = data.pinCode || data.roomKey || data.classId;
    if (!roomKey) return;

    const room = this.getOrCreateRoom(roomKey);
    const quizId = room.currentQuestionState?.quizId || room.quizId;
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

    // ⚡ Consolidação rigorosa para a escala 0 a 10
    const leaderboardPromises = Object.values(room.scores).map(async (s) => {
      const rawUserHistory = room.answersHistory[s.userId] || {};
      const completeAnswersMatrix: { [questionIndex: number]: boolean } = {};
      let calculatedCorrectCount = 0;

      for (let qIdx = 0; qIdx < totalQuestions; qIdx++) {
        const answeredCorrectly = rawUserHistory[qIdx] === true;
        completeAnswersMatrix[qIdx] = answeredCorrectly;
        if (answeredCorrectly) calculatedCorrectCount += 1;
      }

      // ⚡⚡ PONTUAÇÃO DO QUIZ NA ESCALA 0 A 10 (100% acertos = 10.0) ⚡⚡
      let calculatedGrade = 0.0;
      if (totalQuestions > 0) {
        if (calculatedCorrectCount === totalQuestions) {
          calculatedGrade = 10.0;
        } else {
          calculatedGrade = Number(((calculatedCorrectCount / totalQuestions) * 10.0).toFixed(1));
        }
      }
      calculatedGrade = Math.max(0.0, Math.min(10.0, calculatedGrade));
      const isApproved = calculatedGrade >= 7.0;

      if (quizId) {
        try {
          const effectiveClassId = room.classId || undefined;
          const userRecord = await (this.prisma.user as any).findFirst({
            where: {
              OR: [
                { id: s.userId },
                { document: s.document || undefined },
                { name: { equals: s.userName, mode: 'insensitive' } },
              ],
            },
          });

          if (userRecord) {
            const existingSub = await this.prisma.examSubmission.findFirst({
              where: {
                quizId,
                userId: userRecord.id,
                ...(effectiveClassId ? { classId: effectiveClassId } : {}),
              },
            });

            if (existingSub) {
              await this.prisma.examSubmission.update({
                where: { id: existingSub.id },
                data: {
                  totalScore: calculatedGrade,
                  totalCorrect: calculatedCorrectCount,
                  totalQuestions,
                  isApproved,
                },
              });
            } else {
              await this.prisma.examSubmission.create({
                data: {
                  quizId,
                  userId: userRecord.id,
                  classId: effectiveClassId,
                  totalScore: calculatedGrade,
                  totalCorrect: calculatedCorrectCount,
                  totalQuestions,
                  isApproved,
                  timeSpentSeconds: 0,
                },
              });
            }

            const isLast = Boolean(data.isLastQuestion || currentQIndex + 1 >= totalQuestions);
            if (isLast) {
              const livePayload = {
                quizId,
                classId: effectiveClassId,
                userId: userRecord.id,
                userName: s.userName,
                nickname: s.nickname,
                document: s.document,
                totalScore: calculatedGrade,
                totalCorrect: calculatedCorrectCount,
                totalQuestions,
                isApproved,
                timeSpentSeconds: 0,
                submittedAt: new Date(),
              };
              const targetRoom = effectiveClassId || roomKey;
              this.server.to(targetRoom).emit('exam_submitted_live', livePayload);
              this.server.to(`room_${targetRoom}`).emit('exam_submitted_live', livePayload);
              this.server.emit('exam_submitted_live', livePayload);
            }
          }
        } catch (err) {
          console.error('[SessionGateway] Erro ao consolidar nota acadêmica:', err);
        }
      }

      return {
        rank: 1,
        userId: s.userId,
        userName: s.userName,
        nickname: s.nickname,
        document: s.document,
        teamName: room.students[s.userId]?.teamName || s.teamName || null,
        teamColor: room.students[s.userId]?.teamColor || s.teamColor || null,
        score: s.score,
        streak: s.streak || 0,
        roundScore: s.lastRoundScore,
        totalCorrect: calculatedCorrectCount,
        totalQuestions,
        totalGrade: calculatedGrade,
        isApproved,
        isCorrect: s.lastRoundCorrect,
        answersMap: completeAnswersMatrix,
      };
    });

    const leaderboard = await Promise.all(leaderboardPromises);
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard.forEach((item, index) => {
      item.rank = index + 1;
    });

    this.server.to(roomKey).emit('question_ended', {
      roomKey,
      classId: room.classId,
      isTeamMode: room.isTeamMode,
      leaderboard,
      answerStats,
      correctIndex,
    });
  }

  

  // ⚡ 7. VINCULAR SESSÃO E RESULTADOS A UMA TURMA A QUALQUER MOMENTO
  @SubscribeMessage('bind_session_to_class')
  async handleBindSessionToClass(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomKey: string; classId: string },
  ) {
    const room = this.rooms[data.roomKey];
    if (!room) {
      client.emit('error_message', { message: 'Sessão não encontrada.' });
      return;
    }

    room.classId = data.classId;

    if (room.pinCode) {
      await this.prisma.quizSession.updateMany({
        where: { pinCode: room.pinCode },
        data: { classId: data.classId },
      });
    }

    for (const student of Object.values(room.students)) {
      if (student.document) {
        const user = await (this.prisma.user as any).findFirst({
          where: {
            OR: [
              { document: student.document },
              { email: `${student.document}@aluno.myclasspluss.com` },
            ],
          },
        });

        if (user) {
          await this.prisma.enrollment.upsert({
            where: {
              userId_classId: {
                userId: user.id,
                classId: data.classId,
              },
            },
            create: {
              userId: user.id,
              classId: data.classId,
            },
            update: {},
          });

          if (room.quizId) {
            await (this.prisma.examSubmission as any).updateMany({
              where: {
                quizId: room.quizId,
                userId: user.id,
              },
              data: { classId: data.classId },
            });
          }
        }
      }
    }

    client.emit('session_bound_success', {
      classId: data.classId,
      enrolledCount: Object.keys(room.students).length,
    });

    this.broadcastRoomStatus(data.roomKey);
  }

  @SubscribeMessage('configure_teams')
  handleConfigureTeams(
    @MessageBody()
    data: {
      roomKey?: string;
      classId?: string;
      isTeamMode: boolean;
      teams: TeamItem[];
      autoAssign: boolean;
    },
  ) {
    const key = data.roomKey || data.classId;
    if (!key) return;

    const room = this.getOrCreateRoom(key);
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

    this.broadcastRoomStatus(key);
  }

  @SubscribeMessage('close_room')
  handleCloseRoom(@MessageBody() data: { roomKey?: string; classId?: string }) {
    const key = data.roomKey || data.classId;
    if (key && this.rooms[key]) {
      delete this.rooms[key];
      this.server.to(key).emit('room_closed');
    }
  }

  @SubscribeMessage('reset_leaderboard')
  handleResetLeaderboard(@MessageBody() data: { roomKey?: string; classId?: string }) {
    const key = data.roomKey || data.classId;
    if (!key) return;

    const room = this.getOrCreateRoom(key);
    room.currentQuestionState = null;
    room.activeFormalExam = null;
    room.scores = {};
    room.answersHistory = {};
    room.roundOptionVotes = {};

    Object.keys(room.students).forEach((uid) => {
      room.scores[uid] = {
        userId: uid,
        userName: room.students[uid].userName,
        nickname: room.students[uid].nickname,
        document: room.students[uid].document,
        score: 0,
        streak: 0,
        totalCorrect: 0,
        lastRoundScore: 0,
        lastRoundCorrect: false,
        teamId: room.students[uid].teamId || null,
      };
    });
    this.server.to(key).emit('leaderboard_reset', { roomKey: key });
  }
}