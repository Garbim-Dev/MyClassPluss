import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useFormAutoSave } from '../../hooks/useFormAutoSave';
import {
  Clock,
  Send,
  CheckCircle2,
  XCircle,
  FileCheck2,
  Layers,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  RotateCcw,
  GraduationCap,
  Radio,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  BookmarkCheck,
  AlertCircle,
} from 'lucide-react';

interface FormalExamViewProps {
  quizData: any;
  studentUser: any;
  classId: string;
  durationMinutes?: number;
  onFinishExam: (result: any) => void;
  onReturnToLobby?: () => void;
}

// ⚡ Algoritmo Fisher-Yates para embaralhamento uniforme
const shuffleArray = (array: any[]) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  if (shuffled.length > 1 && shuffled.every((item, idx) => item.correctOrder === idx)) {
    const temp = shuffled[0];
    shuffled[0] = shuffled[1];
    shuffled[1] = temp;
  }
  return shuffled;
};

export const FormalExamView: React.FC<FormalExamViewProps> = ({
  quizData,
  studentUser,
  classId,
  durationMinutes = 45,
  onFinishExam,
  onReturnToLobby,
}) => {
  const navigate = useNavigate();

  // ⚡ 1. Garante lista de questões disponível
  const rawQuestions: any[] = React.useMemo(() => {
    if (!quizData) return [];
    if (Array.isArray(quizData.questions) && quizData.questions.length > 0) {
      return quizData.questions;
    }
    return [];
  }, [quizData]);

  // ⚡ 2. DECLARAÇÃO DE TODOS OS ESTADOS PRIMEIRO (Evita TDZ)
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [answers, setAnswers] = useState<{ [questionId: string]: any }>({});
  const [timeLeft, setTimeLeft] = useState((durationMinutes || 45) * 60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackResult, setFeedbackResult] = useState<any | null>(null); // <-- Declarado aqui no topo!

  const [showAlreadyDoneModal, setShowAlreadyDoneModal] = useState(false);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [blankQuestionIndexes, setBlankQuestionIndexes] = useState<number[]>([]);

  const [puzzleStates, setPuzzleStates] = useState<{ [questionId: string]: any[] }>({});
  const [orderedQuestions, setOrderedQuestions] = useState<any[]>(() => rawQuestions);

  // ⚡ 3. Chave de bloqueio e persistência
  const completedStorageKey = `@MyClassPluss:exam_completed_${quizData?.id}_${studentUser?.id}`;
  const examStorageKey = `@MyClassPluss:student_exam_${quizData?.id}_${studentUser?.id}`;

  // ⚡ Trava visual e elegante de avaliação já finalizada
  useEffect(() => {
    try {
      const isCompleted = localStorage.getItem(completedStorageKey) === 'true';
      if (isCompleted && !feedbackResult) {
        setShowAlreadyDoneModal(true);
        // Retorna automaticamente após 4 segundos se o aluno não clicar
        const timer = setTimeout(() => {
          if (onReturnToLobby) onReturnToLobby();
          else navigate('/student/portal', { replace: true });
        }, 4000);
        return () => clearTimeout(timer);
      }
    } catch (e) {}
  }, [completedStorageKey, onReturnToLobby, navigate, feedbackResult]);

  // ⚡ 5. AutoSave Universal
  const { clearDraft } = useFormAutoSave(
    examStorageKey,
    { answers, currentIdx, timeLeft },
    (saved) => {
      if (saved.answers && typeof saved.answers === 'object') {
        setAnswers(saved.answers);
      }
      if (typeof saved.currentIdx === 'number') {
        setCurrentIdx(saved.currentIdx);
      }
      if (typeof saved.timeLeft === 'number' && saved.timeLeft > 0) {
        setTimeLeft(saved.timeLeft);
      }
    },
    Boolean(feedbackResult)
  );

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

  useEffect(() => {
    window.history.pushState(null, '', window.location.href);

    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
      if (feedbackResult) {
        if (onReturnToLobby) onReturnToLobby();
        else navigate('/student/portal', { replace: true });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [feedbackResult, navigate, onReturnToLobby]);

  // ⚡ Inicialização com Embaralhamento Individual e Persistente
  useEffect(() => {
    if (!rawQuestions || rawQuestions.length === 0) return;

    const questionsCacheKey = `@MyClassPluss:exam_questions_${quizData?.id}_${studentUser?.id}`;
    const cachedQuestions = localStorage.getItem(questionsCacheKey);
    let finalQuestions: any[] = [];

    if (cachedQuestions) {
      try {
        finalQuestions = JSON.parse(cachedQuestions);
      } catch (e) {
        finalQuestions = [];
      }
    }

    if (finalQuestions.length === 0 || finalQuestions.length !== rawQuestions.length) {
      const clonedQuestions = rawQuestions.map((q: any) => {
        if (q.type === 'MULTIPLE_CHOICE' && q.options && q.options.length > 1) {
          return {
            ...q,
            options: shuffleArray(q.options),
          };
        }
        return q;
      });

      finalQuestions = shuffleArray(clonedQuestions);
      try {
        localStorage.setItem(questionsCacheKey, JSON.stringify(finalQuestions));
      } catch (e) {}
    }

    setOrderedQuestions(finalQuestions);

    // Inicialização dos Puzzles
    const initialPuzzles: { [qId: string]: any[] } = {};

    finalQuestions.forEach((q: any) => {
      if (q.type === 'PUZZLE' && q.options && q.options.length > 0) {
        const mapped = q.options.map((opt: any, idx: number) => ({
          ...opt,
          id: opt.id || `opt_${q.id}_${idx}`,
          correctOrder: opt.correctOrder !== undefined && opt.correctOrder !== null ? Number(opt.correctOrder) : idx,
        }));

        if (answers[q.id] && Array.isArray(answers[q.id])) {
          const cachedIds = answers[q.id];
          const restored = cachedIds
            .map((val: any) => mapped.find((m: any) => m.id === val || m.correctOrder === val || m.text === val))
            .filter(Boolean);
          initialPuzzles[q.id] = restored.length === mapped.length ? restored : shuffleArray(mapped);
        } else {
          initialPuzzles[q.id] = shuffleArray(mapped);
        }
      }
    });

    setPuzzleStates(initialPuzzles);
  }, [rawQuestions, quizData?.id, studentUser?.id]);

  const handleSelectAnswer = (questionId: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleMovePuzzleItem = (questionId: string, index: number, direction: 'up' | 'down') => {
    const currentList = puzzleStates[questionId] || [];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentList.length) return;

    const updatedList = [...currentList];
    const temp = updatedList[index];
    updatedList[index] = updatedList[targetIndex];
    updatedList[targetIndex] = temp;

    const newPuzzleStates = { ...puzzleStates, [questionId]: updatedList };
    setPuzzleStates(newPuzzleStates);

    const newAnswerPayload = updatedList.map((item) => item.id);
    handleSelectAnswer(questionId, newAnswerPayload);
  };

  useEffect(() => {
    if (feedbackResult) return;
    if (timeLeft <= 0) {
      executeSubmission();
      return;
    }
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, feedbackResult]);

  // Lista de questões resolvida
  const currentQuestionList = orderedQuestions.length > 0 ? orderedQuestions : rawQuestions;
  const totalQuestionsCount = currentQuestionList.length;

  const isQuestionAnswered = (qItem: any): boolean => {
    if (!qItem) return false;
    const val = answers[qItem.id];
    if (val === undefined || val === null || val === '') return false;
    if (qItem.type === 'FAST_ANSWER' && String(val).trim() === '') return false;
    return true;
  };

  const answeredCount = currentQuestionList.filter(isQuestionAnswered).length;
  const isLastQuestion = totalQuestionsCount > 0 && currentIdx === totalQuestionsCount - 1;

  const handlePreSubmit = () => {
    const blanks: number[] = [];

    currentQuestionList.forEach((qItem: any, idx: number) => {
      if (!isQuestionAnswered(qItem)) {
        blanks.push(idx + 1);
      }
    });

    if (blanks.length > 0) {
      setBlankQuestionIndexes(blanks);
      setShowConfirmModal(true);
    } else {
      executeSubmission();
    }
  };

  const executeSubmission = async () => {
    setShowConfirmModal(false);
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const formattedAnswers = currentQuestionList.map((qItem: any) => {
        let val = answers[qItem.id];
        if (qItem.type === 'PUZZLE' && (!val || !Array.isArray(val))) {
          val = (puzzleStates[qItem.id] || qItem.options || []).map((item: any) => item.id);
        }

        return {
          questionId: qItem.id,
          answerValue: val !== undefined ? val : '',
        };
      });

      const payload = {
        quizId: quizData.id,
        userId: studentUser.id,
        classId: classId || undefined,
        timeSpentSeconds: (durationMinutes || 45) * 60 - timeLeft,
        answers: formattedAnswers,
      };

      const res = await api.post('/academic/evaluations/submit-exam', payload);
      setFeedbackResult(res.data);

      // ⚡ Grava trava permanente para não permitir 2ª tentativa
      try {
        localStorage.setItem(completedStorageKey, 'true');
      } catch (e) {}

      clearDraft();
      try {
        localStorage.removeItem(`@MyClassPluss:exam_questions_${quizData?.id}_${studentUser?.id}`);
      } catch (e) {}

      if (onFinishExam) onFinishExam(res.data);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Tente novamente.';
      if (msg.includes('já foi entregue') || msg.includes('já possui cadastro')) {
        try {
          localStorage.setItem(completedStorageKey, 'true');
        } catch (e) {}
      }
      alert('Aviso na entrega da avaliação: ' + msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // TELA DE GABARITO & DEVOLUTIVA
  if (feedbackResult) {
    const isApproved = feedbackResult.isApproved;
    return (
      <div className="min-h-screen bg-[#070b19] text-slate-100 p-4 sm:p-8 font-sans animate-fade-in">
        <div className="max-w-4xl mx-auto space-y-6">
          <div
            className={`p-6 sm:p-8 rounded-3xl border text-center space-y-4 shadow-2xl ${
              isApproved
                ? 'bg-emerald-950/40 border-emerald-500/60 shadow-emerald-900/30'
                : 'bg-red-950/40 border-red-500/60 shadow-red-900/30'
            }`}
          >
            {isApproved ? (
              <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto animate-bounce" />
            ) : (
              <XCircle className="w-16 h-16 text-red-400 mx-auto" />
            )}

            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wide">
                {isApproved ? 'Aprovado na Avaliação!' : 'Resultado Abaixo da Média'}
              </h1>
              <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-wider">
                Gabarito formativo e extrato de acertos da sua prova
              </p>
            </div>

            <div className="inline-flex items-center gap-6 bg-slate-950/80 px-6 py-3 rounded-2xl border border-slate-800">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase block tracking-wider">Nota Final</span>
                <span className="text-3xl font-black font-mono text-white">
                  {feedbackResult.finalGrade?.toFixed(1)} <span className="text-xs text-slate-500">/ 10</span>
                </span>
              </div>
              <div className="border-l border-slate-800 pl-6">
                <span className="text-[10px] font-black text-slate-400 uppercase block tracking-wider">Acertos</span>
                <span className="text-2xl font-black font-mono text-emerald-400">
                  {feedbackResult.totalCorrect} / {feedbackResult.totalQuestions}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => navigate('/student/portal', { replace: true })}
              className="w-full bg-blue-600 hover:bg-blue-500 py-3.5 rounded-2xl text-xs font-black text-white shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95 uppercase tracking-wider"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Ver Meu Boletim & Histórico</span>
            </button>

            <button
              type="button"
              onClick={() => {
                clearDraft();
                if (onReturnToLobby) {
                  onReturnToLobby();
                } else {
                  navigate(`/student/join?classId=${classId}`, { replace: true });
                }
              }}
              className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 py-3.5 rounded-2xl text-xs font-black text-slate-300 flex items-center justify-center gap-2 cursor-pointer transition-colors uppercase tracking-wider"
            >
              <Radio className="w-4 h-4 text-emerald-400" />
              <span>Retornar ao Lobby da Sala</span>
            </button>
          </div>

          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
              Extrato Detalhado de Respostas
            </h3>

            {feedbackResult.evaluatedAnswers?.map((item: any, idx: number) => {
              const isBlank = item.studentAnswer === 'Em branco' || item.studentAnswer === '""' || !item.studentAnswer;

              return (
                <div
                  key={item.questionId || idx}
                  className={`p-5 rounded-2xl border space-y-3 ${
                    item.isCorrect
                      ? 'bg-slate-900/80 border-emerald-500/40'
                      : isBlank
                      ? 'bg-slate-900/80 border-amber-500/40'
                      : 'bg-slate-900/80 border-red-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                      Questão {idx + 1} • Peso: {item.weight} pts
                    </span>

                    {item.isCorrect ? (
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full border bg-emerald-500/20 text-emerald-300 border-emerald-500/30 uppercase tracking-wide">
                        ✓ Correta (+{item.weight} pts)
                      </span>
                    ) : isBlank ? (
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full border bg-amber-500/20 text-amber-300 border-amber-500/40 uppercase tracking-wide">
                        ⚠ Em Branco (0.0 pts)
                      </span>
                    ) : (
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full border bg-red-500/20 text-red-300 border-red-500/30 uppercase tracking-wide">
                        ✗ Incorreta (0.0 pts)
                      </span>
                    )}
                  </div>

                  <h4 className="font-black text-white text-base uppercase leading-snug">{item.title}</h4>

                  {item.justification && (
                    <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300">
                      <strong className="text-emerald-400 uppercase font-black">Comentário do Instrutor: </strong>
                      <span>{item.justification}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const q = currentQuestionList[currentIdx];
  const currentVal = q ? answers[q.id] : null;
  const isCurrentAnswered = q ? isQuestionAnswered(q) : false;

  return (
    <div className="min-h-screen bg-[#070b19] text-slate-100 font-sans p-3 sm:p-6 select-none flex flex-col justify-between">
      <div className="max-w-4xl mx-auto w-full space-y-4 sm:space-y-6">
        
        {/* CABEÇALHO COM CRONÔMETRO E STATUS */}
        <header className="bg-slate-900/95 border border-slate-800 p-4 rounded-3xl shadow-2xl backdrop-blur-md flex items-center justify-between">
          <div className="truncate pr-2">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-wider truncate">
                {quizData?.title || 'Avaliação Oficial'}
              </h2>
            </div>
            <span className="text-xs text-slate-400 uppercase font-bold tracking-wide block truncate">
              Aluno: <strong className="text-white">{studentUser?.name}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-2xl border font-mono font-black ${
                timeLeft < 300
                  ? 'bg-red-500/20 text-red-400 border-red-500 animate-pulse'
                  : 'bg-slate-950 text-amber-300 border-slate-800'
              }`}
            >
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-sm sm:text-lg">{formatTime(timeLeft)}</span>
            </div>
          </div>
        </header>

        {/* ⚡ RÉGUA DE NAVEGAÇÃO LIVRE DAS QUESTÕES */}
        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-3xl shadow-xl space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 px-1">
            <span className="flex items-center gap-1.5 uppercase tracking-wider">
              <BookmarkCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Mapa de Questões ({answeredCount}/{totalQuestionsCount} respondidas)</span>
            </span>
            <span className="text-slate-500">Toque no número para saltar</span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin">
            {currentQuestionList.map((item: any, i: number) => {
              const answered = isQuestionAnswered(item);
              const isCurrent = i === currentIdx;

              let btnStyle = 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700';

              if (isCurrent) {
                btnStyle = 'bg-blue-600 text-white border-blue-400 ring-2 ring-blue-500/50 shadow-lg shadow-blue-600/40 scale-105';
              } else if (answered) {
                btnStyle = 'bg-emerald-950/60 text-emerald-300 border-emerald-500/50 font-black';
              } else {
                btnStyle = 'bg-slate-950/90 text-amber-400/80 border-amber-500/30 font-medium';
              }

              return (
                <button
                  key={item.id || i}
                  type="button"
                  onClick={() => setCurrentIdx(i)}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl border text-xs sm:text-sm font-mono flex items-center justify-center shrink-0 transition-all cursor-pointer ${btnStyle}`}
                  title={`Saltar para Questão ${i + 1} ${answered ? '(Respondida)' : '(Em branco)'}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* CARD DA QUESTÃO ATIVA */}
        {q ? (
          <div className="bg-slate-900/90 border border-slate-800 p-5 sm:p-7 rounded-3xl space-y-5 shadow-2xl animate-fade-in relative">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black text-emerald-400 uppercase tracking-widest">
                  Questão {currentIdx + 1} de {totalQuestionsCount}
                </span>
                {isCurrentAnswered ? (
                  <span className="text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    Respondida
                  </span>
                ) : (
                  <span className="text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                    Pendente
                  </span>
                )}
              </div>

              <span className="text-xs font-black text-slate-400 bg-slate-950 px-2.5 py-0.5 rounded-full border border-slate-800 uppercase tracking-wide">
                Peso: {q.weight || 1.0} pts
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-black text-white leading-relaxed uppercase tracking-wide">
              {q.title}
            </h3>

            {q.imageUrl && (
              <div className="max-h-64 flex items-center justify-center p-2 bg-slate-950/60 rounded-2xl border border-slate-800">
                <img
                  src={formatImageUrl(q.imageUrl)}
                  alt="Esquema da Questão"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                  className="max-h-60 max-w-full object-contain rounded-xl shadow-lg"
                />
              </div>
            )}

            {/* MÚLTIPLA ESCOLHA & VERDADEIRO / FALSO */}
            {(q.type === 'MULTIPLE_CHOICE' || q.type === 'TRUE_FALSE') && (
              <div className="grid grid-cols-1 gap-2.5">
                {q.options?.map((opt: any, optIdx: number) => {
                  const isSelected =
                    currentVal === opt.id ||
                    currentVal === optIdx ||
                    (typeof currentVal === 'string' && currentVal.toLowerCase() === opt.text?.toLowerCase());

                  return (
                    <div
                      key={opt.id || optIdx}
                      onClick={() => handleSelectAnswer(q.id, opt.id || opt.text)}
                      className={`p-3.5 sm:p-4 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-emerald-600/30 border-emerald-500 text-white ring-1 ring-emerald-500 shadow-md shadow-emerald-950/40'
                          : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center border shrink-0 ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-400'
                            : 'bg-slate-900 border-slate-700 text-slate-400'
                        }`}
                      >
                        {q.type === 'TRUE_FALSE'
                          ? opt.text?.toLowerCase() === 'verdadeiro' ? '✓' : '✗'
                          : String.fromCharCode(65 + optIdx)}
                      </span>
                      <span className="text-xs sm:text-sm font-bold uppercase tracking-wide flex-1">
                        {opt.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* PUZZLE / ORDENAÇÃO */}
            {q.type === 'PUZZLE' && (
              <div className="space-y-3 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
                <span className="text-xs font-black text-purple-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                  <Layers className="w-4 h-4" />
                  <span>Use as setas para organizar na ordem correta (1º ao 4º):</span>
                </span>

                <div className="space-y-2">
                  {(puzzleStates[q.id] || q.options || []).map((pItem: any, pIdx: number) => (
                    <div
                      key={pItem.id || pIdx}
                      className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between shadow-sm"
                    >
                      <div className="flex items-center gap-3 pr-2">
                        <span className="w-7 h-7 rounded-lg bg-purple-600/30 text-purple-300 border border-purple-500/40 flex items-center justify-center font-black text-xs shrink-0">
                          {pIdx + 1}º
                        </span>
                        <span className="text-xs sm:text-sm font-black text-white uppercase tracking-wide">
                          {pItem.text}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={pIdx === 0}
                          onClick={() => handleMovePuzzleItem(q.id, pIdx, 'up')}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-20 rounded-lg text-slate-200 cursor-pointer transition-colors"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={pIdx === (puzzleStates[q.id]?.length || q.options?.length || 4) - 1}
                          onClick={() => handleMovePuzzleItem(q.id, pIdx, 'down')}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-20 rounded-lg text-slate-200 cursor-pointer transition-colors"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* RESPOSTA RÁPIDA / TEXTO */}
            {q.type === 'FAST_ANSWER' && (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Digite sua resposta aqui..."
                  value={currentVal || ''}
                  onChange={(e) => handleSelectAnswer(q.id, e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 p-4 rounded-2xl text-white text-sm font-black focus:outline-none uppercase tracking-wide shadow-inner"
                />
                <span className="text-[11px] text-slate-500 italic block">
                  Você pode deixar em branco e responder depois clicando em Pular Questão.
                </span>
              </div>
            )}

            {/* SLIDER / ESTIMATIVA */}
            {q.type === 'SLIDER' && (() => {
              const conf = typeof q.sliderConfig === 'string' ? JSON.parse(q.sliderConfig || '{}') : q.sliderConfig || {};
              const min = conf.min ?? 0;
              const max = conf.max ?? 100;
              const val = currentVal !== undefined ? currentVal : min;

              return (
                <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <div className="flex justify-between text-xs font-mono font-black text-slate-400 uppercase">
                    <span>Min: {min}</span>
                    <span className="text-base font-black text-amber-300 font-mono">{val} {conf.unit || ''}</span>
                    <span>Max: {max}</span>
                  </div>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={conf.step || 1}
                    value={val}
                    onChange={(e) => handleSelectAnswer(q.id, Number(e.target.value))}
                    className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
            <h3 className="text-base font-bold text-white">Carregando questões da avaliação...</h3>
            <p className="text-xs text-slate-400">Aguarde um momento enquanto os itens são organizados.</p>
          </div>
        )}

        {/* ⚡ CONTROLES DE NAVEGAÇÃO REORGANIZADOS E TOTALMENTE FUNCIONAIS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          {/* Botão Anterior */}
          <button
            type="button"
            disabled={currentIdx === 0}
            onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
            className="bg-slate-900 hover:bg-slate-800 disabled:opacity-30 border border-slate-800 text-slate-200 font-bold py-3.5 rounded-2xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Anterior</span>
          </button>

          {/* Botão Pular Questão */}
          <button
            type="button"
            onClick={() => {
              if (totalQuestionsCount > 1) {
                setCurrentIdx((prev) => (prev + 1) % totalQuestionsCount);
              }
            }}
            className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-400 font-bold py-3.5 rounded-2xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors active:scale-95"
            title="Avança para a próxima deixando esta questão para responder mais tarde"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span>Pular Questão</span>
          </button>

          {/* Botão Próxima */}
          <button
            type="button"
            disabled={isLastQuestion}
            onClick={() => setCurrentIdx((prev) => Math.min(totalQuestionsCount - 1, prev + 1))}
            className="bg-slate-900 hover:bg-slate-800 disabled:opacity-30 border border-slate-800 text-slate-200 font-bold py-3.5 rounded-2xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors active:scale-95"
          >
            <span>Próxima</span>
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Botão Entregar Prova */}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handlePreSubmit}
            className={`font-black py-3.5 rounded-2xl text-white shadow-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 text-xs disabled:opacity-50 uppercase tracking-wider ${
              isLastQuestion || answeredCount === totalQuestionsCount
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/40 ring-2 ring-emerald-400/50'
                : 'bg-emerald-800/80 hover:bg-emerald-700 shadow-emerald-900/30'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Entregar Prova</span>
          </button>
        </div>

      </div>

      {/* MODAL DE CONFIRMAÇÃO DE QUESTÕES EM BRANCO */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in font-sans">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-5 shadow-2xl">
            <div className="p-4 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-2xl inline-block mx-auto">
              <AlertTriangle className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-white uppercase tracking-wide">Atenção: Questões em Branco</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Você deixou <strong className="text-amber-400 font-black">{blankQuestionIndexes.length} questão(ões)</strong> sem responder:
              </p>
              
              <div className="flex flex-wrap items-center justify-center gap-1.5 py-1">
                {blankQuestionIndexes.map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      setCurrentIdx(num - 1);
                      setShowConfirmModal(false);
                    }}
                    className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold hover:bg-amber-500 hover:text-slate-950 transition-colors cursor-pointer"
                    title={`Ir direto para a questão ${num}`}
                  >
                    {num}
                  </button>
                ))}
              </div>

              <p className="text-[11px] text-slate-500">
                Questões não respondidas serão computadas como <strong>0,0 ponto</strong>. Toque em qualquer número acima para ir direto a ela ou clique em revisar.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-black py-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer border border-slate-700 uppercase tracking-wider"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Revisar Prova</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={executeSubmission}
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-black py-3 rounded-xl text-xs transition-all shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 uppercase tracking-wider"
              >
                <Send className="w-4 h-4" />
                <span>Entregar Assim Mesmo</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ⚡ MODAL ELEGANTE: AVALIAÇÃO JÁ ENTREGUE */}
      {showAlreadyDoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in font-sans">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-9 h-9 animate-bounce" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-white uppercase tracking-wide">
                Avaliação Concluída!
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Suas respostas já foram enviadas e computadas com sucesso no sistema.
              </p>
              <span className="text-[11px] text-slate-500 block pt-1">
                Não é permitida uma segunda tentativa para este exame.
              </span>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (onReturnToLobby) onReturnToLobby();
                  else navigate(`/student/join?classId=${classId}`, { replace: true });
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <Radio className="w-4 h-4" />
                <span>Voltar ao Lobby da Sala</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/student/portal', { replace: true })}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2 border border-slate-700"
              >
                <GraduationCap className="w-4 h-4 text-blue-400" />
                <span>Ver Meu Boletim</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormalExamView;