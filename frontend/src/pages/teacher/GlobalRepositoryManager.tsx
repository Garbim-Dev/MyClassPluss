import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Globe, Search, Download, BookOpen, Layers, CheckCircle2, User, Tag } from 'lucide-react';

export const GlobalRepositoryManager: React.FC = () => {
  const [repository, setRepository] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const areas = ['Segurança do Trabalho', 'Mecânica Pesada', 'Logística', 'Eletromecânica', 'Automação'];

  const fetchGlobalQuizzes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedArea) params.append('area', selectedArea);

      const res = await api.get(`/quizzes/global/repository?${params.toString()}`);
      setRepository(res.data || []);
    } catch (err) {
      console.error('Erro ao buscar repositório global:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalQuizzes();
  }, [selectedArea]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchGlobalQuizzes();
  };

  const handleCloneQuiz = async (quizId: string, quizTitle: string) => {
    if (!confirm(`Deseja clonar a avaliação "${quizTitle}" para o seu painel particular?`)) return;

    try {
      await api.post(`/quizzes/${quizId}/clone`, {});
      setSuccessMsg(`Avaliação "${quizTitle}" clonada com sucesso! Acesse seus gerenciadores para editá-la.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert('Erro ao clonar atividade.');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* CABEÇALHO */}
      <div className="bg-slate-900/80 border border-slate-800 p-6 md:p-8 rounded-3xl shadow-xl backdrop-blur-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2.5">
            <Globe className="w-6 h-6 text-teal-400" />
            Repositório Global de Questões
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Compartilhe e descubra avaliações e quizzes criados por outros instrutores da rede técnica.
          </p>
        </div>

        {/* FILTROS DE ÁREA */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none font-bold cursor-pointer"
          >
            <option value="">Todas as Áreas de Conhecimento</option>
            {areas.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-950/50 border border-emerald-500/40 rounded-2xl flex items-center gap-3 text-emerald-300 text-xs">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* BARRA DE PESQUISA */}
      <form onSubmit={handleSearchSubmit} className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Buscar por título, palavra-chave ou conteúdo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900/80 border border-slate-800 focus:border-teal-500 rounded-2xl pl-10 pr-4 py-3 text-xs text-white focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="bg-teal-600 hover:bg-teal-500 text-white font-bold px-5 py-3 rounded-2xl text-xs transition-all shadow-lg shadow-teal-600/30 cursor-pointer"
        >
          Filtrar
        </button>
      </form>

      {/* LISTAGEM DE ITENS GLOBAIS */}
      {loading ? (
        <div className="text-center py-16 text-slate-500 text-xs">Carregando acervo compartilhado...</div>
      ) : repository.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-3xl space-y-2">
          <Layers className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm font-bold text-slate-300">Nenhuma avaliação encontrada no Repositório Global.</p>
          <p className="text-xs text-slate-500">Seja o primeiro a publicar uma prova ou quiz público para a comunidade!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {repository.map((quiz) => (
            <div
              key={quiz.id}
              className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 p-6 rounded-3xl shadow-xl flex flex-col justify-between space-y-4 transition-all"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full border bg-teal-500/10 text-teal-300 border-teal-500/30">
                    {quiz.knowledgeArea || 'Geral'}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                    {quiz.questions?.length || 0} questões
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white">{quiz.title}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1">{quiz.description || 'Sem descrição informada.'}</p>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1">
                  <User className="w-3.5 h-3.5 text-teal-400" />
                  <span>Criado por: <strong className="text-slate-200">{quiz.teacher?.name || 'Instrutor da Rede'}</strong></span>
                </div>

                {quiz.tags && quiz.tags.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <Tag className="w-3 h-3 text-slate-500" />
                    {quiz.tags.map((tag: string, idx: number) => (
                      <span key={idx} className="text-[10px] bg-slate-950 text-slate-400 px-2 py-0.5 rounded-md border border-slate-800">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => handleCloneQuiz(quiz.id, quiz.title)}
                  className="w-full bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 text-xs font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <Download className="w-4 h-4 text-teal-400" />
                  <span>Clonar para Meu Painel</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GlobalRepositoryManager;