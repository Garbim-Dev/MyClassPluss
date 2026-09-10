import React from 'react';
import * as XLSX from 'xlsx';
import {
  X,
  Printer,
  GraduationCap,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react';

interface StudentReportItem {
  rank: number;
  userId: string;
  userName: string;
  totalGrade: number;
  isApproved: boolean;
  roundGrade?: number;
}

interface ClassReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  classNameStr: string;
  courseNameStr: string;
  students: StudentReportItem[];
}

export const ClassReportModal: React.FC<ClassReportModalProps> = ({
  isOpen,
  onClose,
  classNameStr,
  courseNameStr,
  students,
}) => {
  if (!isOpen) return null;

  const totalStudents = students.length;
  const approvedCount = students.filter((s) => s.isApproved).length;
  const failedCount = totalStudents - approvedCount;
  const classAverage =
    totalStudents > 0
      ? (students.reduce((acc, curr) => acc + curr.totalGrade, 0) / totalStudents).toFixed(1)
      : '0.0';

  const exportToExcel = () => {
    const data = students.map((s) => ({
      Posicao: `${s.rank}º`,
      Aluno: s.userName,
      Nota: s.totalGrade.toFixed(1),
      Situacao: s.isApproved ? 'APROVADO' : 'ABAIXO DA MEDIA',
      Criterio: '7.0',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Notas');

    ws['!cols'] = [{ wch: 10 }, { wch: 30 }, { wch: 15 }, { wch: 25 }, { wch: 12 }];

    XLSX.writeFile(wb, `Relatorio_OffClass_${classNameStr.replace(/\s+/g, '_')}.xlsx`);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Topo do Modal */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">
                <span>Relatório Consolidado de Desempenho</span>
              </h2>
              <p className="text-xs text-slate-400">
                <span>Turma: </span>
                <strong className="text-slate-200">{classNameStr}</strong>
                <span> • Curso: </span>
                <span>{courseNameStr}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportToExcel}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
              title="Exportar planilha Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Exportar Excel</span>
            </button>

            <button
              onClick={handlePrintPdf}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Imprimir ou Salvar PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Indicadores Gerais */}
        <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-950/40 border-b border-slate-800/80">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center">
            <span className="text-xs font-bold text-slate-400 block">
              <span>Total de Alunos</span>
            </span>
            <span className="text-2xl font-black text-white mt-1 block">{totalStudents}</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center">
            <span className="text-xs font-bold text-slate-400 block">
              <span>Média Geral da Sala</span>
            </span>
            <span className="text-2xl font-black text-blue-400 mt-1 block">{classAverage}</span>
          </div>

          <div className="bg-emerald-950/30 border border-emerald-500/30 p-4 rounded-2xl text-center">
            <span className="text-xs font-bold text-emerald-400 block">
              <span>Aprovados (≥ 7,0)</span>
            </span>
            <span className="text-2xl font-black text-emerald-300 mt-1 block">{approvedCount}</span>
          </div>

          <div className="bg-amber-950/30 border border-amber-500/30 p-4 rounded-2xl text-center">
            <span className="text-xs font-bold text-amber-400 block">
              <span>Recuperação (&lt; 7,0)</span>
            </span>
            <span className="text-2xl font-black text-amber-300 mt-1 block">{failedCount}</span>
          </div>
        </div>

        {/* Tabela de Alunos e Notas */}
        <div className="p-6 overflow-y-auto flex-1">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-black text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">
                  <span>Posição</span>
                </th>
                <th className="py-3 px-4">
                  <span>Nome do Aluno</span>
                </th>
                <th className="py-3 px-4 text-center">
                  <span>Nota Final (0 - 10)</span>
                </th>
                <th className="py-3 px-4 text-right">
                  <span>Situação</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500 italic">
                    <span>Nenhuma resposta registrada nesta sessão.</span>
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.userId} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-black text-slate-400">
                      <span>#{s.rank}</span>
                    </td>
                    <td className="py-3 px-4 font-bold text-white text-sm">
                      <span>{s.userName}</span>
                    </td>
                    <td className="py-3 px-4 text-center font-black text-base">
                      <span className={s.isApproved ? 'text-emerald-300' : 'text-amber-400'}>
                        {s.totalGrade.toFixed(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-black">
                      {s.isApproved ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Aprovado</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-full text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Abaixo de 7,0</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé do Modal */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-500">
          <span>
            <span>Sistema OffClass • Relatório emitido em </span>
            <span>{new Date().toLocaleDateString('pt-BR')}</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition-colors cursor-pointer"
          >
            <span>Fechar</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClassReportModal;