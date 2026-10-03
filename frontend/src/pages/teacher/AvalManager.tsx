import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { AiImportModal } from './AiImportModal';
import { ExamPrintModal } from './ExamPrintModal';
import { PersonalQuestionBankModal } from './PersonalQuestionBankModal';
import {
  BookmarkCheck,
  BookmarkPlus,
  FileCheck2,
  PlusCircle,
  Trash2,
  Sparkles,
  Layers,
  AlertCircle,
  Image as ImageIcon,
  X,
  Plus,
  Check,
  X as XIcon,
  Sliders,
  FileText,
  Edit3,
  RotateCcw,
  Award,
  HelpCircle,
  Clock,
  Globe,
  Tag,
  Printer,
  Filter,
  BookOpen,
} from 'lucide-react';

type QuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'FAST_ANSWER' | 'SLIDER' | 'PUZZLE';

interface QuestionDraft {
  id: string;
  title: string;
  imageUrl?: string;
  type: QuestionType;
  weight: number;
  justification: string;
  options: { text: string; color: string; isCorrect: boolean; correctOrder?: number }[];
  tfCorrectIndex: number;
  shortAnswerKeywords: string[];
  sliderConfig: {
    min: number;
    max: number;
    target: number;
    tolerance: number;
    unit: string;
  };
}

const DRAFT_KEY = '@MyClassPluss:draft_eval';
const EDITING_ID_KEY = '@MyClassPluss:editing_eval_id';

const createInitialQuestion = (id: string): QuestionDraft => ({
  id,
  title: '',
  imageUrl: '',
  type: 'MULTIPLE_CHOICE',
  weight: 2.5,
  justification: '',
  options: [
    { text: '', color: 'red', isCorrect: true, correctOrder: 0 },
    { text: '', color: 'blue', isCorrect: false, correctOrder: 1 },
    { text: '', color: 'yellow', isCorrect: false, correctOrder: 2 },
    { text: '', color: 'green', isCorrect: false, correctOrder: 3 },
  ],
  tfCorrectIndex: 1,
  shortAnswerKeywords: ['', '', ''],
  sliderConfig: { min: 0, max: 100, target: 50, tolerance: 0, unit: 'bar' },
});

export const AvalManager: React.FC = () => {
  const savedDraft = React.useMemo(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }, []);

  const [subjects, setSubjects] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(() => {
    return savedDraft?.selectedSubjectId || '';
  });

  // ⚡ Filtro da listagem de avaliações por disciplina
  const [filterSubjectId, setFilterSubjectId] = useState<string>('ALL');

  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [editingEvalId, setEditingEvalId] = useState<string | null>(() => {
    return localStorage.getItem(EDITING_ID_KEY) || null;
  });

  const [isQuestionBankOpen, setIsQuestionBankOpen] = useState(false);

  const [printExamData, setPrintExamData] = useState<any | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [quizToPublish, setQuizToPublish] = useState<any>(null);
  const [knowledgeArea, setKnowledgeArea] = useState('Segurança do Trabalho');
  const [tagsInput, setTagsInput] = useState('');
  const [publishing, setPublishing] = useState(false);

  const [title, setTitle] = useState<string>(() => savedDraft?.title || '');
  const [description, setDescription] = useState<string>(() => savedDraft?.description || '');
  const [durationMinutes, setDurationMinutes] = useState<number>(() => {
    return Number(savedDraft?.durationMinutes) || 45;
  });

  const [questions, setQuestions] = useState<QuestionDraft[]>(() => {
    if (savedDraft?.questions && Array.isArray(savedDraft.questions) && savedDraft.questions.length > 0) {
      return savedDraft.questions;
    }
    return [createInitialQuestion('1')];
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const saveStateToStorage = () => {
    try {
      const payload = {
        title,
        description,
        selectedSubjectId,
        durationMinutes,
        questions,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
      if (editingEvalId) {
        localStorage.setItem(EDITING_ID_KEY, editingEvalId);
      } else {
        localStorage.removeItem(EDITING_ID_KEY);
      }
    } catch (e) {}
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      saveStateToStorage();
    }, 400);
    return () => clearTimeout(timer);
  }, [title, description, selectedSubjectId, durationMinutes, questions, editingEvalId]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (window.document.visibilityState === 'hidden') {
        saveStateToStorage();
      }
    };
    const handleBeforeUnload = () => {
      saveStateToStorage();
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [title, description, selectedSubjectId, durationMinutes, questions, editingEvalId]);

  const clearFormDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
      localStorage.removeItem(EDITING_ID_KEY);
    } catch (e) {}
  };

  const formatImageUrl = (url?: string | null): string => {
    if (!url) return '';
    let target = url.trim();

    if (target.startsWith('http://') || target.startsWith('https://')) {
      try {
        const parsed = new URL(target);
        return encodeURI(`${window.location.protocol}//${window.location.hostname}:3000${parsed.pathname}${parsed.search}`);
      } catch (e) {
        return encodeURI(target);
      }
    }

    const slash = target.startsWith('/') ? '' : '/';
    return encodeURI(`${window.location.protocol}//${window.location.hostname}:3000${slash}${target}`);
  };

  const fetchData = async () => {
    try {
      const [subRes, quizRes] = await Promise.all([
        api.get('/academic/subjects'),
        api.get('/quizzes'),
      ]);
      setSubjects(subRes.data || []);
      const allQuizzes = quizRes.data || [];

      setEvaluations(
        allQuizzes.filter(
          (q: any) =>
            q.type === 'AVALIAÇAO' ||
            q.type === 'AVALIACAO' ||
            String(q.type)
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '') === 'AVALIACAO'
        )
      );

      if (subRes.data?.length > 0 && !selectedSubjectId) {
        setSelectedSubjectId(subRes.data[0].id);
      }
    } catch (e) {
      console.error('Erro ao buscar disciplinas/avaliações:', e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ⚡ FILTRAGEM PRECISA DAS AVALIAÇÕES PELA DISCIPLINA SELECIONADA
  const filteredEvaluations = useMemo(() => {
    if (filterSubjectId === 'ALL') {
      return evaluations;
    }
    return evaluations.filter(
      (ev) => ev.subjectId === filterSubjectId || ev.subject?.id === filterSubjectId
    );
  }, [evaluations, filterSubjectId]);

  const selectedFilterSubjectName = useMemo(() => {
    if (filterSubjectId === 'ALL') return 'Todas as Disciplinas';
    const found = subjects.find((s) => s.id === filterSubjectId);
    return found?.name || 'Disciplina Selecionada';
  }, [subjects, filterSubjectId]);

  const handleAddQuestion = () => {
    setQuestions([...questions, createInitialQuestion(Date.now().toString())]);
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length === 1) {
      alert('A avaliação precisa ter pelo menos 1 questão cadastrada.');
      return;
    }
    setQuestions(questions.filter((_, idx) => idx !== index));
  };

  const handleUpdateQuestion = (index: number, field: keyof QuestionDraft, value: any) => {
    const updated = [...questions];
    (updated[index] as any)[field] = value;
    setQuestions(updated);
  };

  const handleImportFromPersonalBank = (savedQ: any) => {
    const newQuestion = {
      id: Date.now().toString(),
      title: savedQ.title,
      imageUrl: savedQ.imageUrl || '',
      type: savedQ.type,
      weight: Number(savedQ.weight) || 2.5,
      justification: savedQ.justification || '',
      options: savedQ.options || [],
      tfCorrectIndex: 1,
      shortAnswerKeywords: ['', '', ''],
      sliderConfig: savedQ.sliderConfig || { min: 0, max: 100, target: 50, tolerance: 0, unit: 'bar' },
    };
    setQuestions((prev) => [...prev, newQuestion]);
  };

  const handleSaveToPersonalBank = async (q: QuestionDraft) => {
    const tagInput = window.prompt(
      'Digite tags para catalogar esta questão no seu acervo (separadas por vírgula):',
      'Segurança, NR-12'
    );
    if (tagInput === null) return;

    try {
      const tags = tagInput.split(',').map((t) => t.trim().toLowerCase());
      await api.post('/academic/personal-questions', {
        title: q.title,
        type: q.type,
        weight: q.weight,
        justification: q.justification,
        imageUrl: q.imageUrl,
        options: q.options,
        sliderConfig: q.sliderConfig,
        tags,
        isFavorite: true,
      });
      alert('Questão adicionada ao seu Banco Pessoal com sucesso!');
    } catch (err) {
      alert('Erro ao salvar no banco pessoal.');
    }
  };

  const handleUpdateOptionText = (qIndex: number, optIndex: number, text: string) => {
    const updated = [...questions];
    updated[qIndex].options[optIndex].text = text;
    setQuestions(updated);
  };

  const handleSetCorrectOption = (qIndex: number, optIndex: number) => {
    const updated = [...questions];
    updated[qIndex].options.forEach((opt, idx) => {
      opt.isCorrect = idx === optIndex;
    });
    setQuestions(updated);
  };

  const handleUpdateShortKeyword = (qIndex: number, keywordIndex: number, value: string) => {
    const updated = [...questions];
    updated[qIndex].shortAnswerKeywords[keywordIndex] = value;
    setQuestions(updated);
  };

  const handleUpdateSliderConfig = (qIndex: number, field: string, value: any) => {
    const updated = [...questions];
    (updated[qIndex].sliderConfig as any)[field] = value;
    setQuestions(updated);
  };

  const handleImageUpload = async (qIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data) {
        const savedUrl = res.data.url || res.data.fileUrl || `/uploads/${res.data.filename}`;
        handleUpdateQuestion(qIndex, 'imageUrl', savedUrl);
      }
    } catch (err: any) {
      console.error('Erro ao enviar imagem para o servidor:', err);
      alert(err.response?.data?.message || 'Erro ao realizar upload da imagem.');
    }
  };

  const handleOpenPrintPreview = async (ev: any) => {
    try {
      const res = await api.get(`/quizzes/${ev.id}`);
      const fullExam = res.data || ev;
      
      if (!fullExam.subjectName && fullExam.subject?.name) {
        fullExam.subjectName = fullExam.subject.name;
      }
      
      setPrintExamData(fullExam);
      setIsPrintModalOpen(true);
    } catch (err) {
      console.warn('Não foi possível carregar os detalhes pela API, usando dados locais:', err);
      setPrintExamData(ev);
      setIsPrintModalOpen(true);
    }
  };

  const handleOpenPublishModal = (ev: any) => {
    setQuizToPublish(ev);
    setKnowledgeArea(ev.knowledgeArea || 'Segurança do Trabalho');
    setTagsInput(ev.tags ? ev.tags.join(', ') : '');
    setIsPublishModalOpen(true);
  };

  const handleConfirmPublish = async () => {
    if (!quizToPublish) return;
    setPublishing(true);

    try {
      const tagsArray = tagsInput
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0);

      const newPublicState = !quizToPublish.isPublic;

      await api.put(`/quizzes/${quizToPublish.id}/publish`, {
        isPublic: newPublicState,
        knowledgeArea,
        tags: tagsArray,
      });

      alert(
        newPublicState
          ? 'Avaliação publicada no Repositório Global com sucesso!'
          : 'Avaliação retirada do Repositório Global.'
      );
      setIsPublishModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Erro ao publicar avaliação:', err);
      alert('Erro ao atualizar status de publicação.');
    } finally {
      setPublishing(false);
    }
  };

  const handleImportFromAi = (data: any) => {
    if (data.title) setTitle(data.title);
    if (data.description) setDescription(data.description);
    if (data.durationMinutes) setDurationMinutes(Number(data.durationMinutes));

    if (data.questions && data.questions.length > 0) {
      const mapped: QuestionDraft[] = data.questions.map((q: any, qIdx: number) => {
        const qType: QuestionType = q.type || 'MULTIPLE_CHOICE';

        let sliderParsed = { min: 0, max: 100, target: 50, tolerance: 0, unit: 'bar' };
        if (q.sliderConfig) {
          sliderParsed = {
            min: Number(q.sliderConfig.min || 0),
            max: Number(q.sliderConfig.max || 100),
            target: Number(q.sliderConfig.target || 50),
            tolerance: Number(q.sliderConfig.tolerance || 0),
            unit: q.sliderConfig.unit || '',
          };
        }

        const keywords = ['', '', ''];
        if (qType === 'FAST_ANSWER' && q.options) {
          q.options.forEach((opt: any, idx: number) => {
            if (idx < 3) keywords[idx] = opt.text || '';
          });
        }

        let tfIdx = 1;
        if (qType === 'TRUE_FALSE' && q.options) {
          const correctOpt = q.options.find((opt: any) => opt.isCorrect);
          tfIdx = correctOpt?.text?.toLowerCase() === 'falso' ? 0 : 1;
        }

        const defaultOpts = [
          { text: '', color: 'red', isCorrect: true, correctOrder: 0 },
          { text: '', color: 'blue', isCorrect: false, correctOrder: 1 },
          { text: '', color: 'yellow', isCorrect: false, correctOrder: 2 },
          { text: '', color: 'green', isCorrect: false, correctOrder: 3 },
        ];

        if (q.options && q.options.length > 0) {
          q.options.forEach((opt: any, idx: number) => {
            if (idx < 4) {
              defaultOpts[idx] = {
                text: opt.text || '',
                color: opt.color || defaultOpts[idx].color,
                isCorrect: Boolean(opt.isCorrect),
                correctOrder: opt.correctOrder ?? idx,
              };
            }
          });
        }

        return {
          id: (Date.now() + qIdx).toString(),
          title: q.title || '',
          imageUrl: q.imageUrl || '',
          type: qType,
          weight: q.weight !== undefined ? Number(q.weight) : 2.5,
          justification: q.justification || '',
          options: defaultOpts,
          tfCorrectIndex: tfIdx,
          shortAnswerKeywords: keywords,
          sliderConfig: sliderParsed,
        };
      });

      setQuestions(mapped);
    }
  };

  const handleEditEval = (ev: any) => {
    setEditingEvalId(ev.id);
    localStorage.setItem(EDITING_ID_KEY, ev.id);

    setTitle(ev.title);
    setDescription(ev.description || '');
    setDurationMinutes(Number(ev.durationMinutes) || 45);
    setSelectedSubjectId(ev.subjectId || '');

    if (ev.questions && ev.questions.length > 0) {
      const loaded: QuestionDraft[] = ev.questions.map((q: any) => {
        let sliderParsed = { min: 0, max: 100, target: 50, tolerance: 0, unit: 'bar' };
        if (q.sliderConfig) {
          try {
            sliderParsed =
              typeof q.sliderConfig === 'string'
                ? JSON.parse(q.sliderConfig)
                : q.sliderConfig;
          } catch (e) {}
        }

        const keywords = ['', '', ''];
        if (q.type === 'FAST_ANSWER' && q.options) {
          q.options.forEach((opt: any, idx: number) => {
            if (idx < 3) keywords[idx] = opt.text;
          });
        }

        let tfIdx = 1;
        if (q.type === 'TRUE_FALSE' && q.options) {
          const correctOpt = q.options.find((opt: any) => opt.isCorrect);
          tfIdx = correctOpt?.text === 'Verdadeiro' ? 1 : 0;
        }

        const defaultOpts = [
          { text: '', color: 'red', isCorrect: true, correctOrder: 0 },
          { text: '', color: 'blue', isCorrect: false, correctOrder: 1 },
          { text: '', color: 'yellow', isCorrect: false, correctOrder: 2 },
          { text: '', color: 'green', isCorrect: false, correctOrder: 3 },
        ];

        if (q.options && q.options.length > 0) {
          const sortedOptions = [...q.options].sort(
            (a: any, b: any) => (a.correctOrder ?? 0) - (b.correctOrder ?? 0)
          );
          sortedOptions.forEach((opt: any, idx: number) => {
            if (idx < 4) {
              defaultOpts[idx] = {
                text: opt.text,
                color: opt.color || defaultOpts[idx].color,
                isCorrect: opt.isCorrect,
                correctOrder: opt.correctOrder ?? idx,
              };
            }
          });
        }

        return {
          id: q.id || Date.now().toString(),
          title: q.title,
          imageUrl: q.imageUrl || '',
          type: q.type || 'MULTIPLE_CHOICE',
          weight: q.weight !== undefined ? Number(q.weight) : 2.5,
          justification: q.justification || '',
          options: defaultOpts,
          tfCorrectIndex: tfIdx,
          shortAnswerKeywords: keywords,
          sliderConfig: sliderParsed,
        };
      });

      setQuestions(loaded);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    clearFormDraft();
    setEditingEvalId(null);
    setTitle('');
    setDescription('');
    setDurationMinutes(45);
    setQuestions([createInitialQuestion('1')]);
    setError('');
  };

  const handleSaveEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedSubjectId) {
      setError('Selecione uma disciplina vinculada antes de salvar.');
      return;
    }

    if (!title.trim()) {
      setError('Informe o título da avaliação formal.');
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.title.trim()) {
        setError(`Preencha o enunciado da Questão ${i + 1}.`);
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        type: 'AVALIACAO',
        durationMinutes: Number(durationMinutes) || 45,
        subjectId: selectedSubjectId,
        questions: questions.map((q, idx) => {
          let formattedOptions: any[] = [];

          if (q.type === 'MULTIPLE_CHOICE') {
            formattedOptions = q.options.map((opt, oIdx) => ({
              text: opt.text || `Opção ${oIdx + 1}`,
              color: opt.color || (['red', 'blue', 'yellow', 'green'][oIdx] as string),
              isCorrect: Boolean(opt.isCorrect),
              correctOrder: oIdx,
            }));
          } else if (q.type === 'TRUE_FALSE') {
            formattedOptions = [
              {
                text: 'Verdadeiro',
                color: 'blue',
                isCorrect: q.tfCorrectIndex === 1,
                correctOrder: 0,
              },
              {
                text: 'Falso',
                color: 'red',
                isCorrect: q.tfCorrectIndex === 0,
                correctOrder: 1,
              },
            ];
          } else if (q.type === 'FAST_ANSWER') {
            formattedOptions = q.shortAnswerKeywords
              .filter((k) => k && k.trim().length > 0)
              .map((keyword, kIdx) => ({
                text: keyword.trim(),
                color: 'emerald',
                isCorrect: true,
                correctOrder: kIdx,
              }));
          } else if (q.type === 'PUZZLE') {
            formattedOptions = q.options.map((opt, oIdx) => ({
              text: opt.text || `Etapa ${oIdx + 1}`,
              color: 'purple',
              isCorrect: true,
              correctOrder: oIdx,
            }));
          }

          return {
            title: q.title.trim(),
            imageUrl: q.imageUrl || undefined,
            type: q.type,
            timeLimitSeconds: (Number(durationMinutes) || 45) * 60,
            weight: Number(q.weight) || 1.0,
            justification: q.justification?.trim() || undefined,
            points: 1000,
            order: idx + 1,
            sliderConfig:
              q.type === 'SLIDER' && q.sliderConfig
                ? {
                    min: Number(q.sliderConfig.min || 0),
                    max: Number(q.sliderConfig.max || 100),
                    target: Number(q.sliderConfig.target || 50),
                    tolerance: Number(q.sliderConfig.tolerance || 0),
                    unit: q.sliderConfig.unit || '',
                    step: 1,
                  }
                : undefined,
            options: formattedOptions,
          };
        }),
      };

      if (editingEvalId) {
        await api.put(`/quizzes/${editingEvalId}`, payload);
        alert('Avaliação formal atualizada com sucesso!');
      } else {
        await api.post('/quizzes', payload);
        alert('Avaliação formal cadastrada com sucesso!');
      }

      clearFormDraft();
      handleCancelEdit();
      await fetchData();
    } catch (err: any) {
      console.error('Erro ao salvar avaliação:', err);
      const serverMsg =
        err.response?.data?.message ||
        (Array.isArray(err.response?.data?.message)
          ? err.response?.data?.message.join(', ')
          : null);
      setError(serverMsg || 'Erro de comunicação ao salvar a avaliação.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEval = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta avaliação formal?')) return;
    try {
      await api.delete('/quizzes/' + id);
      fetchData();
    } catch (e) {
      alert('Erro ao excluir avaliação.');
    }
  };

  const totalWeight = questions.reduce((acc, q) => acc + (Number(q.weight) || 0), 0);

  return (
    <div className="space-y-8 font-sans">
      <div className="bg-slate-900/60 border border-slate-800/90 p-6 md:p-8 rounded-3xl shadow-xl backdrop-blur-md space-y-6">
        {/* CABEÇALHO */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div
              className={
                'p-3 rounded-2xl ' +
                (editingEvalId
                  ? 'bg-amber-600/20 text-amber-400'
                  : 'bg-emerald-600/20 text-emerald-400')
              }
            >
              {editingEvalId ? <Edit3 className="w-6 h-6" /> : <FileCheck2 className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {editingEvalId ? 'Editando Avaliação Formal' : 'Gestor de Avaliações Formais'}
              </h2>
              <p className="text-xs text-slate-400">
                Provas individuais com tempo global em minutos, pesos ponderados (soma 10,0) e justificativas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsQuestionBankOpen(true)}
              className="bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <BookmarkCheck className="w-4 h-4 text-amber-400" />
              <span>Meu Banco de Questões</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAiModalOpen(true)}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-transform active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
              <span>Gerar Prova com IA</span>
            </button>

            {editingEvalId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Cancelar</span>
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-950/50 border border-red-800 rounded-xl text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSaveEvaluation} className="space-y-6">
          {/* DADOS GERAIS DA PROVA */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400">Título da Prova</label>
              <input
                required
                placeholder="Ex: Avaliação Oficial de Noções de Mineração"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 p-2.5 rounded-xl text-white text-sm font-semibold focus:outline-none uppercase"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400">Disciplina Vinculada</label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 p-2.5 rounded-xl text-white text-sm focus:outline-none font-medium"
              >
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Duração Total da Prova (Minutos)</span>
              </label>
              <input
                type="number"
                required
                min={5}
                max={240}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full mt-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 p-2.5 rounded-xl text-white text-sm font-mono font-bold focus:outline-none"
              />
            </div>

            <div className="md:col-span-3">
              <label className="text-xs font-bold text-slate-400">Instruções aos Alunos</label>
              <textarea
                rows={2}
                placeholder="Orientações, critérios de aprovação (média mínima 7,0), etc..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 p-2.5 rounded-xl text-white text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* PAINEL DE DISTRIBUIÇÃO DE PESOS */}
          <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Award className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <span className="text-xs font-black text-white block uppercase tracking-wider">Distribuição de Pesos das Questões</span>
                <span className="text-[11px] text-slate-400">
                  Defina o peso de cada questão para balancear o exame em 10,0 pontos.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 font-bold">Total Acumulado:</span>
              <span
                className={`text-base font-black ${
                  totalWeight === 10 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {totalWeight.toFixed(1)} / 10,0 pts
              </span>
            </div>
          </div>

          {/* LISTA DE QUESTÕES */}
          <div className="space-y-6 pt-2">
            {questions.map((q, qIdx) => (
              <div
                key={q.id}
                className="p-5 bg-slate-950/80 border border-slate-800 rounded-3xl space-y-4 shadow-lg hover:border-slate-700 transition-colors"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800/80 pb-3 gap-3">
                  <span className="text-xs font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Questão {qIdx + 1} de {questions.length}</span>
                  </span>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs font-bold text-slate-400">Tipo:</label>
                      <select
                        value={q.type}
                        onChange={(e) =>
                          handleUpdateQuestion(qIdx, 'type', e.target.value as QuestionType)
                        }
                        className="bg-slate-900 border border-emerald-500/40 text-emerald-300 text-xs px-2.5 py-1.5 rounded-xl font-bold focus:outline-none cursor-pointer"
                      >
                        <option value="MULTIPLE_CHOICE">▲ Múltipla Escolha</option>
                        <option value="TRUE_FALSE">✓/✗ Verdadeiro ou Falso</option>
                        <option value="FAST_ANSWER">✎ Resposta Curta</option>
                        <option value="SLIDER">⎚ Slider Numérico</option>
                        <option value="PUZZLE">🧩 Puzzle / Ordenação</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-xl">
                      <span className="text-[10px] text-slate-400 font-bold">Peso:</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="10"
                        value={q.weight}
                        onChange={(e) =>
                          handleUpdateQuestion(qIdx, 'weight', Number(e.target.value))
                        }
                        className="w-12 bg-transparent text-emerald-400 font-black text-xs focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-400">pts</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSaveToPersonalBank(q)}
                      className="text-slate-500 hover:text-amber-400 p-1.5 rounded-lg transition-colors cursor-pointer"
                      title="Salvar esta questão no meu Acervo Pessoal"
                    >
                      <BookmarkPlus className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(qIdx)}
                      className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg transition-colors cursor-pointer"
                      title="Remover questão"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <input
                  required
                  placeholder={`Enunciado da Questão ${qIdx + 1}...`}
                  value={q.title}
                  onChange={(e) => handleUpdateQuestion(qIdx, 'title', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 p-3 rounded-xl text-white text-sm font-black focus:outline-none uppercase tracking-wide"
                />

                <div className="p-3 bg-slate-900/60 border border-slate-800 border-dashed rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs text-slate-300 font-medium">
                      Foto / Esquema ilustrativo (opcional)
                    </span>
                  </div>

                  {q.imageUrl ? (
                    <div className="relative">
                      <img
                        src={formatImageUrl(q.imageUrl)}
                        alt="Preview da Questão"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                        className="h-14 w-24 object-contain rounded-lg border border-slate-700 bg-slate-950 p-1"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateQuestion(qIdx, 'imageUrl', '')}
                        className="absolute -top-1.5 -right-1.5 bg-red-600 text-white p-0.5 rounded-full cursor-pointer hover:bg-red-500 shadow-md"
                        title="Remover imagem"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors">
                      <span>Anexar Imagem</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(qIdx, e)}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {q.type === 'MULTIPLE_CHOICE' && (
                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Digite as 4 alternativas e marque a opção correta:
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[0, 1, 2, 3].map((optIdx) => (
                        <div
                          key={optIdx}
                          className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center gap-2"
                        >
                          <span className="w-5 h-5 rounded-md bg-slate-800 flex items-center justify-center font-black text-[10px] text-slate-300 border border-slate-700">
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <input
                            required
                            placeholder={`Alternativa ${String.fromCharCode(65 + optIdx)}`}
                            value={q.options[optIdx]?.text || ''}
                            onChange={(e) =>
                              handleUpdateOptionText(qIdx, optIdx, e.target.value)
                            }
                            className="w-full bg-transparent text-xs text-white focus:outline-none uppercase font-bold"
                          />
                          <input
                            type="radio"
                            name={`correct_${qIdx}`}
                            checked={q.options[optIdx]?.isCorrect}
                            onChange={() => handleSetCorrectOption(qIdx, optIdx)}
                            className="w-4 h-4 accent-emerald-500 cursor-pointer"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {q.type === 'TRUE_FALSE' && (
                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Defina o gabarito desta afirmação:
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <div
                        onClick={() => handleUpdateQuestion(qIdx, 'tfCorrectIndex', 1)}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all bg-blue-950/40 ${
                          q.tfCorrectIndex === 1
                            ? 'border-emerald-400 ring-2 ring-emerald-500/40'
                            : 'border-blue-900/60'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Check className="w-5 h-5 text-emerald-400" />
                          <span className="text-sm font-black text-white tracking-wider">VERDADEIRO</span>
                        </div>
                        <input
                          type="radio"
                          name={`tf_correct_${qIdx}`}
                          checked={q.tfCorrectIndex === 1}
                          onChange={() => handleUpdateQuestion(qIdx, 'tfCorrectIndex', 1)}
                          className="w-4 h-4 accent-emerald-500"
                        />
                      </div>

                      <div
                        onClick={() => handleUpdateQuestion(qIdx, 'tfCorrectIndex', 0)}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all bg-red-950/40 ${
                          q.tfCorrectIndex === 0
                            ? 'border-red-400 ring-2 ring-red-500/40'
                            : 'border-red-900/60'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <XIcon className="w-5 h-5 text-red-400" />
                          <span className="text-sm font-black text-white tracking-wider">FALSO</span>
                        </div>
                        <input
                          type="radio"
                          name={`tf_correct_${qIdx}`}
                          checked={q.tfCorrectIndex === 0}
                          onChange={() => handleUpdateQuestion(qIdx, 'tfCorrectIndex', 0)}
                          className="w-4 h-4 accent-red-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {q.type === 'FAST_ANSWER' && (
                  <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-3">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-4 h-4" />
                      <span>Termos técnicos aceitos:</span>
                    </span>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400">
                          Resposta Principal *
                        </label>
                        <input
                          required
                          placeholder="Termo exato"
                          value={q.shortAnswerKeywords[0] || ''}
                          onChange={(e) => handleUpdateShortKeyword(qIdx, 0, e.target.value)}
                          className="w-full mt-1 bg-slate-950 border border-emerald-600/50 p-2.5 rounded-xl text-white text-xs font-bold focus:outline-none uppercase"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400">Sinônimo 2</label>
                        <input
                          placeholder="Variação aceita"
                          value={q.shortAnswerKeywords[1] || ''}
                          onChange={(e) => handleUpdateShortKeyword(qIdx, 1, e.target.value)}
                          className="w-full mt-1 bg-slate-950 border border-slate-700 p-2.5 rounded-xl text-white text-xs font-medium focus:outline-none uppercase"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400">Sinônimo 3</label>
                        <input
                          placeholder="Variação aceita"
                          value={q.shortAnswerKeywords[2] || ''}
                          onChange={(e) => handleUpdateShortKeyword(qIdx, 2, e.target.value)}
                          className="w-full mt-1 bg-slate-950 border border-slate-700 p-2.5 rounded-xl text-white text-xs font-medium focus:outline-none uppercase"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {q.type === 'SLIDER' && (
                  <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-3">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders className="w-4 h-4" />
                      <span>Parâmetros do Slider Numérico:</span>
                    </span>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Mínimo</label>
                        <input
                          type="number"
                          value={q.sliderConfig.min}
                          onChange={(e) =>
                            handleUpdateSliderConfig(qIdx, 'min', Number(e.target.value))
                          }
                          className="w-full mt-1 bg-slate-950 border border-slate-700 p-2 rounded-xl text-white text-xs font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Máximo</label>
                        <input
                          type="number"
                          value={q.sliderConfig.max}
                          onChange={(e) =>
                            handleUpdateSliderConfig(qIdx, 'max', Number(e.target.value))
                          }
                          className="w-full mt-1 bg-slate-950 border border-slate-700 p-2 rounded-xl text-white text-xs font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Unidade</label>
                        <input
                          type="text"
                          placeholder="bar, ton, °C, %"
                          value={q.sliderConfig.unit}
                          onChange={(e) =>
                            handleUpdateSliderConfig(qIdx, 'unit', e.target.value)
                          }
                          className="w-full mt-1 bg-slate-950 border border-slate-700 p-2 rounded-xl text-white text-xs uppercase"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-emerald-400 uppercase">
                          Gabarito Alvo *
                        </label>
                        <input
                          type="number"
                          value={q.sliderConfig.target}
                          onChange={(e) =>
                            handleUpdateSliderConfig(qIdx, 'target', Number(e.target.value))
                          }
                          className="w-full mt-1 bg-slate-950 border border-emerald-500/70 p-2 rounded-xl text-white text-xs font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">
                          Tolerância (±)
                        </label>
                        <input
                          type="number"
                          value={q.sliderConfig.tolerance}
                          onChange={(e) =>
                            handleUpdateSliderConfig(qIdx, 'tolerance', Number(e.target.value))
                          }
                          className="w-full mt-1 bg-slate-950 border border-slate-700 p-2 rounded-xl text-white text-xs font-mono font-bold"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {q.type === 'PUZZLE' && (
                  <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-3">
                    <span className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-4 h-4" />
                      <span>Cadastre as 4 etapas na sequência correta:</span>
                    </span>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[0, 1, 2, 3].map((stepIdx) => (
                        <div
                          key={stepIdx}
                          className="p-2.5 bg-slate-950 border border-slate-700 rounded-xl flex items-center gap-2"
                        >
                          <span className="w-6 h-6 rounded-lg bg-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                            {stepIdx + 1}º
                          </span>
                          <input
                            required
                            placeholder={`${stepIdx + 1}ª Etapa...`}
                            value={q.options[stepIdx]?.text || ''}
                            onChange={(e) =>
                              handleUpdateOptionText(qIdx, stepIdx, e.target.value)
                            }
                            className="w-full bg-transparent text-xs text-white focus:outline-none font-bold uppercase"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* JUSTIFICATIVA DO GABARITO */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                  <label className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Justificativa / Comentário do Gabarito (Aparecerá para o aluno pós-prova)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Explicação técnica do gabarito oficial..."
                    value={q.justification}
                    onChange={(e) => handleUpdateQuestion(qIdx, 'justification', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 p-2.5 rounded-xl text-white text-xs focus:outline-none"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* BOTÕES DE AÇÃO */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={handleAddQuestion}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 rounded-2xl transition-colors flex items-center justify-center gap-2 border border-slate-700 cursor-pointer text-xs"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Adicionar Mais uma Questão</span>
            </button>

            <button
              type="submit"
              disabled={loading}
              className={
                'flex-1 font-black py-3.5 rounded-2xl text-white shadow-lg transition-all cursor-pointer disabled:opacity-50 text-xs uppercase tracking-wider ' +
                (editingEvalId
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20')
              }
            >
              {loading
                ? 'Salvando...'
                : editingEvalId
                ? `Atualizar Avaliação (${questions.length} questões)`
                : `Salvar Avaliação Formal (${questions.length} questões)`}
            </button>
          </div>
        </form>
      </div>

      {/* ⚡ LISTAGEM DE AVALIAÇÕES FORMAIS CADASTRADAS COM FILTRO POR DISCIPLINA */}
      <div className="bg-slate-900/60 border border-slate-800/90 p-6 rounded-3xl space-y-4 shadow-xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="text-emerald-400 w-5 h-5" />
              <span>Banco de Avaliações Formais Cadastradas</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Exibindo {filteredEvaluations.length} de {evaluations.length} avaliações formais cadastradas
            </p>
          </div>

          {/* ⚡ SELETOR DE DISCIPLINA PARA FILTRAR AS AVALIAÇÕES */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-emerald-400 shrink-0" />
            <select
              value={filterSubjectId}
              onChange={(e) => setFilterSubjectId(e.target.value)}
              className="bg-slate-950 border border-slate-800 focus:border-emerald-500 text-xs text-slate-200 font-bold px-3 py-2 rounded-xl focus:outline-none w-full sm:w-64 cursor-pointer"
            >
              <option value="ALL">Todas as Disciplinas ({evaluations.length})</option>
              {subjects.map((sub) => {
                const count = evaluations.filter(
                  (ev) => ev.subjectId === sub.id || ev.subject?.id === sub.id
                ).length;
                return (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* EMPTY STATE ESPECÍFICO QUANDO NÃO HÁ ITENS PARA A DISCIPLINA */}
        {filteredEvaluations.length === 0 ? (
          <div className="p-8 border border-dashed border-slate-800 rounded-3xl text-center space-y-2.5 bg-slate-950/40">
            <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
            <h4 className="text-sm font-bold text-slate-300">
              Nenhuma Avaliação Formal cadastrada para {selectedFilterSubjectName}
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Crie uma avaliação formal com pesos e gabarito preenchendo o formulário acima e selecionando esta disciplina vinculada.
            </p>
            {filterSubjectId !== 'ALL' && (
              <button
                type="button"
                onClick={() => setFilterSubjectId('ALL')}
                className="text-xs text-emerald-400 hover:text-emerald-300 underline font-bold cursor-pointer pt-1"
              >
                Ver todas as disciplinas
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEvaluations.map((ev) => (
              <div
                key={ev.id}
                className={
                  'border p-4 rounded-2xl flex flex-col justify-between transition-all ' +
                  (editingEvalId === ev.id
                    ? 'bg-amber-950/30 border-amber-500/80 ring-2 ring-amber-500/30'
                    : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700')
                }
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-300 border-emerald-500/30 flex items-center gap-1">
                      <FileCheck2 className="w-3 h-3" />
                      <span>{ev.durationMinutes || 45} min</span>
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenPublishModal(ev)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-slate-800 ${
                          ev.isPublic ? 'text-teal-400 bg-teal-500/10' : 'text-slate-400 hover:text-teal-400'
                        }`}
                        title={ev.isPublic ? 'Remover do Repositório Global' : 'Publicar no Repositório Global'}
                      >
                        <Globe className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenPrintPreview(ev);
                        }}
                        className="p-1.5 text-slate-400 hover:text-blue-400 rounded-lg transition-colors cursor-pointer hover:bg-slate-800"
                        title="Imprimir Avaliação / Salvar em PDF"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEditEval(ev)}
                        className="text-slate-400 hover:text-amber-400 p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-slate-800"
                        title="Editar avaliação"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEval(ev.id)}
                        className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-slate-800"
                        title="Excluir avaliação"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-white text-sm uppercase">{ev.title}</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      <span className="text-emerald-300 font-bold">{ev.subject?.name || 'Geral'}</span> •{' '}
                      <strong className="text-emerald-400">{ev.questions?.length || 0} questões</strong>
                    </p>
                    {ev.isPublic && (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-teal-500/10 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-md mt-2 uppercase font-bold">
                        <Globe className="w-3 h-3" /> Público ({ev.knowledgeArea || 'Geral'})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL DE PUBLICAÇÃO GLOBAL */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-teal-400" />
              <span>Publicar no Repositório Global</span>
            </h3>
            
            <p className="text-xs text-slate-400">
              Compartilhe a prova <strong className="text-white">{quizToPublish?.title}</strong> com outros instrutores da rede.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Área de Conhecimento *</label>
                <select
                  value={knowledgeArea}
                  onChange={(e) => setKnowledgeArea(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none font-bold cursor-pointer"
                >
                  <option value="Segurança do Trabalho">Segurança do Trabalho</option>
                  <option value="Mecânica Pesada">Mecânica Pesada</option>
                  <option value="Logística">Logística</option>
                  <option value="Eletromecânica">Eletromecânica</option>
                  <option value="Automação">Automação</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Tags (separadas por vírgula) *</label>
                <input
                  type="text"
                  placeholder="Ex: nr-12, escavadeira, inspecao"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsPublishModalOpen(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmPublish}
                disabled={publishing}
                className="flex-1 bg-teal-600 hover:bg-teal-500 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-teal-600/30 cursor-pointer disabled:opacity-50"
              >
                {publishing ? 'Salvando...' : quizToPublish?.isPublic ? 'Atualizar / Despublicar' : 'Publicar Agora'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE IMPORTAÇÃO IA */}
      <AiImportModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onImportData={handleImportFromAi}
      />

      {/* MODAL DE IMPRESSÃO DA AVALIAÇÃO FORMAL EM PDF */}
      <ExamPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        exam={printExamData}
      />

      {/* MODAL DO BANCO PESSOAL DE QUESTÕES */}
      <PersonalQuestionBankModal
        isOpen={isQuestionBankOpen}
        onClose={() => setIsQuestionBankOpen(false)}
        onSelectQuestion={handleImportFromPersonalBank}
      />
    </div>
  );
};

export default AvalManager;