import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { EnrollmentChoiceModal } from './EnrollmentChoiceModal';
import { LiveQrEnrollmentModal } from './LiveQrEnrollmentModal';
import { 
  X, 
  Users, 
  UserPlus, 
  Trash2, 
  Edit3, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Mail,
  User,
  Save,
  QrCode
} from 'lucide-react';

interface ClassStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: string | null;
  classCode: string;
  courseName?: string;
}

export const ClassStudentsModal: React.FC<ClassStudentsModalProps> = ({
  isOpen,
  onClose,
  classId,
  classCode,
  courseName = 'Treinamento Técnico',
}) => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Estados de controle dos novos modais de escolha e QR Code ao vivo
  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);
  const [isLiveQrModalOpen, setIsLiveQrModalOpen] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false); // Controla se o form manual está visível na tela

  // Formulário de Cadastro / Edição Manual de Aluno
  const [editingEnrollmentId, setEditingEnrollmentId] = useState<string | null>(null);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchStudents = async () => {
    if (!classId) return;
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/academic/classes/${classId}/students`);
      
      // ⚡ Ordena os alunos alfabeticamente pelo nome (case-insensitive)
      const sortedStudents = res.data.sort((a: any, b: any) => 
        a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'accent' })
      );

      setStudents(sortedStudents);
    } catch (err) {
      setError('Erro ao carregar a lista de alunos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && classId) {
      fetchStudents();
      resetForm();
      setShowManualForm(false);
    }
  }, [isOpen, classId]);

  if (!isOpen) return null;

  const resetForm = () => {
    setEditingEnrollmentId(null);
    setEditingStudentId(null);
    setName('');
    setEmail('');
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classId) return;
    setSubmitting(true);
    setError('');

    try {
      if (editingStudentId) {
        await api.put(`/academic/students/${editingStudentId}`, { name, email });
        setSuccessMsg('Dados do aluno atualizados com sucesso!');
      } else {
        await api.post(`/academic/classes/${classId}/students`, { name, email });
        setSuccessMsg('Aluno matriculado com sucesso!');
      }

      resetForm();
      setShowManualForm(false);
      fetchStudents();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar aluno.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (st: any) => {
    setEditingEnrollmentId(st.enrollmentId);
    setEditingStudentId(st.studentId);
    setName(st.name);
    setEmail(st.email);
    setShowManualForm(true); // Abre o formulário para edição
  };

  const handleRemoveStudent = async (enrollmentId: string) => {
    if (!window.confirm('Tem certeza que deseja remover este aluno da turma?')) return;

    try {
      await api.delete(`/academic/enrollments/${enrollmentId}`);
      setSuccessMsg('Aluno removido da turma com sucesso!');
      fetchStudents();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError('Erro ao remover aluno.');
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in font-sans">
        <div className="bg-[#0b1120] border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-3xl w-full space-y-6 shadow-2xl relative max-h-[92vh] overflow-y-auto text-slate-100">
          
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Cabeçalho e Botão Principal de Matrícula */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="space-y-1">
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <Users className="w-6 h-6 text-indigo-400" />
                <span>Gerenciamento de Alunos</span>
              </h3>
              <p className="text-xs text-slate-400">
                Turma: <strong className="text-indigo-400 font-mono">{classCode}</strong> • {courseName}
              </p>
            </div>

            {/* ⚡ BOTÃO QUE ABRE O MODAL DE ESCOLHA DE MATRÍCULA */}
            <button
              type="button"
              onClick={() => setIsChoiceModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-colors cursor-pointer active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>Matricular Aluno</span>
            </button>
          </div>

          {successMsg && (
            <div className="p-3 bg-emerald-950/50 border border-emerald-500/40 rounded-xl flex items-center gap-2 text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-950/50 border border-red-800/80 rounded-xl flex items-center gap-2 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* FORMULÁRIO DE CADASTRO / EDIÇÃO MANUAL (Exibido apenas quando solicitado) */}
          {showManualForm && (
            <form onSubmit={handleSaveStudent} className="bg-[#0f172a] border border-slate-800 p-5 rounded-2xl space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wide text-slate-200 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-emerald-400" />
                  <span>{editingStudentId ? 'Editar Dados do Aluno' : 'Matrícula Manual de Aluno'}</span>
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setShowManualForm(false);
                    resetForm();
                  }}
                  className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Fechar Formulário
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    required
                    placeholder="Nome Completo do Aluno"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#0b1120] border border-slate-800 focus:border-indigo-500 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                  <input
                    type="email"
                    required
                    placeholder="E-mail institucional/pessoal"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#0b1120] border border-slate-800 focus:border-indigo-500 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className={`w-full font-bold py-2.5 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-white ${
                  editingStudentId ? 'bg-amber-600 hover:bg-amber-500' : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : editingStudentId ? (
                  <><Save className="w-4 h-4" /> Salvar Alterações</>
                ) : (
                  <><UserPlus className="w-4 h-4" /> Confirmar Matrícula Manual</>
                )}
              </button>
            </form>
          )}

          {/* LISTA DE ALUNOS MATRICULADOS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wide text-slate-300">
                Alunos Matriculados ({students.length})
              </h4>
              <span className="text-[11px] text-slate-500 italic">
                Atualização instantânea
              </span>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-12 bg-[#0f172a]/50 border border-slate-800/80 rounded-2xl space-y-2">
                <div className="w-10 h-10 bg-slate-800/50 text-slate-500 rounded-full flex items-center justify-center mx-auto">
                  <Users className="w-5 h-5" />
                </div>
                <p className="text-sm font-bold text-slate-300">Nenhum aluno matriculado nesta turma ainda.</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Clique em <strong>"Matricular Aluno"</strong> acima para cadastrar manualmente ou abrir o QR Code interativo.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {students.map((st) => (
                  <div 
                    key={st.enrollmentId}
                    className="bg-[#0f172a] border border-slate-800/80 p-3.5 rounded-xl flex items-center justify-between text-xs hover:border-slate-700 transition-colors"
                  >
                    <div className="space-y-0.5 truncate pr-2">
                      <p className="font-bold text-white truncate">{st.name}</p>
                      <p className="text-slate-400 text-[11px] truncate font-mono">{st.email}</p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-[10px] text-slate-500 hidden sm:inline font-mono">
                        Entrada: {new Date(st.joinedAt).toLocaleDateString('pt-BR')}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(st)}
                        className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-950/40 rounded-lg transition-colors cursor-pointer"
                        title="Editar aluno"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveStudent(st.enrollmentId)}
                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                        title="Remover aluno da turma"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ⚡ 1. MODAL DE ESCOLHA (Manual vs QR Code) */}
      <EnrollmentChoiceModal
        isOpen={isChoiceModalOpen}
        onClose={() => setIsChoiceModalOpen(false)}
        classCode={classCode}
        onSelectManual={() => {
          setShowManualForm(true); // Abre o formulário manual na tela principal
        }}
        onSelectQrCode={() => {
          setIsLiveQrModalOpen(true); // Abre o painel ao vivo com QR Code
        }}
      />

      {/* ⚡ 2. PAINEL DE MATRÍCULA AO VIVO (QR Code + Lista em Tempo Real) */}
      <LiveQrEnrollmentModal
        isOpen={isLiveQrModalOpen}
        onClose={() => {
          setIsLiveQrModalOpen(false);
          fetchStudents(); // Atualiza a lista principal ao fechar o painel QR Code
        }}
        classId={classId || ''}
        classCode={classCode}
        courseName={courseName}
      />
    </>
  );
};

export default ClassStudentsModal;