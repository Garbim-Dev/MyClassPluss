import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { CoursesManager } from './CoursesManager'; // 👈 Importação do gestor de cursos
import { 
  Building2, 
  Plus, 
  MapPin, 
  Edit3, 
  Trash2, 
  X, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  BookOpen,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export const InstitutionsManager: React.FC = () => {
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Estados do Modal (Criar / Editar Instituição)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Estado para controlar qual instituição está com os cursos expandidos na tela
  const [expandedInstitutionId, setExpandedInstitutionId] = useState<string | null>(null);

  const fetchInstitutions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/academic/institutions');
      setInstitutions(res.data);
    } catch (err: any) {
      setError('Erro ao carregar instituições.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstitutions();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setName('');
    setLocation('');
    setDescription('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (inst: any) => {
    setEditingId(inst.id);
    setName(inst.name);
    setLocation(inst.location || '');
    setDescription(inst.description || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (editingId) {
        await api.put(`/academic/institutions/${editingId}`, { name, location, description });
        setSuccessMsg('Instituição atualizada com sucesso!');
      } else {
        await api.post('/academic/institutions', { name, location, description });
        setSuccessMsg('Instituição cadastrada com sucesso!');
      }

      setIsModalOpen(false);
      fetchInstitutions();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar instituição.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta instituição? Todos os cursos e turmas vinculados serão removidos.')) {
      return;
    }

    try {
      await api.delete(`/academic/institutions/${id}`);
      setSuccessMsg('Instituição excluída com sucesso!');
      fetchInstitutions();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setError('Erro ao excluir instituição.');
    }
  };

  return (
    <div className="space-y-6">
      {/* CABEÇALHO DA SEÇÃO */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 border border-slate-800 p-6 rounded-3xl backdrop-blur-xl">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-500" />
            Gestão de Instituições e Cursos
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Cadastre as escolas ou polos de ensino e gerencie os cursos associados a cada unidade.
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Nova Instituição
        </button>
      </div>

      {/* MENSAGENS DE FEEDBACK */}
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

      {/* LISTAGEM DE INSTITUIÇÕES */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : institutions.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 border border-slate-800/80 rounded-3xl space-y-3">
          <Building2 className="w-12 h-12 text-slate-600 mx-auto" />
          <p className="text-sm font-bold text-slate-300">Nenhuma instituição cadastrada</p>
          <p className="text-xs text-slate-500">Clique em "Nova Instituição" para começar.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {institutions.map((inst) => {
            const isExpanded = expandedInstitutionId === inst.id;

            return (
              <div 
                key={inst.id}
                className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 p-6 rounded-3xl shadow-xl space-y-6 transition-all"
              >
                {/* CABEÇALHO DO CARD DA INSTITUIÇÃO */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-2xl mt-1">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white">{inst.name}</h3>
                      {inst.location && (
                        <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span>{inst.location}</span>
                        </p>
                      )}
                      {inst.description && (
                        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                          {inst.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => setExpandedInstitutionId(isExpanded ? null : inst.id)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-700"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                      <span>{isExpanded ? 'Ocultar Cursos' : 'Gerenciar Cursos'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      onClick={() => handleOpenEditModal(inst)}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                      title="Editar Instituição"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(inst.id)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-xl transition-colors cursor-pointer"
                      title="Excluir Instituição"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* ⚡ GESTOR DE CURSOS EXPANSÍVEL POR INSTITUIÇÃO */}
                {isExpanded && (
                  <div className="pt-4 border-t border-slate-800 animate-fade-in">
                    <CoursesManager institutionId={inst.id} institutionName={inst.name} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE CADASTRO / EDIÇÃO DE INSTITUIÇÃO */}
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
                {editingId ? 'Editar Instituição' : 'Nova Instituição'}
              </h3>
              <p className="text-xs text-slate-400">
                Preencha os dados da escola ou local de ensino.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Nome da Instituição *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: SENAI Parauapebas"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Local / Endereço / Polo</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ex: Unidade Cidade Nova"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Descrição (Opcional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalhes adicionais..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-3 text-sm text-white focus:outline-none resize-none"
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
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Instituição'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstitutionsManager;