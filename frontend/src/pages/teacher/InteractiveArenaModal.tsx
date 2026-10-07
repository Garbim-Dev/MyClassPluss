import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import confetti from 'canvas-confetti';
import {
  X,
  Trophy,
  Volume2,
  VolumeX,
  FastForward,
  Sparkles,
  SkipForward,
  RotateCcw,
  Users,
  FileSpreadsheet,
  Maximize,
  Minimize,
  Sliders,
  Keyboard,
  Medal,
  Award,
  Play,
  Palette,
  Check,
  CheckCircle2,
  HelpCircle,
  Layers,
  Shuffle,
} from 'lucide-react';

type ArenaTheme = 'CYBER_BLUE' | 'GRAPHITE' | 'CLEAN_LIGHT' | 'NEON_ARENA';

interface OptionItem {
  text: string;
  isCorrect?: boolean;
}

interface QuestionDetails {
  title: string;
  imageUrl?: string;
  type: string;
  justification?: string;
  options?: OptionItem[];
  timeLimitSeconds?: number;
  sliderConfig?: any;
}

interface QuizResultsData {
  leaderboard?: any[];
  correctIndex?: number;
  answerStats?: {
    type?: string;
    red: number;
    blue: number;
    yellow: number;
    green: number;
    trueVotes?: number;
    falseVotes?: number;
    totalAnswers: number;
    totalCorrect?: number;
    accuracyRate?: number;
    sliderTarget?: number;
    sliderMin?: number;
    sliderMax?: number;
    sliderTolerance?: number;
    sliderUnit?: string;
    isTrueCorrect?: boolean;
  };
}

interface InteractiveArenaModalProps {
  isOpen: boolean;
  onClose: () => void;
  quizTitle?: string;
  quizQuestion: string;
  quizImage?: string;
  questionType: string;
  countdown: number;
  totalTime: number;
  answersCount: number;
  totalStudents: number;
  quizRunning: boolean;
  showPodium: boolean;
  quizResults: QuizResultsData | any;
  currentQuestionIndex: number;
  totalQuestions: number;
  currentQuestionData?: QuestionDetails;
  onStartGame?: () => void;
  onNextQuestion: () => void;
  onResetScores: () => void;
  onForceFinishTime?: () => void;
  onOpenFinalReport?: () => void;
  optRed?: string;
  optBlue?: string;
  optYellow?: string;
  optGreen?: string;
  puz1?: string;
  puz2?: string;
  puz3?: string;
  puz4?: string;
  sliderMin?: number;
  sliderMax?: number;
  sliderUnit?: string;
}

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[j], result[j]] = [result[j], result[i]];
  }
  return result;
}

export const InteractiveArenaModal: React.FC<InteractiveArenaModalProps> = ({
  isOpen,
  onClose,
  quizTitle = 'Atividade Técnica Gamificada',
  quizQuestion,
  quizImage,
  questionType,
  countdown,
  totalTime,
  answersCount,
  totalStudents,
  quizRunning,
  showPodium,
  quizResults,
  currentQuestionIndex,
  totalQuestions,
  currentQuestionData,
  onStartGame,
  onNextQuestion,
  onResetScores,
  onForceFinishTime,
  onOpenFinalReport,
  optRed = '',
  optBlue = '',
  optYellow = '',
  optGreen = '',
  puz1 = '',
  puz2 = '',
  puz3 = '',
  puz4 = '',
  sliderMin = 0,
  sliderMax = 100,
  sliderUnit = '',
}) => {
  const [arenaStage, setArenaStage] = useState<'CONFIG' | 'WARMUP' | 'PLAYING'>('CONFIG');
  const [warmupSeconds, setWarmupSeconds] = useState<number>(8);
  const [selectedTheme, setSelectedTheme] = useState<ArenaTheme>('CYBER_BLUE');

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [shuffledPuzzleSteps, setShuffledPuzzleSteps] = useState<{ text: string; correctIndex: number }[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const tensionAudioRef = useRef<HTMLAudioElement | null>(null);

  const [showingStats, setShowingStats] = useState<boolean>(false);
  const [statsTimer, setStatsTimer] = useState<number>(8);

  const formatImageUrl = (url?: string | null): string => {
    if (!url) return '';
    let target = url.trim();

    if (target.startsWith('http://') || target.startsWith('https://')) {
      try {
        const parsed = new URL(target);
        return encodeURI(`${window.location.protocol}//${window.location.hostname}:3000${parsed.pathname}${parsed.search}`);
      } catch (e) {
        return encodeURI(target);
      }
    }

    const slash = target.startsWith('/') ? '' : '/';
    return encodeURI(`${window.location.protocol}//${window.location.hostname}:3000${slash}${target}`);
  };

  const rawImage = quizImage || currentQuestionData?.imageUrl;
  const activeImage = formatImageUrl(rawImage);

  // ⚡ Bloqueia o scroll do body quando a arena abre para isolar como tela limpa
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (currentQuestionIndex === 0) {
        setArenaStage('CONFIG');
        setWarmupSeconds(8);
      } else {
        setArenaStage('PLAYING');
      }
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    let timer: any;
    if (arenaStage === 'WARMUP') {
      if (warmupSeconds > 0) {
        timer = setInterval(() => {
          setWarmupSeconds((prev) => prev - 1);
        }, 1000);
      } else {
        setArenaStage('PLAYING');
        if (onStartGame) {
          onStartGame();
        }
      }
    }
    return () => clearInterval(timer);
  }, [arenaStage, warmupSeconds, onStartGame]);

  useEffect(() => {
    if (showPodium && isOpen) {
      setShowingStats(true);
      setStatsTimer(8);
    } else {
      setShowingStats(false);
    }
  }, [showPodium, isOpen, currentQuestionIndex]);

  useEffect(() => {
    let timer: any;
    if (showingStats && statsTimer > 0) {
      timer = setInterval(() => {
        setStatsTimer((prev) => prev - 1);
      }, 1000);
    } else if (showingStats && statsTimer === 0) {
      setShowingStats(false);
    }
    return () => clearInterval(timer);
  }, [showingStats, statsTimer]);

  const handleSkipStatsToPodium = () => {
    setShowingStats(false);
  };

  useEffect(() => {
    if (questionType === 'PUZZLE' && currentQuestionData?.options && currentQuestionData.options.length > 0) {
      const mapped = currentQuestionData.options.map((opt, idx) => ({
        text: opt.text,
        correctIndex: idx,
      }));
      setShuffledPuzzleSteps(shuffleArray(mapped));
    } else {
      setShuffledPuzzleSteps([]);
    }
  }, [questionType, currentQuestionIndex, currentQuestionData]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  useEffect(() => {
    const audio = new Audio('/sounds/tensao.mp3');
    audio.loop = true;
    audio.volume = 0.25;
    tensionAudioRef.current = audio;

    return () => {
      audio.pause();
      tensionAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = tensionAudioRef.current;
    if (!audio) return;

    const shouldPlay =
      isOpen &&
      arenaStage === 'PLAYING' &&
      quizRunning &&
      !showPodium &&
      soundEnabled &&
      countdown > 0;

    if (shouldPlay) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [isOpen, arenaStage, quizRunning, showPodium, soundEnabled, countdown]);

  useEffect(() => {
    if (!isOpen || !soundEnabled) return;

    if (arenaStage === 'WARMUP' && warmupSeconds > 0) {
      const ctx = getAudioContext();
      if (!ctx) return;
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(warmupSeconds <= 3 ? 880 : 587, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } catch (e) {}
    }

    if (arenaStage === 'PLAYING' && quizRunning && !showPodium && countdown <= 5 && countdown > 0) {
      const ctx = getAudioContext();
      if (!ctx) return;
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } catch (e) {}
    }
  }, [countdown, warmupSeconds, arenaStage, isOpen, quizRunning, showPodium, soundEnabled]);

  useEffect(() => {
    if (showPodium && !showingStats && isOpen) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'],
      });

      const timer = setTimeout(() => {
        confetti({ particleCount: 80, angle: 60, spread: 55, origin: { x: 0 } });
        confetti({ particleCount: 80, angle: 120, spread: 55, origin: { x: 1 } });
      }, 400);

      return () => clearTimeout(timer);
    }
  }, [showPodium, showingStats, isOpen]);

  const progressPercent = totalTime > 0 ? (countdown / totalTime) * 100 : 0;
  const hasNextQuestion = currentQuestionIndex + 1 < totalQuestions;

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      }

      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        getAudioContext();
        setSoundEnabled((prev) => !prev);
      }

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();

        if (arenaStage === 'CONFIG') {
          handleStartCountdown();
          return;
        }

        if (showingStats) {
          handleSkipStatsToPodium();
          return;
        }

        if (showPodium && hasNextQuestion) {
          onNextQuestion();
          return;
        }

        if (arenaStage === 'PLAYING' && quizRunning && countdown > 0 && onForceFinishTime) {
          onForceFinishTime();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isOpen,
    arenaStage,
    showingStats,
    showPodium,
    hasNextQuestion,
    quizRunning,
    countdown,
    onNextQuestion,
    onForceFinishTime,
  ]);

  const getThemeClasses = () => {
    switch (selectedTheme) {
      case 'GRAPHITE':
        return {
          root: 'bg-[#0f1117] text-zinc-100',
          header: 'border-zinc-800 bg-zinc-900/80 backdrop-blur-md',
          card: 'bg-zinc-900/90 border-zinc-800 shadow-2xl',
          footer: 'border-zinc-800 text-zinc-400 bg-zinc-950/80',
          patternOpacity: 'opacity-[0.06]',
          patternFilter: 'grayscale(1) brightness(1.8)',
          glowTop: 'from-zinc-500/10 to-transparent',
        };
      case 'CLEAN_LIGHT':
        return {
          root: 'bg-slate-100 text-slate-900',
          header: 'border-slate-300 bg-white/90 shadow-sm backdrop-blur-md',
          card: 'bg-white border-slate-300 shadow-xl',
          footer: 'border-slate-300 text-slate-600 bg-white/90',
          patternOpacity: 'opacity-[0.07]',
          patternFilter: 'brightness(0.3) contrast(1.2)',
          glowTop: 'from-blue-400/15 to-transparent',
        };
      case 'NEON_ARENA':
        return {
          root: 'bg-[#0d0722] text-purple-100',
          header: 'border-purple-800/60 bg-slate-950/80 backdrop-blur-md',
          card: 'bg-slate-900/90 border-purple-500/40 shadow-purple-950/50 shadow-2xl',
          footer: 'border-purple-800/60 text-purple-300 bg-slate-950/80',
          patternOpacity: 'opacity-[0.08]',
          patternFilter: 'hue-rotate(240deg) brightness(1.6)',
          glowTop: 'from-purple-600/20 via-pink-600/10 to-transparent',
        };
      case 'CYBER_BLUE':
      default:
        return {
          root: 'bg-[#060919] text-slate-100',
          header: 'border-slate-800 bg-slate-950/80 backdrop-blur-md',
          card: 'bg-slate-900/90 border-slate-800 shadow-2xl',
          footer: 'border-slate-800 text-slate-400 bg-slate-950/80',
          patternOpacity: 'opacity-[0.07]',
          patternFilter: 'brightness(1.5)',
          glowTop: 'from-blue-600/20 via-indigo-600/10 to-transparent',
        };
    }
  };

  const themeStyles = getThemeClasses();
  const isLight = selectedTheme === 'CLEAN_LIGHT';

  const handleStartCountdown = () => {
    getAudioContext();
    setWarmupSeconds(8);
    setArenaStage('WARMUP');
  };

  let parsedSlider = { min: sliderMin, max: sliderMax, target: 50, tolerance: 5, unit: sliderUnit };
  if (currentQuestionData?.sliderConfig) {
    try {
      const conf =
        typeof currentQuestionData.sliderConfig === 'string'
          ? JSON.parse(currentQuestionData.sliderConfig)
          : currentQuestionData.sliderConfig;
      parsedSlider = {
        min: Number(conf.min ?? sliderMin),
        max: Number(conf.max ?? sliderMax),
        target: Number(conf.target ?? 50),
        tolerance: Number(conf.tolerance ?? 5),
        unit: conf.unit || sliderUnit,
      };
    } catch (e) {}
  }

  const renderQuestionBody = () => {
    switch (questionType) {
      case 'MULTIPLE_CHOICE':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full">
            <div className="min-h-[82px] p-4 rounded-2xl border-2 flex items-center gap-3.5 bg-red-950/50 border-red-500/60 shadow-lg backdrop-blur-sm">
              <span className="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center font-black text-white text-sm shrink-0 shadow-md">
                ▲
              </span>
              <span className="text-sm md:text-base font-black text-white leading-snug break-words whitespace-normal flex-1 uppercase tracking-wide">
                {optRed}
              </span>
            </div>

            <div className="min-h-[82px] p-4 rounded-2xl border-2 flex items-center gap-3.5 bg-blue-950/50 border-blue-500/60 shadow-lg backdrop-blur-sm">
              <span className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-sm shrink-0 shadow-md">
                ◆
              </span>
              <span className="text-sm md:text-base font-black text-white leading-snug break-words whitespace-normal flex-1 uppercase tracking-wide">
                {optBlue}
              </span>
            </div>

            <div className="min-h-[82px] p-4 rounded-2xl border-2 flex items-center gap-3.5 bg-amber-950/50 border-amber-500/60 shadow-lg backdrop-blur-sm">
              <span className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center font-black text-slate-950 text-sm shrink-0 shadow-md">
                ●
              </span>
              <span className="text-sm md:text-base font-black text-white leading-snug break-words whitespace-normal flex-1 uppercase tracking-wide">
                {optYellow}
              </span>
            </div>

            <div className="min-h-[82px] p-4 rounded-2xl border-2 flex items-center gap-3.5 bg-emerald-950/50 border-emerald-500/60 shadow-lg backdrop-blur-sm">
              <span className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center font-black text-white text-sm shrink-0 shadow-md">
                ■
              </span>
              <span className="text-sm md:text-base font-black text-white leading-snug break-words whitespace-normal flex-1 uppercase tracking-wide">
                {optGreen}
              </span>
            </div>
          </div>
        );

      case 'TRUE_FALSE':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <div className="p-6 md:p-8 rounded-3xl border flex flex-col items-center justify-center gap-2 shadow-2xl bg-blue-950/50 border-blue-500/60 shadow-blue-950/50 backdrop-blur-sm">
              <span className="text-2xl md:text-3xl font-black text-white tracking-widest uppercase">
                VERDADEIRO
              </span>
            </div>
            <div className="p-6 md:p-8 rounded-3xl border flex flex-col items-center justify-center gap-2 shadow-2xl bg-red-950/50 border-red-500/60 shadow-red-950/50 backdrop-blur-sm">
              <span className="text-2xl md:text-3xl font-black text-white tracking-widest uppercase">
                FALSO
              </span>
            </div>
          </div>
        );

      case 'FAST_ANSWER':
        return (
          <div className={`w-full ${themeStyles.card} rounded-3xl p-6 text-center space-y-4 shadow-xl backdrop-blur-md`}>
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <Keyboard className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className={`text-lg md:text-xl font-black uppercase tracking-wide ${isLight ? 'text-slate-900' : 'text-white'}`}>
                DIGITE A RESPOSTA NO SEU SMARTPHONE!
              </h3>
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                OS PARTICIPANTES ESTÃO DIGITANDO OS TERMOS TÉCNICOS NOS APARELHOS...
              </p>
            </div>
          </div>
        );

      case 'SLIDER':
        return (
          <div className={`w-full ${themeStyles.card} rounded-3xl p-6 text-center space-y-5 shadow-xl backdrop-blur-md`}>
            <div className="flex items-center justify-center gap-2 text-amber-400">
              <Sliders className="w-5 h-5" />
              <span className="text-xs font-black uppercase tracking-widest">DESLIZE O VALOR CORRETO NO CELULAR</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-black text-slate-300 px-2 font-mono uppercase">
                <span>MÍN: {parsedSlider.min} {parsedSlider.unit}</span>
                <span>MÁX: {parsedSlider.max} {parsedSlider.unit}</span>
              </div>
              <div className="h-3.5 bg-slate-950 rounded-full border border-slate-800 overflow-hidden relative">
                <div className="h-full bg-gradient-to-r from-amber-500/40 via-amber-400 to-amber-500/40 w-full" />
              </div>
            </div>
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">
              AJUSTE A RÉGUA NO SMARTPHONE ATÉ A MARCAÇÃO PRECISA...
            </p>
          </div>
        );

      case 'PUZZLE':
        return (
          <div className="w-full space-y-3 text-left">
            <span className="text-xs font-black text-purple-400 uppercase tracking-widest block text-center mb-1">
              ORDENE A SEQUÊNCIA CORRETA NO SEU SMARTPHONE (1º AO 4º):
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(shuffledPuzzleSteps.length > 0
                ? shuffledPuzzleSteps
                : [puz1, puz2, puz3, puz4].filter(Boolean).map((t, i) => ({ text: t, correctIndex: i }))
              ).map((step, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl flex items-center gap-3 border bg-slate-900/90 border-purple-500/40 shadow-md min-h-[64px] backdrop-blur-sm"
                >
                  <span className="w-7 h-7 rounded-xl bg-purple-600/30 border border-purple-500/40 text-purple-300 font-black text-xs flex items-center justify-center shrink-0">
                    ?
                  </span>
                  <span className="text-xs md:text-sm font-black text-slate-200 leading-snug break-words whitespace-normal flex-1 uppercase tracking-wide">
                    {step.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const leaderboard = quizResults?.leaderboard || [];
  const top1 = leaderboard[0];
  const top2 = leaderboard[1];
  const top3 = leaderboard[2];
  const restOfLeaderboard = leaderboard.slice(3);

  if (!isOpen) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[9999] flex flex-col justify-between p-4 md:p-6 select-none overflow-hidden font-sans h-screen w-screen transition-colors duration-500 ${themeStyles.root}`}
      style={{ margin: 0, top: 0, left: 0 }}
    >
      {/* ========================================================================= */}
      {/* ⚡ FUNDO DE ARENA: LOGOS ESPALHADAS (WALLPAPER PATTERN) COM TOM CLARO */}
      {/* ========================================================================= */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0">
        {/* Aura de iluminação superior suave */}
        <div className={`absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b ${themeStyles.glowTop} blur-[130px] rounded-full`} />

        {/* Mosaico com várias logos repetidas em tom claro e sutil */}
        <div
          className={`absolute inset-0 ${themeStyles.patternOpacity}`}
          style={{
            backgroundImage: `url('/logo.png')`,
            backgroundRepeat: 'repeat',
            backgroundSize: '160px 160px',
            backgroundPosition: '0 0',
            transform: 'rotate(-8deg) scale(1.15)',
            filter: themeStyles.patternFilter,
          }}
        />

        {/* Vinheta radial para manter o centro e as bordas confortáveis para leitura */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30 pointer-events-none" />
      </div>

      {/* CABEÇALHO DA ARENA */}
      <header className={`relative z-10 flex items-center justify-between border-b pb-3 shrink-0 ${themeStyles.header} rounded-2xl px-4 py-2.5`}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 text-white rounded-xl shadow-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className={`text-lg md:text-xl font-black uppercase tracking-wider ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Arena MyClassPluss
            </span>
            {arenaStage === 'PLAYING' && (
              <span className="ml-2 text-xs font-black text-blue-500 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/30 uppercase tracking-wide">
                Questão {currentQuestionIndex + 1} de {totalQuestions}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="p-2 bg-slate-900/80 border border-slate-700 text-emerald-400 rounded-xl flex items-center gap-1.5 text-xs font-bold"
            title="Ordem das perguntas embaralhada aleatoriamente para esta rodada"
          >
            <Shuffle className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline uppercase text-[10px] tracking-wider">Ordem Sorteada</span>
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-blue-400 hover:text-white rounded-xl transition-all cursor-pointer flex items-center gap-1.5 uppercase font-bold text-xs"
            title="Modo Apresentação"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            <span className="text-xs font-bold hidden sm:inline">{isFullscreen ? 'Janela' : 'Tela Cheia'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              getAudioContext();
              setSoundEnabled(!soundEnabled);
            }}
            className="p-2.5 bg-slate-900/80 border border-slate-700 text-slate-400 hover:text-white rounded-xl cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 bg-slate-900/80 border border-slate-700 text-slate-400 hover:text-white rounded-xl cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ÁREA CENTRAL */}
      <main className="relative z-10 flex-1 my-auto flex flex-col justify-center py-2 max-w-6xl mx-auto w-full overflow-hidden">
        {/* ESTÁGIO 1: CONFIGURAÇÃO DE TEMA E SORTEIO */}
        {arenaStage === 'CONFIG' && (
          <div className="max-w-2xl mx-auto w-full bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-xl animate-fade-in text-center">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-black uppercase tracking-wider">
                <Palette className="w-4 h-4" />
                <span>Configuração de Apresentação</span>
              </div>
              <h2 className="text-2xl font-black text-white uppercase tracking-wide">Escolha a Iluminação do Telão</h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Selecione o esquema de cores que oferece o melhor contraste para o projetor ou iluminação da sala.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3.5 text-left">
              <div
                onClick={() => setSelectedTheme('CYBER_BLUE')}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  selectedTheme === 'CYBER_BLUE'
                    ? 'bg-blue-950/60 border-blue-500 ring-2 ring-blue-500/40 shadow-lg'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="w-4 h-4 rounded-full bg-[#070b19] border border-blue-500" />
                  {selectedTheme === 'CYBER_BLUE' && <Check className="w-4 h-4 text-blue-400" />}
                </div>
                <h4 className="text-xs font-black text-white uppercase">Cyber Blue</h4>
                <p className="text-[10px] text-slate-400">Azul meia-noite (Padrão)</p>
              </div>

              <div
                onClick={() => setSelectedTheme('GRAPHITE')}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  selectedTheme === 'GRAPHITE'
                    ? 'bg-zinc-900 border-zinc-500 ring-2 ring-zinc-500/40 shadow-lg'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="w-4 h-4 rounded-full bg-zinc-900 border border-zinc-600" />
                  {selectedTheme === 'GRAPHITE' && <Check className="w-4 h-4 text-zinc-300" />}
                </div>
                <h4 className="text-xs font-black text-white uppercase">Graphite / Chumbo</h4>
                <p className="text-[10px] text-slate-400">Cinza neutro de baixo brilho</p>
              </div>

              <div
                onClick={() => setSelectedTheme('CLEAN_LIGHT')}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  selectedTheme === 'CLEAN_LIGHT'
                    ? 'bg-slate-200 border-blue-600 ring-2 ring-blue-500/40 shadow-lg'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="w-4 h-4 rounded-full bg-slate-100 border border-slate-400" />
                  {selectedTheme === 'CLEAN_LIGHT' && <Check className="w-4 h-4 text-blue-600" />}
                </div>
                <h4 className="text-xs font-black text-slate-900 uppercase">Clean Light</h4>
                <p className="text-[10px] text-slate-600">Alto contraste para salas claras</p>
              </div>

              <div
                onClick={() => setSelectedTheme('NEON_ARENA')}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  selectedTheme === 'NEON_ARENA'
                    ? 'bg-purple-950/60 border-purple-500 ring-2 ring-purple-500/40 shadow-lg'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="w-4 h-4 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600" />
                  {selectedTheme === 'NEON_ARENA' && <Check className="w-4 h-4 text-purple-400" />}
                </div>
                <h4 className="text-xs font-black text-white uppercase">Neon Arena</h4>
                <p className="text-[10px] text-slate-400">Gradiente vibrante gameshow</p>
              </div>
            </div>

            <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl flex items-center justify-center gap-2 text-xs text-emerald-300 font-bold uppercase tracking-wider">
              <Shuffle className="w-4 h-4 text-emerald-400" />
              <span>Embaralhamento Ativado: Nova sequência sorteada para a turma</span>
            </div>

            <button
              type="button"
              onClick={handleStartCountdown}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2.5 cursor-pointer text-sm tracking-widest uppercase transition-all active:scale-95"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Iniciar Contagem Regressiva (8s)</span>
            </button>
          </div>
        )}

        {/* ESTÁGIO 2: WARM-UP (8s) */}
        {arenaStage === 'WARMUP' && (
          <div className="flex flex-col items-center justify-center text-center space-y-6 animate-fade-in">
            <div className="space-y-2">
              <span className="text-xs font-black uppercase tracking-widest text-blue-400 bg-blue-500/10 border border-blue-500/30 px-4 py-1 rounded-full inline-block">
                PREPAREM OS SMARTPHONES
              </span>
              <h1 className={`text-3xl sm:text-5xl font-black max-w-4xl leading-tight uppercase tracking-wide ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {quizTitle}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 font-bold uppercase tracking-wider">
                {totalQuestions} QUESTÕES • ORDEM SORTEADA • TEMPO CRONOMETRADO
              </p>
            </div>

            <div className="relative flex items-center justify-center my-4">
              <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-blue-600/20 border-4 border-blue-500 flex items-center justify-center animate-ping absolute opacity-30" />
              <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-slate-900/90 border-4 border-blue-500 shadow-2xl flex items-center justify-center z-10">
                <span className="text-6xl sm:text-7xl font-black text-white font-mono tracking-tighter">
                  {warmupSeconds}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-lg sm:text-2xl font-black uppercase text-amber-400 tracking-wider animate-pulse">
                O JOGO TERÁ INÍCIO EM {warmupSeconds} SEGUNDOS!
              </h3>
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                ATENÇÃO AO TELÃO E MANTENHAM AS OPÇÕES PRONTAS NA TELA DO CELULAR.
              </p>
            </div>
          </div>
        )}

        {/* ESTÁGIO 3: ARENA / DEVOLUTIVA CONDICIONAL / PÓDIO */}
        {arenaStage === 'PLAYING' && (
          showingStats ? (
            <div className="bg-slate-900/95 border border-blue-500/40 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-xl animate-fade-in max-w-5xl mx-auto w-full text-center">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="text-left space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 bg-blue-500/10 border border-blue-500/30 px-3 py-1 rounded-full inline-block">
                    DEVOLUTIVA PEDAGÓGICA DA RODADA
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wide">
                    DISTRIBUIÇÃO DE RESPOSTAS DA TURMA
                  </h2>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    PÓDIO EM <strong className="text-amber-400 font-mono text-sm">{statsTimer}S</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleSkipStatsToPodium}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-black px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95 uppercase tracking-wider"
                  >
                    <span>Ver Pódio Agora</span>
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {(() => {
                const stats = quizResults?.answerStats || {
                  type: questionType,
                  red: 0,
                  blue: 0,
                  yellow: 0,
                  green: 0,
                  trueVotes: 0,
                  falseVotes: 0,
                  totalAnswers: answersCount || 1,
                  totalCorrect: 0,
                  accuracyRate: 0,
                  sliderTarget: parsedSlider.target,
                  sliderUnit: parsedSlider.unit,
                };

                const total = Math.max(stats.totalAnswers || answersCount, 1);
                const correctIdx = quizResults?.correctIndex ?? currentQuestionData?.options?.findIndex((o) => o.isCorrect);

                // 1. VERDADEIRO OU FALSO
                if (questionType === 'TRUE_FALSE') {
                  const trueCount = stats.trueVotes ?? 0;
                  const falseCount = stats.falseVotes ?? 0;
                  const truePct = total > 0 ? Math.round((trueCount / total) * 100) : 0;
                  const falsePct = total > 0 ? Math.round((falseCount / total) * 100) : 0;

                  const trueOptionInQuestion = currentQuestionData?.options?.find(
                    (o) => o.text?.trim().toLowerCase() === 'verdadeiro'
                  );
                  
                  const isTrueCorrect = stats.isTrueCorrect !== undefined 
                    ? Boolean(stats.isTrueCorrect) 
                    : Boolean(trueOptionInQuestion?.isCorrect);
                  
                  const isFalseCorrect = !isTrueCorrect;

                  return (
                    <div className="grid grid-cols-2 gap-6 max-w-2xl mx-auto py-6 items-end h-64 sm:h-72">
                      <div className="flex flex-col items-center h-full justify-end">
                        {isTrueCorrect && (
                          <span className="mb-2 text-xs font-black uppercase tracking-wider text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 rounded-full animate-bounce">
                            ✓ CORRETA
                          </span>
                        )}
                        <span className="text-2xl font-black text-white font-mono mb-1">{truePct}%</span>
                        <div className="w-full bg-slate-950 rounded-2xl p-2 flex flex-col justify-end border border-slate-800 h-44">
                          <div
                            style={{ height: `${Math.max(truePct, 12)}%` }}
                            className={`w-full rounded-xl transition-all duration-1000 flex flex-col items-center justify-between py-2 shadow-lg ${
                              isTrueCorrect ? 'bg-blue-600 ring-2 ring-emerald-400' : 'bg-blue-600/70'
                            }`}
                          >
                            <span className="text-xs font-black text-white/90 uppercase">{trueCount} {trueCount === 1 ? 'VOTO' : 'VOTOS'}</span>
                            <span className="text-sm md:text-base font-black text-white uppercase tracking-widest">VERDADEIRO</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-center h-full justify-end">
                        {isFalseCorrect && (
                          <span className="mb-2 text-xs font-black uppercase tracking-wider text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 rounded-full animate-bounce">
                            ✓ CORRETA
                          </span>
                        )}
                        <span className="text-2xl font-black text-white font-mono mb-1">{falsePct}%</span>
                        <div className="w-full bg-slate-950 rounded-2xl p-2 flex flex-col justify-end border border-slate-800 h-44">
                          <div
                            style={{ height: `${Math.max(falsePct, 12)}%` }}
                            className={`w-full rounded-xl transition-all duration-1000 flex flex-col items-center justify-between py-2 shadow-lg ${
                              isFalseCorrect ? 'bg-red-600 ring-2 ring-emerald-400' : 'bg-red-600/70'
                            }`}
                          >
                            <span className="text-xs font-black text-white/90 uppercase">{falseCount} {falseCount === 1 ? 'VOTO' : 'VOTOS'}</span>
                            <span className="text-sm md:text-base font-black text-white uppercase tracking-widest">FALSO</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                // 2. SLIDER NUMÉRICO
                if (questionType === 'SLIDER') {
                  const targetVal = stats.sliderTarget !== undefined ? stats.sliderTarget : parsedSlider.target;
                  const minVal = stats.sliderMin !== undefined ? stats.sliderMin : parsedSlider.min;
                  const maxVal = stats.sliderMax !== undefined ? stats.sliderMax : parsedSlider.max;
                  const unitStr = stats.sliderUnit !== undefined ? stats.sliderUnit : parsedSlider.unit;
                  const toleranceVal = stats.sliderTolerance !== undefined ? stats.sliderTolerance : parsedSlider.tolerance;
                  const accuracy = stats.accuracyRate ?? (total > 0 ? Math.round(((stats.totalCorrect ?? 0) / total) * 100) : 0);

                  return (
                    <div className="max-w-xl mx-auto py-6 space-y-6 text-center animate-fade-in">
                      <div className="p-6 bg-slate-950/80 border border-amber-500/40 rounded-3xl shadow-xl space-y-2">
                        <span className="text-xs font-black uppercase text-amber-300 tracking-wider flex items-center justify-center gap-1.5">
                          <Sliders className="w-4 h-4" /> TAXA DE PRECISÃO DA TURMA NO ALVO
                        </span>
                        <div className="text-6xl font-black text-white font-mono">{accuracy}%</div>
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                          {stats.totalCorrect ?? 0} DE {total} PARTICIPANTES ACERTARAM DENTRO DA MARGEM
                        </p>
                      </div>

                      <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-around">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-black tracking-wider">FAIXA ACEITA</span>
                          <strong className="text-slate-200 text-sm font-mono font-black uppercase">
                            {minVal} A {maxVal} {unitStr}
                          </strong>
                          {toleranceVal > 0 && (
                            <span className="text-[10px] text-slate-500 block font-mono font-bold uppercase">
                              (MARGEM: ±{toleranceVal} {unitStr})
                            </span>
                          )}
                        </div>
                        <div className="h-8 w-px bg-slate-800" />
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-black tracking-wider">GABARITO / VALOR ALVO</span>
                          <strong className="text-amber-400 text-2xl font-mono font-black uppercase">
                            {targetVal} {unitStr}
                          </strong>
                        </div>
                      </div>
                    </div>
                  );
                }

                // 3. PUZZLE / ORDENAÇÃO
                if (questionType === 'PUZZLE') {
                  const accuracy = stats.accuracyRate ?? (total > 0 ? Math.round(((stats.totalCorrect ?? 0) / total) * 100) : 0);
                  const officialOrder = (currentQuestionData?.options || []).map((o) => o.text);
                  const displayOrder = officialOrder.length > 0 ? officialOrder : [puz1, puz2, puz3, puz4].filter(Boolean);

                  return (
                    <div className="max-w-3xl mx-auto py-4 space-y-6 text-center">
                      <div className="p-6 bg-slate-950/80 border border-purple-500/40 rounded-3xl shadow-xl space-y-2">
                        <span className="text-xs font-black uppercase text-purple-300 tracking-wider flex items-center justify-center gap-1.5">
                          <Layers className="w-4 h-4" /> DOMÍNIO DA SEQUÊNCIA CORRETA
                        </span>
                        <div className="text-6xl font-black text-white font-mono">{accuracy}%</div>
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                          {stats.totalCorrect ?? 0} DE {total} ALUNOS ACERTARAM A ORDENAÇÃO DE PONTA A PONTA
                        </p>
                      </div>

                      <div className="space-y-2 text-left">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block text-center">
                          GABARITO OFICIAL DO PROCEDIMENTO (1º AO 4º):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                          {displayOrder.map((stepText, idx) => (
                            <div
                              key={idx}
                              className="bg-slate-950 border border-purple-500/30 p-3 rounded-2xl flex items-center gap-2.5 shadow-md"
                            >
                              <span className="w-6 h-6 rounded-lg bg-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                                {idx + 1}º
                              </span>
                              <span className="text-xs font-black text-slate-200 truncate uppercase tracking-wide">{stepText}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                }

                // 4. RESPOSTA CURTA
                if (questionType === 'FAST_ANSWER') {
                  const accuracy = stats.accuracyRate ?? (total > 0 ? Math.round(((stats.totalCorrect ?? 0) / total) * 100) : 0);
                  const acceptedTerms = (currentQuestionData?.options || []).map((o) => o.text).filter(Boolean);

                  return (
                    <div className="max-w-xl mx-auto py-6 space-y-6 text-center">
                      <div className="p-6 bg-slate-950/80 border border-emerald-500/40 rounded-3xl shadow-xl space-y-2">
                        <span className="text-xs font-black uppercase text-emerald-300 tracking-wider flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" /> TAXA DE ACERTO DA RESPOSTA CURTA
                        </span>
                        <div className="text-6xl font-black text-white font-mono">{accuracy}%</div>
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                          {stats.totalCorrect ?? 0} DE {total} ALUNOS RESPONDERAM O TERMO TÉCNICO CORRETO
                        </p>
                      </div>

                      <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-center space-y-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">TERMOS OFICIAIS ACEITOS:</span>
                        <p className="text-sm font-black text-emerald-400 font-mono uppercase tracking-wide">
                          {acceptedTerms.length > 0 ? acceptedTerms.join(' • ') : 'GABARITO REGISTRADO NO SISTEMA'}
                        </p>
                      </div>
                    </div>
                  );
                }

                // 5. MÚLTIPLA ESCOLHA
                const pctRed = Math.round((stats.red / total) * 100);
                const pctBlue = Math.round((stats.blue / total) * 100);
                const pctYellow = Math.round((stats.yellow / total) * 100);
                const pctGreen = Math.round((stats.green / total) * 100);

                const bars = [
                  { label: '▲', text: optRed, count: stats.red, pct: pctRed, bg: 'bg-red-600', isCorrect: correctIdx === 0 },
                  { label: '◆', text: optBlue, count: stats.blue, pct: pctBlue, bg: 'bg-blue-600', isCorrect: correctIdx === 1 },
                  { label: '●', text: optYellow, count: stats.yellow, pct: pctYellow, bg: 'bg-amber-500', isCorrect: correctIdx === 2 },
                  { label: '■', text: optGreen, count: stats.green, pct: pctGreen, bg: 'bg-emerald-600', isCorrect: correctIdx === 3 },
                ];

                return (
                  <div className="grid grid-cols-4 gap-3 sm:gap-6 pt-6 pb-2 items-end h-64 sm:h-72">
                    {bars.map((bar, idx) => (
                      <div key={idx} className="flex flex-col items-center h-full justify-end group">
                        {bar.isCorrect && (
                          <span className="mb-2 text-[10px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 rounded-full animate-bounce">
                            ✓ CORRETA
                          </span>
                        )}

                        <span className="text-sm sm:text-base font-black text-white font-mono mb-1">
                          {bar.pct}%
                        </span>

                        <div className="w-full bg-slate-950 rounded-2xl p-1.5 flex flex-col justify-end border border-slate-800 h-44">
                          <div
                            style={{ height: `${Math.max(bar.pct, 8)}%` }}
                            className={`w-full ${bar.bg} rounded-xl transition-all duration-1000 flex flex-col items-center justify-between py-1.5 shadow-lg relative overflow-hidden`}
                          >
                            <span className="text-[10px] font-black text-white/90 uppercase">
                              {bar.count}
                            </span>
                            <span className="text-xs sm:text-sm font-black text-white">
                              {bar.label}
                            </span>
                          </div>
                        </div>

                        <span className="text-[11px] font-black text-slate-200 mt-2 line-clamp-2 max-w-[120px] leading-tight uppercase tracking-wide">
                          {bar.text || `OPÇÃO ${idx + 1}`}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          ) : showPodium ? (
            <div className="bg-slate-900/95 border border-purple-500/40 rounded-3xl p-6 space-y-6 shadow-2xl backdrop-blur-xl animate-fade-in max-h-[85vh] overflow-y-auto">
              <div className="text-center space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-black uppercase tracking-wider">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>{hasNextQuestion ? 'CLASSIFICAÇÃO PARCIAL' : '🏆 PÓDIO FINAL DA ARENA'}</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wide">
                  {hasNextQuestion ? 'LÍDERES DA RODADA' : 'PARABÉNS AOS VENCEDORES DO TREINAMENTO!'}
                </h2>
              </div>

              {leaderboard.length > 0 && (
                <div className="flex items-end justify-center gap-3 sm:gap-6 pt-4 pb-2 px-2">
                  {/* 2º LUGAR */}
                  {top2 && (
                    <div className="flex-1 max-w-[180px] flex flex-col items-center animate-fade-in">
                      <div className="text-center mb-2 space-y-0.5">
                        <span className="text-xs font-black text-slate-200 truncate max-w-[140px] block uppercase">{top2.userName}</span>
                        <span className="text-xs font-black text-slate-400">{Number(top2.score ?? 0).toLocaleString('pt-BR')} PTS</span>
                        
                        {top2.streak >= 2 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase bg-gradient-to-r from-orange-500 to-amber-500 text-white px-2 py-0.5 rounded-full shadow-md animate-pulse mt-0.5">
                            🔥 {top2.streak}X COMBO
                          </span>
                        )}
                      </div>
                      <div className="w-full h-32 bg-gradient-to-t from-slate-800 to-slate-700 border-t-4 border-slate-400 rounded-t-2xl flex flex-col items-center justify-start pt-3 shadow-xl">
                        <Medal className="w-6 h-6 text-slate-300 mb-1" />
                        <span className="text-2xl font-black text-slate-200">2º</span>
                      </div>
                    </div>
                  )}

                  {/* 1º LUGAR */}
                  {top1 && (
                    <div className="flex-1 max-w-[200px] flex flex-col items-center animate-bounce-subtle z-10">
                      <div className="text-center mb-2 space-y-0.5">
                        <span className="inline-block p-1 bg-amber-500/20 rounded-full text-amber-400 mb-0.5 animate-pulse">👑</span>
                        <span className="text-sm font-black text-amber-300 truncate max-w-[160px] block uppercase">{top1.userName}</span>
                        <span className="text-sm font-black text-amber-400">{Number(top1.score ?? 0).toLocaleString('pt-BR')} PTS</span>
                        
                        {top1.streak >= 2 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase bg-gradient-to-r from-orange-500 to-amber-500 text-white px-2 py-0.5 rounded-full shadow-md animate-pulse mt-0.5">
                            🔥 {top1.streak}X COMBO
                          </span>
                        )}
                      </div>
                      <div className="w-full h-44 bg-gradient-to-t from-amber-950 via-amber-900/80 to-amber-700 border-t-4 border-amber-400 rounded-t-2xl flex flex-col items-center justify-start pt-3 shadow-2xl shadow-amber-600/30">
                        <Trophy className="w-8 h-8 text-amber-300 mb-1 drop-shadow-md" />
                        <span className="text-3xl font-black text-amber-200">1º</span>
                      </div>
                    </div>
                  )}

                  {/* 3º LUGAR */}
                  {top3 && (
                    <div className="flex-1 max-w-[180px] flex flex-col items-center animate-fade-in">
                      <div className="text-center mb-2 space-y-0.5">
                        <span className="text-xs font-black text-slate-200 truncate max-w-[140px] block uppercase">{top3.userName}</span>
                        <span className="text-xs font-black text-slate-400">{Number(top3.score ?? 0).toLocaleString('pt-BR')} PTS</span>
                        
                        {top3.streak >= 2 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase bg-gradient-to-r from-orange-500 to-amber-500 text-white px-2 py-0.5 rounded-full shadow-md animate-pulse mt-0.5">
                            🔥 {top3.streak}X COMBO
                          </span>
                        )}
                      </div>
                      <div className="w-full h-24 bg-gradient-to-t from-amber-900/40 to-amber-800/40 border-t-4 border-amber-600 rounded-t-2xl flex flex-col items-center justify-start pt-3 shadow-xl">
                        <Award className="w-6 h-6 text-amber-600 mb-1" />
                        <span className="text-xl font-black text-amber-500">3º</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* CLASSIFICAÇÃO DO 4º EM DIANTE */}
              {restOfLeaderboard.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-2 pt-2 border-t border-slate-800">
                  {restOfLeaderboard.map((student: any) => (
                    <div
                      key={student.userId}
                      className={
                        'flex items-center justify-between p-3 rounded-xl border transition-all ' +
                        (student.isApproved ? 'bg-emerald-950/30 border-emerald-500/40' : 'bg-slate-950/80 border-slate-800')
                      }
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 font-black text-slate-400 text-sm">#{student.rank}</span>
                        <span className="font-black text-white text-xs md:text-sm uppercase tracking-wide">{student.userName}</span>
                        
                        {student.streak >= 2 && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/40 text-orange-400 px-1.5 py-0.5 rounded-full animate-pulse">
                            🔥 {student.streak}X
                          </span>
                        )}

                        {student.teamName && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded text-white uppercase tracking-wider" style={{ backgroundColor: student.teamColor || '#6366f1' }}>
                            {student.teamName}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {student.isCorrect && student.roundScore > 0 && (
                          <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                            +{student.roundScore}
                          </span>
                        )}
                        <span className="text-sm font-black text-amber-300 font-mono">
                          {Number(student.score ?? 0).toLocaleString('pt-BR')} <span className="text-xs font-normal text-slate-400">PTS</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-center gap-3 pt-2">
                {hasNextQuestion ? (
                  <button
                    type="button"
                    onClick={onNextQuestion}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-6 py-3 rounded-xl text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer animate-pulse uppercase tracking-wider"
                  >
                    <span>Próxima Questão ({currentQuestionIndex + 2} de {totalQuestions})</span>
                    <SkipForward className="w-4 h-4" />
                  </button>
                ) : (
                  onOpenFinalReport && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenFinalReport();
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-6 py-3 rounded-xl text-xs shadow-lg flex items-center gap-2 cursor-pointer transition-transform active:scale-95 uppercase tracking-wider"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Dossiê Pedagógico Completo</span>
                    </button>
                  )
                )}

                <button
                  type="button"
                  onClick={onResetScores}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-black px-4 py-3 rounded-xl text-xs cursor-pointer flex items-center gap-1.5 uppercase tracking-wider"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reiniciar</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col justify-between h-full max-h-[82vh] space-y-3">
              <div className={`flex items-center justify-between border px-4 py-2.5 rounded-2xl shrink-0 ${themeStyles.card}`}>
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center font-black text-lg ${
                      countdown <= 5 ? 'bg-red-500/20 border-red-500 text-red-400 animate-bounce' : 'bg-blue-600/20 border-blue-500 text-blue-400'
                    }`}
                  >
                    {countdown}s
                  </div>
                  <div className="w-36 sm:w-48 bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full transition-all duration-1000 ${
                        countdown <= 5 ? 'bg-red-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {quizRunning && countdown > 0 && onForceFinishTime && (
                  <button
                    type="button"
                    onClick={onForceFinishTime}
                    className="bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 text-xs font-black px-3.5 py-1.5 rounded-xl cursor-pointer uppercase"
                    title="Encerrar tempo agora"
                  >
                    <FastForward className="w-3.5 h-3.5" />
                  </button>
                )}

                <div className="flex items-center gap-2">
                  <span className={`text-xs font-black uppercase tracking-wider ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    <strong className="text-emerald-500">{answersCount}</strong>/{totalStudents} RESPOSTAS
                  </span>
                  <Users className="w-4 h-4 text-emerald-500" />
                </div>
              </div>

              {/* Bloco de Enunciado da Pergunta */}
              <div className={`border px-6 py-4 rounded-2xl shrink-0 text-center ${themeStyles.card}`}>
                <h1 className={`text-lg md:text-2xl font-black leading-snug break-words uppercase tracking-wide ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {quizQuestion}
                </h1>
              </div>

              <div className="flex-1 min-h-0 flex items-center justify-center">
                {activeImage ? (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 w-full h-full items-center">
                    <div className="md:col-span-5 flex items-center justify-center h-full max-h-[42vh]">
                      <img
                        src={activeImage}
                        alt="Esquema Ilustrativo"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                        className="max-h-full max-w-full object-contain rounded-2xl border border-slate-700 shadow-2xl bg-slate-950/60 p-1.5"
                      />
                    </div>
                    <div className="md:col-span-7 flex items-center justify-center w-full">
                      {renderQuestionBody()}
                    </div>
                  </div>
                ) : (
                  <div className="w-full flex items-center justify-center max-w-4xl mx-auto">
                    {renderQuestionBody()}
                  </div>
                )}
              </div>
            </div>
          )
        )}
      </main>

      {/* RODAPÉ */}
      <footer className={`relative z-10 flex items-center justify-between border-t pt-2 text-[10px] shrink-0 ${themeStyles.footer} rounded-xl px-4 py-2`}>
        <div className="flex items-center gap-3">
          <span className="uppercase font-bold">MyClassPluss • Apresentação de Telão</span>
          <span className="hidden sm:inline text-slate-500">•</span>
          <span className="hidden sm:inline font-mono text-slate-400">
            Atalhos: <strong className="text-white font-bold">[Espaço]</strong> Avançar/Ação • <strong className="text-white font-bold">[F]</strong> Tela Cheia • <strong className="text-white font-bold">[M]</strong> Mudo
          </span>
        </div>
        <span className="uppercase font-bold">Pressione ESC para sair da tela cheia</span>
      </footer>
    </div>,
    document.body
  );
};

export default InteractiveArenaModal;