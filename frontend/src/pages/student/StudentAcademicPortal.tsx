import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  BookOpen,
  FileCheck2,
  Gamepad2,
  Wrench,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ChevronDown,
  Printer,
  ArrowLeft,
  X,
  Search,
  Award,
  Sparkles,
  Layers,
  HelpCircle,
  Clock,
} from 'lucide-react';

interface AnswerDetail {
  questionTitle: string;
  studentAnswer: string;
  isCorrect: boolean;
  pointsAwarded: number;
  justification?: string;
}

interface ActivityItem {
  submissionId: string;
  quizId: string;
  title: string;
  type: string;
  score: number;
  totalCorrect: number;
  totalQuestions: number;
  isApproved: boolean;
  timeSpentSeconds?: number;
  submittedAt: string;
  answers?: AnswerDetail[];
}

interface SubjectReport {
  subjectId: string;
  subjectName: string;
  courseName: string;
  totalActivities: number;
  totalExams: number;
  totalQuizzes: number;
  totalPractices: number;
  finalGrade: number;
  isApproved: boolean;
  exams: ActivityItem[];
  quizzes: ActivityItem[];
  practices: ActivityItem[];
}

export const StudentAcademicPortal: React.FC = () => {
  const navigate = useNavigate();

  // 1. Identificação do estudante
  const storedUser = (() => {
    try {
      const u = localStorage.getItem('@MyClassPluss:user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  })();

  const defaultIdentifier = storedUser?.document || storedUser?.id || '';
  const [identifierInput, setIdentifierInput] = useState(defaultIdentifier);
  const [activeIdentifier, setActiveIdentifier] = useState(defaultIdentifier);

  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<{
    student?: any;
    subjects: SubjectReport[];
    totalSubmissions: number;
  } | null>(null);

  // Estados de navegação visual
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);

  const fetchStudentHistory = async (idToSearch: string) => {
    if (!idToSearch || idToSearch.trim() === '') return;
    try {
      setLoading(true);
      const clean = idToSearch.trim();
      const res = await api.get(`/academic/student-report/${encodeURIComponent(clean)}`);
      setReportData(res.data);
      if (res.data?.subjects?.length > 0) {
        setExpandedSubject(res.data.subjects[0].subjectId);
      }
    } catch (err) {
      console.error('[StudentPortal] Erro ao buscar histórico:', err);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeIdentifier) {
      fetchStudentHistory(activeIdentifier);
    }
  }, [activeIdentifier]);

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (identifierInput.trim()) {
      setActiveIdentifier(identifierInput.trim());
    }
  };

  // Métricas globais do aluno
  const allSubjects = reportData?.subjects || [];
  const overallActivitiesCount = allSubjects.reduce((acc, s) => acc + s.totalActivities, 0);
  const overallGrade =
    allSubjects.length > 0
      ? (allSubjects.reduce((acc, s) => acc + s.finalGrade, 0) / allSubjects.length).toFixed(1)
      : '0.0';

  const formatTimeSpent = (secs?: number) => {
    if (!secs) return '—';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="min-h-screen bg-[#070b19] text-slate-100 font-sans p-3 sm:p-6 lg:p-8 selection:bg-blue-600">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* CABEÇALHO DO PORTAL */}
        <header className="bg-slate-900/90 border border-slate-800 p-5 sm:p-7 rounded-3xl shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 backdrop-blur-md">
          <div className="flex items-center gap-3.5">
            <div className="p-3.5 bg-blue-600/20 text-blue-400 rounded-2xl border border-blue-500/30 shrink-0">
              <GraduationCap className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full tracking-wider">
                  Portal Formativo
                </span>
                <span className="text-[11px] text-slate-500 font-mono">MyClassPluss</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
                Histórico Escolar & Boletim
              </h1>
              <p className="text-xs text-slate-400">
                Consulta individualizada de avaliações, testes gamificados e práticas de oficina
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
              title="Imprimir ou Salvar em PDF"
            >
              <Printer className="w-4 h-4 text-blue-400" />
              <span className="hidden sm:inline">Imprimir / Salvar PDF</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/student/join')}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer shadow-lg shadow-blue-600/30"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Entrar em Sala</span>
            </button>
          </div>
        </header>

        {/* BARRA DE CONSULTA POR CPF / MATRÍCULA */}
        <section className="bg-slate-900/60 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-md">
          <form onSubmit={handleManualSearch} className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Informe seu CPF ou Matrícula para consultar seu histórico..."
                value={identifierInput}
                onChange={(e) => setIdentifierInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors font-mono"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-black rounded-xl border border-slate-700 cursor-pointer transition-colors uppercase tracking-wider"
            >
              Buscar Histórico
            </button>
          </form>

          {reportData?.student && (
            <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
              <div>
                Aluno Identificado:{' '}
                <strong className="text-white uppercase font-black">
                  {reportData.student.name}
                </strong>
              </div>
              <div className="font-mono text-slate-400">
                Doc/CPF: <span className="text-blue-400 font-bold">{reportData.student.document || 'Não informado'}</span>
              </div>
            </div>
          )}
        </section>

        {/* CARDS TOTALIZADORES GERAIS */}
        {reportData && allSubjects.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                Disciplinas
              </span>
              <p className="text-2xl font-black text-white">{allSubjects.length}</p>
              <span className="text-[10px] text-slate-500 block">Cursadas / Em andamento</span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                Atividades
              </span>
              <p className="text-2xl font-black text-blue-400">{overallActivitiesCount}</p>
              <span className="text-[10px] text-slate-500 block">Entregas computadas</span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                Média Geral
              </span>
              <p className="text-2xl font-black text-amber-300 font-mono">
                {overallGrade} <span className="text-xs text-slate-500 font-normal">/ 10</span>
              </p>
              <span className="text-[10px] text-slate-500 block">Aproveitamento acumulado</span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Status Geral
              </span>
              <p className={`text-base sm:text-lg font-black uppercase tracking-wide mt-1 ${
                Number(overallGrade) >= 7.0 ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {Number(overallGrade) >= 7.0 ? 'Aprovado' : 'Em Recuperação'}
              </p>
              <span className="text-[10px] text-slate-500 block">Critério: Média ≥ 7,0</span>
            </div>
          </div>
        )}

        {/* FEEDBACK DE CARREGAMENTO OU VAZIO */}
        {loading ? (
          <div className="p-16 text-center space-y-3 bg-slate-900/40 rounded-3xl border border-slate-800">
            <GraduationCap className="w-10 h-10 text-blue-400 animate-bounce mx-auto" />
            <p className="text-sm font-bold text-slate-300">Consultando registros acadêmicos no servidor...</p>
          </div>
        ) : !reportData || allSubjects.length === 0 ? (
          <div className="p-12 text-center space-y-3 bg-slate-900/40 rounded-3xl border border-slate-800">
            <HelpCircle className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-black text-white uppercase tracking-wide">
              Nenhum registro encontrado
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Não foram encontradas avaliações ou atividades registradas para este documento. Verifique se o CPF/matrícula digitado está correto ou realize uma atividade em sala.
            </p>
          </div>
        ) : (
          /* ACORDEÃO DE DISCIPLINAS */
          <div className="space-y-4">
            <h2 className="text-xs font-black uppercase text-slate-400 tracking-widest px-1">
              Desempenho por Disciplina
            </h2>

            {allSubjects.map((subject) => {
              const isExpanded = expandedSubject === subject.subjectId;
              const allActivities = [...subject.exams, ...subject.quizzes, ...subject.practices];

              return (
                <div
                  key={subject.subjectId}
                  className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl transition-all"
                >
                  {/* CABEÇALHO DA DISCIPLINA */}
                  <div
                    onClick={() => setExpandedSubject(isExpanded ? null : subject.subjectId)}
                    className="p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">
                        {subject.courseName}
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wide">
                        {subject.subjectName}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {subject.totalActivities} atividades concluídas: (
                        <span className="text-emerald-400 font-bold">{subject.totalExams} Provas</span>,{' '}
                        <span className="text-purple-400 font-bold">{subject.totalQuizzes} Quizzes</span>,{' '}
                        <span className="text-amber-400 font-bold">{subject.totalPractices} Práticas</span>)
                      </p>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-center">
                      <div className="text-right">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">
                          Média da Matéria
                        </span>
                        <span className="text-xl sm:text-2xl font-black font-mono text-white">
                          {subject.finalGrade.toFixed(1)}{' '}
                          <span className="text-xs text-slate-500 font-normal">/ 10</span>
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider ${
                          subject.isApproved
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-red-500/20 text-red-300 border-red-500/30'
                        }`}
                      >
                        {subject.isApproved ? 'Aprovado' : 'Abaixo de 7,0'}
                      </span>

                      <div className="text-slate-400 p-1">
                        {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>

                  {/* LISTA EXPANSÍVEL DE ATIVIDADES */}
                  {isExpanded && (
                    <div className="p-5 sm:p-6 bg-slate-950/70 border-t border-slate-800 space-y-2.5">
                      <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-3">
                        Extrato Detalhado de Provas e Quizzes (Toque para ver o espelho)
                      </h4>

                      {allActivities.map((act) => {
                        const isExam = act.type === 'AVALIACAO' || act.type === 'AVALIAÇAO';
                        const isPractice = act.type === 'ATIVIDADE';

                        return (
                          <div
                            key={act.submissionId}
                            onClick={() => setSelectedActivity(act)}
                            className="p-3.5 sm:p-4 bg-slate-900/90 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-all group shadow-sm"
                          >
                            <div className="flex items-center gap-3 truncate">
                              <div
                                className={`p-2.5 rounded-xl border shrink-0 ${
                                  isExam
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                    : isPractice
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                    : 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                                }`}
                              >
                                {isExam ? (
                                  <FileCheck2 className="w-5 h-5" />
                                ) : isPractice ? (
                                  <Wrench className="w-5 h-5" />
                                ) : (
                                  <Gamepad2 className="w-5 h-5" />
                                )}
                              </div>

                              <div className="truncate">
                                <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider block">
                                  {isExam ? 'Avaliação Formal' : isPractice ? 'Prática de Campo' : 'Quiz Interativo'}
                                </span>
                                <h5 className="text-xs sm:text-sm font-bold text-white uppercase truncate group-hover:text-blue-400 transition-colors">
                                  {act.title}
                                </h5>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {new Date(act.submittedAt).toLocaleDateString('pt-BR')} • {act.totalCorrect}/{act.totalQuestions} acertos
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right">
                                <span className="text-base sm:text-lg font-black font-mono text-white block">
                                  {act.score.toFixed(1)}{' '}
                                  <span className="text-[10px] text-slate-500 font-normal">/ 10</span>
                                </span>
                                <span
                                  className={`text-[8px] font-black uppercase ${
                                    act.isApproved ? 'text-emerald-400' : 'text-amber-400'
                                  }`}
                                >
                                  {act.isApproved ? 'Atingiu a Média' : 'Abaixo da Média'}
                                </span>
                              </div>

                              <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* MODAL: ESPELHO DA PROVA / GABARITO FORMATIVO */}
      {selectedActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-fade-in font-sans">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* TOPO DO MODAL */}
            <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3">
              <div className="truncate">
                <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider block">
                  Espelho da Prova & Comentários do Instrutor
                </span>
                <h3 className="text-sm sm:text-base font-black text-white uppercase truncate">
                  {selectedActivity.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedActivity(null)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* CORPO DO MODAL */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Nota Final Obtida
                  </span>
                  <span className="text-2xl font-black font-mono text-white">
                    {selectedActivity.score.toFixed(1)}{' '}
                    <span className="text-xs text-slate-500 font-normal">/ 10,0</span>
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Taxa de Acertos
                  </span>
                  <span className="text-lg font-black font-mono text-emerald-400">
                    {selectedActivity.totalCorrect} de {selectedActivity.totalQuestions}
                  </span>
                  {selectedActivity.timeSpentSeconds !== undefined && (
                    <span className="text-[10px] text-slate-500 block">
                      Tempo: {formatTimeSpent(selectedActivity.timeSpentSeconds)}
                    </span>
                  )}
                </div>
              </div>

              {/* LISTA DAS QUESTÕES RESPONDIDAS */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                  Detalhamento Questão a Questão
                </h4>

                {(!selectedActivity.answers || selectedActivity.answers.length === 0) ? (
                  <p className="text-xs text-slate-500 italic p-4 text-center bg-slate-950 rounded-xl">
                    Detalhamento item por item indisponível para esta atividade.
                  </p>
                ) : (
                  selectedActivity.answers.map((ans, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border space-y-2 ${
                        ans.isCorrect
                          ? 'bg-slate-950/80 border-emerald-500/40 shadow-sm'
                          : 'bg-slate-950/80 border-red-500/40 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-slate-400 uppercase font-mono">
                          Questão #{idx + 1}
                        </span>
                        <span
                          className={`text-[9px] font-black px-2.5 py-0.5 rounded-full border uppercase ${
                            ans.isCorrect
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-red-500/20 text-red-300 border-red-500/30'
                          }`}
                        >
                          {ans.isCorrect ? '✓ Acerto' : '✗ Incorreta'}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm font-bold text-white uppercase leading-relaxed">
                        {ans.questionTitle}
                      </p>

                      <div className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                        Sua Resposta:{' '}
                        <strong className="text-white font-mono">
                          {ans.studentAnswer || 'Em branco'}
                        </strong>
                      </div>

                      {ans.justification && (
                        <div className="p-3 bg-blue-950/20 border border-blue-500/30 rounded-xl text-xs text-slate-300 space-y-1">
                          <strong className="text-blue-400 uppercase font-black text-[10px] block tracking-wider">
                            Justificativa Pedagógica do Instrutor:
                          </strong>
                          <p className="text-slate-200 leading-relaxed">{ans.justification}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* RODAPÉ DO MODAL */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 text-right">
              <button
                type="button"
                onClick={() => setSelectedActivity(null)}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Fechar Espelho
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default StudentAcademicPortal;