import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
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
} from 'lucide-react';

interface FormalExamViewProps {
  quizData: any;
  studentUser: any;
  classId: string;
  durationMinutes?: number;
  onFinishExam: (result: any) => void;
  onReturnToLobby?: () => void; // 👈 Callback para retorno limpo ao Lobby sem reload
}

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

  const [answers, setAnswers] = useState<{ [questionId: string]: any }>({});
  const [timeLeft, setTimeLeft] = useState((durationMinutes || 45) * 60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackResult, setFeedbackResult] = useState<any | null>(null);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [unansweredCount, setUnansweredCount] = useState(0);

  const [puzzleStates, setPuzzleStates] = useState<{ [questionId: string]: any[] }>({});

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

  useEffect(() => {
    const cacheKey = `@OffClass:exam_cache_${quizData?.id}`;
    const saved = sessionStorage.getItem(cacheKey);
    let initialAnswers: { [qId: string]: any } = {};

    if (saved) {
      try {
        initialAnswers = JSON.parse(saved);
        setAnswers(initialAnswers);
      } catch (e) {}
    }

    const initialPuzzles: { [qId: string]: any[] } = {};

    quizData.questions?.forEach((q: any) => {
      if (q.type === 'PUZZLE' && q.options && q.options.length > 0) {
        const mapped = q.options.map((opt: any, idx: number) => ({
          ...opt,
          id: opt.id || `opt_${q.id}_${idx}`,
          correctOrder: opt.correctOrder !== undefined && opt.correctOrder !== null ? Number(opt.correctOrder) : idx,
        }));

        if (initialAnswers[q.id] && Array.isArray(initialAnswers[q.id])) {
          const cachedIds = initialAnswers[q.id];
          const restored = cachedIds.map((val: any) =>
            mapped.find((m: any) => m.id === val || m.correctOrder === val || m.text === val)
          ).filter(Boolean);
          initialPuzzles[q.id] = restored.length === mapped.length ? restored : shuffleArray(mapped);
        } else {
          const shuffled = shuffleArray(mapped);
          initialPuzzles[q.id] = shuffled;
          initialAnswers[q.id] = shuffled.map((item) => item.id);
        }
      }
    });

    setPuzzleStates(initialPuzzles);
    setAnswers(initialAnswers);
  }, [quizData]);

  const handleSelectAnswer = (questionId: string, value: any) => {
    const updated = { ...answers, [questionId]: value };
    setAnswers(updated);
    sessionStorage.setItem(`@OffClass:exam_cache_${quizData?.id}`, JSON.stringify(updated));
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

  const handlePreSubmit = () => {
    const questions = quizData.questions || [];
    let blankCount = 0;

    questions.forEach((q: any) => {
      const val = answers[q.id];
      if (
        val === undefined ||
        val === null ||
        val === '' ||
        (q.type === 'FAST_ANSWER' && String(val).trim() === '')
      ) {
        blankCount++;
      }
    });

    if (blankCount > 0) {
      setUnansweredCount(blankCount);
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
      const formattedAnswers = (quizData.questions || []).map((q: any) => {
        let val = answers[q.id];
        if (q.type === 'PUZZLE' && (!val || !Array.isArray(val))) {
          val = (puzzleStates[q.id] || q.options || []).map((item: any) => item.id);
        }

        return {
          questionId: q.id,
          answerValue: val !== undefined ? val : '',
        };
      });

      const payload = {
        quizId: quizData.id,
        userId: studentUser.id,
        classId,
        timeSpentSeconds: (durationMinutes || 45) * 60 - timeLeft,
        answers: formattedAnswers,
      };

      const res = await api.post('/academic/evaluations/submit-exam', payload);
      setFeedbackResult(res.data);
      sessionStorage.removeItem(`@OffClass:exam_cache_${quizData?.id}`);
      if (onFinishExam) onFinishExam(res.data);
    } catch (err: any) {
      alert('Erro ao enviar avaliação: ' + (err.response?.data?.message || 'Tente novamente.'));
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
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                {isApproved ? 'Aprovado na Avaliação!' : 'Resultado Abaixo da Média'}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Gabarito formativo e extrato de acertos da sua prova
              </p>
            </div>

            <div className="inline-flex items-center gap-6 bg-slate-950/80 px-6 py-3 rounded-2xl border border-slate-800">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Nota Final</span>
                <span className="text-3xl font-black font-mono text-white">
                  {feedbackResult.finalGrade?.toFixed(1)} <span className="text-xs text-slate-500">/ 10</span>
                </span>
              </div>
              <div className="border-l border-slate-800 pl-6">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Acertos</span>
                <span className="text-2xl font-black font-mono text-emerald-400">
                  {feedbackResult.totalCorrect} / {feedbackResult.totalQuestions}
                </span>
              </div>
            </div>
          </div>

          {/* BOTÕES DE NAVEGAÇÃO SEGURA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => navigate('/student/portal', { replace: true })}
              className="w-full bg-blue-600 hover:bg-blue-500 py-3.5 rounded-2xl text-xs font-bold text-white shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Ver Meu Boletim & Histórico</span>
            </button>

            {/* ⚡ Retorno limpo ao Lobby via estado React sem quebrar o socket */}
            <button
              type="button"
              onClick={() => {
                sessionStorage.removeItem(`@OffClass:exam_cache_${quizData?.id}`);
                if (onReturnToLobby) {
                  onReturnToLobby();
                } else {
                  navigate(`/join?classId=${classId}`, { replace: true });
                }
              }}
              className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 py-3.5 rounded-2xl text-xs font-bold text-slate-300 flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Radio className="w-4 h-4 text-emerald-400" />
              <span>Retornar ao Lobby da Sala</span>
            </button>
          </div>

          {/* EXTRATO DETALHADO */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
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
                    <span className="text-xs font-black text-slate-400">
                      Questão {idx + 1} • Peso: {item.weight} pts
                    </span>

                    {item.isCorrect ? (
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full border bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                        ✓ Correta (+{item.weight} pts)
                      </span>
                    ) : isBlank ? (
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full border bg-amber-500/20 text-amber-300 border-amber-500/40">
                        ⚠ Em Branco (0.0 pts)
                      </span>
                    ) : (
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full border bg-red-500/20 text-red-300 border-red-500/30">
                        ✗ Incorreta (0.0 pts)
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-white text-base">{item.title}</h4>

                  {item.justification && (
                    <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300">
                      <strong className="text-emerald-400">Comentário do Instrutor: </strong>
                      {item.justification}
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

  // TELA DE PROVA (FORMULÁRIO CONTÍNUO)
  return (
    <div className="min-h-screen bg-[#070b19] text-slate-100 font-sans p-4 sm:p-6 select-none">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="sticky top-4 z-40 bg-slate-900/95 border border-slate-800 p-4 rounded-2xl shadow-2xl backdrop-blur-md flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-black text-white">{quizData.title}</h2>
            </div>
            <span className="text-xs text-slate-400">Aluno: <strong>{studentUser.name}</strong></span>
          </div>

          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-mono font-black ${
              timeLeft < 300
                ? 'bg-red-500/20 text-red-400 border-red-500 animate-pulse'
                : 'bg-slate-950 text-amber-300 border-slate-800'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-lg">{formatTime(timeLeft)}</span>
          </div>
        </header>

        <div className="space-y-6">
          {quizData.questions?.map((q: any, idx: number) => {
            const currentVal = answers[q.id];

            return (
              <div key={q.id || idx} className="bg-slate-900/80 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <span className="text-xs font-black text-emerald-400 uppercase tracking-wide">
                    Questão {idx + 1} de {quizData.questions.length}
                  </span>
                  <span className="text-xs font-bold text-slate-400 bg-slate-950 px-2.5 py-0.5 rounded-full border border-slate-800">
                    Peso: {q.weight || 1.0} pts
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white leading-relaxed">{q.title}</h3>

                {q.imageUrl && (
                  <div className="max-h-60 flex items-center justify-center p-2 bg-slate-950/60 rounded-2xl border border-slate-800">
                    <img src={q.imageUrl} alt="" className="max-h-56 object-contain rounded-xl" />
                  </div>
                )}

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
                          className={`p-3.5 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-emerald-600/30 border-emerald-500 text-white ring-1 ring-emerald-500'
                              : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <span
                            className={`w-6 h-6 rounded-lg font-bold text-xs flex items-center justify-center border ${
                              isSelected ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-slate-900 border-slate-700 text-slate-400'
                            }`}
                          >
                            {q.type === 'TRUE_FALSE'
                              ? opt.text?.toLowerCase() === 'verdadeiro' ? '✓' : '✗'
                              : String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="text-sm font-bold">{opt.text}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {q.type === 'PUZZLE' && (
                  <div className="space-y-3 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
                    <span className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
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
                            <span className="text-xs sm:text-sm font-medium text-white">{pItem.text}</span>
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

                {q.type === 'FAST_ANSWER' && (
                  <input
                    type="text"
                    placeholder="Digite sua resposta..."
                    value={currentVal || ''}
                    onChange={(e) => handleSelectAnswer(q.id, e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 p-3.5 rounded-xl text-white text-sm focus:outline-none"
                  />
                )}

                {q.type === 'SLIDER' && (() => {
                  const conf = typeof q.sliderConfig === 'string' ? JSON.parse(q.sliderConfig || '{}') : q.sliderConfig || {};
                  const min = conf.min ?? 0;
                  const max = conf.max ?? 100;
                  const val = currentVal !== undefined ? currentVal : min;

                  return (
                    <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                      <div className="flex justify-between text-xs font-mono text-slate-400">
                        <span>Min: {min}</span>
                        <span className="text-base font-bold text-amber-300">{val} {conf.unit || ''}</span>
                        <span>Max: {max}</span>
                      </div>
                      <input
                        type="range"
                        min={min}
                        max={max}
                        value={val}
                        onChange={(e) => handleSelectAnswer(q.id, Number(e.target.value))}
                        className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>

        <div className="pt-4 pb-12">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handlePreSubmit}
            className="w-full bg-emerald-600 hover:bg-emerald-500 font-black py-4 rounded-2xl text-white shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95 text-base disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
            <span>{isSubmitting ? 'Corrigindo Prova...' : 'Finalizar e Enviar Avaliação'}</span>
          </button>
        </div>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in font-sans">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-5 shadow-2xl">
            <div className="p-4 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-2xl inline-block mx-auto">
              <AlertTriangle className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-white">Atenção: Questões em Branco</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Você deixou <strong className="text-amber-400 font-bold">{unansweredCount} questão(ões)</strong> sem responder. Questões em branco serão computadas como <strong>0,0 ponto</strong>.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer border border-slate-700"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Revisar Prova</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={executeSubmission}
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-black py-3 rounded-xl text-xs transition-all shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>Enviar Assim Mesmo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormalExamView;