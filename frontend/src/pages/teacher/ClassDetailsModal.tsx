import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import * as XLSX from 'xlsx';
import { ClassAttendanceModal } from './ClassAttendanceModal';
import {
  X,
  Users,
  GraduationCap,
  Award,
  CheckCircle2,
  AlertCircle,
  Download,
  Printer,
  Search,
  BookOpen,
  Calendar,
  Layers,
  MapPin,
  Clock,
  UserCheck,
} from 'lucide-react';

interface ClassDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: string | null;
}

export const ClassDetailsModal: React.FC<ClassDetailsModalProps> = ({
  isOpen,
  onClose,
  classId,
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // ⚡ Estado para controlar a abertura do Modal de Chamada (Diário de Frequência)
  const [isAttendanceOpen, setIsAttendanceOpen] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && classId) {
      fetchClassDetails(classId);
    }
  }, [isOpen, classId]);

  const fetchClassDetails = async (id: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/academic/classes/${id}/performance`);
      setData(res.data);
    } catch (err) {
      console.error('Erro ao buscar dados da turma:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !classId) return null;

  const filteredStudents = data?.students?.filter((s: any) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.enrollmentNumber || s.registration || '').toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleExportExcel = () => {
    if (!data || !data.students?.length) return;

    const rows = data.students.map((s: any, idx: number) => ({
      'Nº': idx + 1,
      'Matrícula': s.enrollmentNumber || s.registration || 'MAT-100',
      'Nome do Aluno': s.name,
      'E-mail': s.email,
      'Atividades Realizadas': s.activitiesCount ?? s.totalActivities ?? 0,
      'Acertos': s.correctCount ?? s.totalCorrect ?? 0,
      'Precisão (%)': `${s.accuracyRate ?? s.precision ?? 0}%`,
      'Média Final (0 a 10)': Number(s.averageGrade ?? s.finalGrade ?? 0).toFixed(1),
      'Situação': (s.isApproved ?? (s.finalGrade >= 7.0)) ? 'APROVADO' : 'EM RECUPERAÇÃO',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pauta_Turma');
    XLSX.writeFile(wb, `Pauta_${data.classInfo?.code || data.classCode || 'Turma'}_Desempenho.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  const classCodeStr = data?.classInfo?.code || data?.classCode || 'Turma';
  const courseNameStr = data?.classInfo?.courseName || data?.courseName || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header do Modal */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 flex-wrap gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-blue-600/20 text-blue-400 rounded-2xl">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-white">
                  {classCodeStr}
                </h2>
                <span className="text-xs font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2.5 py-0.5 rounded-full">
                  Dossiê da Turma
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {courseNameStr} • Média Mínima para Aprovação: <strong className="text-slate-200">7,0 pts</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* ⚡ BOTÃO DE REALIZAR CHAMADA (DIÁRIO DE CLASSE) */}
            <button
              type="button"
              onClick={() => setIsAttendanceOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>Realizar Chamada</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={loading || !data?.students?.length}
              className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Exportar Excel</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={loading}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
            >
              <Printer className="w-4 h-4 text-blue-400" />
              <span>Imprimir</span>
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

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400">Carregando dados pedagógicos dos alunos...</p>
          </div>
        ) : (
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {/* Cards de Métricas da Turma */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span>Matriculados</span>
                </span>
                <p className="text-2xl font-black text-white">
                  {data?.summary?.enrolledCount ?? data?.totalStudents ?? 0}
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>Média da Turma</span>
                </span>
                <p className="text-2xl font-black text-amber-300">
                  {Number(data?.summary?.classAverage ?? data?.classAverage ?? 0).toFixed(1)}
                  <span className="text-xs text-slate-500 font-normal ml-1">/ 10.0</span>
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Aprovados (≥ 7,0)</span>
                </span>
                <p className="text-2xl font-black text-emerald-400">
                  {data?.summary?.approvedCount ?? data?.approvedCount ?? 0}
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span>Aproveitamento</span>
                </span>
                <p className="text-2xl font-black text-purple-300">
                  {data?.summary?.approvalRate ?? data?.overallPrecision ?? 0}%
                </p>
              </div>
            </div>

            {/* Barra de Pesquisa */}
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Buscar aluno por nome ou matrícula..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <span className="text-xs text-slate-400">
                Exibindo <strong className="text-white">{filteredStudents.length}</strong> aluno(s)
              </span>
            </div>

            {/* Tabela de Desempenho dos Alunos */}
            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                    <th className="p-3.5">Matrícula</th>
                    <th className="p-3.5">Nome do Aluno</th>
                    <th className="p-3.5 text-center">Atividades</th>
                    <th className="p-3.5 text-center">Acertos</th>
                    <th className="p-3.5 text-center">Precisão</th>
                    <th className="p-3.5 text-right">Média Final</th>
                    <th className="p-3.5 text-center">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500 italic">
                        Nenhum aluno matriculado ou encontrado nesta turma.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student: any) => {
                      const activities = student.activitiesCount ?? student.totalActivities ?? 0;
                      const correct = student.correctCount ?? student.totalCorrect ?? 0;
                      const accuracy = student.accuracyRate ?? student.precision ?? 0;
                      const grade = Number(student.averageGrade ?? student.finalGrade ?? 0);
                      const approved = student.isApproved ?? (grade >= 7.0);

                      return (
                        <tr key={student.id} className="hover:bg-slate-900/50 transition-colors">
                          <td className="p-3.5 font-mono text-slate-400">
                            {student.enrollmentNumber || student.registration || 'MAT-100'}
                          </td>
                          <td className="p-3.5">
                            <div className="font-bold text-white text-sm">{student.name}</div>
                            <div className="text-[11px] text-slate-500">{student.email}</div>
                          </td>
                          <td className="p-3.5 text-center text-slate-300 font-semibold">{activities}</td>
                          <td className="p-3.5 text-center text-emerald-400 font-semibold">{correct}</td>
                          <td className="p-3.5 text-center">
                            <span className="bg-slate-900 px-2 py-1 rounded-lg border border-slate-800 text-slate-300 font-bold">
                              {accuracy}%
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <span
                              className={
                                'text-sm font-black ' +
                                (approved ? 'text-emerald-400' : 'text-amber-400')
                              }
                            >
                              {grade.toFixed(1)}
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            <span
                              className={
                                'px-2.5 py-1 rounded-full text-[10px] font-black border ' +
                                (approved
                                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30')
                              }
                            >
                              {approved ? 'APROVADO' : 'RECUPERAÇÃO'}
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
        )}
      </div>

      {/* ⚡ MODAL DE CHAMADA (DIÁRIO DE FREQUÊNCIA) INTEGRADO */}
      <ClassAttendanceModal
        isOpen={isAttendanceOpen}
        onClose={() => setIsAttendanceOpen(false)}
        classId={classId}
        classCode={classCodeStr}
        courseName={courseNameStr}
      />
    </div>
  );
};

export default ClassDetailsModal;