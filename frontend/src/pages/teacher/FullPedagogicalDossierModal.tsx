import React from 'react';
import { ExportService } from '../../services/exportService';
import {
  FileText,
  Printer,
  Download,
  X,
  BookOpen,
  GraduationCap,
  Users,
  Award,
  CheckCircle2,
  XCircle,
  FileCheck2,
  Gamepad2,
  Wrench,
  FileSpreadsheet,
} from 'lucide-react';

interface StudentDossierItem {
  rank: number;
  userId: string;
  userName: string;
  teamName?: string | null;
  teamColor?: string | null;
  score?: number;
  roundScore?: number;
  totalGrade?: number;
  isApproved: boolean;
  totalCorrect?: number;
  answersMatrix?: { [questionIndex: number]: boolean };
  answersMap?: { [questionIndex: number]: boolean };
}

interface FullPedagogicalDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  quizTitle: string;
  quizType?: string;
  courseName: string;
  classCode: string;
  subjectName: string;
  totalQuestions: number;
  leaderboard: StudentDossierItem[];
}

export const FullPedagogicalDossierModal: React.FC<FullPedagogicalDossierModalProps> = ({
  isOpen,
  onClose,
  quizTitle,
  quizType = 'AVALIACAO',
  courseName,
  classCode,
  subjectName,
  totalQuestions = 1,
  leaderboard = [],
}) => {
  if (!isOpen) return null;

  const totalStudents = leaderboard.length;
  const approvedCount = leaderboard.filter((s) => s.isApproved).length;
  const approvalRate = totalStudents > 0 ? ((approvedCount / totalStudents) * 100).toFixed(1) : '0.0';

  const averageGrade =
    totalStudents > 0
      ? (
          leaderboard.reduce((acc, s) => acc + Number(s.totalGrade ?? 0), 0) / totalStudents
        ).toFixed(1)
      : '0.0';

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (leaderboard.length === 0) {
      alert('Não há dados para exportar.');
      return;
    }

    const headers = ['Posição', 'Nome do Aluno', 'Equipe', 'Nota Final (0-10)', 'Situação'];
    const rows = leaderboard.map((s) => [
      s.rank,
      `"${s.userName}"`,
      `"${s.teamName || 'Sem Equipe'}"`,
      Number(s.totalGrade ?? 0).toFixed(1),
      s.isApproved ? 'Aprovado' : 'Abaixo da Média',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Dossie_${classCode}_${quizTitle.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getModalityBadge = () => {
    switch (quizType) {
      case 'AVALIACAO':
        return {
          title: 'Atividade Formal',
          description: 'Avaliação Individual com Nota Oficial (0 a 10)',
          icon: <FileCheck2 className="w-5 h-5 text-emerald-400" />,
          border: 'border-emerald-500/40',
          bg: 'bg-emerald-950/20',
          textColor: 'text-emerald-300',
        };
      case 'ATIVIDADE':
        return {
          title: 'Prática de Campo',
          description: 'Roteiro Operacional e Checklist Técnico',
          icon: <Wrench className="w-5 h-5 text-amber-400" />,
          border: 'border-amber-500/40',
          bg: 'bg-amber-950/20',
          textColor: 'text-amber-300',
        };
      default:
        return {
          title: 'Quiz Interativo',
          description: 'Gamificação ao Vivo e Pontuação por Velocidade',
          icon: <Gamepad2 className="w-5 h-5 text-purple-400" />,
          border: 'border-purple-500/40',
          bg: 'bg-purple-950/20',
          textColor: 'text-purple-300',
        };
    }
  };

  const modality = getModalityBadge();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in font-sans">
      <div className="bg-[#0b1120] border border-slate-800 rounded-3xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* CABEÇALHO */}
        <div className="p-6 bg-[#080d1a] border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-2xl">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white">Dossiê Pedagógico Completo</h2>
                <span className="text-[10px] font-black uppercase bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2.5 py-0.5 rounded-full">
                  Média de Aprovação: 7,0
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Relatório consolidado com matriz de acertos, pontuações de velocidade e notas finais
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold rounded-xl border border-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-blue-400" />
              <span>Imprimir</span>
            </button>

            {/* ⚡ BOTÃO DE EXPORTAÇÃO PARA EXCEL (XLSX) */}
            <button
              type="button"
              onClick={() =>
                ExportService.exportToExcel({
                  quizTitle,
                  courseName,
                  classCode,
                  subjectName,
                  students: leaderboard,
                })
              }
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Baixar planilha formatada em Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel (.xlsx)</span>
            </button>

            {/* ⚡ BOTÃO DE EXPORTAÇÃO PARA PDF OFICIAL */}
            <button
              type="button"
              onClick={() =>
                ExportService.exportToPDF({
                  quizTitle,
                  courseName,
                  classCode,
                  subjectName,
                  students: leaderboard,
                })
              }
              className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-red-600/30 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Baixar relatório oficial em PDF"
            >
              <FileText className="w-4 h-4 text-white" />
              <span>PDF Oficial</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Baixar formato CSV tradicional"
            >
              <Download className="w-4 h-4" />
              <span>CSV</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CARDS DE INFORMAÇÕES GERAIS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 p-6 bg-[#080d1a]/50 border-b border-slate-800">
          
          {/* 1. CURSO / TURMA */}
          <div className="bg-[#0f172a] border border-slate-800/80 p-4 rounded-2xl space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-blue-400" />
              <span>Curso / Turma</span>
            </span>
            <p className="text-sm font-black text-white truncate">{courseName || 'Curso Geral'}</p>
            <span className="text-xs font-mono font-bold text-blue-400 block truncate">{classCode}</span>
          </div>

          {/* 2. DISCIPLINA / ATIVIDADE */}
          <div className="bg-[#0f172a] border border-slate-800/80 p-4 rounded-2xl space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-purple-400" />
              <span>Disciplina / Atividade</span>
            </span>
            <p className="text-sm font-black text-white truncate">{subjectName || 'Geral'}</p>
            <span className="text-xs text-slate-300 font-medium block truncate">{quizTitle}</span>
          </div>

          {/* 3. MODALIDADE DA ATIVIDADE */}
          <div className={`${modality.bg} border ${modality.border} p-4 rounded-2xl space-y-1 shadow-sm`}>
            <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${modality.textColor}`}>
              {modality.icon}
              <span>Modalidade</span>
            </span>
            <p className="text-sm font-black text-white">{modality.title}</p>
            <span className="text-[11px] text-slate-400 block leading-tight">{modality.description}</span>
          </div>

          {/* 4. PARTICIPAÇÃO & MÉDIA */}
          <div className="bg-[#0f172a] border border-slate-800/80 p-4 rounded-2xl space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>Participação & Média</span>
            </span>
            <p className="text-sm font-black text-white">
              {totalStudents} <span className="text-xs font-normal text-slate-400">alunos</span>
            </p>
            <span className="text-xs font-bold text-emerald-400 block">
              Média da Turma: {averageGrade} pts
            </span>
          </div>

          {/* 5. APROVEITAMENTO */}
          <div className="bg-[#0f172a] border border-slate-800/80 p-4 rounded-2xl space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Aproveitamento</span>
            </span>
            <p className="text-lg font-black text-amber-300">{approvalRate}%</p>
            <span className="text-xs text-slate-400 block">
              {approvedCount} de {totalStudents} aprovados
            </span>
          </div>
        </div>

        {/* TABELA CONSOLIDADA COM MATRIZ DE ACERTOS */}
        <div className="p-6 flex-1 overflow-y-auto space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Quadro de Rendimento por Participante
            </h3>
            <div className="flex items-center gap-3 text-[11px] font-bold">
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> Acerto
              </span>
              <span className="flex items-center gap-1 text-red-400">
                <XCircle className="w-3.5 h-3.5" /> Erro
              </span>
            </div>
          </div>

          <div className="border border-slate-800 rounded-2xl overflow-hidden shadow-xl bg-[#090e1a]">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 font-bold border-b border-slate-800 uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">Pos.</th>
                  <th className="py-3 px-4">Nome do Aluno</th>
                  <th className="py-3 px-4">Equipe</th>
                  {Array.from({ length: totalQuestions }).map((_, qIdx) => (
                    <th key={qIdx} className="py-3 px-2 text-center w-10">
                      Q{qIdx + 1}
                    </th>
                  ))}
                  <th className="py-3 px-4 text-center text-emerald-400">Acertos</th>
                  <th className="py-3 px-4 text-center font-black text-white">Nota Final</th>
                  <th className="py-3 px-4 text-right">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={6 + totalQuestions} className="py-12 text-center text-slate-500 italic">
                      Nenhum resultado registrado para esta sessão.
                    </td>
                  </tr>
                ) : (
                  leaderboard.map((student, sIdx) => {
                    const matrix = student.answersMatrix || student.answersMap || {};
                    const isApproved = Boolean(student.isApproved);
                    const finalGrade = Number(student.totalGrade ?? (student.score ? (student.score / 1000) * 10 : 0)).toFixed(1);

                    return (
                      <tr key={student.userId || sIdx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 text-center font-black text-slate-400 font-mono">
                          #{student.rank || sIdx + 1}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-white whitespace-nowrap">
                          {student.userName}
                        </td>
                        <td className="py-3.5 px-4">
                          {student.teamName ? (
                            <span
                              className="text-[10px] font-black px-2 py-0.5 rounded-md text-white shadow-sm inline-block"
                              style={{ backgroundColor: student.teamColor || '#6366f1' }}
                            >
                              {student.teamName}
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">—</span>
                          )}
                        </td>

                        {Array.from({ length: totalQuestions }).map((_, qIdx) => {
                          const isCorrect = matrix[qIdx] === true;

                          return (
                            <td key={qIdx} className="py-3.5 px-2 text-center">
                              {isCorrect ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-400 mx-auto" />
                              )}
                            </td>
                          );
                        })}

                        <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-400">
                          {student.totalCorrect !== undefined ? `${student.totalCorrect} / ${totalQuestions}` : '—'}
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono font-black text-sm text-white">
                          {finalGrade} <span className="text-[10px] text-slate-500 font-normal">/ 10</span>
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <span
                            className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                              isApproved
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : 'bg-red-500/20 text-red-300 border-red-500/30'
                            }`}
                          >
                            {isApproved ? 'Aprovado' : 'Abaixo de 7,0'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RODAPÉ */}
        <div className="p-4 bg-[#080d1a] border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span>OffClass • Sistema de Gestão de Aprendizagem & Avaliação</span>
          <span>Emitido em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

      </div>
    </div>
  );
};