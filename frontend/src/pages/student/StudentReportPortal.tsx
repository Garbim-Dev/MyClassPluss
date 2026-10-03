import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  GraduationCap,
  FileCheck2,
  Gamepad2,
  Wrench,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  BookOpen,
  Award,
  ArrowLeft,
  X,
  FileText,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const StudentReportPortal: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [selectedActivity, setSelectedActivity] = useState<any | null>(null);

  const studentUser = (() => {
    try {
      const stored = localStorage.getItem('@MyClassPluss:user');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  })();

  const studentId = studentUser?.id || studentUser?.document || 'me';

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/academic/student-report/${studentId}`);
        setReportData(res.data);
      } catch (err) {
        console.error('Erro ao carregar boletim:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [studentId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b19] flex items-center justify-center text-slate-300 font-sans">
        <div className="text-center space-y-3">
          <GraduationCap className="w-10 h-10 text-blue-400 animate-bounce mx-auto" />
          <p className="text-sm font-bold">Carregando seu histórico e boletim...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b19] text-slate-100 font-sans p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* CABEÇALHO DO PORTAL DO ALUNO */}
        <header className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-blue-600/20 text-blue-400 rounded-2xl border border-blue-500/30">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider">
                Área do Estudante
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                Meu Boletim & Desempenho
              </h1>
              <p className="text-xs text-slate-400">
                Aluno: <strong className="text-white">{reportData?.student?.name || studentUser?.name}</strong> • Documento: <span className="font-mono text-slate-300">{reportData?.student?.document || studentUser?.document || 'N/A'}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors border border-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>
        </header>

        {/* LISTA DE DISCIPLINAS */}
        {(!reportData?.subjects || reportData.subjects.length === 0) ? (
          <div className="bg-slate-900/60 border border-slate-800 p-10 rounded-3xl text-center space-y-2">
            <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-white">Nenhuma atividade registrada ainda</h3>
            <p className="text-xs text-slate-400">
              Conforme você for realizando avaliações, quizzes e atividades práticas, seu boletim será atualizado automaticamente aqui.
            </p>
          </div>
        ) : (
          reportData.subjects.map((subj: any) => (
            <div
              key={subj.subjectId}
              className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl"
            >
              {/* TOPO DA DISCIPLINA COM MÉDIA CONSOLIDADA */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {subj.courseName}
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-wide">
                    {subj.subjectName}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Total: <strong className="text-white">{subj.totalActivities}</strong> atividades realizadas (
                    <span className="text-emerald-400">{subj.totalExams} Provas</span>,{' '}
                    <span className="text-purple-400">{subj.totalQuizzes} Quizzes</span>,{' '}
                    <span className="text-amber-400">{subj.totalPractices} Práticas</span>)
                  </p>
                </div>

                <div className="flex items-center gap-4 bg-slate-950 px-5 py-3 rounded-2xl border border-slate-800">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase block tracking-wider">
                      Média Consolidada
                    </span>
                    <span className="text-2xl sm:text-3xl font-black font-mono text-white">
                      {subj.finalGrade.toFixed(1)} <span className="text-xs text-slate-500">/ 10</span>
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider ${
                      subj.isApproved
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-red-500/20 text-red-300 border-red-500/40'
                    }`}
                  >
                    {subj.isApproved ? 'Aprovado' : 'Abaixo de 7,0'}
                  </span>
                </div>
              </div>

              {/* LISTA DETALHADA DAS ATIVIDADES DA DISCIPLINA */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  Extrato de Atividades Realizadas
                </h3>

                <div className="grid grid-cols-1 gap-2.5">
                  {[...subj.exams, ...subj.quizzes, ...subj.practices].map((act: any) => {
                    const isExam = act.type === 'AVALIACAO' || act.type === 'AVALIAÇAO';
                    const isPractice = act.type === 'ATIVIDADE';

                    return (
                      <div
                        key={act.submissionId}
                        onClick={() => setSelectedActivity(act)}
                        className="p-4 bg-slate-950/80 hover:bg-slate-800/60 border border-slate-800 hover:border-slate-700 rounded-2xl flex items-center justify-between transition-all cursor-pointer shadow-sm group"
                      >
                        <div className="flex items-center gap-3.5">
                          <div
                            className={`p-2.5 rounded-xl border ${
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

                          <div>
                            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                              {isExam ? 'Avaliação Formal' : isPractice ? 'Prática em Campo' : 'Quiz Interativo'}
                            </span>
                            <h4 className="text-sm font-black text-white uppercase group-hover:text-blue-400 transition-colors">
                              {act.title}
                            </h4>
                            <span className="text-[11px] text-slate-500 font-mono">
                              Entregue em: {new Date(act.submittedAt).toLocaleDateString('pt-BR')} • {act.totalCorrect}/{act.totalQuestions} acertos
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-lg font-black font-mono text-white block">
                              {act.score.toFixed(1)} <span className="text-xs text-slate-500">/ 10</span>
                            </span>
                            <span
                              className={`text-[9px] font-black uppercase ${
                                act.isApproved ? 'text-emerald-400' : 'text-amber-400'
                              }`}
                            >
                              {act.isApproved ? 'Aprovado' : 'Abaixo da Média'}
                            </span>
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-white transition-colors" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))
        )}

      </div>

      {/* MODAL DETALHADO DA AVALIAÇÃO (GABARITO E JUSTIFICATIVAS) */}
      {selectedActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in font-sans">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            
            <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider">
                  Espelho da Prova / Gabarito
                </span>
                <h3 className="text-base font-black text-white uppercase">{selectedActivity.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedActivity(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-3.5">
              <div className="flex items-center justify-between bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Nota Obtida</span>
                  <span className="text-2xl font-black font-mono text-white">
                    {selectedActivity.score.toFixed(1)} <span className="text-xs text-slate-500">/ 10</span>
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Acertos</span>
                  <span className="text-lg font-black font-mono text-emerald-400">
                    {selectedActivity.totalCorrect} de {selectedActivity.totalQuestions}
                  </span>
                </div>
              </div>

              {selectedActivity.answers?.map((ans: any, idx: number) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border space-y-2 ${
                    ans.isCorrect ? 'bg-slate-950/80 border-emerald-500/40' : 'bg-slate-950/80 border-red-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-400 uppercase">
                      Questão {idx + 1}
                    </span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                        ans.isCorrect
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-red-500/20 text-red-300 border-red-500/30'
                      }`}
                    >
                      {ans.isCorrect ? '✓ Correta' : '✗ Incorreta'}
                    </span>
                  </div>

                  <p className="text-sm font-bold text-white uppercase">{ans.questionTitle}</p>
                  <p className="text-xs text-slate-300">
                    Sua Resposta: <strong className="text-white">{ans.studentAnswer || 'Em branco'}</strong>
                  </p>

                  {ans.justification && (
                    <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300">
                      <strong className="text-emerald-400 uppercase font-black">Comentário do Instrutor: </strong>
                      <span>{ans.justification}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 text-right">
              <button
                type="button"
                onClick={() => setSelectedActivity(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
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

export default StudentReportPortal;