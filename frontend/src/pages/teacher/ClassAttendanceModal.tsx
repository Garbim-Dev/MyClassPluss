import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Users, Calendar, Check, X, AlertCircle, Loader2, Save, UserCheck, ShieldAlert } from 'lucide-react';

interface ClassAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: string | null;
  classCode: string;
  courseName: string;
}

interface StudentAttendanceItem {
  userId: string;
  name: string;
  email: string;
  status: 'PRESENTE' | 'FALTA' | 'JUSTIFICADO';
}

export const ClassAttendanceModal: React.FC<ClassAttendanceModalProps> = ({
  isOpen,
  onClose,
  classId,
  classCode,
  courseName,
}) => {
  const [students, setStudents] = useState<StudentAttendanceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0] // Data de hoje padrão (YYYY-MM-DD)
  );
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Busca os alunos matriculados e a chamada da data selecionada (se já houver)
  const fetchClassStudentsAndAttendance = async () => {
    if (!classId) return;
    setLoading(true);
    setFeedbackMsg(null);
    try {
      // 1. Busca alunos da turma
      const resStudents = await api.get(`/academic/classes/${classId}/students`);
      const list = resStudents.data || [];

      // 2. Busca registros de chamada já salvos para esta data (se existirem)
      let existingAttendance: any[] = [];
      try {
        const resAtt = await api.get(`/academic/classes/${classId}/attendance`, {
          params: { date: selectedDate },
        });
        existingAttendance = resAtt.data || [];
      } catch (e) {
        // Se ainda não houver chamada salva para hoje, segue padrão
      }

      // Mapeia os alunos ordenados alfabeticamente com o status correspondente
      const mapped: StudentAttendanceItem[] = list
        .map((s: any) => {
          const foundRecord = existingAttendance.find((att: any) => att.userId === s.studentId);
          return {
            userId: s.studentId,
            name: s.name,
            email: s.email,
            status: foundRecord ? foundRecord.status : 'PRESENTE', // Padrão é PRESENTE
          };
        })
        .sort((a: any, b: any) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'accent' }));

      setStudents(mapped);
    } catch (err) {
      console.error('Erro ao carregar dados de chamada:', err);
      setFeedbackMsg({ type: 'error', text: 'Não foi possível carregar os alunos da turma.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && classId) {
      fetchClassStudentsAndAttendance();
    }
  }, [isOpen, classId, selectedDate]);

  // Alterna o status do aluno (PRESENTE -> FALTA -> JUSTIFICADO -> PRESENTE)
  const handleToggleStatus = (userId: string) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.userId !== userId) return s;
        let nextStatus: 'PRESENTE' | 'FALTA' | 'JUSTIFICADO' = 'PRESENTE';
        if (s.status === 'PRESENTE') nextStatus = 'FALTA';
        else if (s.status === 'FALTA') nextStatus = 'JUSTIFICADO';
        else nextStatus = 'PRESENTE';

        return { ...s, status: nextStatus };
      })
    );
  };

  // Marcar todos como Presente ou Falta em lote
  const handleMarkAll = (status: 'PRESENTE' | 'FALTA') => {
    setStudents((prev) => prev.map((s) => ({ ...s, status })));
  };

  // Salvar a chamada no backend
  const handleSaveAttendance = async () => {
    if (!classId) return;
    setSaving(true);
    setFeedbackMsg(null);

    try {
      await api.post(`/academic/classes/${classId}/attendance`, {
        date: selectedDate,
        records: students.map((s) => ({
          userId: s.userId,
          status: s.status,
        })),
      });

      setFeedbackMsg({ type: 'success', text: 'Chamada salva com sucesso!' });
      setTimeout(() => {
        setFeedbackMsg(null);
      }, 3000);
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.response?.data?.message || 'Erro ao salvar a chamada. Tente novamente.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const totalPresentes = students.filter((s) => s.status === 'PRESENTE').length;
  const totalFaltas = students.filter((s) => s.status === 'FALTA').length;
  const totalJustificados = students.filter((s) => s.status === 'JUSTIFICADO').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in font-sans">
      <div className="bg-[#0b1120] border border-slate-800 rounded-3xl w-full max-w-4xl h-[90vh] shadow-2xl overflow-hidden text-slate-100 flex flex-col">
        
        {/* CABEÇALHO */}
        <div className="p-6 bg-[#080d1a] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Diário de Classe • Chamada Diária</h2>
              <p className="text-xs text-slate-400">
                Turma: <span className="font-mono text-blue-400 font-bold">{classCode}</span> • {courseName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BARRA DE FILTRO DE DATA E AÇÕES RÁPIDAS */}
        <div className="bg-slate-900/80 px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-slate-400 font-medium">Data da Aula:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleMarkAll('PRESENTE')}
              className="text-[11px] font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
            >
              Marcar Todos Presentes
            </button>
            <button
              type="button"
              onClick={() => handleMarkAll('FALTA')}
              className="text-[11px] font-bold bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
            >
              Marcar Todos Faltas
            </button>
          </div>
        </div>

        {/* FEEDBACK DE ERRO OU SUCESSO */}
        {feedbackMsg && (
          <div
            className={`mx-6 mt-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                : 'bg-red-950/60 border border-red-800 text-red-300'
            }`}
          >
            {feedbackMsg.type === 'success' ? <Check className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* LISTAGEM DE ALUNOS */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <span>Carregando lista de alunos da turma...</span>
            </div>
          ) : students.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
              <Users className="w-10 h-10 text-slate-600" />
              <p className="text-sm font-bold text-slate-300">Nenhum aluno matriculado nesta turma</p>
              <p className="text-xs text-slate-500 max-w-xs">
                Matricule alunos na turma antes de realizar a chamada.
              </p>
            </div>
          ) : (
            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-[#0f172a]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                    <th className="p-3.5 pl-5">Nº / Aluno</th>
                    <th className="p-3.5">E-mail</th>
                    <th className="p-3.5 text-center pr-5">Status de Presença (Clique para Alterar)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {students.map((student, idx) => {
                    const isPresente = student.status === 'PRESENTE';
                    const isFalta = student.status === 'FALTA';
                    const isJustificado = student.status === 'JUSTIFICADO';

                    return (
                      <tr key={student.userId} className="hover:bg-slate-900/40 transition-colors">
                        <td className="p-3.5 pl-5">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 font-mono font-bold text-[11px] flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-white">{student.name}</span>
                          </div>
                        </td>
                        <td className="p-3.5 font-mono text-slate-400">{student.email}</td>
                        <td className="p-3.5 text-center pr-5">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(student.userId)}
                            className={`px-4 py-1.5 rounded-xl font-black text-[11px] border transition-all cursor-pointer shadow-sm inline-flex items-center gap-1.5 ${
                              isPresente
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                                : isFalta
                                ? 'bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                            }`}
                          >
                            {isPresente && <Check className="w-3.5 h-3.5" />}
                            {isFalta && <X className="w-3.5 h-3.5" />}
                            {isJustificado && <ShieldAlert className="w-3.5 h-3.5" />}
                            <span>{student.status}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* RODAPÉ COM RESUMO E BOTÃO DE SALVAR */}
        <div className="p-4 bg-[#080d1a] border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 text-slate-400 font-medium">
            <span>Total Matriculados: <strong className="text-white">{students.length}</strong></span>
            <span className="text-emerald-400">Presentes: <strong>{totalPresentes}</strong></span>
            <span className="text-red-400">Faltas: <strong>{totalFaltas}</strong></span>
            <span className="text-amber-400">Justificados: <strong>{totalJustificados}</strong></span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors cursor-pointer w-full sm:w-auto"
            >
              Fechar
            </button>
            <button
              type="button"
              disabled={saving || students.length === 0}
              onClick={handleSaveAttendance}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 w-full sm:w-auto"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Salvar Chamada</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};