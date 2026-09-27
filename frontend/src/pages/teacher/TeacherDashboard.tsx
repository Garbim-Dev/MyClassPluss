import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import { getSocket } from '../../services/socket';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemeToggle } from '../../components/ThemeToggle';
import { QuizManager } from './QuizManager';
import { SessionHistory } from './SessionHistory';
import { InstitutionsManager } from './InstitutionsManager';
import { GlobalCoursesManager } from './GlobalCoursesManager';
import { SubjectsManager } from './SubjectsManager';
import { RoomsManager } from './RoomsManager';       // Gerenciador de Ambientes Físicos (Salas)
import { ClassesManager } from './ClassesManager';   // Gerenciador de Turmas
import { ClassReportModal } from './ClassReportModal';
import { TeamConfigModal } from './TeamConfigModal';
import { InteractiveArenaModal } from './InteractiveArenaModal';
import { ClassDetailsModal } from './ClassDetailsModal';
import { FullPedagogicalDossierModal } from './FullPedagogicalDossierModal';
import { ExamMonitorModal } from './ExamMonitorModal';
import { ContentManager } from './ContentManager';
import { BackupManager } from './BackupManager';
import { ShieldCheck } from 'lucide-react';
import {
  PlusCircle,
  QrCode,
  Clock,
  MapPin,
  Signal,
  Play,
  Sparkles,
  Gamepad2,
  LayoutDashboard,
  Trophy,
  RotateCcw,
  FileSpreadsheet,
  SkipForward,
  History,
  Maximize2,
  GraduationCap,
  LogOut,
  UserCheck,
  FileCheck2,
  Wrench,
  BookOpen,
  Filter,
  Edit3,
  Trash2,
  X,
  Building2,
  Layers,
  DoorClosed,
  Users,
  Copy,
  Check,
  Smartphone,
  Globe,
} from 'lucide-react';

type TabType = 'dashboard' | 'academic' | 'quizzes';
type AcademicSubTab = 'institutions' | 'courses' | 'subjects' | 'rooms' | 'classes' | 'history' | 'backup';
type ActivityFilter = 'ALL' | 'QUIZ_INTERATIVO' | 'AVALIACAO' | 'ATIVIDADE';

interface TeamItem {
  id: string;
  name: string;
  color: string;
}

export const TeacherDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { theme } = useTheme();

  const currentTabParam = (searchParams.get('tab') as TabType) || 'academic';
  const [activeTab, setActiveTabState] = useState<TabType>(
    ['dashboard', 'academic', 'quizzes'].includes(currentTabParam) ? currentTabParam : 'academic'
  );

  // Sub-aba ativa dentro da Gestão Acadêmica
  const [academicSubTab, setAcademicSubTab] = useState<AcademicSubTab>('institutions');

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') as TabType;
    if (tabFromUrl && ['dashboard', 'academic', 'quizzes'].includes(tabFromUrl)) {
      setActiveTabState(tabFromUrl);
    } else {
      setActiveTabState('academic');
    }
  }, [searchParams]);

  const handleTabChange = (newTab: TabType) => {
    setActiveTabState(newTab);
    setSearchParams({ tab: newTab });
  };

  const [teacherName, setTeacherName] = useState<string>('Carregando...');
  const [teacherEmail, setTeacherEmail] = useState<string>('');

  const [classes, setClasses] = useState<any[]>([]);
  const [quizzesList, setQuizzesList] = useState<any[]>([]);
  const [selectedQr, setSelectedQr] = useState<any | null>(null);
  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [activeClassData, setActiveClassData] = useState<any | null>(null);
  const [onlineStudents, setOnlineStudents] = useState<any[]>([]);
  const [copiedCode, setCopiedCode] = useState(false);

  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('ALL');
  const [filterOnlyCurrentDemand, setFilterOnlyCurrentDemand] = useState(true);
  const [selectedQuiz, setSelectedQuiz] = useState<any | null>(null);

  // ⚡ Estado para armazenar o Dossiê Consolidado vindo da API
  const [reportData, setReportData] = useState<any | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);

  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isTeamModeActive, setIsTeamModeActive] = useState(false);
  const [isArenaOpen, setIsArenaOpen] = useState(false);
  const [isExamMonitorOpen, setIsExamMonitorOpen] = useState(false);
  const [selectedClassForDetails, setSelectedClassForDetails] = useState<string | null>(null);
  const [isDossierModalOpen, setIsDossierModalOpen] = useState(false);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizRunning, setQuizRunning] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [answersCount, setAnswersCount] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [quizResults, setQuizResults] = useState<any | null>(null);
  const [showPodium, setShowPodium] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const res = await api.get('/auth/me');
        if (res.data?.name) {
          setTeacherName(res.data.name);
          setTeacherEmail(res.data.email || '');
          localStorage.setItem('user', JSON.stringify(res.data));
        }
      } catch (err) {
        const stored = localStorage.getItem('user');
        if (stored) {
          try {
            const u = JSON.parse(stored);
            if (u.name) setTeacherName(u.name);
            if (u.email) setTeacherEmail(u.email);
          } catch (e) {}
        }
      }
    };
    fetchUserProfile();
  }, []);

  const getInitials = (nameStr: string) => {
    if (!nameStr || nameStr === 'Carregando...') return '...';
    const words = nameStr.trim().split(/\s+/).filter(Boolean);
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  };

  const handleLogout = () => {
    localStorage.removeItem('@MyClassPluss:token');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.clear();
    navigate('/', { replace: true });
  };

  const fetchData = async () => {
    try {
      const [clsRes, qzRes] = await Promise.all([
        api.get('/academic/classes'),
        api.get('/quizzes'),
      ]);
      const classList = clsRes.data || [];
      setClasses(classList);
      const quizzes = qzRes.data || [];
      setQuizzesList(quizzes);

      if (classList.length > 0 && !activeClassId) {
        handleSelectDemand(classList[0]);
      }
    } catch (e) {
      console.error('Erro ao buscar dados:', e);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  useEffect(() => {
    if (!activeClassId) return;
    const socket = getSocket();

    const joinTeacher = () => {
      socket.emit('join_room', {
        classId: activeClassId,
        userId: 'teacher',
        userName: teacherName || 'Instrutor',
        role: 'PROFESSOR',
      });
    };

    joinTeacher();
    socket.on('connect', joinTeacher);

    const handleRoomStatus = (data: any) => {
      if (data.classId === activeClassId) {
        setOnlineStudents(data.students || []);
        if (data.isTeamMode !== undefined) {
          setIsTeamModeActive(data.isTeamMode);
        }
      }
    };

    const handleAnswerCount = (data: any) => {
      if (data.classId === activeClassId) {
        setAnswersCount(data.totalAnswers || 0);
      }
    };

    const handleQuestionEnded = (results: any) => {
      setQuizFinished(true);
      setQuizRunning(false);
      setQuizResults(results);
      setShowPodium(true);
    };

    socket.on('room_status', handleRoomStatus);
    socket.on('answer_received_count', handleAnswerCount);
    socket.on('question_ended', handleQuestionEnded);

    return () => {
      socket.off('connect', joinTeacher);
      socket.off('room_status', handleRoomStatus);
      socket.off('answer_received_count', handleAnswerCount);
      socket.off('question_ended', handleQuestionEnded);
    };
  }, [activeClassId, teacherName]);

  // Contagem regressiva oficial da pergunta
  useEffect(() => {
    let timer: any;
    if (quizRunning && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (quizRunning && countdown === 0 && selectedQuiz) {
      setQuizRunning(false);
      setShowPodium(true);

      const currentQ = selectedQuiz.questions[currentQuestionIndex];
      const isLast = currentQuestionIndex + 1 >= selectedQuiz.questions.length;
      const socket = getSocket();

      if (activeClassId && currentQ) {
        socket.emit('finish_question', {
          classId: activeClassId,
          questionIndex: currentQuestionIndex,
          totalQuestions: selectedQuiz.questions.length,
          type: currentQ.type,
          isLastQuestion: isLast,
        });
      }
    }
    return () => clearInterval(timer);
  }, [quizRunning, countdown, activeClassId, selectedQuiz, currentQuestionIndex]);

  const emitLaunchQuestion = (quiz: any, questionIndex: number) => {
    if (!activeClassId) {
      alert('Selecione uma turma e gere o QR Code antes de iniciar a atividade!');
      return;
    }

    const q = quiz.questions?.[questionIndex] || quiz.questions?.[0];
    if (!q) return;

    setShowPodium(false);
    setQuizFinished(false);
    setQuizResults(null);
    setAnswersCount(0);
    setCountdown(Number(q.timeLimitSeconds) || 30);
    setQuizRunning(true);
    setCurrentQuestionIndex(questionIndex);
    setIsArenaOpen(true);

    const socket = getSocket();
    socket.emit('launch_question', {
      classId: activeClassId,
      quizId: quiz.id,
      quizType: 'QUIZ_INTERATIVO',
      quizTitle: quiz.title,
      questionId: q.id,
      questionIndex,
      totalQuestions: quiz.questions.length,
      title: q.title,
      imageUrl: q.imageUrl || q.image || null,
      type: q.type,
      timeLimitSeconds: Number(q.timeLimitSeconds) || 30,
      durationMinutes: Number(quiz.durationMinutes) || 45,
      options: q.options || [],
      sliderConfig: q.sliderConfig || null,
    });
  };

  const handleStartGameAfterWarmup = () => {
    if (!selectedQuiz) return;
    emitLaunchQuestion(selectedQuiz, 0);
  };

  const handleLaunchActivity = (quizToLaunch?: any) => {
    const target = quizToLaunch || selectedQuiz;
    if (!target || !target.questions?.length) {
      alert('Selecione uma atividade com questões cadastradas!');
      return;
    }
    if (!activeClassId) {
      alert('Selecione ou gere o QR Code de uma turma antes de iniciar!');
      return;
    }

    setSelectedQuiz(target);

    // ⚡ Normaliza para detectar AVALIACAO ou AVALIAÇAO
    const normalizedType = normalizeType(target.type);

    if (normalizedType === 'AVALIACAO') {
      // ⚡ MODALIDADE AVALIAÇÃO FORMAL: Abre o monitor e NÃO abre a arena gamificada
      setIsArenaOpen(false);
      setIsExamMonitorOpen(true);

      const socket = getSocket();
      socket.emit('launch_formal_exam', {
        classId: activeClassId,
        quizId: target.id,
        quizType: 'AVALIAÇAO',
        quizTitle: target.title,
        durationMinutes: Number(target.durationMinutes) || 45,
        totalQuestions: target.questions.length,
        questions: target.questions.map((item: any, idx: number) => ({
          id: item.id || `q_${idx}`,
          title: item.title,
          type: item.type,
          weight: Number(item.weight) || 1.0,
          imageUrl: item.imageUrl || null,
          sliderConfig: item.sliderConfig || null,
          options: item.options || [],
        })),
      });
      return;
    }

    // ⚡ MODALIDADE QUIZ GAMIFICADO (Arena de Telão)
    setShowPodium(false);
    setQuizFinished(false);
    setQuizResults(null);
    setAnswersCount(0);
    setCurrentQuestionIndex(0);

    const firstQ = target.questions[0];
    const initialSeconds = Number(firstQ?.timeLimitSeconds) || 30;
    setCountdown(initialSeconds);
    setQuizRunning(false);
    setIsArenaOpen(true);
  };

  const handleNextQuestion = () => {
    if (!selectedQuiz || currentQuestionIndex + 1 >= selectedQuiz.questions.length) return;
    const nextIdx = currentQuestionIndex + 1;
    setShowPodium(false);
    setQuizResults(null);
    emitLaunchQuestion(selectedQuiz, nextIdx);
  };

  const handleApplyTeams = (isTeamMode: boolean, teams: TeamItem[], autoAssign: boolean) => {
    if (!activeClassId) return;
    const socket = getSocket();
    socket.emit('configure_teams', {
      classId: activeClassId,
      isTeamMode,
      teams,
      autoAssign,
    });
  };

  const handleSelectDemand = async (cls: any) => {
    setOnlineStudents([]);
    setQuizResults(null);
    setShowPodium(false);
    setAnswersCount(0);
    setCurrentQuestionIndex(0);
    setQuizRunning(false);

    setActiveClassData(cls);
    setActiveClassId(cls.id);

    await handleGenerateQr(cls.id);
  };

  const handleGenerateQr = async (classId: string) => {
    try {
      const currentHost = window.location.hostname;
      const res = await api.get(`/academic/classes/${classId}/qrcode`, {
        params: { serverIp: currentHost },
      });
      
      setSelectedQr(res.data);
      setActiveClassId(classId);
      setOnlineStudents([]);

      const socket = getSocket();
      socket.emit('join_room', {
        classId,
        userId: 'teacher',
        userName: teacherName || 'Instrutor',
        role: 'PROFESSOR',
      });
    } catch (e) {
      alert('Erro ao carregar QR Code.');
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleResetScores = () => {
    if (!activeClassId) return;
    if (confirm('Deseja zerar as notas de todos os alunos nesta sala?')) {
      const socket = getSocket();
      socket.emit('reset_leaderboard', { classId: activeClassId });
      setShowPodium(false);
      setQuizFinished(false);
      setQuizResults(null);
      setCurrentQuestionIndex(0);
    }
  };

  // ⚡ Busca o Dossiê Consolidado de Desempenho e Frequência do Backend
  const handleOpenClassReport = async (customClassId?: string, customSubjectId?: string) => {
    const classIdToUse = customClassId || activeClassId;
    if (!classIdToUse) {
      alert('Selecione uma turma para visualizar o Dossiê de Desempenho.');
      return;
    }

    setLoadingReport(true);
    try {
      const subjectIdToUse = customSubjectId || activeClassData?.modules?.[0]?.subjectId;
      const res = await api.get(`/academic/classes/${classIdToUse}/performance`, {
        params: subjectIdToUse ? { subjectId: subjectIdToUse } : undefined,
      });

      setReportData(res.data);
      setIsReportOpen(true);
    } catch (err: any) {
      console.error('Erro ao buscar desempenho da turma:', err);
      const fallbackStudents = (activeClassData?.enrollments || []).map((e: any, idx: number) => ({
        rank: idx + 1,
        userId: e.user?.id || e.id,
        userName: e.user?.name || e.user?.email || `Aluno ${idx + 1}`,
        totalGrade: 0.0,
        isApproved: false,
        attendancePercentage: 100,
      }));

      setReportData({
        classInfo: {
          code: activeClassData?.code || 'Turma',
          courseName: activeClassData?.course?.name || 'Treinamento Técnico',
          subjectName: activeClassData?.modules?.[0]?.subject?.name || 'Geral',
        },
        activityCounts: {
          totalActivities: 0,
          quizzesCount: 0,
          examsCount: 0,
          practicesCount: 0,
        },
        summary: {
          enrolledCount: fallbackStudents.length,
          classAverage: 0.0,
          approvedCount: 0,
          failedCount: fallbackStudents.length,
        },
        students: fallbackStudents,
      });
      setIsReportOpen(true);
    } finally {
      setLoadingReport(false);
    }
  };

  const handleOpenDossier = async (customClassId?: string, customQuizId?: string) => {
    const targetClassId = customClassId || activeClassId;
    const targetQuiz = customQuizId
      ? quizzesList.find((q) => q.id === customQuizId)
      : selectedQuiz;

    if (targetClassId && targetQuiz) {
      setSelectedQuiz(targetQuiz);
      try {
        const res = await api.get(
          `/academic/evaluations/${targetQuiz.id}/class/${targetClassId}/dossier`
        );
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          setQuizResults({
            leaderboard: res.data,
            isTeamMode: isTeamModeActive,
          });
        }
      } catch (err) {
        console.warn('Dossiê carregando dados em memória:', err);
      }
    }

    setIsExamMonitorOpen(false);
    setIsArenaOpen(false);
    setIsDossierModalOpen(true);
  };

  // ⚡ Normalizador universal de tipo para aceitar AVALIACAO e AVALIAÇAO
  const normalizeType = (t?: string) => {
    if (!t) return 'QUIZ_INTERATIVO';
    const n = t.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    if (n.includes('AVALIA')) return 'AVALIACAO';
    if (n.includes('PRAT') || n.includes('ATIVIDADE')) return 'ATIVIDADE';
    return 'QUIZ_INTERATIVO';
  };

  // ⚡ Declaradas uma única vez (sem duplicações)
  const activeSubjectIds = activeClassData?.modules?.map((m: any) => m.subjectId) || [];
  const activeSubjectNames = activeClassData?.modules?.map((m: any) => m.subject?.name?.toLowerCase().trim()) || [];

  const filteredQuizzes = quizzesList.filter((q) => {
    if (activityFilter !== 'ALL' && normalizeType(q.type) !== normalizeType(activityFilter)) {
      return false;
    }

    if (filterOnlyCurrentDemand && activeClassData) {
      const matchById = q.subjectId && activeSubjectIds.includes(q.subjectId);
      const matchByName =
        q.subject?.name &&
        activeSubjectNames.some((name: string) => name === q.subject.name.toLowerCase().trim());
      return matchById || matchByName;
    }

    return true;
  });

  const handleForceFinish = () => {
    setCountdown(0);
    setQuizRunning(false);
    setShowPodium(true);

    const socket = getSocket();
    if (activeClassId && selectedQuiz) {
      const currentQ = selectedQuiz.questions[currentQuestionIndex];
      const isLast = currentQuestionIndex + 1 >= selectedQuiz.questions.length;
      socket.emit('finish_question', {
        classId: activeClassId,
        questionIndex: currentQuestionIndex,
        totalQuestions: selectedQuiz.questions.length,
        type: currentQ?.type,
        isLastQuestion: isLast,
      });
    }
  };

  const hasNextQuestion = Boolean(selectedQuiz && currentQuestionIndex + 1 < selectedQuiz.questions.length);

  const bgRootClass =
    theme === 'light'
      ? 'bg-slate-100 text-slate-900'
      : theme === 'zinc'
      ? 'bg-zinc-950 text-zinc-100'
      : 'bg-slate-950 text-slate-100';

  const getTypeBadge = (type: string) => {
    const normalized = normalizeType(type);
    switch (normalized) {
      case 'AVALIACAO':
        return {
          label: 'Avaliação Formal',
          icon: <FileCheck2 className="w-3.5 h-3.5" />,
          color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        };
      case 'ATIVIDADE':
        return {
          label: 'Atividade Prática',
          icon: <Wrench className="w-3.5 h-3.5" />,
          color: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        };
      default:
        return {
          label: 'Quiz Interativo',
          icon: <Gamepad2 className="w-3.5 h-3.5" />,
          color: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
        };
    }
  };

  const dashboardLeaderboard = quizResults?.leaderboard || [];
  const top1 = dashboardLeaderboard[0];
  const top2 = dashboardLeaderboard[1];
  const top3 = dashboardLeaderboard[2];

  // Identifica o IP/Host para instrução aos alunos
  const currentHost = window.location.hostname;
  const accessUrl = `http://${currentHost}:5173/student/join`;

  return (
    <div className={`relative min-h-screen ${bgRootClass} overflow-hidden font-sans transition-colors duration-300`}>
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center select-none overflow-hidden opacity-[0.04]">
        <img src="/logo.png" alt="" className="w-[800px] max-w-none transform -rotate-12 blur-[1px] object-contain" />
      </div>

      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-600/10 blur-[120px] rounded-full" />

      <div className="relative max-w-7xl mx-auto p-6 space-y-8">
        <header className="border-b border-slate-800/80 pb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="relative group flex items-center justify-center">
              <div className="absolute -inset-1.5 bg-gradient-to-r from-blue-600 to-indigo-500 rounded-2xl blur-md opacity-40 group-hover:opacity-75 transition duration-500" />
              <div className="relative p-1.5 bg-slate-900/80 border border-slate-700/60 rounded-2xl shadow-inner flex items-center justify-center overflow-hidden">
                <img
                  src="/logo.png"
                  alt="MyClassPluss Logo"
                  className="h-12 w-auto object-cover rounded-xl drop-shadow-[0_2px_8px_rgba(59,130,246,0.3)] transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-2xl font-black tracking-tight text-white drop-shadow-sm">MyClassPluss</span>
                <span className="text-[11px] tracking-wider uppercase bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2.5 py-0.5 rounded-full font-bold shadow-[0_0_12px_rgba(59,130,246,0.15)]">
                  Painel do Instrutor
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-1">
                <strong className="text-slate-200">Gestor Acadêmico Interativo</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex items-center bg-slate-900/90 border border-slate-800 p-1.5 rounded-2xl gap-2 shadow-lg flex-wrap">
              <button
                onClick={() => handleTabChange('academic')}
                className={
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ' +
                  (activeTab === 'academic'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50')
                }
              >
                <Building2 className="w-4 h-4 text-blue-400" />
                <span>Gestão Acadêmica</span>
              </button>

              <button
                onClick={() => handleTabChange('quizzes')}
                className={
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ' +
                  (activeTab === 'quizzes'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50')
                }
              >
                <Gamepad2 className="w-4 h-4 text-purple-300" />
                <span>Gestão de Questões</span>
              </button>

              <button
                onClick={() => handleTabChange('dashboard')}
                className={
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ' +
                  (activeTab === 'dashboard'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50')
                }
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Visão de Sala</span>
              </button>
            </div>

            <ThemeToggle />

            <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800/90 py-1.5 px-3 rounded-2xl shadow-lg">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center font-black text-xs text-white shadow-md border border-blue-400/30 tracking-wider">
                {getInitials(teacherName)}
              </div>

              <div className="text-left pr-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white max-w-[150px] truncate block">
                    {teacherName}
                  </span>
                  <UserCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                </div>
                <span className="text-[10px] text-slate-400 block font-medium">
                  Professor/Instrutor
                </span>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800/80 rounded-xl transition-colors cursor-pointer ml-1"
                title="Sair do MyClassPluss"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* 1. GESTÃO ACADÊMICA */}
        {activeTab === 'academic' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 p-2 rounded-2xl w-fit flex-wrap">
              <button
                onClick={() => setAcademicSubTab('institutions')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  academicSubTab === 'institutions'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Instituições</span>
              </button>

              <button
                onClick={() => setAcademicSubTab('courses')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  academicSubTab === 'courses'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Cursos</span>
              </button>

              <button
                onClick={() => setAcademicSubTab('subjects')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  academicSubTab === 'subjects'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Disciplinas</span>
              </button>

              <button
                onClick={() => setAcademicSubTab('rooms')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  academicSubTab === 'rooms'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <DoorClosed className="w-4 h-4" />
                <span>Salas</span>
              </button>

              <button
                onClick={() => setAcademicSubTab('classes')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  academicSubTab === 'classes'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>Turmas</span>
              </button>

              <button
                onClick={() => setAcademicSubTab('backup')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  academicSubTab === 'backup'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Backup & Dados</span>
              </button>

              <button
                onClick={() => setAcademicSubTab('history')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  academicSubTab === 'history'
                    ? 'bg-violet-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Histórico & Relatórios</span>
              </button>
            </div>

            <div className="mt-6">      
              {academicSubTab === 'institutions' && <InstitutionsManager />}
              {academicSubTab === 'courses' && <GlobalCoursesManager />}
              {academicSubTab === 'subjects' && <SubjectsManager />}
              {academicSubTab === 'rooms' && <RoomsManager />}
              {academicSubTab === 'classes' && <ClassesManager />}
              {academicSubTab === 'backup' && <BackupManager />}
              {academicSubTab === 'history' && <SessionHistory />}
            </div>
          </div>
        )}

        {/* 2. GESTÃO DE QUESTÕES */}
        {activeTab === 'quizzes' && <QuizManager />}

        {/* 3. VISÃO DE SALA */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800/90 p-6 rounded-3xl shadow-xl backdrop-blur-md space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <GraduationCap className="text-blue-400 w-5 h-5" />
                    <span>Seleção de Turma para Aula Atual</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Escolha uma turma já cadastrada na Gestão Acadêmica para projetar o QR Code e iniciar as atividades.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">Turmas Disponíveis no Sistema</label>
                    {classes.length === 0 ? (
                      <div className="p-6 bg-slate-950/60 border border-slate-800 rounded-2xl text-center text-xs text-slate-500">
                        Nenhuma turma cadastrada. Vá até a aba <strong className="text-indigo-400">Gestão Acadêmica &gt; Turmas</strong> para criá-la primeiro.
                      </div>
                    ) : (
                      <select
                        value={activeClassId || ''}
                        onChange={(e) => {
                          const found = classes.find(c => c.id === e.target.value);
                          if (found) handleSelectDemand(found);
                        }}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none cursor-pointer font-bold"
                      >
                        <option value="" disabled>Selecione uma turma...</option>
                        {classes.map((cls) => {
                          const mod = cls.modules?.[0];
                          return (
                            <option key={cls.id} value={cls.id}>
                              {cls.code} • {cls.course?.name} ({mod?.subject?.name || 'Geral'} - {mod?.room || 'Sala Principal'})
                            </option>
                          );
                        })}
                      </select>
                    )}
                  </div>

                  {activeClassData && (
                    <div className="bg-slate-950/80 border border-blue-500/30 p-5 rounded-2xl space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black uppercase text-blue-400 tracking-wider">Resumo da Turma Selecionada</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenClassReport(activeClassData.id)}
                            disabled={loadingReport}
                            className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-black px-3 py-1.5 rounded-xl cursor-pointer transition-all flex items-center gap-1.5 uppercase"
                            title="Visualizar Dossiê Pedagógico desta turma"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            <span>{loadingReport ? 'Carregando Dossiê...' : 'Ver Dossiê da Turma'}</span>
                          </button>
                          <span className="text-xs font-bold bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                            Pronta
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-400 block">Curso</span>
                          <strong className="text-white truncate block">{activeClassData.course?.name || 'N/A'}</strong>
                        </div>
                        <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-400 block">Disciplina</span>
                          <strong className="text-indigo-300 truncate block">{activeClassData.modules?.[0]?.subject?.name || 'Geral'}</strong>
                        </div>
                        <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-400 block">Ambiente Físico</span>
                          <strong className="text-amber-300 truncate block">{activeClassData.modules?.[0]?.room || 'Não informado'}</strong>
                        </div>
                        <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-400 block">Horário / Turno</span>
                          <strong className="text-blue-300 truncate block">
                            {activeClassData.modules?.[0]?.startTime || '--'} às {activeClassData.modules?.[0]?.endTime || '--'}
                          </strong>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleGenerateQr(activeClassData.id)}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 cursor-pointer transition-all"
                      >
                        <QrCode className="w-4 h-4" />
                        <span>Gerar / Projetar QR Code desta Turma</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* ========================================================================= */}
              {/* ⚡ CARD DO QR CODE DE ACESSO COM CÓDIGO DA TURMA EM DESTAQUE GIGANTE */}
              {/* ========================================================================= */}
              <div className="bg-slate-900/60 border border-slate-800/90 p-6 rounded-3xl flex flex-col items-center justify-between text-center shadow-xl backdrop-blur-md">
                <div className="w-full">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <QrCode className="text-blue-400 w-5 h-5" />
                    <h2 className="text-base font-bold text-white">Acesso dos Estudantes</h2>
                  </div>

                  {selectedQr ? (
                    <div className="space-y-4 w-full flex flex-col items-center">
                      {/* 1. Código da Turma em formato "PIN" de Alto Contraste */}
                      <div className="w-full bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/60 border-2 border-blue-500/50 p-3.5 rounded-2xl shadow-lg relative group">
                        <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider block mb-1">
                          Código / PIN de Entrada Manual
                        </span>
                        
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-wider drop-shadow-[0_2px_10px_rgba(59,130,246,0.5)]">
                            {selectedQr.classCode}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(selectedQr.classCode)}
                            className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
                            title="Copiar código da turma"
                          >
                            {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>

                        <p className="text-[11px] text-slate-400 mt-1 flex items-center justify-center gap-1">
                          <Globe className="w-3 h-3 text-indigo-400" />
                          <span>Acesse pelo navegador: <strong className="text-slate-200">{accessUrl}</strong></span>
                        </p>
                      </div>

                      {/* 2. QR Code Nítido */}
                      <div className="bg-white p-3 rounded-2xl inline-block shadow-2xl transition-transform hover:scale-105 duration-300">
                        <img src={selectedQr.qrCodeImage} alt="QR Code da Turma" className="w-36 h-36 object-contain" />
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                        <span>Aponte a câmera do celular para entrar</span>
                      </div>

                      {/* 3. Indicador de Alunos Conectados ao Vivo */}
                      <div className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-3 text-left space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                            <Signal className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                            <span>Alunos na Sala</span>
                          </span>
                          <span className="text-xs font-black px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full font-mono">
                            {onlineStudents.length} conectados
                          </span>
                        </div>

                        <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                          {onlineStudents.length === 0 ? (
                            <p className="text-[11px] text-slate-500 italic text-center py-1">
                              Aguardando entrada dos alunos...
                            </p>
                          ) : (
                            onlineStudents.map((s, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-xs text-slate-300 bg-slate-900/90 px-2 py-1 rounded-lg border border-slate-800"
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                  <span className="truncate">{s.userName}</span>
                                </div>
                                {s.teamName && (
                                  <span
                                    className="text-[9px] font-black px-1.5 py-0.5 rounded text-white"
                                    style={{ backgroundColor: s.teamColor || '#6366f1' }}
                                  >
                                    {s.teamName}
                                  </span>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-16 text-slate-500 text-sm">
                      Selecione uma turma acima para gerar o QR Code e o código de acesso.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <ContentManager 
              activeClassId={activeClassId} 
              activeClassData={activeClassData} 
            />

            <div className="bg-gradient-to-br from-slate-900/90 to-slate-950 border border-blue-500/30 p-6 rounded-3xl shadow-2xl space-y-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-800 pb-4 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-xl">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-black text-white">Projetor de Atividade Gamificada</h2>
                      {activeClassData && (
                        <span className="text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                          <span>Demanda: {activeClassData.code} ({activeClassData.course?.name})</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      {filterOnlyCurrentDemand && activeClassData
                        ? `Mostrando atividades da disciplina desta turma (${activeClassData.modules?.[0]?.subject?.name || 'Geral'})`
                        : 'Mostrando todas as atividades disponíveis no sistema'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                  <button
                    type="button"
                    onClick={() => setFilterOnlyCurrentDemand(!filterOnlyCurrentDemand)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                      filterOnlyCurrentDemand
                        ? 'bg-blue-600/20 border-blue-500/60 text-blue-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                    title="Alternar entre ver somente desta turma ou todas"
                  >
                    <Filter className="w-3.5 h-3.5 text-blue-400" />
                    <span>{filterOnlyCurrentDemand ? 'Filtrado pela Demanda' : 'Exibindo Todas'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsTeamModalOpen(true)}
                    className={
                      'px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ' +
                      (isTeamModeActive
                        ? 'bg-purple-600/30 border-purple-500 text-purple-200'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white')
                    }
                  >
                    <Users className="w-4 h-4 text-purple-400" />
                    <span>{isTeamModeActive ? 'Equipes Ativas' : 'Configurar Times'}</span>
                  </button>
                </div>
              </div>

              {quizRunning && (
                <div className="p-4 bg-purple-950/40 border border-purple-500/40 rounded-2xl flex items-center justify-between animate-pulse">
                  <div className="flex items-center gap-2 text-purple-300 text-xs font-bold">
                    <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                    <span>
                      Atividade em Execução: <strong>{selectedQuiz?.title}</strong> (Questão {currentQuestionIndex + 1} de {selectedQuiz?.questions.length})
                    </span>
                  </div>
                  <button
                    onClick={() => setIsArenaOpen(true)}
                    className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow cursor-pointer"
                  >
                    <Maximize2 className="w-4 h-4" />
                    <span>Abrir Telão da Arena</span>
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {[
                  { id: 'ALL', label: 'Todas as Modalidades' },
                  { id: 'QUIZ_INTERATIVO', label: '🎮 Quizzes Interativos' },
                  { id: 'AVALIACAO', label: '📝 Avaliações Formais' },
                  { id: 'ATIVIDADE', label: '🛠️ Atividades Práticas' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActivityFilter(tab.id as ActivityFilter)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      activityFilter === tab.id
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                        : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {filteredQuizzes.length === 0 ? (
                <div className="p-8 border border-dashed border-slate-800 rounded-2xl text-center space-y-2 bg-slate-950/40">
                  <Gamepad2 className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">
                    {filterOnlyCurrentDemand && activeClassData
                      ? `Nenhuma atividade cadastrada para a disciplina "${activeClassData.modules?.[0]?.subject?.name || 'desta turma'}"`
                      : 'Nenhuma atividade cadastrada ainda.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredQuizzes.map((quiz) => {
                    const badge = getTypeBadge(quiz.type);
                    const isSelected = selectedQuiz?.id === quiz.id;
                    const totalQuestions = quiz.questions?.length || 0;
                    const totalTime = quiz.questions?.reduce(
                      (acc: number, q: any) => acc + (Number(q.timeLimitSeconds) || 30),
                      0
                    );

                    return (
                      <div
                        key={quiz.id}
                        onClick={() => setSelectedQuiz(quiz)}
                        className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
                          isSelected
                            ? 'bg-blue-950/30 border-blue-500/80 ring-1 ring-blue-500/40 shadow-xl'
                            : 'bg-slate-950/80 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${badge.color}`}>
                              {badge.icon}
                              <span>{badge.label}</span>
                            </span>

                            <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{totalTime}s</span>
                            </span>
                          </div>

                          <div>
                            <h3 className="font-bold text-white text-base leading-snug">{quiz.title}</h3>
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                              {quiz.subject?.name || 'Geral'} • {quiz.description || 'Atividade pedagógica'}
                            </p>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                          <span className="text-xs text-slate-400 font-medium">
                            <strong className="text-white font-bold">{totalQuestions}</strong> itens
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLaunchActivity(quiz);
                            }}
                            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md shadow-purple-600/30 cursor-pointer transition-all active:scale-95"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Lançar no Telão</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {showPodium && quizResults && (
                <div className="bg-slate-950/95 border border-purple-500/40 rounded-3xl p-6 space-y-6 shadow-2xl animate-fade-in backdrop-blur-md">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-4 gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl shadow-inner">
                        <Trophy className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-white">
                          {hasNextQuestion ? 'Classificação Parcial da Rodada' : '🏆 Pódio Final da Avaliação'}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {hasNextQuestion ? (
                        <button
                          onClick={handleNextQuestion}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg cursor-pointer animate-pulse"
                        >
                          <span>Avançar Questão</span>
                          <SkipForward className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenClassReport(activeClassId || undefined)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg cursor-pointer"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                          <span>Dossiê Oficial da Turma</span>
                        </button>
                      )}

                      <button
                        onClick={handleResetScores}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reiniciar</span>
                      </button>
                    </div>
                  </div>

                  {dashboardLeaderboard.length > 0 && (
                    <div className="flex items-end justify-center gap-3 sm:gap-6 pt-4 pb-2 px-2">
                      {top2 && (
                        <div className="flex-1 max-w-[170px] flex flex-col items-center">
                          <span className="text-xs font-bold text-slate-300 truncate">{top2.userName}</span>
                          <span className="text-xs font-black text-slate-400">{Number(top2.score ?? 0)} pts</span>
                          <div className="w-full h-28 bg-slate-800 border-t-4 border-slate-400 rounded-t-2xl flex flex-col items-center justify-start pt-2.5">
                            <span className="text-2xl font-black text-slate-200">2º</span>
                          </div>
                        </div>
                      )}
                      {top1 && (
                        <div className="flex-1 max-w-[190px] flex flex-col items-center z-10">
                          <span className="text-sm font-black text-amber-300 truncate">{top1.userName}</span>
                          <span className="text-sm font-black text-amber-400">{Number(top1.score ?? 0)} pts</span>
                          <div className="w-full h-40 bg-amber-900 border-t-4 border-amber-400 rounded-t-2xl flex flex-col items-center justify-start pt-2.5">
                            <span className="text-3xl font-black text-amber-200">1º</span>
                          </div>
                        </div>
                      )}
                      {top3 && (
                        <div className="flex-1 max-w-[170px] flex flex-col items-center">
                          <span className="text-xs font-bold text-slate-300 truncate">{top3.userName}</span>
                          <span className="text-xs font-black text-slate-400">{Number(top3.score ?? 0)} pts</span>
                          <div className="w-full h-24 bg-amber-900/40 border-t-4 border-amber-600 rounded-t-2xl flex flex-col items-center justify-start pt-2.5">
                            <span className="text-xl font-black text-amber-500">3º</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL DO DOSSIÊ OFICIAL */}
        <ClassReportModal
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
          classId={activeClassData?.id || activeClassId || ''}
          classNameStr={reportData?.classInfo?.code || activeClassData?.code || 'Turma'}
          courseNameStr={reportData?.classInfo?.courseName || activeClassData?.course?.name || 'Treinamento'}
          subjectNameStr={reportData?.classInfo?.subjectName || activeClassData?.modules?.[0]?.subject?.name || 'Conhecimentos Gerais'}
          totalQuizzes={reportData?.activityCounts?.quizzesCount ?? 0}
          totalExams={reportData?.activityCounts?.examsCount ?? 0}
          totalPractices={reportData?.activityCounts?.practicesCount ?? 0}
          students={reportData?.students || []}
          onRefresh={() => {
            if (activeClassData?.id) {
              handleOpenClassReport(activeClassData.id);
            }
          }}
        />

        <TeamConfigModal
          isOpen={isTeamModalOpen}
          onClose={() => setIsTeamModalOpen(false)}
          onApplyTeams={handleApplyTeams}
          studentCount={onlineStudents.length}
        />

        <FullPedagogicalDossierModal
          isOpen={isDossierModalOpen}
          onClose={() => setIsDossierModalOpen(false)}
          quizTitle={selectedQuiz?.title || 'Avaliação Oficial'}
          quizType={selectedQuiz?.type || 'AVALIACAO'}
          courseName={activeClassData?.course?.name || ''}
          classCode={activeClassData?.code || ''}
          subjectName={activeClassData?.modules?.[0]?.subject?.name || ''}
          totalQuestions={selectedQuiz ? selectedQuiz.questions.length : 1}
          leaderboard={quizResults?.leaderboard || []}
        />

        <InteractiveArenaModal
          isOpen={isArenaOpen}
          onClose={() => {
            setIsArenaOpen(false);
            setQuizRunning(false);
          }}
          quizTitle={selectedQuiz?.title || 'Quiz Interativo'}
          onStartGame={handleStartGameAfterWarmup}
          quizQuestion={selectedQuiz?.questions?.[currentQuestionIndex]?.title || ''}
          quizImage={selectedQuiz?.questions?.[currentQuestionIndex]?.imageUrl || ''}
          questionType={selectedQuiz?.questions?.[currentQuestionIndex]?.type || 'MULTIPLE_CHOICE'}
          currentQuestionData={selectedQuiz?.questions?.[currentQuestionIndex]}
          countdown={countdown}
          totalTime={Number(selectedQuiz?.questions?.[currentQuestionIndex]?.timeLimitSeconds) || 30}
          answersCount={answersCount}
          totalStudents={onlineStudents.length}
          quizRunning={quizRunning}
          showPodium={showPodium}
          quizResults={quizResults}
          currentQuestionIndex={currentQuestionIndex}
          totalQuestions={selectedQuiz ? selectedQuiz.questions.length : 1}
          onNextQuestion={handleNextQuestion}
          onResetScores={handleResetScores}
          onForceFinishTime={handleForceFinish}
          onOpenFinalReport={() => handleOpenClassReport(activeClassId || undefined)}
          optRed={selectedQuiz?.questions?.[currentQuestionIndex]?.options?.[0]?.text || ''}
          optBlue={selectedQuiz?.questions?.[currentQuestionIndex]?.options?.[1]?.text || ''}
          optYellow={selectedQuiz?.questions?.[currentQuestionIndex]?.options?.[2]?.text || ''}
          optGreen={selectedQuiz?.questions?.[currentQuestionIndex]?.options?.[3]?.text || ''}
          puz1={selectedQuiz?.questions?.[currentQuestionIndex]?.options?.[0]?.text || ''}
          puz2={selectedQuiz?.questions?.[currentQuestionIndex]?.options?.[1]?.text || ''}
          puz3={selectedQuiz?.questions?.[currentQuestionIndex]?.options?.[2]?.text || ''}
          puz4={selectedQuiz?.questions?.[currentQuestionIndex]?.options?.[3]?.text || ''}
          sliderMin={selectedQuiz?.questions?.[currentQuestionIndex]?.sliderConfig?.min || 0}
          sliderMax={selectedQuiz?.questions?.[currentQuestionIndex]?.sliderConfig?.max || 100}
          sliderUnit={selectedQuiz?.questions?.[currentQuestionIndex]?.sliderConfig?.unit || ''}
        />

        <ExamMonitorModal
          isOpen={isExamMonitorOpen}
          onClose={() => setIsExamMonitorOpen(false)}
          examTitle={selectedQuiz?.title || 'Avaliação Oficial'}
          durationMinutes={selectedQuiz?.durationMinutes || 45}
          totalQuestions={selectedQuiz?.questions?.length || 0}
          classId={activeClassId || ''}
          onlineStudents={onlineStudents}
          onOpenFinalReport={() => handleOpenClassReport(activeClassId || undefined)}
        />

        <ClassDetailsModal
          isOpen={Boolean(selectedClassForDetails)}
          onClose={() => setSelectedClassForDetails(null)}
          classId={selectedClassForDetails}
        />
      </div>
    </div>
  );
};

export default TeacherDashboard;