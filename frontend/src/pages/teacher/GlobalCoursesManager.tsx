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
  Building2
} from 'lucide-react';

export const GlobalCoursesManager: React.FC = () => {
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [selectedInstId, setSelectedInstId] = useState<string>('');
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal de Curso
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [workload, setWorkload] = useState<number | ''>('');
  const [submitting, setSubmitting] = useState(false);

  // Carrega as instituições do professor
  useEffect(() => {
    const fetchInstitutions = async () => {
      try {
        const res = await api.get('/academic/institutions');
        setInstitutions(res.data);
        if (res.data.length > 0) {
          setSelectedInstId(res.data[0].id);
        }
      } catch (err) {
        setError('Erro ao carregar instituições.');
      }
    };
    fetchInstitutions();
  }, []);

  // Carrega os cursos da instituição selecionada
  useEffect(() => {
    if (!selectedInstId) return;
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/academic/institutions/${selectedInstId}/courses`);
        setCourses(res.data);
      } catch (err) {
        setError('Erro ao carregar cursos.');
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, [selectedInstId]);

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
        await api.put(`/academic/courses/${editingId}`, { name, workload: Number(workload) });
        setSuccessMsg('Curso atualizado com sucesso!');
      } else {
        await api.post('/academic/courses', { name, workload: Number(workload), institutionId: selectedInstId });
        setSuccessMsg('Curso cadastrado com sucesso!');
      }

      setIsModalOpen(false);
      const res = await api.get(`/academic/institutions/${selectedInstId}/courses`);
      setCourses(res.data);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar curso.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este curso?')) return;

    try {
      await api.delete(`/academic/courses/${id}`);
      setSuccessMsg('Curso excluído com sucesso!');
      const res = await api.get(`/academic/institutions/${selectedInstId}/courses`);
      setCourses(res.data);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError('Erro ao excluir curso.');
    }
  };

  const currentInstitution = institutions.find((i) => i.id === selectedInstId);

  return (
    <div className="space-y-6">
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/60 border border-slate-800 p-6 rounded-3xl backdrop-blur-xl">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-purple-400" />
            Gestão de Cursos por Instituição
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Selecione a instituição abaixo para gerenciar os cursos oferecidos na unidade.
          </p>
        </div>

        {/* SELETOR DE INSTITUIÇÃO */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedInstId}
            onChange={(e) => setSelectedInstId(e.target.value)}
            className="bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl px-4 py-2 text-xs font-bold text-white focus:outline-none w-full md:w-64 cursor-pointer"
          >
            {institutions.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleOpenCreateModal}
            disabled={!selectedInstId}
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-lg shadow-purple-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Novo Curso
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-950/50 border border-emerald-500/40 rounded-2xl flex items-center gap-3 text-emerald-300 text-xs">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-950/50 border border-red-800/80 rounded-2xl flex items-center gap-3 text-red-300 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* LISTAGEM */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 border border-slate-800/80 rounded-3xl space-y-3">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto" />
          <p className="text-sm font-bold text-slate-300">
            Nenhum curso cadastrado para {currentInstitution?.name || 'esta instituição'}
          </p>
          <p className="text-xs text-slate-500">Clique em "Novo Curso" para adicionar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div 
              key={course.id}
              className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 p-6 rounded-3xl shadow-xl flex flex-col justify-between space-y-4 transition-all"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div className="p-3 bg-purple-600/10 border border-purple-500/20 text-purple-400 rounded-2xl">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleOpenEditModal(course)}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                      title="Editar"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(course.id)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-xl transition-colors cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-black text-white">{course.name}</h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-2 font-mono">
                    <Clock className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span>Carga Horária: <strong className="text-slate-200">{course.workload}h</strong></span>
                  </p>
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

      {/* MODAL */}
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
                Unidade: <strong className="text-white">{currentInstitution?.name}</strong>
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
                  required
                  value={workload}
                  onChange={(e) => setWorkload(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Ex: 1200"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
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

export default GlobalCoursesManager;