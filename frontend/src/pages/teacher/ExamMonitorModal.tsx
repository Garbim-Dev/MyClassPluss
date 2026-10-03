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
  Sparkles,
  TrendingUp,
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

  // ⚡ Sincronização e escuta unificada de entregas em tempo real
  useEffect(() => {
    if (!isOpen) return;

    setTimeLeft((durationMinutes || 45) * 60);
    const socket = getSocket();

    const handleSubmissionEvent = (data: any) => {
      if (!data) return;

      // Normaliza o score oficial da prova (0 a 10)
      const rawGrade = data.totalScore !== undefined ? data.totalScore : data.finalGrade;
      const normalizedScore = Number(Number(rawGrade ?? 0).toFixed(1));

      const normalizedPayload = {
        ...data,
        userId: String(data.userId || data.id || ''),
        userName: data.userName || data.fullName || 'Aluno',
        nickname: data.nickname || data.userName || 'Aluno',
        document: data.document || '',
        finalGrade: normalizedScore,
        totalScore: normalizedScore,
        isApproved: Boolean(data.isApproved !== undefined ? data.isApproved : normalizedScore >= 7.0),
        totalCorrect: Number(data.totalCorrect ?? 0),
        totalQuestions: Number(data.totalQuestions ?? totalQuestions ?? 1),
      };

      setSubmissions((prev) => {
        // Evita duplicação comparando por ID, documento (CPF) ou sessão
        const alreadyExistsIndex = prev.findIndex(
          (s) =>
            (s.userId && s.userId === normalizedPayload.userId) ||
            (s.document && normalizedPayload.document && s.document === normalizedPayload.document) ||
            (s.studentSessionId && s.studentSessionId === normalizedPayload.studentSessionId)
        );

        if (alreadyExistsIndex !== -1) {
          const updated = [...prev];
          updated[alreadyExistsIndex] = normalizedPayload;
          return updated;
        }

        return [normalizedPayload, ...prev];
      });
    };

    // Escuta todos os eventos emitidos pelo backend
    socket.on('exam_submitted_live', handleSubmissionEvent);
    socket.on('exam_submission_received', handleSubmissionEvent);

    return () => {
      socket.off('exam_submitted_live', handleSubmissionEvent);
      socket.off('exam_submission_received', handleSubmissionEvent);
    };
  }, [isOpen, durationMinutes, classId, totalQuestions]);

  // Cronômetro regressivo
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

  // ⚡ Cálculos dinâmicos em tempo real
  const averageGrade =
    deliveredCount > 0
      ? (submissions.reduce((acc, s) => acc + (Number(s.finalGrade ?? s.totalScore) || 0), 0) / deliveredCount).toFixed(1)
      : '0.0';

  const approvedCount = submissions.filter((s) => Boolean(s.isApproved)).length;
  const approvalRate =
    deliveredCount > 0 ? Math.round((approvedCount / deliveredCount) * 100) : 0;

  // ⚡ Helper resiliente para identificar se o aluno conectado entregou a prova
  const getStudentSubmission = (st: any) => {
    return submissions.find(
      (sub) =>
        (sub.userId && (sub.userId === String(st.userId) || sub.userId === String(st.id))) ||
        (sub.document && st.document && sub.document === st.document) ||
        (sub.studentSessionId && st.studentSessionId && sub.studentSessionId === st.studentSessionId) ||
        (sub.userName && st.userName && sub.userName.trim().toLowerCase() === st.userName.trim().toLowerCase())
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in font-sans">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* CABEÇALHO DO MONITOR */}
        <div className="p-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 truncate">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30 shrink-0">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full">
                  ● Monitoramento ao Vivo
                </span>
                <span className="text-xs text-slate-400 font-bold">• {totalQuestions} questões</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-0.5 truncate uppercase tracking-wide">
                {examTitle}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-2xl font-mono font-black text-amber-300 shadow-inner">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-base sm:text-lg">{formatTime(timeLeft)}</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              title="Fechar Monitor"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MÉTRICAS DE ENTREGA EM TEMPO REAL */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 bg-slate-950/60 border-b border-slate-800">
          <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl flex items-center gap-3 shadow-md">
            <Users className="w-6 h-6 text-blue-400 shrink-0" />
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Conectados</span>
              <p className="text-xl font-black text-white">{totalConnected}</p>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl flex items-center gap-3 shadow-md">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Entregues</span>
              <p className="text-xl font-black text-emerald-400">
                {deliveredCount} <span className="text-xs text-slate-500">/ {totalConnected}</span>
              </p>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl flex items-center gap-3 shadow-md">
            <Award className="w-6 h-6 text-amber-400 shrink-0" />
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Média da Turma</span>
              <p className="text-xl font-black text-amber-300">
                {deliveredCount > 0 ? averageGrade : '--'} <span className="text-xs text-slate-500">/ 10</span>
              </p>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl flex items-center gap-3 shadow-md">
            <TrendingUp className="w-6 h-6 text-teal-400 shrink-0" />
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Aprovação (≥ 7,0)</span>
              <p className="text-xl font-black text-teal-300">
                {deliveredCount > 0 ? `${approvalRate}%` : '--'}
              </p>
            </div>
          </div>
        </div>

        {/* LISTAGEM DE ALUNOS E STATUS DE ENTREGA */}
        <div className="p-6 flex-1 overflow-y-auto space-y-2.5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Status Individual dos Alunos</span>
            </h3>
            <span className="text-[11px] text-slate-500 font-bold">
              Atualização automática via WebSocket
            </span>
          </div>

          {onlineStudents.length === 0 ? (
            <div className="p-8 text-center space-y-2 bg-slate-950/40 rounded-2xl border border-slate-800/80">
              <Users className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400 font-bold">Aguardando entrada dos alunos na sala...</p>
              <p className="text-[11px] text-slate-500">
                Os alunos que escanearem o QR Code ou digitarem o PIN aparecerão aqui em tempo real.
              </p>
            </div>
          ) : (
            onlineStudents.map((st, idx) => {
              const submission = getStudentSubmission(st);
              const hasDelivered = Boolean(submission);
              const isApproved = submission ? Boolean(submission.isApproved) : false;
              const displayGrade = submission ? Number(submission.finalGrade ?? submission.totalScore ?? 0).toFixed(1) : '0.0';

              return (
                <div
                  key={st.userId || st.id || idx}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                    hasDelivered
                      ? isApproved
                        ? 'bg-emerald-950/30 border-emerald-500/50 shadow-sm shadow-emerald-950/30'
                        : 'bg-amber-950/20 border-amber-500/40'
                      : 'bg-slate-950/70 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        hasDelivered ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white uppercase tracking-wide">
                          {st.userName || st.name || 'Aluno'}
                        </span>
                        {st.nickname && st.nickname !== st.userName && (
                          <span className="text-xs text-slate-400 font-medium">({st.nickname})</span>
                        )}
                        {st.teamName && (
                          <span
                            className="text-[9px] font-black px-2 py-0.5 rounded text-white uppercase"
                            style={{ backgroundColor: st.teamColor || '#6366f1' }}
                          >
                            {st.teamName}
                          </span>
                        )}
                      </div>
                      {st.document && (
                        <span className="text-[10px] text-slate-500 font-mono block">
                          Doc: {st.document}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {hasDelivered ? (
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-black px-3 py-1 rounded-xl border flex items-center gap-1.5 uppercase font-mono ${
                            isApproved
                              ? 'text-emerald-300 bg-emerald-500/20 border-emerald-500/40'
                              : 'text-amber-300 bg-amber-500/20 border-amber-500/40'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Nota: {displayGrade}</span>
                        </span>
                        <span className="text-[10px] text-slate-400 hidden sm:inline-block font-bold">
                          ({submission.totalCorrect}/{submission.totalQuestions} acertos)
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-xl flex items-center gap-1.5 animate-pulse font-bold">
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
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 rounded-xl transition-colors cursor-pointer border border-slate-700"
          >
            Fechar Monitor (Manter Prova Aberta)
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenFinalReport();
            }}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer transition-transform active:scale-95 uppercase tracking-wider"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Encerrar e Abrir Relatório Pedagógico</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default ExamMonitorModal;