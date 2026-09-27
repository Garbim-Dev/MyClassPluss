import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../../services/api';
import {
  X,
  Printer,
  GraduationCap,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Users,
  Eye,
  Gamepad2,
  FileCheck2,
  Wrench,
  Clock,
  CalendarCheck,
  ShieldCheck,
  BookOpen,
  Trash2,
  Loader2,
} from 'lucide-react';

interface StudentActivityItem {
  id: string;
  title: string;
  type: 'QUIZ_INTERATIVO' | 'AVALIACAO' | 'ATIVIDADE';
  scoreOrGrade: number | string;
  date?: string;
  isApproved?: boolean;
  statusLabel?: string;
}

interface StudentReportItem {
  rank: number;
  userId: string;
  userName: string;
  totalGrade: number;
  isApproved: boolean;
  roundGrade?: number;
  attendancePercentage?: number;
  totalPresences?: number;
  totalAbsences?: number;
  quizzesCompleted?: StudentActivityItem[];
  examsCompleted?: StudentActivityItem[];
  practicesCompleted?: StudentActivityItem[];
}

interface ClassReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId?: string;
  classNameStr: string;
  courseNameStr: string;
  subjectNameStr?: string;
  totalQuizzes?: number;
  totalExams?: number;
  totalPractices?: number;
  students: StudentReportItem[];
  onRefresh?: () => void;
}

export const ClassReportModal: React.FC<ClassReportModalProps> = ({
  isOpen,
  onClose,
  classId,
  classNameStr,
  courseNameStr,
  subjectNameStr = 'Conhecimentos Gerais',
  totalQuizzes = 0,
  totalExams = 0,
  totalPractices = 0,
  students = [],
  onRefresh,
}) => {
  const [selectedStudent, setSelectedStudent] = useState<StudentReportItem | null>(null);
  const [deletingActivityId, setDeletingActivityId] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalStudents = students.length;
  const approvedCount = students.filter((s) => s.isApproved).length;
  const failedCount = totalStudents - approvedCount;

  const atRiskAttendanceCount = students.filter(
    (s) => s.attendancePercentage !== undefined && s.attendancePercentage < 75
  ).length;

  const classAverage =
    totalStudents > 0
      ? (students.reduce((acc, curr) => acc + (Number(curr.totalGrade) || 0), 0) / totalStudents).toFixed(1)
      : '0.0';

  const calculatedQuizzesCount =
    totalQuizzes ||
    Math.max(...students.map((s) => s.quizzesCompleted?.length || 0), 0);
  const calculatedExamsCount =
    totalExams ||
    Math.max(...students.map((s) => s.examsCompleted?.length || 0), 0);
  const calculatedPracticesCount =
    totalPractices ||
    Math.max(...students.map((s) => s.practicesCompleted?.length || 0), 0);

  const exportToExcel = () => {
    const data = students.map((s) => ({
      Posicao: `${s.rank}º`,
      Aluno: s.userName || (s as any).name || 'Aluno',
      Nota: Number(s.totalGrade || 0).toFixed(1),
      Situacao: s.isApproved ? 'APROVADO' : 'ABAIXO DA MEDIA',
      Frequencia: s.attendancePercentage !== undefined ? `${s.attendancePercentage}%` : 'N/D',
      AlertaFrequencia:
        s.attendancePercentage !== undefined && s.attendancePercentage < 75
          ? 'ABAIXO DE 75% (RISCO)'
          : 'REGULAR',
      Criterio: '7.0',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Desempenho_Frequencia');

    ws['!cols'] = [
      { wch: 10 },
      { wch: 30 },
      { wch: 15 },
      { wch: 20 },
      { wch: 15 },
      { wch: 25 },
      { wch: 12 },
    ];

    XLSX.writeFile(wb, `Relatorio_MyClassPluss_${classNameStr.replace(/\s+/g, '_')}.xlsx`);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  // ⚡ Exclusão da submissão individual do aluno com recálculo automático
  const handleDeleteStudentActivity = async (activity: StudentActivityItem) => {
    if (!selectedStudent || !classId) {
      alert('Identificador da turma ou do aluno não localizado.');
      return;
    }

    const confirmMsg = `Tem certeza que deseja apagar o resultado da atividade "${activity.title}" para ${selectedStudent.userName}?\n\nEsta ação excluirá as notas e respostas do aluno, permitindo que ele refaça a atividade.`;
    if (!window.confirm(confirmMsg)) return;

    setDeletingActivityId(activity.id);

    try {
      await api.delete(
        `/academic/classes/${classId}/activities/${activity.id}/students/${selectedStudent.userId}/submission`
      );

      // Atualiza o prontuário localmente
      setSelectedStudent((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          quizzesCompleted: prev.quizzesCompleted?.filter((q) => q.id !== activity.id),
          examsCompleted: prev.examsCompleted?.filter((e) => e.id !== activity.id),
          practicesCompleted: prev.practicesCompleted?.filter((p) => p.id !== activity.id),
        };
      });

      // Notifica o componente pai para buscar os novos dados consolidados
      if (onRefresh) {
        onRefresh();
      }
    } catch (err: any) {
      console.error('Erro ao excluir submissão do aluno:', err);
      alert(err.response?.data?.message || 'Erro ao excluir a submissão do aluno.');
    } finally {
      setDeletingActivityId(null);
    }
  };

  const displaySubjectName =
    subjectNameStr && subjectNameStr !== 'Todas as Disciplinas / Módulo Ativo'
      ? subjectNameStr
      : 'Conhecimentos Gerais';

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in font-sans">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
          {/* Topo do Modal com Disciplina Vinculada */}
          <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl shrink-0">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2 flex-wrap">
                  <span>Dossiê Oficial: Desempenho, Frequência & Atividades</span>
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 flex-wrap">
                  <span>Turma: </span>
                  <strong className="text-white bg-slate-800 px-2 py-0.5 rounded-md font-mono">{classNameStr}</strong>
                  <span> • Curso: </span>
                  <span className="text-slate-300 font-medium">{courseNameStr}</span>
                  <span> • Disciplina: </span>
                  <span className="text-blue-400 font-bold bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md uppercase">
                    {displaySubjectName}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={exportToExcel}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
                title="Exportar planilha Excel"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span className="hidden sm:inline">Exportar Excel</span>
              </button>

              <button
                type="button"
                onClick={handlePrintPdf}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Imprimir ou Salvar PDF"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Imprimir / PDF</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer ml-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Barra de Atividades Realizadas na Disciplina */}
          <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800/80 flex items-center gap-3 sm:gap-6 text-xs text-slate-300 overflow-x-auto">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Volume de Aulas:</span>
            
            <div className="flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-lg text-purple-300 font-bold">
              <Gamepad2 className="w-3.5 h-3.5 text-purple-400" />
              <span>{calculatedQuizzesCount} Quizzes Aplicados</span>
            </div>

            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg text-emerald-300 font-bold">
              <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{calculatedExamsCount} Avaliações Formais</span>
            </div>

            <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg text-amber-300 font-bold">
              <Wrench className="w-3.5 h-3.5 text-amber-400" />
              <span>{calculatedPracticesCount} Práticas em Campo</span>
            </div>
          </div>

          {/* Indicadores Gerais Consolidados */}
          <div className="p-5 sm:p-6 grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 bg-slate-950/50 border-b border-slate-800/80">
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl text-center">
              <span className="text-xs font-bold text-slate-400 block">Total de Alunos</span>
              <span className="text-2xl font-black text-white mt-1 block">{totalStudents}</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl text-center">
              <span className="text-xs font-bold text-slate-400 block">Média da Sala</span>
              <span className="text-2xl font-black text-blue-400 mt-1 block font-mono">{classAverage}</span>
            </div>

            <div className="bg-emerald-950/30 border border-emerald-500/30 p-3.5 rounded-2xl text-center">
              <span className="text-xs font-bold text-emerald-400 block">Aprovados (≥ 7,0)</span>
              <span className="text-2xl font-black text-emerald-300 mt-1 block font-mono">{approvedCount}</span>
            </div>

            <div className="bg-amber-950/30 border border-amber-500/30 p-3.5 rounded-2xl text-center">
              <span className="text-xs font-bold text-amber-400 block">Recuperação (&lt; 7,0)</span>
              <span className="text-2xl font-black text-amber-300 mt-1 block font-mono">{failedCount}</span>
            </div>

            <div className="bg-red-950/30 border border-red-500/30 p-3.5 rounded-2xl text-center col-span-2 sm:col-span-1">
              <span className="text-xs font-bold text-red-400 block">Alerta Freq. (&lt; 75%)</span>
              <span className="text-2xl font-black text-red-300 mt-1 block font-mono">{atRiskAttendanceCount}</span>
            </div>
          </div>

          {/* Tabela Interativa de Alunos */}
          <div className="p-6 overflow-y-auto flex-1">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
              <span>Clique sobre a linha de qualquer aluno para abrir seu histórico individual detalhado:</span>
              <span className="text-[11px] font-bold text-blue-400">Total: {students.length} estudantes</span>
            </div>

            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-black text-[11px] border-b border-slate-800 sticky top-0 z-10">
                <tr>
                  <th className="py-3 px-4">Posição</th>
                  <th className="py-3 px-4">Nome do Aluno</th>
                  <th className="py-3 px-4 text-center">Nota Final (0 - 10)</th>
                  <th className="py-3 px-4 text-center">Frequência (%)</th>
                  <th className="py-3 px-4 text-center">Situação Acadêmica</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 italic">
                      Nenhuma resposta registrada nesta sessão.
                    </td>
                  </tr>
                ) : (
                  students.map((s, idx) => {
                    const hasAttendanceData = s.attendancePercentage !== undefined;
                    const isLowAttendance = hasAttendanceData && s.attendancePercentage! < 75;
                    const rowKey = s.userId ? `student-${s.userId}-${idx}` : `student-row-${idx}`;

                    return (
                      <tr
                        key={rowKey}
                        onClick={() => setSelectedStudent(s)}
                        className="hover:bg-slate-800/70 transition-all cursor-pointer group"
                      >
                        <td className="py-3.5 px-4 font-black text-slate-400">
                          <span>#{s.rank || idx + 1}</span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-white text-sm group-hover:text-blue-300 transition-colors">
                          <div className="flex items-center gap-2">
                            <span>{s.userName || (s as any).name || 'Aluno'}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center font-black text-base font-mono">
                          <span className={s.isApproved ? 'text-emerald-300' : 'text-amber-400'}>
                            {Number(s.totalGrade || 0).toFixed(1)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold">
                          {hasAttendanceData ? (
                            <span className={isLowAttendance ? 'text-red-400 font-black' : 'text-slate-200'}>
                              {s.attendancePercentage}%
                            </span>
                          ) : (
                            <span className="text-slate-500 italic">N/D</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {isLowAttendance && (
                              <span className="inline-flex items-center gap-1 bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Falta &lt; 75%</span>
                              </span>
                            )}
                            {s.isApproved ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Aprovado</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>Abaixo de 7,0</span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStudent(s);
                            }}
                            className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 px-2.5 py-1.5 rounded-xl text-[11px] font-bold inline-flex items-center gap-1 transition-all"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver Prontuário</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Rodapé do Modal Principal */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between text-xs text-slate-500">
            <span>
              Sistema MyClassPluss • Relatório emitido em {new Date().toLocaleDateString('pt-BR')}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ⚡ MODAL DE PRONTUÁRIO INDIVIDUAL DO ALUNO (COM AÇÃO DE EXCLUIR ATIVIDADE) */}
      {/* ========================================================================= */}
      {selectedStudent && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in font-sans">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Topo do Prontuário */}
            <div className="p-6 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="p-3 bg-purple-600/20 text-purple-400 rounded-2xl">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-md">
                      Prontuário Individual do Estudante
                    </span>
                    <span className="text-[10px] font-black uppercase bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md">
                      Posição #{selectedStudent.rank}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white mt-0.5">
                    {selectedStudent.userName || (selectedStudent as any).name || 'Aluno'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Turma: <strong className="text-slate-200">{classNameStr}</strong> • Disciplina: <strong className="text-blue-400 uppercase">{displaySubjectName}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Imprimir Prontuário Individual"
                >
                  <Printer className="w-4 h-4" />
                  <span className="hidden sm:inline">Imprimir</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Painel Resumo de Métricas Individuais */}
            <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-950/40 border-b border-slate-800">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Nota Consolidada</span>
                <span className={`text-2xl font-black font-mono mt-1 block ${selectedStudent.isApproved ? 'text-emerald-300' : 'text-amber-400'}`}>
                  {Number(selectedStudent.totalGrade || 0).toFixed(1)} / 10
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Frequência Global</span>
                <span className="text-2xl font-black text-white font-mono mt-1 block">
                  {selectedStudent.attendancePercentage !== undefined ? `${selectedStudent.attendancePercentage}%` : '100%'}
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Presenças / Faltas</span>
                <span className="text-sm font-bold text-slate-200 mt-2 block">
                  <span className="text-emerald-400 font-black">{selectedStudent.totalPresences ?? 20}P</span> / <span className="text-red-400 font-black">{selectedStudent.totalAbsences ?? 0}F</span>
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Status Final</span>
                <span className="mt-1.5 block">
                  {selectedStudent.isApproved ? (
                    <span className="text-xs font-black text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1 rounded-full uppercase">
                      Apto / Aprovado
                    </span>
                  ) : (
                    <span className="text-xs font-black text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 rounded-full uppercase">
                      Em Recuperação
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* Listagem de Atividades por Categoria */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* 1. Avaliações Formais */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileCheck2 className="w-4 h-4" />
                  <span>Avaliações Formais & Provas Teóricas</span>
                </h4>
                <div className="space-y-2">
                  {(selectedStudent.examsCompleted && selectedStudent.examsCompleted.length > 0) ? (
                    selectedStudent.examsCompleted.map((exam, eIdx) => {
                      const isDeleting = deletingActivityId === exam.id;

                      return (
                        <div key={exam.id ? `exam-${exam.id}-${eIdx}` : `exam-${eIdx}`} className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between">
                          <div>
                            <h5 className="font-bold text-white text-xs sm:text-sm">{exam.title}</h5>
                            <span className="text-[11px] text-slate-400">{exam.date || 'Avaliação Oficial'}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono font-black text-white bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                              Nota: <strong className="text-emerald-400">{Number(exam.scoreOrGrade || 0).toFixed(1)}</strong>
                            </span>
                            <button
                              type="button"
                              disabled={isDeleting}
                              onClick={() => handleDeleteStudentActivity(exam)}
                              className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-red-500/30"
                              title="Apagar tentativa do aluno (Permitir refazer)"
                            >
                              {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
                      <span>Avaliação Formal Geral da Disciplina</span>
                      <span className="font-mono font-bold text-slate-400 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
                        Nenhuma Prova Teórica Registrada
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Quizzes Interativos */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Gamepad2 className="w-4 h-4" />
                  <span>Quizzes Gamificados no Telão</span>
                </h4>
                <div className="space-y-2">
                  {(selectedStudent.quizzesCompleted && selectedStudent.quizzesCompleted.length > 0) ? (
                    selectedStudent.quizzesCompleted.map((quiz, qIdx) => {
                      const isDeleting = deletingActivityId === quiz.id;

                      return (
                        <div key={quiz.id ? `quiz-${quiz.id}-${qIdx}` : `quiz-${qIdx}`} className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between">
                          <div>
                            <h5 className="font-bold text-white text-xs sm:text-sm">{quiz.title}</h5>
                            <span className="text-[11px] text-slate-400">{quiz.statusLabel || 'Rodada Gamificada Concluída'}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono font-black text-amber-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                              {quiz.scoreOrGrade}
                            </span>
                            <button
                              type="button"
                              disabled={isDeleting}
                              onClick={() => handleDeleteStudentActivity(quiz)}
                              className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-red-500/30"
                              title="Apagar resultado do quiz (Permitir refazer)"
                            >
                              {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
                      <span>Simulado Técnico & Arena Gamificada</span>
                      <span className="font-mono font-bold text-slate-400 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
                        Nenhum Quiz Registrado
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Práticas em Sala, Oficina & Campo */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Wrench className="w-4 h-4" />
                  <span>Procedimentos Práticos & Inspeções de Campo</span>
                </h4>
                <div className="space-y-2">
                  {(selectedStudent.practicesCompleted && selectedStudent.practicesCompleted.length > 0) ? (
                    selectedStudent.practicesCompleted.map((prat, pIdx) => (
                      <div key={prat.id ? `prat-${prat.id}-${pIdx}` : `prat-${pIdx}`} className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between">
                        <div>
                          <h5 className="font-bold text-white text-xs sm:text-sm">{prat.title}</h5>
                          <span className="text-[11px] text-slate-400">{prat.statusLabel || 'Checklist Conforme / Procedimento Validado'}</span>
                        </div>
                        <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                          ✓ Aprovado em Campo
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
                      <span>Inspeção Pré-Operacional & Procedimentos de Oficina</span>
                      <span className="font-bold text-slate-400 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
                        Nenhuma Prática Registrada
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Rodapé do Prontuário */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Prontuário emitido sob autenticação acadêmica MyClassPluss
              </span>
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Voltar à Listagem da Turma
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ClassReportModal;