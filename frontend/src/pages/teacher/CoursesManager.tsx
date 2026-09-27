import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { 
  BookOpen, 
  Plus, 
  Clock, 
  Edit3, 
  Trash2, 
  X, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Layers
} from 'lucide-react';

interface CoursesManagerProps {
  institutionId: string;
  institutionName: string;
}

export const CoursesManager: React.FC<CoursesManagerProps> = ({ institutionId, institutionName }) => {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Estados do Modal de Curso
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [workload, setWorkload] = useState<number | ''>('');
  const [submitting, setSubmitting] = useState(false);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/academic/institutions/${institutionId}/courses`);
      setCourses(res.data);
    } catch (err: any) {
      setError('Erro ao carregar cursos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (institutionId) {
      fetchCourses();
    }
  }, [institutionId]);

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setName('');
    setWorkload('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (course: any) => {
    setEditingId(course.id);
    setName(course.name);
    setWorkload(course.workload);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (editingId) {
        await api.put(`/academic/courses/${editingId}`, { name, workload: Number(workload) || 1200 });
        setSuccessMsg('Curso atualizado com sucesso!');
      } else {
        await api.post('/academic/courses', { name, workload: Number(workload) || 1200, institutionId });
        setSuccessMsg('Curso cadastrado com sucesso!');
      }

      setIsModalOpen(false);
      fetchCourses();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar curso.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este curso? As turmas vinculadas poderão ser afetadas.')) {
      return;
    }

    try {
      await api.delete(`/academic/courses/${id}`);
      setSuccessMsg('Curso excluído com sucesso!');
      fetchCourses();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setError('Erro ao excluir curso.');
    }
  };

  return (
    <div className="space-y-6 bg-slate-950/40 p-6 rounded-3xl border border-slate-800/80">
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-400" />
            Cursos de {institutionName}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Gerencie os programas e formações oferecidos nesta instituição.
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition-all shadow-lg shadow-purple-600/30 flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Novo Curso
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

      {/* LISTAGEM DE CURSOS */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-slate-800 rounded-2xl space-y-2">
          <Layers className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-xs font-bold text-slate-300">Nenhum curso cadastrado para esta instituição</p>
          <p className="text-[11px] text-slate-500">Clique em "Novo Curso" para adicionar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {courses.map((course) => (
            <div 
              key={course.id}
              className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-5 rounded-2xl flex flex-col justify-between space-y-3 transition-all shadow-md"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-white">{course.name}</h4>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-purple-400" />
                    <span>Carga Horária: <strong className="text-slate-200">{course.workload}h</strong></span>
                  </div>
                </div>

                <div className="flex gap-1">
                  <button
                    onClick={() => handleOpenEditModal(course)}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    title="Editar Curso"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(course.id)}
                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                    title="Excluir Curso"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
                <span>Turmas vinculadas:</span>
                <span className="font-bold text-purple-400 bg-purple-950/60 border border-purple-800/50 px-2 py-0.5 rounded-md">
                  {course.classes?.length || 0} turmas
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE CADASTRO / EDIÇÃO DE CURSO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-white">
                {editingId ? 'Editar Curso' : 'Novo Curso'}
              </h3>
              <p className="text-xs text-slate-400">
                Vincule o curso à instituição {institutionName}.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Nome do Curso *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Técnico em Eletromecânica"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Carga Horária (Horas) *</label>
                <input
                  type="number"
                  min={1}
                  max={9999}
                  required
                  value={workload}
                  onChange={(e) => {
                    const valStr = e.target.value;
                    if (valStr === '') {
                      setWorkload('');
                      return;
                    }

                    const num = Number(valStr);
                    if (num > 9999) {
                      setWorkload(9999);
                    } else if (num < 0) {
                      setWorkload(0);
                    } else {
                      setWorkload(num); // ⚡ Passa como number em vez de string
                    }
                  }}
                  placeholder="Ex: 1200"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl text-xs transition-colors cursor-pointer border border-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Curso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoursesManager;