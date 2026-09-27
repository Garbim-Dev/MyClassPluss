import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { getSocket } from '../../services/socket';
import { FormalExamView } from './FormalExamView';
import { StudentLibrary } from './StudentLibrary';
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
  WifiOff,
  QrCode,
  LogIn,
  UserPlus,
  Lock,
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

const SESSION_KEY = '@MyClassPluss:student_session';
const SAVED_DOC_KEY = '@MyClassPluss:saved_doc';

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

  // Modo de acesso: 'login' (já cadastrado) ou 'register' (primeiro acesso)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // 1. Restaura classId da URL, localStorage ou sessionStorage
  const [classId, setClassId] = useState<string>(() => {
    const fromUrl = searchParams.get('classId');
    if (fromUrl) return fromUrl;

    const fromLocal = localStorage.getItem(SESSION_KEY);
    if (fromLocal) {
      try {
        const parsed = JSON.parse(fromLocal);
        if (parsed.classId) return parsed.classId;
      } catch (e) {}
    }
    return sessionStorage.getItem('@MyClassPluss:currentClassId') || '';
  });

  // Campo de Código da Turma sempre ativo
  const [classCodeInput, setClassCodeInput] = useState<string>(() => {
    return searchParams.get('code') || '';
  });

  const [name, setName] = useState('');
  const [email, setEmail] = useState(() => localStorage.getItem(SAVED_DOC_KEY) || '');
  const [password, setPassword] = useState('');

  // 2. Restaura o usuário de forma resiliente
  const [studentUser, setStudentUser] = useState(() => {
    const local = localStorage.getItem(SESSION_KEY);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (parsed.id || parsed.userId) {
          return {
            id: parsed.id || parsed.userId,
            name: parsed.name || parsed.userName,
            email: parsed.email,
          };
        }
      } catch (e) {}
    }
    const saved = sessionStorage.getItem('@MyClassPluss:sessionUser');
    return saved ? JSON.parse(saved) : null;
  });

  const [myTeam, setMyTeam] = useState<TeamInfo | null>(() => {
    const savedTeam = sessionStorage.getItem('@MyClassPluss:sessionTeam');
    return savedTeam ? JSON.parse(savedTeam) : null;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isReconnecting, setIsReconnecting] = useState(false);

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

  const [showLibraryModal, setShowLibraryModal] = useState<boolean>(false);

  const wakeLockRef = useRef<any>(null);

  // ⚡ Se o aluno veio via QR Code (tem classId), busca o código legível da turma para pré-preencher o campo
  useEffect(() => {
    if (classId && !classCodeInput) {
      const fetchClassDetails = async () => {
        try {
          const res = await api.get(`/academic/classes/${classId}`).catch(() => null);
          if (res?.data?.code) {
            setClassCodeInput(res.data.code);
          }
        } catch (e) {}
      };
      fetchClassDetails();
    }
  }, [classId]);

  const handleReturnToLobby = () => {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('@MyClassPluss:answered_')) {
        localStorage.removeItem(key);
      }
    });

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

  // 3. Sockets & Keep-Alive com reconexão automática
  useEffect(() => {
    if (!studentUser || !classId) return;

    const socket = getSocket();
    const studentSessionId =
      sessionStorage.getItem('@MyClassPluss:studentSessionId') || `student_${studentUser.id}`;

    const joinPayload = () => {
      setIsReconnecting(false);
      socket.emit('join_room', {
        classId,
        userId: String(studentUser.id),
        studentSessionId,
        userName: studentUser.name,
        role: 'ALUNO',
        teamId: myTeam?.id,
        teamName: myTeam?.name,
        teamColor: myTeam?.color,
      });
    };

    joinPayload();

    const handleConnect = () => {
      joinPayload();
    };

    const handleDisconnect = () => {
      setIsReconnecting(true);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    const handleJoinError = (data: { message: string }) => {
      setError(data.message || 'Erro ao ingressar na sala.');
      setStudentUser(null);
      sessionStorage.removeItem('@MyClassPluss:sessionUser');
      localStorage.removeItem(SESSION_KEY);
    };

    const handleRoomStatus = (data: any) => {
      if (data.classId === classId && studentUser) {
        const me = data.students?.find(
          (s: any) => s.studentSessionId === studentSessionId || s.userId === String(studentUser.id)
        );
        if (me && me.teamName) {
          const teamData = { id: me.teamId, name: me.teamName, color: me.teamColor };
          setMyTeam(teamData);
          sessionStorage.setItem('@MyClassPluss:sessionTeam', JSON.stringify(teamData));
        }
      }
    };

    const handleFormalExamStarted = (data: any) => {
      setRoundFinished(false);
      setRoundResult(null);
      setMyRankInfo(null);
      setHasAnswered(false);

      const resolvedDuration = Number(data.durationMinutes) || 45;

      setCurrentQuestion({
        quizId: data.quizId || data.id,
        quizType: 'AVALIACAO',
        quizTitle: data.quizTitle || data.title || 'Avaliação Oficial',
        title: data.quizTitle || data.title || 'Avaliação Oficial',
        durationMinutes: resolvedDuration,
        totalQuestions: data.totalQuestions || data.questions?.length || 1,
        questionIndex: 0,
        type: 'AVALIACAO',
        timeLimitSeconds: resolvedDuration * 60,
        questions: data.questions || [],
      });
    };

    const handleQuestionStarted = (data: QuestionData) => {
      if (
        data.quizType === 'AVALIACAO' ||
        data.quizType === 'AVALIAÇAO' ||
        (data.questions && data.questions.length > 0)
      ) {
        handleFormalExamStarted(data);
        return;
      }

      setRoundFinished(false);
      setRoundResult(null);
      setMyRankInfo(null);
      setSelectedOption(null);
      setTextAnswer('');

      if (data.questionIndex === 0) {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('@MyClassPluss:answered_')) {
            localStorage.removeItem(key);
          }
        });
      }

      const quizKey = data.quizId || 'current_quiz';
      const answeredKey = `@MyClassPluss:answered_${quizKey}_${data.questionIndex}`;
      const alreadyVoted = localStorage.getItem(answeredKey) === 'true';
      setHasAnswered(alreadyVoted);

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
          (s: any) => s.studentSessionId === studentSessionId || s.userId === String(studentUser.id)
        );
        if (me) {
          setMyRankInfo(me);
          if (me.teamName) {
            const teamData = { id: me.teamId, name: me.teamName, color: me.teamColor };
            setMyTeam(teamData);
            sessionStorage.setItem('@MyClassPluss:sessionTeam', JSON.stringify(teamData));
          }
        }
      }
    };

    socket.on('join_error', handleJoinError);
    socket.on('room_status', handleRoomStatus);
    socket.on('formal_exam_launched', handleFormalExamStarted);
    socket.on('question_launched', handleQuestionStarted);
    socket.on('question_started', handleQuestionStarted);
    socket.on('question_ended', handleQuestionEnded);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('join_error', handleJoinError);
      socket.off('room_status', handleRoomStatus);
      socket.off('formal_exam_launched', handleFormalExamStarted);
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

  // 4. Fluxo Unificado de Entrada
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    let targetClassId = classId;

    try {
      const cleanCode = classCodeInput.trim().toUpperCase();

      // Se o aluno digitou um código manualmente ou alterou o código existente
      if (cleanCode) {
        const codeRes = await api.post('/academic/join-by-code', {
          classCode: cleanCode,
          name: name.trim() || 'Aluno',
          email: email.trim().toLowerCase(),
        });

        if (codeRes.data?.classId) {
          targetClassId = codeRes.data.classId;
          setClassId(targetClassId);
          sessionStorage.setItem('@MyClassPluss:currentClassId', targetClassId);
        } else if (!targetClassId) {
          throw new Error('Código de turma inválido. Verifique o código exibido no telão.');
        }
      } else if (!targetClassId) {
        throw new Error('Por favor, informe o Código da Turma ou escaneie o QR Code.');
      }

      const res = await api.post('/auth/student-join', {
        name: authMode === 'register' ? name.trim() : undefined,
        email: email.trim().toLowerCase(),
        password: password || '123456',
        classId: targetClassId,
        isNewStudent: authMode === 'register',
      });

      if (res.data.token) localStorage.setItem('@MyClassPluss:token', res.data.token);

      localStorage.setItem(SAVED_DOC_KEY, email.trim());

      const generatedSessionId = `student_${res.data.user.id}_${Date.now()}`;
      sessionStorage.setItem('@MyClassPluss:studentSessionId', generatedSessionId);
      sessionStorage.setItem('@MyClassPluss:sessionUser', JSON.stringify(res.data.user));
      sessionStorage.setItem('@MyClassPluss:currentClassId', targetClassId);

      const persistentSession = {
        userId: res.data.user.id,
        id: res.data.user.id,
        userName: res.data.user.name,
        name: res.data.user.name,
        email: res.data.user.email,
        classId: targetClassId,
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(persistentSession));

      setStudentUser(res.data.user);

      const socket = getSocket();
      socket.emit('join_room', {
        classId: targetClassId,
        userId: String(res.data.user.id),
        studentSessionId: generatedSessionId,
        userName: res.data.user.name,
        role: 'ALUNO',
      });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Erro ao conectar à turma.';
      setError(msg);

      if (authMode === 'register' && msg.includes('já possui cadastro')) {
        setTimeout(() => setAuthMode('login'), 2000);
      } else if (authMode === 'login' && msg.includes('não encontrado')) {
        setTimeout(() => setAuthMode('register'), 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendMultipleChoice = (index: number) => {
    if (hasAnswered || roundFinished || !studentUser || !currentQuestion) return;
    setSelectedOption(index);
    setHasAnswered(true);

    const quizKey = currentQuestion?.quizId || 'current_quiz';
    localStorage.setItem(`@MyClassPluss:answered_${quizKey}_${currentQuestion.questionIndex}`, 'true');

    const socket = getSocket();
    const selectedOpt = currentQuestion.options?.[index];
    const isCorrect = Boolean(selectedOpt?.isCorrect);

    socket.emit('submit_answer', {
      classId,
      questionId: currentQuestion.questionId || 'q1',
      questionIndex: currentQuestion.questionIndex || 0,
      userId: String(studentUser.id),
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

    const quizKey = currentQuestion?.quizId || 'current_quiz';
    localStorage.setItem(`@MyClassPluss:answered_${quizKey}_${currentQuestion.questionIndex}`, 'true');

    const cleanInput = textAnswer.trim().toLowerCase();
    const validTerms = currentQuestion.options?.map((o) => o.text?.toLowerCase().trim()) || [];
    const isCorrect = validTerms.some((term) => term && cleanInput === term);

    const socket = getSocket();
    socket.emit('submit_answer', {
      classId,
      questionId: currentQuestion.questionId || 'q1',
      questionIndex: currentQuestion.questionIndex || 0,
      userId: String(studentUser.id),
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

    const quizKey = currentQuestion?.quizId || 'current_quiz';
    localStorage.setItem(`@MyClassPluss:answered_${quizKey}_${currentQuestion.questionIndex}`, 'true');

    const conf = parseSliderConfig(currentQuestion.sliderConfig);
    const isCorrect = Math.abs(sliderVal - conf.target) <= conf.tolerance;

    const socket = getSocket();
    socket.emit('submit_answer', {
      classId,
      questionId: currentQuestion.questionId || 'q1',
      questionIndex: currentQuestion.questionIndex || 0,
      userId: String(studentUser.id),
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

    const quizKey = currentQuestion?.quizId || 'current_quiz';
    localStorage.setItem(`@MyClassPluss:answered_${quizKey}_${currentQuestion.questionIndex}`, 'true');

    const studentOrderedTexts = puzzleItems.map((item) => item.text.trim().toLowerCase());

    const socket = getSocket();
    socket.emit('submit_answer', {
      classId,
      questionId: currentQuestion.questionId || 'q1',
      questionIndex: currentQuestion.questionIndex || 0,
      userId: String(studentUser.id),
      userName: studentUser.name,
      puzzleOrder: studentOrderedTexts,
      timeRemaining: countdown,
      teamId: myTeam?.id || null,
    });
  };

  // 1. Formulário Unificado com Abas: Já sou Cadastrado vs Primeiro Acesso
  if (!studentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-slate-950 font-sans">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-5">
            <img
              src="/logo.png"
              alt="MyClassPluss"
              className="w-12 h-12 object-contain rounded-xl bg-slate-950 p-1 border border-slate-800"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div>
              <h1 className="text-xl font-black text-white">Entrar na Sala</h1>
              <p className="text-xs text-slate-400">Avaliação oficial • Média mínima 7,0</p>
            </div>
          </div>

          {/* ⚡ ABAS DE SELEÇÃO: JÁ SOU CADASTRADO vs PRIMEIRO ACESSO */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-2xl mb-4">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setError('');
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                authMode === 'login'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Já sou Cadastrado</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setError('');
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                authMode === 'register'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Primeiro Acesso</span>
            </button>
          </div>

          {/* Indicador de Status Visual do QR Code (quando escaneado) */}
          {classId && (
            <div className="mb-4 p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-300 text-xs font-bold">
                <QrCode className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Turma identificada via QR Code</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setClassId('');
                  setClassCodeInput('');
                  sessionStorage.removeItem('@MyClassPluss:currentClassId');
                }}
                className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
              >
                Limpar
              </button>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-950/50 border border-red-800/80 rounded-xl text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ⚡ CAMPO DE CÓDIGO DA TURMA SEMPRE VISÍVEL */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                  <span>Código da Turma</span>
                </span>
                {classId && (
                  <span className="text-[10px] text-emerald-400 font-bold">✓ Preenchido via QR Code</span>
                )}
              </label>
              <input
                type="text"
                required
                value={classCodeInput}
                onChange={(e) => {
                  setClassCodeInput(e.target.value.toUpperCase());
                  // Se o aluno digitar outro código, limpa o classId anterior para consultar o novo
                  if (classId) setClassId('');
                }}
                placeholder="Ex: BIG FAMILY ou MICT-VALE"
                className="w-full bg-slate-950 border border-blue-500/50 focus:border-blue-400 rounded-xl px-4 py-3 text-sm text-white font-mono font-bold uppercase focus:outline-none transition-colors shadow-inner tracking-wider"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                {classId
                  ? 'Código detectado automaticamente. Você pode alterá-lo se necessário.'
                  : 'Digite o código da turma projetado no telão pelo instrutor.'}
              </span>
            </div>

            {/* Nome Completo: Exibido apenas no Primeiro Acesso */}
            {authMode === 'register' && (
              <div className="animate-fade-in">
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
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Matrícula Funcional ou CPF
              </label>
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ex: 0023419 ou 000.000.000-00"
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-colors font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                {authMode === 'register'
                  ? 'Seu número de identificação único que amarra suas notas e frequência.'
                  : 'Digite o mesmo número utilizado no seu cadastro.'}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center justify-between">
                <span>{authMode === 'register' ? 'Crie sua Senha de Acesso' : 'Sua Senha de Acesso'}</span>
                <span className="text-[10px] text-slate-500 font-mono">Padrão: 123456</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-colors"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 transition-all py-3.5 rounded-xl font-bold text-white shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 mt-6 disabled:opacity-50 cursor-pointer text-sm active:scale-95"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : authMode === 'register' ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Concluir Cadastro & Entrar</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Acessar Sala</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. Avaliação Formal Contínua
  const isFormalEvaluation = Boolean(
    currentQuestion &&
    (currentQuestion.quizType === 'AVALIACAO' || currentQuestion.quizType === 'AVALIAÇAO') &&
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
      <div className="relative min-h-screen bg-slate-950">
        {isReconnecting && (
          <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500/90 text-slate-950 py-1.5 px-4 text-center text-xs font-black flex items-center justify-center gap-2 shadow-md">
            <WifiOff className="w-3.5 h-3.5 animate-pulse" />
            <span>Sinal oscilando. Restabelecendo conexão com a sala...</span>
          </div>
        )}

        <FormalExamView
          quizData={examPayload}
          studentUser={studentUser}
          classId={classId}
          durationMinutes={examPayload.durationMinutes}
          onFinishExam={(result) => setRoundResult(result)}
          onReturnToLobby={handleReturnToLobby}
        />
      </div>
    );
  }

  // 3. Resultado da Rodada Gamificada
  if (roundFinished && roundResult) {
    const isApproved = Boolean(myRankInfo ? myRankInfo.totalGrade >= 7.0 : false);
    const isCorrect = Boolean(myRankInfo ? myRankInfo.isCorrect : false);

    const correctOptionObj = currentQuestion?.options?.find((o) => o.isCorrect);
    const correctTextAnswer =
      currentQuestion?.type === 'TRUE_FALSE'
        ? currentQuestion.options?.find((o) => o.isCorrect)?.text || 'Verdadeiro'
        : currentQuestion?.type === 'FAST_ANSWER'
        ? currentQuestion.options?.map((o) => o.text).join(' ou ')
        : currentQuestion?.type === 'PUZZLE'
        ? [...(currentQuestion.options || [])]
            .sort((a, b) => (a.originalIndex ?? 0) - (b.originalIndex ?? 0))
            .map((o, i) => `${i + 1}º: ${o.text}`)
            .join(' → ')
        : correctOptionObj?.text;

    return (
      <div className="flex flex-col min-h-screen bg-slate-950 p-6 items-center justify-center text-center select-none space-y-6 animate-fade-in relative font-sans">
        {isReconnecting && (
          <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500/90 text-slate-950 py-1.5 px-4 text-center text-xs font-black flex items-center justify-center gap-2 shadow-md">
            <WifiOff className="w-3.5 h-3.5 animate-pulse" />
            <span>Sinal oscilando. Restabelecendo conexão com a sala...</span>
          </div>
        )}

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

        {(() => {
          const isLastQuestion = Boolean(
            currentQuestion &&
            currentQuestion.questionIndex + 1 >= (currentQuestion.totalQuestions || 1)
          );

          if (isLastQuestion) {
            return (
              <div className="w-full max-w-sm space-y-3 bg-slate-900/90 border border-slate-800 p-4 rounded-3xl shadow-xl animate-fade-in">
                <div className="text-center pb-1">
                  <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider flex items-center justify-center gap-1">
                    <Trophy className="w-3.5 h-3.5" /> Atividade Concluída!
                  </span>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Sua pontuação final e nota oficial foram computadas.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleReturnToLobby}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/30 cursor-pointer active:scale-95"
                >
                  <Radio className="w-4 h-4" />
                  <span>Retornar ao Lobby da Sala</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/student/portal', { replace: true })}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 rounded-2xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer border border-slate-700"
                >
                  <GraduationCap className="w-4 h-4 text-blue-400" />
                  <span>Ver Meu Boletim & Frequência</span>
                </button>
              </div>
            );
          }

          return (
            <div className="w-full max-w-sm bg-slate-900/80 border border-slate-800/90 p-4 rounded-3xl shadow-lg flex items-center justify-center gap-2.5 animate-pulse">
              <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
              <div className="text-left">
                <span className="text-xs font-bold text-white block">
                  Olhe para o telão!
                </span>
                <span className="text-[11px] text-slate-400 block">
                  Aguarde o instrutor avançar para a próxima pergunta...
                </span>
              </div>
            </div>
          );
        })()}
      </div>
    );
  }

  // 4. Gameplay Ativo de Quiz (1 Questão por vez)
  if (currentQuestion && !roundFinished) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-950 p-4 select-none justify-between animate-fade-in relative">
        {isReconnecting && (
          <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500/90 text-slate-950 py-1.5 px-4 text-center text-xs font-black flex items-center justify-center gap-2 shadow-md">
            <WifiOff className="w-3.5 h-3.5 animate-pulse" />
            <span>Sinal oscilando. Restabelecendo conexão com a sala...</span>
          </div>
        )}

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
          MyClassPluss • Escala 0 a 10 • Média: 7,0
        </div>
      </div>
    );
  }

  // 5. Lobby de Espera
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-slate-950 animate-fade-in font-sans relative">
      {isReconnecting && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500/90 text-slate-950 py-1.5 px-4 text-center text-xs font-black flex items-center justify-center gap-2 shadow-md">
          <WifiOff className="w-3.5 h-3.5 animate-pulse" />
          <span>Sinal oscilando. Restabelecendo conexão com a sala...</span>
        </div>
      )}

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