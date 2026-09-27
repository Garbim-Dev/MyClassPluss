import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  BookmarkCheck,
  Star,
  Search,
  Tag,
  Plus,
  Trash2,
  X,
  Layers,
  Sparkles,
  Sliders,
  CheckCircle2,
  Filter,
} from 'lucide-react';

interface PersonalQuestionItem {
  id: string;
  title: string;
  type: string;
  weight: number;
  tags: string[];
  isFavorite: boolean;
  imageUrl?: string;
  options?: any[];
  sliderConfig?: any;
  justification?: string;
}

interface PersonalQuestionBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectQuestion: (question: any) => void;
}

export const PersonalQuestionBankModal: React.FC<PersonalQuestionBankModalProps> = ({
  isOpen,
  onClose,
  onSelectQuestion,
}) => {
  const [questions, setQuestions] = useState<PersonalQuestionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchQuestions();
    }
  }, [isOpen, search, selectedTag, onlyFavorites]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search.trim()) params.search = search.trim();
      if (selectedTag) params.tag = selectedTag;
      if (onlyFavorites) params.favorites = 'true';

      const res = await api.get('/academic/personal-questions', { params });
      setQuestions(res.data || []);
    } catch (err) {
      console.error('Erro ao carregar banco pessoal de questões:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await api.put(`/academic/personal-questions/${id}/favorite`);
      setQuestions((prev) =>
        prev.map((q) => (q.id === id ? { ...q, isFavorite: !q.isFavorite } : q))
      );
    } catch (err) {
      console.error('Erro ao alternar favorito:', err);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Excluir esta questão do seu acervo pessoal permanente?')) return;

    try {
      await api.delete(`/academic/personal-questions/${id}`);
      setQuestions((prev) => prev.filter((q) => q.id !== id));
    } catch (err) {
      console.error('Erro ao excluir questão:', err);
    }
  };

  // Coleta todas as tags distintas do acervo
  const allTags = Array.from(new Set(questions.flatMap((q) => q.tags || [])));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        
        {/* CABEÇALHO */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl">
              <BookmarkCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Meu Banco de Questões Pessoal</h2>
              <p className="text-xs text-slate-400">
                Seu acervo de itens validados para montagem rápida de novas avaliações
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BARRA DE FILTROS E PESQUISA */}
        <div className="p-5 border-b border-slate-800 bg-slate-900/50 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar por enunciado da questão..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => setOnlyFavorites(!onlyFavorites)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-2 cursor-pointer ${
                onlyFavorites
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              <Star className={`w-4 h-4 ${onlyFavorites ? 'fill-amber-400 text-amber-400' : ''}`} />
              <span>Apenas Favoritas</span>
            </button>
          </div>

          {/* CHIPS DE TAGS */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 shrink-0">
                <Tag className="w-3 h-3" /> Tags:
              </span>
              <button
                type="button"
                onClick={() => setSelectedTag('')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors shrink-0 ${
                  selectedTag === ''
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                Todas
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(tag === selectedTag ? '' : tag)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors shrink-0 ${
                    selectedTag === tag
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* LISTAGEM DE QUESTÕES DO ACERVO */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="py-20 text-center text-xs text-slate-400">Carregando acervo...</div>
          ) : questions.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs space-y-2">
              <BookmarkCheck className="w-10 h-10 text-slate-600 mx-auto" />
              <p>Nenhuma questão encontrada com estes filtros.</p>
              <p className="text-[11px] text-slate-600">
                Dica: Você pode salvar questões no acervo clicando no ícone de marcador diretamente ao criar novos testes.
              </p>
            </div>
          ) : (
            questions.map((q) => (
              <div
                key={q.id}
                className="p-4 bg-slate-950 border border-slate-800 hover:border-amber-500/40 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                      {q.type}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-400">
                      Peso: {q.weight} pt
                    </span>
                    {q.tags?.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                  <h4 className="text-sm font-bold text-white">{q.title}</h4>
                  {q.justification && (
                    <p className="text-xs text-slate-400 italic line-clamp-1">
                      Nota pedagógica: {q.justification}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end border-t md:border-t-0 border-slate-900 pt-2 md:pt-0">
                  {/* FAVORITAR */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleFavorite(e, q.id)}
                    className="p-2 text-slate-400 hover:text-amber-400 bg-slate-900 border border-slate-800 rounded-xl transition-colors cursor-pointer"
                    title={q.isFavorite ? 'Remover dos favoritos' : 'Favoritar questão'}
                  >
                    <Star className={`w-4 h-4 ${q.isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                  </button>

                  {/* DELETAR DO ACERVO */}
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, q.id)}
                    className="p-2 text-slate-500 hover:text-red-400 bg-slate-900 border border-slate-800 rounded-xl transition-colors cursor-pointer"
                    title="Excluir questão do acervo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {/* INSERIR NA PROVA */}
                  <button
                    type="button"
                    onClick={() => {
                      onSelectQuestion(q);
                      onClose();
                    }}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Usar Nesta Prova</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PersonalQuestionBankModal;