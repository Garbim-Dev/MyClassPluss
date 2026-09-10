import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { 
  DoorClosed, 
  Plus, 
  Edit3, 
  Trash2, 
  X, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Users,
  Info
} from 'lucide-react';

export const RoomsManager: React.FC = () => {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Estados do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Buscar salas cadastradas
  const fetchRooms = async () => {
    try {
      setLoading(true);
      const res = await api.get('/academic/rooms');
      setRooms(res.data);
    } catch (err) {
      // Se a rota ainda não existir no backend, inicializa vazio
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setName('');
    setCapacity('');
    setDescription('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (room: any) => {
    setEditingId(room.id);
    setName(room.name);
    setCapacity(room.capacity || '');
    setDescription(room.description || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (editingId) {
        await api.put(`/academic/rooms/${editingId}`, { name, capacity: Number(capacity) || 0, description });
        setSuccessMsg('Ambiente físico atualizado com sucesso!');
      } else {
        await api.post('/academic/rooms', { name, capacity: Number(capacity) || 0, description });
        setSuccessMsg('Ambiente físico cadastrado com sucesso!');
      }

      setIsModalOpen(false);
      fetchRooms();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar ambiente físico.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este ambiente físico?')) return;

    try {
      await api.delete(`/academic/rooms/${id}`);
      setSuccessMsg('Ambiente removido com sucesso!');
      fetchRooms();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError('Erro ao excluir ambiente.');
    }
  };

  return (
    <div className="space-y-6">
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/60 border border-slate-800 p-6 rounded-3xl backdrop-blur-xl">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <DoorClosed className="w-6 h-6 text-amber-400" />
            Gestão de Salas e Ambientes Físicos
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Cadastre os locais físicos (Laboratórios, Oficinas, Auditórios e Salas de Aula) onde as aulas serão ministradas.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-lg shadow-amber-600/30 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Novo Ambiente Físico
        </button>
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

      {/* LISTAGEM DOS AMBIENTES */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      ) : rooms.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 border border-slate-800/80 rounded-3xl space-y-3">
          <DoorClosed className="w-12 h-12 text-slate-600 mx-auto" />
          <p className="text-sm font-bold text-slate-300">Nenhum ambiente físico cadastrado ainda.</p>
          <p className="text-xs text-slate-500">Clique em "Novo Ambiente Físico" para adicionar laboratórios e salas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => (
            <div 
              key={room.id}
              className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 p-6 rounded-3xl shadow-xl flex flex-col justify-between space-y-4 transition-all"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div className="p-3 bg-amber-600/10 border border-amber-500/20 text-amber-400 rounded-2xl">
                    <DoorClosed className="w-6 h-6" />
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleOpenEditModal(room)}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                      title="Editar"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(room.id)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-xl transition-colors cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-black text-white">{room.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {room.description || 'Nenhuma descrição informada.'}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-400 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  <span>Capacidade:</span>
                </span>
                <span className="font-bold text-amber-400 bg-amber-950/60 border border-amber-800/50 px-2.5 py-0.5 rounded-md">
                  {room.capacity ? `${room.capacity} alunos` : 'Não informada'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE CADASTRO / EDIÇÃO */}
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
                {editingId ? 'Editar Ambiente Físico' : 'Novo Ambiente Físico'}
              </h3>
              <p className="text-xs text-slate-400">
                Defina o local onde os treinamentos e aulas práticas serão realizados.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Nome do Local *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Laboratório de Informática 01"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Capacidade (Alunos)</label>
                <input
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Ex: 30"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Descrição / Equipamentos</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Projetor multimídia, 20 computadores i5, ar-condicionado."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none resize-none"
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
                  className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Ambiente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomsManager;