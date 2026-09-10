import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  Clock,
  Users,
  CheckCircle2,
  X,
  AlertTriangle,
  Award,
  FileSpreadsheet,
  RotateCcw,
} from 'lucide-react';
import { getSocket } from '../../services/socket';

interface ExamMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  examTitle: string;
  durationMinutes: number;
  totalQuestions: number;
  classId: string;
  onlineStudents: any[];
  onOpenFinalReport: () => void;
}

export const ExamMonitorModal: React.FC<ExamMonitorModalProps> = ({
  isOpen,
  onClose,
  examTitle,
  durationMinutes,
  totalQuestions,
  classId,
  onlineStudents,
  onOpenFinalReport,
}) => {
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60);
  const [submissions, setSubmissions] = useState<any[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setTimeLeft(durationMinutes * 60);
    setSubmissions([]);

    const socket = getSocket();

    const handleExamAnswerReceived = (data: any) => {
      if (data.classId === classId) {
        setSubmissions((prev) => {
          const exists = prev.find((s) => s.userId === data.userId);
          if (exists) return prev;
          return [...prev, data];
        });
      }
    };

    socket.on('exam_submission_received', handleExamAnswerReceived);

    return () => {
      socket.off('exam_submission_received', handleExamAnswerReceived);
    };
  }, [isOpen, durationMinutes, classId]);

  useEffect(() => {
    if (!isOpen || timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [isOpen, timeLeft]);

  if (!isOpen) return null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const totalConnected = onlineStudents.length;
  const deliveredCount = submissions.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        
        {/* CABEÇALHO DO MONITOR */}
        <div className="p-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full">
                  Avaliação Formal em Andamento
                </span>
                <span className="text-xs text-slate-400">• {totalQuestions} questões</span>
              </div>
              <h2 className="text-xl font-black text-white mt-0.5">{examTitle}</h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-2xl font-mono font-bold text-amber-300">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-lg">{formatTime(timeLeft)}</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MÉTRICAS DE ENTREGA EM TEMPO REAL */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-6 bg-slate-950/40 border-b border-slate-800">
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
            <Users className="w-6 h-6 text-blue-400" />
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Alunos Conectados</span>
              <p className="text-xl font-black text-white">{totalConnected}</p>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Provas Entregues</span>
              <p className="text-xl font-black text-emerald-400">{deliveredCount} de {totalConnected}</p>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
            <Award className="w-6 h-6 text-amber-400" />
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Média Provisória</span>
              <p className="text-xl font-black text-amber-300">
                {deliveredCount > 0
                  ? (submissions.reduce((acc, s) => acc + (s.finalGrade || 0), 0) / deliveredCount).toFixed(1)
                  : 'Aguardando...'}
              </p>
            </div>
          </div>
        </div>

        {/* LISTAGEM DE ALUNOS E STATUS DE ENTREGA */}
        <div className="p-6 flex-1 overflow-y-auto space-y-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Status Individual dos Alunos
          </h3>

          {onlineStudents.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8 italic">
              Nenhum aluno conectado na sala no momento.
            </p>
          ) : (
            onlineStudents.map((st, idx) => {
              const submission = submissions.find((sub) => sub.userId === st.userId);
              const hasDelivered = Boolean(submission);

              return (
                <div
                  key={idx}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between transition-colors ${
                    hasDelivered
                      ? 'bg-emerald-950/20 border-emerald-500/40'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <div>
                      <span className="text-sm font-bold text-white">{st.userName}</span>
                      {st.teamName && (
                        <span
                          className="ml-2 text-[9px] font-black px-1.5 py-0.5 rounded text-white"
                          style={{ backgroundColor: st.teamColor || '#6366f1' }}
                        >
                          {st.teamName}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {hasDelivered ? (
                      <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Entregue (Nota: {submission.finalGrade?.toFixed(1)})</span>
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Respondendo prova...</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* RODAPÉ COM AÇÕES */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 rounded-xl transition-colors cursor-pointer"
          >
            Fechar Monitor (Manter Prova Aberta)
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenFinalReport();
            }}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer transition-transform active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Encerrar e Abrir Relatório Pedagógico</span>
          </button>
        </div>

      </div>
    </div>
  );
};