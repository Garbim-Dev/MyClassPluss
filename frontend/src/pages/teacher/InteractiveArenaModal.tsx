import React, { useEffect, useRef, useState } from 'react';
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
  Layers,
  Medal,
  Award,
} from 'lucide-react';

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

interface InteractiveArenaModalProps {
  isOpen: boolean;
  onClose: () => void;
  quizQuestion: string;
  quizImage?: string;
  questionType: string;
  countdown: number;
  totalTime: number;
  answersCount: number;
  totalStudents: number;
  quizRunning: boolean;
  showPodium: boolean;
  quizResults: any;
  currentQuestionIndex: number;
  totalQuestions: number;
  currentQuestionData?: QuestionDetails;
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

export const InteractiveArenaModal: React.FC<InteractiveArenaModalProps> = ({
  isOpen,
  onClose,
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
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [shuffledPuzzleSteps, setShuffledPuzzleSteps] = useState<{ text: string; correctIndex: number }[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const activeImage = quizImage || currentQuestionData?.imageUrl;

  useEffect(() => {
    if (questionType === 'PUZZLE' && currentQuestionData?.options && currentQuestionData.options.length > 0) {
      const mapped = currentQuestionData.options.map((opt, idx) => ({
        text: opt.text,
        correctIndex: idx,
      }));
      const shuffled = [...mapped].sort(() => Math.random() - 0.5);
      setShuffledPuzzleSteps(shuffled);
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
    if (!isOpen || !quizRunning || showPodium || !soundEnabled || countdown <= 0) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const freq = countdown <= 5 ? 587.33 : 440;
      osc.type = countdown <= 5 ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {}
  }, [countdown, isOpen, quizRunning, showPodium, soundEnabled]);

  // ⚡ Dispara efeito visual de Confetti em cascata quando o pódio é exibido
  useEffect(() => {
    if (showPodium && isOpen) {
      // Disparo inicial em leque
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'],
      });

      // Segundo disparo com efeito de chuva lateral após 400ms
      const timer = setTimeout(() => {
        confetti({
          particleCount: 80,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
        });
        confetti({
          particleCount: 80,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
        });
      }, 400);

      return () => clearTimeout(timer);
    }
  }, [showPodium, isOpen]);

  if (!isOpen) return null;

  const progressPercent = totalTime > 0 ? (countdown / totalTime) * 100 : 0;
  const hasNextQuestion = currentQuestionIndex + 1 < totalQuestions;

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 w-full">
            <div className="p-4 rounded-2xl border flex items-center justify-between bg-red-950/40 border-red-500/40">
              <div className="flex items-center gap-3 truncate">
                <span className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center font-black text-white text-base shrink-0">
                  ▲
                </span>
                <span className="text-sm md:text-base font-bold text-white truncate">{optRed}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl border flex items-center justify-between bg-blue-950/40 border-blue-500/40">
              <div className="flex items-center gap-3 truncate">
                <span className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white text-base shrink-0">
                  ◆
                </span>
                <span className="text-sm md:text-base font-bold text-white truncate">{optBlue}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl border flex items-center justify-between bg-amber-950/40 border-amber-500/40">
              <div className="flex items-center gap-3 truncate">
                <span className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center font-black text-slate-950 text-base shrink-0">
                  ●
                </span>
                <span className="text-sm md:text-base font-bold text-white truncate">{optYellow}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl border flex items-center justify-between bg-emerald-950/40 border-emerald-500/40">
              <div className="flex items-center gap-3 truncate">
                <span className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-black text-white text-base shrink-0">
                  ■
                </span>
                <span className="text-sm md:text-base font-bold text-white truncate">{optGreen}</span>
              </div>
            </div>
          </div>
        );

      case 'TRUE_FALSE':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <div className="p-6 md:p-8 rounded-3xl border flex flex-col items-center justify-center gap-2 shadow-2xl bg-blue-950/40 border-blue-500/60 shadow-blue-950/50">
              <span className="text-xl md:text-2xl font-black text-white tracking-wider">VERDADEIRO</span>
            </div>

            <div className="p-6 md:p-8 rounded-3xl border flex flex-col items-center justify-center gap-2 shadow-2xl bg-red-950/40 border-red-500/60 shadow-red-950/50">
              <span className="text-xl md:text-2xl font-black text-white tracking-wider">FALSO</span>
            </div>
          </div>
        );

      case 'FAST_ANSWER':
        return (
          <div className="w-full bg-slate-900/80 border border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-xl">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <Keyboard className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg md:text-xl font-black text-white">Digite a resposta no seu smartphone!</h3>
              <p className="text-xs text-slate-400">
                Os participantes estão digitando os termos técnicos nos seus aparelhos...
              </p>
            </div>
          </div>
        );

      case 'SLIDER':
        return (
          <div className="w-full bg-slate-900/80 border border-slate-800 rounded-3xl p-6 text-center space-y-5 shadow-xl">
            <div className="flex items-center justify-center gap-2 text-amber-400">
              <Sliders className="w-5 h-5" />
              <span className="text-xs font-black uppercase tracking-wider">Deslize o valor correto</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-2 font-mono">
                <span>Mín: {parsedSlider.min} {parsedSlider.unit}</span>
                <span>Máx: {parsedSlider.max} {parsedSlider.unit}</span>
              </div>

              <div className="h-3.5 bg-slate-950 rounded-full border border-slate-800 overflow-hidden relative">
                <div className="h-full bg-gradient-to-r from-amber-500/40 via-amber-400 to-amber-500/40 w-full" />
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Ajuste a régua no smartphone até a marcação precisa...
            </p>
          </div>
        );

      case 'PUZZLE':
        return (
          <div className="w-full space-y-3 text-left">
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider block text-center mb-1">
              Ordene a sequência correta no seu smartphone (1º ao 4º):
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(shuffledPuzzleSteps.length > 0
                ? shuffledPuzzleSteps
                : [puz1, puz2, puz3, puz4].filter(Boolean).map((t, i) => ({ text: t, correctIndex: i }))
              ).map((step, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl flex items-center gap-3 border bg-slate-900/90 border-purple-500/40 shadow-md"
                >
                  <span className="w-7 h-7 rounded-xl bg-purple-600/30 border border-purple-500/40 text-purple-300 font-black text-xs flex items-center justify-center shrink-0">
                    ?
                  </span>
                  <span className="text-xs md:text-sm font-bold text-slate-200 truncate">{step.text}</span>
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

  return (
    <div className="fixed inset-0 z-50 bg-[#070b19] flex flex-col justify-between p-4 md:p-6 select-none overflow-hidden text-slate-100 font-sans h-screen w-screen">
      {/* CABEÇALHO */}
      <header className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 text-white rounded-xl shadow-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg md:text-xl font-black text-white">Arena OffClass</span>
            <span className="ml-2 text-xs font-bold text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/30">
              Questão {currentQuestionIndex + 1} de {totalQuestions}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-blue-400 hover:text-white rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
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
            className="p-2.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ÁREA CENTRAL */}
      <main className="flex-1 my-auto flex flex-col justify-center py-2 max-w-6xl mx-auto w-full overflow-hidden">
        {showPodium ? (
          /* TELA DE PÓDIO IMERSIVO COM ESCADARIA ESTILO GAMESHOW */
          <div className="bg-slate-900/95 border border-purple-500/40 rounded-3xl p-6 space-y-6 shadow-2xl backdrop-blur-xl animate-fade-in max-h-[85vh] overflow-y-auto">
            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-black uppercase">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>{hasNextQuestion ? 'Classificação Parcial' : '🏆 Pódio Final da Arena'}</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-white">
                {hasNextQuestion ? 'Líderes da Rodada' : 'Parabéns aos Vencedores do Treinamento!'}
              </h2>
            </div>

            {/* PÓDIO EM ESCADARIA (TOP 3) */}
            {leaderboard.length > 0 && (
              <div className="flex items-end justify-center gap-3 sm:gap-6 pt-4 pb-2 px-2">
                {/* 2º LUGAR */}
                {top2 && (
                  <div className="flex-1 max-w-[180px] flex flex-col items-center animate-fade-in">
                    <div className="text-center mb-2 space-y-0.5">
                      <span className="text-xs font-bold text-slate-300 truncate max-w-[140px] block">{top2.userName}</span>
                      <span className="text-xs font-black text-slate-400">{Number(top2.score ?? 0).toLocaleString('pt-BR')} pts</span>
                      {top2.teamName && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded text-white block mx-auto w-fit" style={{ backgroundColor: top2.teamColor || '#6366f1' }}>
                          {top2.teamName}
                        </span>
                      )}
                    </div>
                    <div className="w-full h-32 bg-gradient-to-t from-slate-800 to-slate-700 border-t-4 border-slate-400 rounded-t-2xl flex flex-col items-center justify-start pt-3 shadow-xl">
                      <Medal className="w-6 h-6 text-slate-300 mb-1" />
                      <span className="text-2xl font-black text-slate-200">2º</span>
                    </div>
                  </div>
                )}

                {/* 1º LUGAR (MAIS ALTO E EM DESTAQUE) */}
                {top1 && (
                  <div className="flex-1 max-w-[200px] flex flex-col items-center animate-bounce-subtle z-10">
                    <div className="text-center mb-2 space-y-0.5">
                      <span className="inline-block p-1 bg-amber-500/20 rounded-full text-amber-400 mb-0.5 animate-pulse">👑</span>
                      <span className="text-sm font-black text-amber-300 truncate max-w-[160px] block">{top1.userName}</span>
                      <span className="text-sm font-black text-amber-400">{Number(top1.score ?? 0).toLocaleString('pt-BR')} pts</span>
                      {top1.teamName && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded text-white block mx-auto w-fit shadow-md" style={{ backgroundColor: top1.teamColor || '#6366f1' }}>
                          {top1.teamName}
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
                      <span className="text-xs font-bold text-slate-300 truncate max-w-[140px] block">{top3.userName}</span>
                      <span className="text-xs font-black text-slate-400">{Number(top3.score ?? 0).toLocaleString('pt-BR')} pts</span>
                      {top3.teamName && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded text-white block mx-auto w-fit" style={{ backgroundColor: top3.teamColor || '#6366f1' }}>
                          {top3.teamName}
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

            {/* DEMAIS POSIÇÕES DO RANKING (DO 4º EM DIANTE) */}
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
                      <span className="font-bold text-white text-xs md:text-sm">{student.userName}</span>
                      {student.teamName && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: student.teamColor || '#6366f1' }}>
                          {student.teamName}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {student.isCorrect && student.roundScore > 0 && (
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                          +{student.roundScore}
                        </span>
                      )}
                      <span className="text-sm font-black text-amber-300 font-mono">
                        {Number(student.score ?? 0).toLocaleString('pt-BR')} <span className="text-xs font-normal text-slate-400">pts</span>
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
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-6 py-3 rounded-xl text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer animate-pulse"
                >
                  <span>Próxima Questão ({currentQuestionIndex + 2} de {totalQuestions})</span>
                  <SkipForward className="w-4 h-4" />
                </button>
              ) : (
                onOpenFinalReport && (
                  <button
                    type="button"
                    onClick={onOpenFinalReport}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-6 py-3 rounded-xl text-xs shadow-lg flex items-center gap-2 cursor-pointer transition-transform active:scale-95"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Dossiê Pedagógico Completo</span>
                  </button>
                )
              )}

              <button
                type="button"
                onClick={onResetScores}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-3 rounded-xl text-xs cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reiniciar</span>
              </button>
            </div>
          </div>
        ) : (
          /* TELA DA PERGUNTA */
          <div className="flex flex-col justify-between h-full max-h-[82vh] space-y-3">
            {/* STATUS SUPERIOR */}
            <div className="flex items-center justify-between bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-2xl shrink-0">
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
                  className="bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 text-xs font-black px-3.5 py-1.5 rounded-xl cursor-pointer"
                  title="Encerrar tempo agora"
                >
                  <FastForward className="w-3.5 h-3.5" />
                </button>
              )}

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">
                  <strong className="text-emerald-400">{answersCount}</strong>/{totalStudents} respostas
                </span>
                <Users className="w-4 h-4 text-emerald-400" />
              </div>
            </div>

            {/* ENUNCIADO */}
            <div className="bg-slate-900 border border-slate-800 px-6 py-4 rounded-2xl shrink-0 text-center">
              <h1 className="text-lg md:text-2xl font-black text-white leading-tight line-clamp-3">{quizQuestion}</h1>
            </div>

            {/* ÁREA DINÂMICA (COM OU SEM IMAGEM) */}
            <div className="flex-1 min-h-0 flex items-center justify-center">
              {activeImage ? (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 w-full h-full items-center">
                  <div className="md:col-span-5 flex items-center justify-center h-full max-h-[42vh]">
                    <img
                      src={activeImage}
                      alt="Esquema Ilustrativo"
                      className="max-h-full max-w-full object-contain rounded-2xl border border-slate-700 shadow-2xl bg-slate-950/60 p-1.5"
                    />
                  </div>

                  <div className="md:col-span-7 flex items-center justify-center w-full">
                    {renderQuestionBody()}
                  </div>
                </div>
              ) : (
                <div className="w-full flex items-center justify-center">
                  {renderQuestionBody()}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* RODAPÉ */}
      <footer className="flex items-center justify-between border-t border-slate-800 pt-2 text-[10px] text-slate-500 shrink-0">
        <span>OffClass • Apresentação de Telão em Sala</span>
        <span>Pressione ESC para sair da tela cheia</span>
      </footer>
    </div>
  );
};

export default InteractiveArenaModal;