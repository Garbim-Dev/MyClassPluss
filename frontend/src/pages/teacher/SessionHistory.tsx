import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import * as XLSX from 'xlsx';
import {
  History,
  Calendar,
  Download,
  Search,
  Eye,
  X,
  Layers,
  Award,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  BookOpen,
  Trash2,
  AlertCircle
} from 'lucide-react';

interface SessionItem {
  id: string;
  startedAt?: string;
  date?: string;
  quiz?: {
    id: string;
    title: string;
    type?: string;
    subject?: {
      name: string;
    };
    questions?: any[];
  };
  quizTitle?: string;
  quizType?: string;
  subjectName?: string;
  class?: {
    id: string;
    code: string;
    course?: {
      name: string;
    };
  };
  classCode?: string;
  courseName?: string;
  answers?: any[];
  submissionsCount?: number;
  averageGrade?: number;
  approvalRate?: number;
}

export const SessionHistory: React.FC = () => {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [actionError, setActionError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get('/academic/sessions/history');
      setSessions(res.data || []);
    } catch (e) {
      console.error('Erro ao carregar histórico de sessões:', e);
      try {
        const fallbackRes = await api.get('/quizzes/sessions/history');
        setSessions(fallbackRes.data || []);
      } catch (err) {}
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // SINCRONIZAÇÃO COM A SETA DE VOLTAR DO NAVEGADOR PARA MODAIS
  useEffect(() => {
    if (selectedSession) {
      window.history.pushState({ modalOpen: true }, '');

      const handlePopState = () => {
        setSelectedSession(null);
      };

      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [selectedSession]);

  const handleCloseDetails = () => {
    if (window.history.state?.modalOpen) {
      window.history.back();
    } else {
      setSelectedSession(null);
    }
  };

  // ⚡ FUNÇÃO PARA EXCLUIR SESSÃO / ATIVIDADE INICIADA POR ENGANO
  const handleDeleteSession = async (sessionId: string, quizName: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o registro da sessão "${quizName}"? Esta ação removerá os dados do histórico.`)) {
      return;
    }

    setActionError('');
    
    // ⚡ Atualização otimista: remove da tela imediatamente para uma experiência fluida
    const previousSessions = [...sessions];
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));

    try {
      // Tenta a rota acadêmica padrão para exclusão de sessão
      await api.delete(`/academic/sessions/${sessionId}`);
      
      setSuccessMsg('Sessão removida do histórico com sucesso!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      try {
        // Tenta a rota alternativa de quizzes caso o endpoint seja outro
        await api.delete(`/quizzes/sessions/${sessionId}`);
        setSuccessMsg('Sessão removida do histórico com sucesso!');
        setTimeout(() => setSuccessMsg(''), 3000);
      } catch (fallbackErr: any) {
        // Se falhar em ambas, reverte o estado anterior da lista e avisa o usuário
        setSessions(previousSessions);
        setActionError(fallbackErr.response?.data?.message || 'Erro ao excluir a sessão no servidor. Tente novamente.');
        setTimeout(() => setActionError(''), 4000);
      }
    }
  };

  const filteredSessions = sessions.filter((s) => {
    const quizTitle = s.quiz?.title || s.quizTitle || '';
    const classCode = s.class?.code || s.classCode || '';
    const subjectName = s.quiz?.subject?.name || s.subjectName || '';
    const term = searchTerm.toLowerCase();
    return (
      quizTitle.toLowerCase().includes(term) ||
      classCode.toLowerCase().includes(term) ||
      subjectName.toLowerCase().includes(term)
    );
  });

  const getSessionStats = (s: SessionItem) => {
    const answers = s.answers || [];
    const uniqueStudents = s.submissionsCount || new Set(answers.map((a) => a.userId)).size;
    const correctAnswers = answers.filter((a) => a.isCorrect).length;
    const totalAnswers = answers.length;
    const accuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : (s.approvalRate || 0);

    const averageGrade = Number(s.averageGrade ?? 0);

    return {
      participantsCount: uniqueStudents,
      accuracy,
      averageGrade,
    };
  };

  const handleExportSessionExcel = (s: SessionItem) => {
    const answers = s.answers || [];
    const studentMap = new Map<string, any>();

    // Agrupa e consolida as respostas por aluno
    answers.forEach((ans) => {
      const uId = ans.userId;
      if (!studentMap.has(uId)) {
        studentMap.set(uId, {
          nome: ans.user?.name || ans.userName || 'Aluno',
          email: ans.user?.email || ans.email || 'N/A',
          totalQuestoes: 0,
          acertos: 0,
          pontos: 0,
        });
      }
      const st = studentMap.get(uId);
      st.totalQuestoes += 1;
      if (ans.isCorrect) st.acertos += 1;
      st.pontos += Number(ans.scoreEarned || ans.finalGrade || 0);
    });

    // ⚡ Cálculo rigoroso alinhado ao Dossiê Pedagógico
    const rows = Array.from(studentMap.values()).map((st, idx) => {
      const totalQ = st.totalQuestoes > 0 ? st.totalQuestoes : (s.quiz?.questions?.length || 20);
      // Calcula a nota proporcional de 0 a 10 com base nos acertos reais
      const calculatedGrade = (st.acertos / totalQ) * 10;
      const finalGrade = Number(calculatedGrade.toFixed(1));
      
      return {
        'Nº': idx + 1,
        'Nome do Aluno': st.nome,
        'E-mail': st.email,
        'Total Questões': totalQ,
        'Acertos': st.acertos,
        'Média Final (0 a 10)': finalGrade,
        'Situação': finalGrade >= 7.0 ? 'APROVADO' : 'ABAIXO DA MÉDIA',
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ 'Aviso': 'Sessão sem submissões detalhadas registradas.' }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relatorio_Sessao');
    const safeTitle = (s.quiz?.title || s.quizTitle || 'Atividade').replace(/[^a-zA-Z0-9]/g, '_');
    XLSX.writeFile(wb, `MyClassPluss_Historico_${safeTitle}.xlsx`);
  };

  const handleOpenDetails = async (sessionId: string) => {
    try {
      const res = await api.get(`/quizzes/sessions/${sessionId}`);
      setSelectedSession(res.data);
    } catch (e) {
      const found = sessions.find((item) => item.id === sessionId);
      if (found) {
        setSelectedSession(found);
      } else {
        alert('Erro ao carregar detalhes da sessão.');
      }
    }
  };

  return (
    <div className="space-y-8 font-sans animate-fade-in">
      {/* CABEÇALHO */}
      <div className="bg-slate-900/60 border border-slate-800/90 p-6 rounded-3xl shadow-xl backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-violet-600/20 text-violet-400 rounded-2xl">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Histórico de Sessões e Avaliações</h2>
            <p className="text-xs text-slate-400">
              Consulte atividades passadas, notas apuradas, turmas e exporte relatórios oficiais em Excel
            </p>
          </div>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por atividade, turma ou disciplina..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none"
          />
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-950/50 border border-emerald-500/40 rounded-xl flex items-center gap-2 text-emerald-300 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3 bg-red-950/50 border border-red-800/80 rounded-xl flex items-center gap-2 text-red-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{actionError}</span>
        </div>
      )}

      {/* LISTAGEM DE SESSÕES */}
      {loading ? (
        <div className="py-24 text-center space-y-3">
          <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Carregando histórico de avaliações...</p>
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800 p-12 rounded-3xl text-center space-y-3">
          <History className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-300">Nenhuma sessão encontrada</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Assim que você lançar uma atividade, avaliação ou quiz interativo no telão, o registro com as notas dos alunos aparecerá aqui.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSessions.map((session) => {
            const stats = getSessionStats(session);
            const dateSource = session.startedAt || session.date;
            const formattedDate = dateSource
              ? new Date(dateSource).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Data N/A';

            const isApproved = stats.averageGrade >= 7.0;
            const quizTitle = session.quiz?.title || session.quizTitle || 'Quiz Sem Título';
            const classCode = session.class?.code || session.classCode || 'Turma N/A';
            const subjectName = session.quiz?.subject?.name || session.subjectName || 'Disciplina Geral';
            const quizType = session.quiz?.type || session.quizType || 'AVALIAÇÃO';

            return (
              <div
                key={session.id}
                className="bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 p-5 rounded-3xl flex flex-col justify-between space-y-4 shadow-xl transition-all relative group"
              >
                {/* ⚡ BOTÃO DE EXCLUSÃO RÁPIDA (LIXEIRA) NO CANTO SUPERIOR DIREITO */}
                <button
                  type="button"
                  onClick={() => handleDeleteSession(session.id, quizTitle)}
                  className="absolute top-4 right-4 p-2 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded-xl transition-colors cursor-pointer"
                  title="Excluir sessão iniciada por engano"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="space-y-3 pr-8">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase bg-blue-500/10 text-blue-400 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                      {classCode}
                    </span>

                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formattedDate}</span>
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black uppercase bg-violet-500/10 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded">
                        {quizType}
                      </span>
                    </div>
                    <h3 className="font-bold text-white text-base leading-snug">{quizTitle}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                      <BookOpen className="w-3 h-3 text-indigo-400" />
                      <span>{subjectName}</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800/80 text-center">
                      <span className="text-[10px] text-slate-400 block font-medium">Alunos</span>
                      <strong className="text-sm text-white font-bold">{stats.participantsCount}</strong>
                    </div>

                    <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800/80 text-center">
                      <span className="text-[10px] text-slate-400 block font-medium">Precisão</span>
                      <strong className="text-sm text-emerald-400 font-bold">{stats.accuracy}%</strong>
                    </div>

                    <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800/80 text-center">
                      <span className="text-[10px] text-slate-400 block font-medium">Média</span>
                      <strong
                        className={
                          'text-sm font-black ' +
                          (isApproved ? 'text-emerald-400' : 'text-amber-400')
                        }
                      >
                        {Number(stats.averageGrade || 0).toFixed(1)}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => handleOpenDetails(session.id)}
                    className="bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold py-2 rounded-xl border border-slate-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-400" />
                    <span>Detalhes</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExportSessionExcel(session)}
                    className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Excel</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE DETALHES DA SESSÃO */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">
                    {selectedSession.quiz?.title || selectedSession.quizTitle}
                  </h3>
                  <span className="text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full">
                    {selectedSession.class?.code || selectedSession.classCode}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {selectedSession.quiz?.subject?.name || selectedSession.subjectName} • Relatório de Respostas por Aluno
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseDetails}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                      <th className="p-3">Aluno</th>
                      <th className="p-3 text-center">Questão / Atividade</th>
                      <th className="p-3 text-center">Tempo Gasto</th>
                      <th className="p-3 text-right">Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {(!selectedSession.answers || selectedSession.answers.length === 0) ? (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-slate-500 italic">
                          Registros consolidados oficiais da sessão salvos no banco.
                        </td>
                      </tr>
                    ) : (
                      selectedSession.answers.map((ans: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-900/40">
                          <td className="p-3 font-semibold text-white">
                            {ans.user?.name || ans.userName || 'Aluno'}
                          </td>
                          <td className="p-3 text-center text-slate-300">
                            {ans.question?.title || `Questão #${idx + 1}`}
                          </td>
                          <td className="p-3 text-center text-slate-400">
                            {ans.timeSpentSeconds ? `${ans.timeSpentSeconds}s` : 'N/A'}
                          </td>
                          <td className="p-3 text-right">
                            <span
                              className={
                                'px-2.5 py-0.5 rounded-full text-[10px] font-black border inline-flex items-center gap-1 ' +
                                (ans.isCorrect
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/35'
                                  : 'bg-red-500/10 text-red-400 border-red-500/35')
                              }
                            >
                              {ans.isCorrect ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              {ans.isCorrect ? 'Correta' : 'Incorreta'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex justify-end">
              <button
                type="button"
                onClick={handleCloseDetails}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionHistory;