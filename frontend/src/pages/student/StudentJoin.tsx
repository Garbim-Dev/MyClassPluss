import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { getSocket } from '../../services/socket';
import { FormalExamView } from './FormalExamView';
import { StudentLibrary } from './StudentLibrary';
import { JoinByCodeModal } from './JoinByCodeModal';
import {
  AlertCircle,
  Loader2,
  Radio,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  Trophy,
  GraduationCap,
  Send,
  Sliders,
  Check,
  X as XIcon,
  ArrowUp,
  ArrowDown,
  Layers,
  Shield,
  BookOpen,
  HelpCircle,
  KeyRound,
} from 'lucide-react';

interface QuestionOptionItem {
  id?: string;
  text: string;
  color?: string;
  isCorrect?: boolean;
  originalIndex?: number;
}

interface QuestionData {
  quizId?: string;
  quizType?: string;
  quizTitle?: string;
  questionId?: string;
  questionIndex: number;
  totalQuestions: number;
  title: string;
  imageUrl?: string;
  type: string;
  timeLimitSeconds: number;
  durationMinutes?: number;
  options?: QuestionOptionItem[];
  sliderConfig?: any;
  questions?: any[];
}

interface TeamInfo {
  id: string;
  name: string;
  color: string;
}

const parseSliderConfig = (rawConfig: any) => {
  if (!rawConfig) return { min: 0, max: 100, target: 50, tolerance: 0, step: 1, unit: '' };
  try {
    const parsed = typeof rawConfig === 'string' ? JSON.parse(rawConfig) : rawConfig;
    return {
      min: Number(parsed.min ?? 0),
      max: Number(parsed.max ?? 100),
      target: Number(parsed.target ?? 50),
      tolerance: Number(parsed.tolerance ?? 0),
      step: Number(parsed.step ?? 1),
      unit: parsed.unit || '',
    };
  } catch (e) {
    return { min: 0, max: 100, target: 50, tolerance: 0, step: 1, unit: '' };
  }
};

const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  if (
    shuffled.length > 1 &&
    shuffled.every((item: any, idx) => item.originalIndex === idx)
  ) {
    const temp = shuffled[0];
    shuffled[0] = shuffled[1];
    shuffled[1] = temp;
  }
  return shuffled;
};

export const StudentJoin: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const classId = searchParams.get('classId') || sessionStorage.getItem('@OffClass:currentClassId') || '';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [studentUser, setStudentUser] = useState(() => {
    const saved = sessionStorage.getItem('@OffClass:sessionUser');
    return saved ? JSON.parse(saved) : null;
  });

  const [myTeam, setMyTeam] = useState<TeamInfo | null>(() => {
    const savedTeam = sessionStorage.getItem('@OffClass:sessionTeam');
    return savedTeam ? JSON.parse(savedTeam) : null;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [currentQuestion, setCurrentQuestion] = useState<QuestionData | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [hasAnswered, setHasAnswered] = useState<boolean>(false);
  const [roundFinished, setRoundFinished] = useState<boolean>(false);
  const [roundResult, setRoundResult] = useState<any>(null);
  const [myRankInfo, setMyRankInfo] = useState<any>(null);

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [textAnswer, setTextAnswer] = useState<string>('');
  const [sliderVal, setSliderVal] = useState<number>(50);
  const [puzzleItems, setPuzzleItems] = useState<QuestionOptionItem[]>([]);

  // Estado para controlar a abertura da Biblioteca de Slides e do Modal de Código
  const [showLibraryModal, setShowLibraryModal] = useState<boolean>(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState<boolean>(false);

  const wakeLockRef = useRef<any>(null);

  const handleReturnToLobby = () => {
    setCurrentQuestion(null);
    setRoundFinished(false);
    setRoundResult(null);
    setMyRankInfo(null);
    setHasAnswered(false);
    setSelectedOption(null);
    setTextAnswer('');
  };

  useEffect(() => {
    window.history.pushState({ studentInApp: true }, '', window.location.href);

    const handlePopState = () => {
      window.history.pushState({ studentInApp: true }, '', window.location.href);
      if (roundFinished || !currentQuestion) {
        navigate('/student/portal', { replace: true });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [roundFinished, currentQuestion, navigate]);

  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && studentUser) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        console.warn('[WakeLock] Não suportado no dispositivo');
      }
    };
    requestWakeLock();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && studentUser) requestWakeLock();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) wakeLockRef.current.release().catch(() => {});
    };
  }, [studentUser]);

  useEffect(() => {
    if (!studentUser || !classId) return;

    const socket = getSocket();
    const studentSessionId = sessionStorage.getItem('@OffClass:studentSessionId') || studentUser.id;

    const joinPayload = () => {
      socket.emit('join_room', {
        classId,
        userId: studentUser.id,
        studentSessionId,
        userName: studentUser.name,
        role: 'ALUNO',
        teamId: myTeam?.id,
        teamName: myTeam?.name,
        teamColor: myTeam?.color,
      });
    };

    joinPayload();
    socket.on('connect', joinPayload);

    const handleJoinError = (data: { message: string }) => {
      setError(data.message || 'Erro ao ingressar na sala.');
      setStudentUser(null);
      sessionStorage.removeItem('@OffClass:sessionUser');
    };

    const handleRoomStatus = (data: any) => {
      if (data.classId === classId && studentUser) {
        const me = data.students?.find(
          (s: any) => s.studentSessionId === studentSessionId || s.userId === studentUser.id
        );
        if (me && me.teamName) {
          const teamData = { id: me.teamId, name: me.teamName, color: me.teamColor };
          setMyTeam(teamData);
          sessionStorage.setItem('@OffClass:sessionTeam', JSON.stringify(teamData));
        }
      }
    };

    const handleQuestionStarted = (data: QuestionData) => {
      setRoundFinished(false);
      setRoundResult(null);
      setMyRankInfo(null);
      setHasAnswered(false);
      setSelectedOption(null);
      setTextAnswer('');

      setCurrentQuestion(data);
      setCountdown(Number(data.timeLimitSeconds) || 30);

      if (data.sliderConfig || data.type === 'SLIDER') {
        const conf = parseSliderConfig(data.sliderConfig);
        setSliderVal(conf.min);
      }

      if (data.type === 'PUZZLE' && data.options) {
        const mappedItems = data.options.map((opt, idx) => ({ ...opt, originalIndex: idx }));
        setPuzzleItems(shuffleArray(mappedItems));
      } else {
        setPuzzleItems([]);
      }
    };

    const handleQuestionEnded = (results: any) => {
      setRoundFinished(true);
      setRoundResult(results);

      if (results.leaderboard && studentUser) {
        const me = results.leaderboard.find(
          (s: any) => s.studentSessionId === studentSessionId || s.userId === studentUser.id
        );
        if (me) {
          setMyRankInfo(me);
          if (me.teamName) {
            const teamData = { id: me.teamId, name: me.teamName, color: me.teamColor };
            setMyTeam(teamData);
            sessionStorage.setItem('@OffClass:sessionTeam', JSON.stringify(teamData));
          }
        }
      }
    };

    socket.on('join_error', handleJoinError);
    socket.on('room_status', handleRoomStatus);
    socket.on('question_launched', handleQuestionStarted);
    socket.on('question_started', handleQuestionStarted);
    socket.on('question_ended', handleQuestionEnded);

    return () => {
      socket.off('connect', joinPayload);
      socket.off('join_error', handleJoinError);
      socket.off('room_status', handleRoomStatus);
      socket.off('question_launched', handleQuestionStarted);
      socket.off('question_started', handleQuestionStarted);
      socket.off('question_ended', handleQuestionEnded);
    };
  }, [studentUser, classId, myTeam]);

  useEffect(() => {
    let timer: any;
    if (currentQuestion && !roundFinished && countdown > 0) {
      timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [currentQuestion, roundFinished, countdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/student-join', { name, email, password, classId });
      if (res.data.token) localStorage.setItem('@OffClass:token', res.data.token);

      const generatedSessionId = `student_${res.data.user.id}_${Date.now()}`;
      sessionStorage.setItem('@OffClass:studentSessionId', generatedSessionId);
      sessionStorage.setItem('@OffClass:sessionUser', JSON.stringify(res.data.user));
      sessionStorage.setItem('@OffClass:currentClassId', classId);

      setStudentUser(res.data.user);

      const socket = getSocket();
      socket.emit('join_room', {
        classId,
        userId: res.data.user.id,
        studentSessionId: generatedSessionId,
        userName: res.data.user.name,
        role: 'ALUNO',
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao conectar à turma.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMultipleChoice = (index: number) => {
    if (hasAnswered || roundFinished || !studentUser || !currentQuestion) return;
    setSelectedOption(index);
    setHasAnswered(true);

    const socket = getSocket();
    const selectedOpt = currentQuestion.options?.[index];
    const isCorrect = Boolean(selectedOpt?.isCorrect);

    socket.emit('submit_answer', {
      classId,
      questionId: currentQuestion.questionId || 'q1',
      questionIndex: currentQuestion.questionIndex || 0,
      userId: studentUser.id,
      userName: studentUser.name,
      selectedOptionIndex: index,
      isCorrect,
      timeRemaining: countdown,
      teamId: myTeam?.id || null,
    });
  };

  const handleSendTextAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasAnswered || roundFinished || !studentUser || !currentQuestion || !textAnswer.trim()) return;
    setHasAnswered(true);

    const cleanInput = textAnswer.trim().toLowerCase();
    const validTerms = currentQuestion.options?.map((o) => o.text?.toLowerCase().trim()) || [];
    const isCorrect = validTerms.some((term) => term && cleanInput === term);

    const socket = getSocket();
    socket.emit('submit_answer', {
      classId,
      questionId: currentQuestion.questionId || 'q1',
      questionIndex: currentQuestion.questionIndex || 0,
      userId: studentUser.id,
      userName: studentUser.name,
      textAnswer: textAnswer.trim(),
      isCorrect,
      timeRemaining: countdown,
      teamId: myTeam?.id || null,
    });
  };

  const handleSendSliderAnswer = () => {
    if (hasAnswered || roundFinished || !studentUser || !currentQuestion) return;
    setHasAnswered(true);

    const conf = parseSliderConfig(currentQuestion.sliderConfig);
    const isCorrect = Math.abs(sliderVal - conf.target) <= conf.tolerance;

    const socket = getSocket();
    socket.emit('submit_answer', {
      classId,
      questionId: currentQuestion.questionId || 'q1',
      questionIndex: currentQuestion.questionIndex || 0,
      userId: studentUser.id,
      userName: studentUser.name,
      sliderValue: Number(sliderVal),
      isCorrect,
      timeRemaining: countdown,
      teamId: myTeam?.id || null,
    });
  };

  const movePuzzleItem = (index: number, direction: 'up' | 'down') => {
    if (hasAnswered || roundFinished) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= puzzleItems.length) return;

    const updated = [...puzzleItems];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setPuzzleItems(updated);
  };

  const handleSendPuzzleAnswer = () => {
    if (hasAnswered || roundFinished || !studentUser || !currentQuestion) return;
    setHasAnswered(true);

    const studentOrderedTexts = puzzleItems.map((item) => item.text.trim().toLowerCase());

    const socket = getSocket();
    socket.emit('submit_answer', {
      classId,
      questionId: currentQuestion.questionId || 'q1',
      questionIndex: currentQuestion.questionIndex || 0,
      userId: studentUser.id,
      userName: studentUser.name,
      puzzleOrder: studentOrderedTexts,
      timeRemaining: countdown,
      teamId: myTeam?.id || null,
    });
  };

  if (!classId && !studentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-slate-950">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl backdrop-blur-xl text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-amber-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Nenhum QR Code detectado</h2>
          <p className="text-xs text-slate-400">
            Você pode escanear o QR Code fornecido pelo professor ou digitar o código da turma manualmente.
          </p>
          <button
            type="button"
            onClick={() => setIsCodeModalOpen(true)}
            className="w-full bg-blue-600 hover:bg-blue-500 transition-colors py-3.5 rounded-xl font-bold text-white shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer text-sm"
          >
            <KeyRound className="w-4 h-4" />
            <span>Entrar com Código da Turma</span>
          </button>
        </div>

        {/* Modal de Entrada por Código caso não tenha classId */}
        <JoinByCodeModal
          isOpen={isCodeModalOpen}
          onClose={() => setIsCodeModalOpen(false)}
          onSuccess={(resolvedClassId) => {
            sessionStorage.setItem('@OffClass:currentClassId', resolvedClassId);
            window.location.href = `/student/join?classId=${resolvedClassId}`;
          }}
        />
      </div>
    );
  }

  if (!studentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-slate-950">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-6">
            <img
              src="/logo.png"
              alt="OffClass"
              className="w-12 h-12 object-contain rounded-xl bg-slate-950 p-1 border border-slate-800"
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
            />
            <div>
              <h1 className="text-xl font-bold text-white">Entrar na Sala</h1>
              <p className="text-xs text-slate-400">Avaliação oficial • Média mínima 7,0</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-950/50 border border-red-800/80 rounded-xl text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Nome Completo</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: João da Silva"
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Matrícula ou E-mail</label>
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ex: 202601 ou joao@email.com"
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">PIN / Senha de Acesso</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha de acesso"
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 transition-colors py-3.5 rounded-xl font-bold text-white shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 mt-6 disabled:opacity-50 cursor-pointer text-sm"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar Presença'}
            </button>
          </form>

          {/* ⚡ BOTÃO ALTERNATIVO PARA ENTRAR COM CÓDIGO DA TURMA */}
          <div className="mt-4 text-center border-t border-slate-800/80 pt-4">
            <button
              type="button"
              onClick={() => setIsCodeModalOpen(true)}
              className="text-xs text-blue-400 hover:text-blue-300 underline flex items-center justify-center gap-1.5 mx-auto cursor-pointer font-medium"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Não conseguiu ler o QR Code? Digite o código da turma</span>
            </button>
          </div>
        </div>

        {/* Modal de Entrada por Código */}
        <JoinByCodeModal
          isOpen={isCodeModalOpen}
          onClose={() => setIsCodeModalOpen(false)}
          onSuccess={(resolvedClassId) => {
            sessionStorage.setItem('@OffClass:currentClassId', resolvedClassId);
            window.location.href = `/student/join?classId=${resolvedClassId}`;
          }}
        />
      </div>
    );
  }

  // 1. AVALIAÇÃO FORMAL CONTÍNUA
  const isFormalEvaluation = Boolean(
    currentQuestion &&
    currentQuestion.quizType === 'AVALIACAO' &&
    currentQuestion.questions &&
    currentQuestion.questions.length > 0
  );

  if (isFormalEvaluation && currentQuestion) {
    const examPayload = {
      id: currentQuestion.quizId || 'exam-1',
      title: currentQuestion.quizTitle || currentQuestion.title || 'Avaliação Oficial',
      durationMinutes: currentQuestion.durationMinutes || 45,
      questions: currentQuestion.questions,
    };

    return (
      <FormalExamView
        quizData={examPayload}
        studentUser={studentUser}
        classId={classId}
        durationMinutes={examPayload.durationMinutes}
        onFinishExam={(result) => setRoundResult(result)}
        onReturnToLobby={handleReturnToLobby}
      />
    );
  }

  // 2. RESULTADO DA RODADA GAMIFICADA
  if (roundFinished && roundResult) {
    const isApproved = Boolean(myRankInfo ? myRankInfo.totalGrade >= 7.0 : false);
    const isCorrect = Boolean(myRankInfo ? myRankInfo.isCorrect : false);

    const correctOptionObj = currentQuestion?.options?.find((o) => o.isCorrect);
    const correctTextAnswer = currentQuestion?.type === 'TRUE_FALSE' 
      ? (currentQuestion.options?.find((o) => o.isCorrect)?.text || 'Verdadeiro')
      : currentQuestion?.type === 'FAST_ANSWER'
      ? currentQuestion.options?.map((o) => o.text).join(' ou ')
      : currentQuestion?.type === 'PUZZLE'
      ? [...(currentQuestion.options || [])]
          .sort((a, b) => (a.originalIndex ?? 0) - (b.originalIndex ?? 0))
          .map((o, i) => `${i + 1}º: ${o.text}`)
          .join(' → ')
      : correctOptionObj?.text;

    return (
      <div className="flex flex-col min-h-screen bg-slate-950 p-6 items-center justify-center text-center select-none space-y-6 animate-fade-in">
        <div
          className={
            'p-6 sm:p-8 rounded-3xl border w-full max-w-sm shadow-2xl space-y-4 ' +
            (isCorrect
              ? 'bg-emerald-950/40 border-emerald-500/60 shadow-emerald-900/30'
              : 'bg-red-950/40 border-red-500/60 shadow-red-900/30')
          }
        >
          {isCorrect ? (
            <>
              <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto animate-bounce" />
              <h2 className="text-3xl font-black text-emerald-200">Mandou Bem!</h2>
              <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl">
                <span className="text-xs font-bold text-emerald-300 uppercase block">Pontos na Rodada</span>
                <span className="text-2xl font-black text-white">
                  +{Number(myRankInfo?.roundScore ?? 0)} pts
                </span>
              </div>
            </>
          ) : (
            <>
              <XCircle className="w-16 h-16 text-red-400 mx-auto" />
              <h2 className="text-2xl sm:text-3xl font-black text-red-200">Você Errou!</h2>
              
              <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-2xl text-left space-y-1">
                <span className="text-[10px] font-bold text-amber-400 uppercase flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" /> Gabarito / Resposta Correta:
                </span>
                <p className="text-xs font-bold text-white">
                  {currentQuestion?.type === 'SLIDER'
                    ? `O valor alvo era ${parseSliderConfig(currentQuestion.sliderConfig).target} ${parseSliderConfig(currentQuestion.sliderConfig).unit}`
                    : correctTextAnswer || 'Consulte o telão para ver a explicação.'}
                </p>
              </div>
            </>
          )}

          {myRankInfo && (
            <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-3 text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <span className="text-xs font-bold text-slate-300">{myRankInfo.rank}º Lugar na Turma</span>
                </div>
                <span
                  className={
                    'text-xs font-black px-2.5 py-0.5 rounded-full border ' +
                    (isApproved
                      ? 'text-emerald-300 bg-emerald-500/20 border-emerald-500/40'
                      : 'text-amber-300 bg-amber-500/20 border-amber-500/40')
                  }
                >
                  {isApproved ? 'Aprovado' : 'Abaixo de 7,0'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                <span className="text-xs text-slate-400 font-medium">Nota Acadêmica:</span>
                <span className="text-xl font-black text-white">{Number(myRankInfo.totalGrade ?? 0).toFixed(1)} / 10,0</span>
              </div>
            </div>
          )}
        </div>

        <div className="w-full max-w-sm space-y-2.5">
          <button
            type="button"
            onClick={handleReturnToLobby}
            className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 py-3 rounded-2xl text-xs text-slate-300 font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg"
          >
            <Radio className="w-4 h-4 text-emerald-400" />
            <span>Aguardar Próxima Atividade no Lobby</span>
          </button>
        </div>
      </div>
    );
  }

  // 3. GAMEPLAY ATIVO DE QUIZ GAMIFICADO (1 QUESTÃO POR VEZ)
  if (currentQuestion && !roundFinished) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-950 p-4 select-none justify-between animate-fade-in">
        <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl shadow-lg">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white truncate max-w-[130px]">{studentUser.name}</span>
              {myTeam && (
                <span
                  className="text-[9px] font-black uppercase text-white px-1.5 py-0.2 rounded mt-0.5 inline-block"
                  style={{ backgroundColor: myTeam.color }}
                >
                  {myTeam.name}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-xl">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-base font-black text-amber-300">{countdown}s</span>
          </div>
        </div>

        {hasAnswered ? (
          <div className="my-auto text-center space-y-3 p-6 bg-slate-900/80 border border-slate-800 rounded-3xl animate-fade-in shadow-2xl">
            <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto animate-bounce" />
            <h3 className="text-2xl font-black text-white">Resposta Enviada!</h3>
            <p className="text-xs text-slate-400">
              {myTeam ? `Pontuando para você e para a ${myTeam.name}...` : 'Olhe para o telão e aguarde a apuração da rodada...'}
            </p>
          </div>
        ) : (
          <div className="my-auto">
            {currentQuestion.type === 'PUZZLE' && (
              <div className="space-y-4">
                <div className="text-center">
                  <span className="text-xs font-bold uppercase text-purple-400 tracking-wider flex items-center justify-center gap-1.5">
                    <Layers className="w-4 h-4" />
                    <span>Ordene a sequência correta (1º ao 4º)</span>
                  </span>
                </div>
                <div className="space-y-2.5">
                  {puzzleItems.map((item, idx) => (
                    <div key={idx} className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between shadow-md">
                      <div className="flex items-center gap-3 pr-2">
                        <span className="w-7 h-7 rounded-xl bg-purple-600/30 text-purple-300 border border-purple-500/40 flex items-center justify-center font-black text-xs shrink-0">
                          {idx + 1}º
                        </span>
                        <span className="text-xs font-bold text-white line-clamp-2">{item.text}</span>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => movePuzzleItem(idx, 'up')}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-lg text-slate-200 cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === puzzleItems.length - 1}
                          onClick={() => movePuzzleItem(idx, 'down')}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-lg text-slate-200 cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleSendPuzzleAnswer}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 font-black py-4 rounded-2xl text-white shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-transform mt-4"
                >
                  <Check className="w-5 h-5" />
                  <span>Confirmar Sequência</span>
                </button>
              </div>
            )}

            {currentQuestion.type === 'TRUE_FALSE' && (() => {
              const tfOptions = currentQuestion.options || [];
              const trueIdx = tfOptions.findIndex((o) => o.text?.toLowerCase() === 'verdadeiro');
              const falseIdx = tfOptions.findIndex((o) => o.text?.toLowerCase() === 'falso');

              const actualTrueIdx = trueIdx !== -1 ? trueIdx : 0;
              const actualFalseIdx = falseIdx !== -1 ? falseIdx : 1;

              return (
                <div className="grid grid-cols-1 gap-4 h-[65vh]">
                  <button
                    type="button"
                    onClick={() => handleSendMultipleChoice(actualTrueIdx)}
                    className="bg-blue-600 hover:bg-blue-500 active:scale-95 transition-transform rounded-3xl flex flex-col items-center justify-center text-white shadow-xl shadow-blue-600/30 cursor-pointer p-6"
                  >
                    <Check className="w-16 h-16 mb-2" />
                    <span className="text-2xl font-black uppercase tracking-wider">VERDADEIRO</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendMultipleChoice(actualFalseIdx)}
                    className="bg-red-600 hover:bg-red-500 active:scale-95 transition-transform rounded-3xl flex flex-col items-center justify-center text-white shadow-xl shadow-red-600/30 cursor-pointer p-6"
                  >
                    <XIcon className="w-16 h-16 mb-2" />
                    <span className="text-2xl font-black uppercase tracking-wider">FALSO</span>
                  </button>
                </div>
              );
            })()}

            {currentQuestion.type === 'FAST_ANSWER' && (
              <form onSubmit={handleSendTextAnswer} className="space-y-4 bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-2xl">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block text-center">
                  Digite o termo ou código correto
                </span>
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="Sua resposta aqui..."
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  className="w-full text-center text-xl font-bold bg-slate-950 border border-slate-700 focus:border-blue-500 p-4 rounded-2xl text-white focus:outline-none"
                />
                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 font-black py-4 rounded-2xl text-white shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-transform"
                >
                  <Send className="w-5 h-5" />
                  <span>Enviar Resposta</span>
                </button>
              </form>
            )}

            {currentQuestion.type === 'SLIDER' && (() => {
              const conf = parseSliderConfig(currentQuestion.sliderConfig);
              return (
                <div className="space-y-6 bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-2xl text-center">
                  <div className="flex items-center justify-center gap-2 text-slate-300">
                    <Sliders className="w-5 h-5 text-blue-400" />
                    <span className="text-xs font-bold uppercase tracking-wider">Ajuste o Valor Estimado</span>
                  </div>
                  <div className="py-4">
                    <span className="text-5xl font-black text-white font-mono">
                      {sliderVal} {conf.unit}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={conf.min}
                    max={conf.max}
                    step={conf.step || 1}
                    value={sliderVal}
                    onChange={(e) => setSliderVal(Number(e.target.value))}
                    className="w-full h-3 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between text-xs font-bold text-slate-500 px-1 font-mono">
                    <span>{conf.min} {conf.unit}</span>
                    <span>{conf.max} {conf.unit}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSendSliderAnswer}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 font-black py-4 rounded-2xl text-white shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-transform"
                  >
                    <Check className="w-5 h-5" />
                    <span>Confirmar Valor</span>
                  </button>
                </div>
              );
            })()}

            {currentQuestion.type === 'MULTIPLE_CHOICE' && (
              <div className="grid grid-cols-2 gap-3.5 h-[68vh]">
                <button
                  type="button"
                  onClick={() => handleSendMultipleChoice(0)}
                  className="bg-red-600 hover:bg-red-500 active:scale-95 transition-transform rounded-3xl flex flex-col items-center justify-center text-white shadow-xl shadow-red-600/30 cursor-pointer p-4 select-none"
                >
                  <span className="text-4xl sm:text-5xl font-black mb-2">▲</span>
                  <span className="text-xs sm:text-sm font-black text-center line-clamp-2 px-1">
                    {currentQuestion.options?.[0]?.text || 'Opção 1'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMultipleChoice(1)}
                  className="bg-blue-600 hover:bg-blue-500 active:scale-95 transition-transform rounded-3xl flex flex-col items-center justify-center text-white shadow-xl shadow-blue-600/30 cursor-pointer p-4 select-none"
                >
                  <span className="text-4xl sm:text-5xl font-black mb-2">◆</span>
                  <span className="text-xs sm:text-sm font-black text-center line-clamp-2 px-1">
                    {currentQuestion.options?.[1]?.text || 'Opção 2'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMultipleChoice(2)}
                  className="bg-amber-500 hover:bg-amber-400 active:scale-95 transition-transform rounded-3xl flex flex-col items-center justify-center text-slate-950 shadow-xl shadow-amber-500/30 cursor-pointer p-4 select-none"
                >
                  <span className="text-4xl sm:text-5xl font-black mb-2">●</span>
                  <span className="text-xs sm:text-sm font-black text-center line-clamp-2 px-1 text-slate-950">
                    {currentQuestion.options?.[2]?.text || 'Opção 3'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMultipleChoice(3)}
                  className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-transform rounded-3xl flex flex-col items-center justify-center text-white shadow-xl shadow-emerald-600/30 cursor-pointer p-4 select-none"
                >
                  <span className="text-4xl sm:text-5xl font-black mb-2">■</span>
                  <span className="text-xs sm:text-sm font-black text-center line-clamp-2 px-1">
                    {currentQuestion.options?.[3]?.text || 'Opção 4'}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        <div className="text-center text-[11px] text-slate-500 pb-1">
          OffClass • Escala 0 a 10 • Média: 7,0
        </div>
      </div>
    );
  }

  // 4. LOBBY DE ESPERA COM ACESSO À BIBLIOTECA DE SLIDES
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-slate-950 animate-fade-in font-sans">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center space-y-5 shadow-2xl">
        <div className="inline-flex p-4 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl animate-pulse">
          <Radio className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-white">Você está no Lobby!</h2>
        <p className="text-sm text-slate-400">
          Olá <strong className="text-white">{studentUser.name}</strong>, sua presença foi confirmada.
        </p>

        {myTeam && (
          <div
            className="p-3 rounded-2xl border flex items-center justify-center gap-2"
            style={{ backgroundColor: myTeam.color + '15', borderColor: myTeam.color + '40' }}
          >
            <Shield className="w-4 h-4" style={{ color: myTeam.color }} />
            <span className="text-xs font-black text-white">Você joga na {myTeam.name}</span>
          </div>
        )}

        <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 text-xs text-blue-400 flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
          <span>Aguardando o instrutor lançar a atividade...</span>
        </div>

        <div className="space-y-2.5 pt-2">
          <button
            type="button"
            onClick={() => setShowLibraryModal(true)}
            className="w-full bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <BookOpen className="w-4 h-4 text-purple-400" />
            <span>Consultar Apostila & Slides da Disciplina</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/student/portal', { replace: true })}
            className="w-full bg-slate-800 hover:bg-slate-700 text-xs font-bold py-3 rounded-xl text-slate-200 border border-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <GraduationCap className="w-4 h-4 text-blue-400" />
            <span>Acessar Meu Boletim & Histórico</span>
          </button>
        </div>
      </div>

      {showLibraryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-400" />
                <span>Biblioteca de Estudos da Turma</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowLibraryModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto flex-1 pr-1">
              <StudentLibrary studentClassId={classId} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentJoin;