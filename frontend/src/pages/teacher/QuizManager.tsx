import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { AiImportModal } from './AiImportModal';
import { AvalManager } from './AvalManager';
import { PratManager } from './PratManager';
import { ExamPrintModal } from './ExamPrintModal';
import { PersonalQuestionBankModal } from './PersonalQuestionBankModal';
import {
  BookmarkCheck,
  BookmarkPlus,
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
  Gamepad2,
  FileCheck2,
  Wrench,
  Shield,
  HelpCircle,
  Globe,
  Printer
} from 'lucide-react';

type QuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'FAST_ANSWER' | 'SLIDER' | 'PUZZLE';
type ActivityType = 'QUIZ_INTERATIVO' | 'AVALIACAO' | 'ATIVIDADE';

interface QuestionDraft {
  id: string;
  title: string;
  imageUrl?: string;
  type: QuestionType;
  timeLimitSeconds: number;
  weight?: number;
  justification?: string;
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

export const QuizManager: React.FC = () => {
  const [activityType, setActivityType] = useState<ActivityType>('QUIZ_INTERATIVO');

  const [isQuestionBankOpen, setIsQuestionBankOpen] = useState(false);

  const [subjects, setSubjects] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');

  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  // ⚡ Estados para o Modal de Publicação no Repositório Global
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [quizToPublish, setQuizToPublish] = useState<any>(null);
  const [knowledgeArea, setKnowledgeArea] = useState('Segurança do Trabalho');
  const [tagsInput, setTagsInput] = useState('');
  const [publishing, setPublishing] = useState(false);

  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [printExamData, setPrintExamData] = useState<any | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // ⚡ Normaliza dinamicamente a URL da imagem para o IP e porta atuais do backend (:3000)
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

  const createInitialQuestion = (id: string): QuestionDraft => ({
    id,
    title: '',
    imageUrl: '',
    type: 'MULTIPLE_CHOICE',
    timeLimitSeconds: 30,
    weight: 2.5,
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

  const [questions, setQuestions] = useState<QuestionDraft[]>([createInitialQuestion('1')]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      const [subRes, quizRes] = await Promise.all([
        api.get('/academic/subjects'),
        api.get('/quizzes'),
      ]);
      setSubjects(subRes.data || []);
      const list = quizRes.data || [];
      setQuizzes(list.filter((q: any) => q.type === 'QUIZ_INTERATIVO' || !q.type));
      if (subRes.data?.length > 0 && !selectedSubjectId) {
        setSelectedSubjectId(subRes.data[0].id);
      }
    } catch (e) {
      console.error('Erro ao buscar disciplinas/quizzes:', e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddQuestion = () => {
    setQuestions([...questions, createInitialQuestion(Date.now().toString())]);
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length === 1) {
      alert('A atividade precisa ter pelo menos 1 questão cadastrada.');
      return;
    }
    setQuestions(questions.filter((_, idx) => idx !== index));
  };

  const handleUpdateQuestion = (index: number, field: keyof QuestionDraft, value: any) => {
    const updated = [...questions];
    (updated[index] as any)[field] = value;
    setQuestions(updated);
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

  const handleImportFromPersonalBank = (savedQ: any) => {
    const newQuestion: QuestionDraft = {
      id: Date.now().toString(),
      title: savedQ.title || '',
      imageUrl: savedQ.imageUrl || '',
      type: savedQ.type || 'MULTIPLE_CHOICE',
      timeLimitSeconds: Number(savedQ.timeLimitSeconds) || 30,
      weight: Number(savedQ.weight) || 2.5,
      justification: savedQ.justification || '',
      options: savedQ.options && savedQ.options.length > 0 ? savedQ.options : [
        { text: '', color: 'red', isCorrect: true, correctOrder: 0 },
        { text: '', color: 'blue', isCorrect: false, correctOrder: 1 },
        { text: '', color: 'yellow', isCorrect: false, correctOrder: 2 },
        { text: '', color: 'green', isCorrect: false, correctOrder: 3 },
      ],
      tfCorrectIndex: savedQ.tfCorrectIndex ?? 1,
      shortAnswerKeywords: savedQ.shortAnswerKeywords || ['', '', ''],
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

  const handleOpenPrintPreview = async (quiz: any) => {
    try {
      const res = await api.get(`/quizzes/${quiz.id}`);
      setPrintExamData(res.data || quiz);
      setIsPrintModalOpen(true);
    } catch (err) {
      console.warn('Não foi possível carregar os detalhes pela API, usando dados locais:', err);
      setPrintExamData(quiz);
      setIsPrintModalOpen(true);
    }
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
        // ⚡ Salva o caminho relativo confiável para resolução dinâmica
        const savedUrl = res.data.url || res.data.fileUrl || `/uploads/${res.data.filename}`;
        handleUpdateQuestion(qIndex, 'imageUrl', savedUrl);
      }
    } catch (err: any) {
      console.error('Erro ao enviar imagem para o servidor:', err);
      alert(err.response?.data?.message || 'Erro ao realizar upload da imagem.');
    }
  };

  // ⚡ Funções de Publicação no Repositório Global
  const handleOpenPublishModal = (quiz: any) => {
    setQuizToPublish(quiz);
    setKnowledgeArea(quiz.knowledgeArea || 'Segurança do Trabalho');
    setTagsInput(quiz.tags ? quiz.tags.join(', ') : '');
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

      alert(newPublicState ? 'Quiz publicado no Repositório Global com sucesso!' : 'Quiz retirado do Repositório Global.');
      setIsPublishModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Erro ao publicar quiz:', err);
      alert('Erro ao atualizar status de publicação.');
    } finally {
      setPublishing(false);
    }
  };

  const handleImportFromAi = (data: any) => {
    if (data.title) setTitle(data.title);
    if (data.description) setDescription(data.description);

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
          timeLimitSeconds: Number(q.timeLimitSeconds || 30),
          weight: 2.5,
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

  const handleEditQuiz = (quiz: any) => {
    setEditingQuizId(quiz.id);
    setTitle(quiz.title);
    setDescription(quiz.description || '');
    setSelectedSubjectId(quiz.subjectId || '');

    if (quiz.questions && quiz.questions.length > 0) {
      const loadedQuestions: QuestionDraft[] = quiz.questions.map((q: any) => {
        let sliderParsed = { min: 0, max: 100, target: 50, tolerance: 0, unit: 'bar' };
        if (q.sliderConfig) {
          try {
            sliderParsed = typeof q.sliderConfig === 'string' ? JSON.parse(q.sliderConfig) : q.sliderConfig;
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
          const sortedOptions = [...q.options].sort((a: any, b: any) => (a.correctOrder ?? 0) - (b.correctOrder ?? 0));
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
          timeLimitSeconds: q.timeLimitSeconds || 30,
          weight: 2.5,
          justification: q.justification || '',
          options: defaultOpts,
          tfCorrectIndex: tfIdx,
          shortAnswerKeywords: keywords,
          sliderConfig: sliderParsed,
        };
      });

      setQuestions(loadedQuestions);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingQuizId(null);
    setTitle('');
    setDescription('');
    setQuestions([createInitialQuestion('1')]);
    setError('');
  };

  const handleSaveQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedSubjectId) {
      setError('Selecione uma disciplina vinculada antes de salvar.');
      return;
    }

    if (!title.trim()) {
      setError('Informe o título da atividade.');
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.title.trim()) {
        setError(`Preencha o enunciado do item ${i + 1}.`);
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        type: 'QUIZ_INTERATIVO',
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
              { text: 'Verdadeiro', color: 'blue', isCorrect: q.tfCorrectIndex === 1, correctOrder: 0 },
              { text: 'Falso', color: 'red', isCorrect: q.tfCorrectIndex === 0, correctOrder: 1 },
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
            timeLimitSeconds: Number(q.timeLimitSeconds) || 30,
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

      if (editingQuizId) {
        await api.put(`/quizzes/${editingQuizId}`, payload);
        alert('Quiz atualizado com sucesso com o gabarito protegido!');
      } else {
        await api.post('/quizzes', payload);
        alert('Quiz cadastrado com sucesso!');
      }

      handleCancelEdit();
      await fetchData();
    } catch (err: any) {
      console.error('Erro ao salvar atividade:', err);
      const serverMsg =
        err.response?.data?.message ||
        (Array.isArray(err.response?.data?.message)
          ? err.response?.data?.message.join(', ')
          : null);
      setError(serverMsg || 'Erro de comunicação ao salvar a atividade.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuiz = async (id: string) => {
    if (!confirm('Deseja realmente excluir este quiz?')) return;
    try {
      await api.delete('/quizzes/' + id);
      fetchData();
    } catch (e) {
      alert('Erro ao excluir quiz.');
    }
  };

  return (
    <div className="space-y-8 font-sans">
      {/* SELETOR PRINCIPAL DE MODALIDADES PEDAGÓGICAS */}
      <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-3xl shadow-xl backdrop-blur-md space-y-3">
        <label className="text-xs font-black text-slate-400 uppercase tracking-wider block">
          Selecione o Tipo de Conteúdo que Deseja Criar ou Gerenciar:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <button
            type="button"
            onClick={() => {
              setActivityType('QUIZ_INTERATIVO');
              if (editingQuizId) handleCancelEdit();
            }}
            className={`p-4 rounded-2xl border flex flex-col items-start gap-2.5 transition-all cursor-pointer text-left ${
              activityType === 'QUIZ_INTERATIVO'
                ? 'bg-purple-600/20 border-purple-500 ring-2 ring-purple-500/40 shadow-xl'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="p-2.5 bg-purple-500/20 text-purple-400 rounded-xl">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-white">Quiz Interativo</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Gamificação ao vivo, tempo por rodada e pódio instantâneo</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setActivityType('AVALIACAO');
              if (editingQuizId) handleCancelEdit();
            }}
            className={`p-4 rounded-2xl border flex flex-col items-start gap-2.5 transition-all cursor-pointer text-left ${
              activityType === 'AVALIACAO'
                ? 'bg-emerald-600/20 border-emerald-500 ring-2 ring-emerald-500/40 shadow-xl'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-white">Avaliação Formal</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Tempo total em minutos, pesos ponderados (0 a 10) e gabarito comentado</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setActivityType('ATIVIDADE');
              if (editingQuizId) handleCancelEdit();
            }}
            className={`p-4 rounded-2xl border flex flex-col items-start gap-2.5 transition-all cursor-pointer text-left ${
              activityType === 'ATIVIDADE'
                ? 'bg-amber-600/20 border-amber-500 ring-2 ring-amber-500/40 shadow-xl'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-white">Prática em Sala / Campo</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Checklist de procedimentos técnicos por bancada ou equipe</p>
            </div>
          </button>
        </div>
      </div>

      {activityType === 'AVALIACAO' ? (
        <AvalManager />
      ) : activityType === 'ATIVIDADE' ? (
        <PratManager />
      ) : (
        <div className="bg-slate-900/60 border border-slate-800/90 p-6 md:p-8 rounded-3xl shadow-xl backdrop-blur-md space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="flex items-center gap-3">
              <div
                className={
                  'p-3 rounded-2xl ' +
                  (editingQuizId ? 'bg-amber-600/20 text-amber-400' : 'bg-purple-600/20 text-purple-400')
                }
              >
                {editingQuizId ? <Edit3 className="w-6 h-6" /> : <PlusCircle className="w-6 h-6" />}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {editingQuizId ? 'Editando Quiz Interativo' : 'Criador de Quiz Interativo'}
                </h2>
                <p className="text-xs text-slate-400">
                  Configure as opções coloridas com contagem regressiva por questão para a arena ao vivo.
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
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-purple-600/30 transition-transform active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
                <span>Criar com IA</span>
              </button>

              {editingQuizId && (
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

          <form onSubmit={handleSaveQuiz} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400">Título do Quiz</label>
                <input
                  required
                  placeholder="Ex: Simulado Técnico de Operação e Segurança"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 focus:border-purple-500 p-2.5 rounded-xl text-white text-sm font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400">Disciplina Vinculada</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 focus:border-purple-500 p-2.5 rounded-xl text-white text-sm focus:outline-none font-medium cursor-pointer"
                >
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-400">Instruções aos Alunos</label>
                <textarea
                  rows={2}
                  placeholder="Orientações aos alunos sobre a execução desta atividade..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 focus:border-purple-500 p-2.5 rounded-xl text-white text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-6 pt-2">
              {questions.map((q, qIdx) => (
                <div
                  key={q.id}
                  className="p-5 bg-slate-950/80 border border-slate-800 rounded-3xl space-y-4 shadow-lg hover:border-slate-700 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800/80 pb-3 gap-3">
                    <span className="text-xs font-black uppercase text-purple-400 tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Questão {qIdx + 1} de {questions.length}</span>
                    </span>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs font-bold text-slate-400">Tipo:</label>
                        <select
                          value={q.type}
                          onChange={(e) => handleUpdateQuestion(qIdx, 'type', e.target.value as QuestionType)}
                          className="bg-slate-900 border border-purple-500/40 text-purple-300 text-xs px-2.5 py-1.5 rounded-xl font-bold focus:outline-none"
                        >
                          <option value="MULTIPLE_CHOICE">▲ 4 Alternativas Coloridas</option>
                          <option value="TRUE_FALSE">✓/✗ Verdadeiro ou Falso</option>
                          <option value="FAST_ANSWER">✎ Resposta Curta</option>
                          <option value="SLIDER">⎚ Slider Numérico</option>
                          <option value="PUZZLE">🧩 Puzzle / Ordenação</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <label className="text-xs text-slate-400">Tempo:</label>
                        <select
                          value={q.timeLimitSeconds}
                          onChange={(e) => handleUpdateQuestion(qIdx, 'timeLimitSeconds', Number(e.target.value))}
                          className="bg-slate-900 border border-slate-700 text-white text-xs px-2 py-1 rounded-lg focus:outline-none"
                        >
                          <option value={10}>10s</option>
                          <option value={20}>20s</option>
                          <option value={30}>30s</option>
                          <option value={45}>45s</option>
                          <option value={60}>60s</option>
                          <option value={90}>90s</option>
                          <option value={120}>2 min</option>
                          <option value={300}>5 min</option>
                        </select>
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
                        title="Remover item"
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
                    className="w-full bg-slate-900 border border-slate-800 focus:border-purple-500 p-3 rounded-xl text-white text-sm font-semibold focus:outline-none"
                  />

                  {/* IMAGEM COM NORMALIZADOR DINÂMICO E SUPORTE A ERRO */}
                  <div className="p-3 bg-slate-900/60 border border-slate-800 border-dashed rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-purple-400" />
                      <span className="text-xs text-slate-300 font-medium">Foto / Esquema ilustrativo (opcional)</span>
                    </div>

                    {q.imageUrl ? (
                      <div className="relative">
                        <img
                          src={formatImageUrl(q.imageUrl)}
                          alt="Preview da Questão"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                          className="h-14 w-24 object-contain rounded-lg border border-slate-700 bg-slate-950 p-1 shadow-md"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateQuestion(qIdx, 'imageUrl', '')}
                          className="absolute -top-1.5 -right-1.5 bg-red-600 hover:bg-red-500 text-white p-0.5 rounded-full cursor-pointer shadow-md transition-colors"
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
                        Digite as 4 alternativas e marque a correta:
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="p-2.5 bg-red-950/40 border border-red-900/60 rounded-xl flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-red-600 flex items-center justify-center font-black text-[10px] text-white">▲</span>
                          <input
                            required
                            placeholder="Alternativa Vermelha"
                            value={q.options[0]?.text || ''}
                            onChange={(e) => handleUpdateOptionText(qIdx, 0, e.target.value)}
                            className="w-full bg-transparent text-xs text-white focus:outline-none font-bold"
                          />
                          <input
                            type="radio"
                            name={`correct_${qIdx}`}
                            checked={q.options[0]?.isCorrect}
                            onChange={() => handleSetCorrectOption(qIdx, 0)}
                            className="w-4 h-4 accent-red-500 cursor-pointer"
                          />
                        </div>

                        <div className="p-2.5 bg-blue-950/40 border border-blue-900/60 rounded-xl flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-blue-600 flex items-center justify-center font-black text-[10px] text-white">◆</span>
                          <input
                            required
                            placeholder="Alternativa Azul"
                            value={q.options[1]?.text || ''}
                            onChange={(e) => handleUpdateOptionText(qIdx, 1, e.target.value)}
                            className="w-full bg-transparent text-xs text-white focus:outline-none font-bold"
                          />
                          <input
                            type="radio"
                            name={`correct_${qIdx}`}
                            checked={q.options[1]?.isCorrect}
                            onChange={() => handleSetCorrectOption(qIdx, 1)}
                            className="w-4 h-4 accent-blue-500 cursor-pointer"
                          />
                        </div>

                        <div className="p-2.5 bg-amber-950/40 border border-amber-900/60 rounded-xl flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-amber-500 flex items-center justify-center font-black text-[10px] text-slate-950">●</span>
                          <input
                            required
                            placeholder="Alternativa Amarela"
                            value={q.options[2]?.text || ''}
                            onChange={(e) => handleUpdateOptionText(qIdx, 2, e.target.value)}
                            className="w-full bg-transparent text-xs text-white focus:outline-none font-bold"
                          />
                          <input
                            type="radio"
                            name={`correct_${qIdx}`}
                            checked={q.options[2]?.isCorrect}
                            onChange={() => handleSetCorrectOption(qIdx, 2)}
                            className="w-4 h-4 accent-amber-500 cursor-pointer"
                          />
                        </div>

                        <div className="p-2.5 bg-emerald-950/40 border border-emerald-900/60 rounded-xl flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-emerald-600 flex items-center justify-center font-black text-[10px] text-white">■</span>
                          <input
                            required
                            placeholder="Alternativa Verde"
                            value={q.options[3]?.text || ''}
                            onChange={(e) => handleUpdateOptionText(qIdx, 3, e.target.value)}
                            className="w-full bg-transparent text-xs text-white focus:outline-none font-bold"
                          />
                          <input
                            type="radio"
                            name={`correct_${qIdx}`}
                            checked={q.options[3]?.isCorrect}
                            onChange={() => handleSetCorrectOption(qIdx, 3)}
                            className="w-4 h-4 accent-emerald-500 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {q.type === 'TRUE_FALSE' && (
                    <div className="space-y-2 pt-1">
                      <div className="grid grid-cols-2 gap-3">
                        <div
                          onClick={() => handleUpdateQuestion(qIdx, 'tfCorrectIndex', 1)}
                          className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all bg-blue-950/40 ${
                            q.tfCorrectIndex === 1 ? 'border-blue-400 ring-2 ring-blue-500/40' : 'border-blue-900/60'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Check className="w-5 h-5 text-blue-400" />
                            <span className="text-sm font-black text-white">VERDADEIRO</span>
                          </div>
                          <input
                            type="radio"
                            name={`tf_correct_${qIdx}`}
                            checked={q.tfCorrectIndex === 1}
                            onChange={() => handleUpdateQuestion(qIdx, 'tfCorrectIndex', 1)}
                            className="w-4 h-4 accent-blue-500"
                          />
                        </div>

                        <div
                          onClick={() => handleUpdateQuestion(qIdx, 'tfCorrectIndex', 0)}
                          className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all bg-red-950/40 ${
                            q.tfCorrectIndex === 0 ? 'border-red-400 ring-2 ring-red-500/40' : 'border-red-900/60'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <XIcon className="w-5 h-5 text-red-400" />
                            <span className="text-sm font-black text-white">FALSO</span>
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
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400">Resposta Principal *</label>
                          <input
                            required
                            placeholder="Ex: Walkaround"
                            value={q.shortAnswerKeywords[0] || ''}
                            onChange={(e) => handleUpdateShortKeyword(qIdx, 0, e.target.value)}
                            className="w-full mt-1 bg-slate-950 border border-purple-600/50 p-2.5 rounded-xl text-white text-xs font-bold focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400">Sinônimo 2</label>
                          <input
                            placeholder="Ex: Inspeção Visual"
                            value={q.shortAnswerKeywords[1] || ''}
                            onChange={(e) => handleUpdateShortKeyword(qIdx, 1, e.target.value)}
                            className="w-full mt-1 bg-slate-950 border border-slate-700 p-2.5 rounded-xl text-white text-xs font-medium focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400">Sinônimo 3</label>
                          <input
                            placeholder="Ex: Inspecao 360"
                            value={q.shortAnswerKeywords[2] || ''}
                            onChange={(e) => handleUpdateShortKeyword(qIdx, 2, e.target.value)}
                            className="w-full mt-1 bg-slate-950 border border-slate-700 p-2.5 rounded-xl text-white text-xs font-medium focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {q.type === 'SLIDER' && (
                    <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Mínimo</label>
                          <input
                            type="number"
                            value={q.sliderConfig.min}
                            onChange={(e) => handleUpdateSliderConfig(qIdx, 'min', Number(e.target.value))}
                            className="w-full mt-1 bg-slate-950 border border-slate-700 p-2 rounded-xl text-white text-xs font-mono font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Máximo</label>
                          <input
                            type="number"
                            value={q.sliderConfig.max}
                            onChange={(e) => handleUpdateSliderConfig(qIdx, 'max', Number(e.target.value))}
                            className="w-full mt-1 bg-slate-950 border border-slate-700 p-2 rounded-xl text-white text-xs font-mono font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Unidade</label>
                          <input
                            type="text"
                            placeholder="bar, ton, °C"
                            value={q.sliderConfig.unit}
                            onChange={(e) => handleUpdateSliderConfig(qIdx, 'unit', e.target.value)}
                            className="w-full mt-1 bg-slate-950 border border-slate-700 p-2 rounded-xl text-white text-xs uppercase"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-amber-400 uppercase">Alvo *</label>
                          <input
                            type="number"
                            value={q.sliderConfig.target}
                            onChange={(e) => handleUpdateSliderConfig(qIdx, 'target', Number(e.target.value))}
                            className="w-full mt-1 bg-slate-950 border border-amber-500/70 p-2 rounded-xl text-white text-xs font-mono font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Tolerância (±)</label>
                          <input
                            type="number"
                            value={q.sliderConfig.tolerance}
                            onChange={(e) => handleUpdateSliderConfig(qIdx, 'tolerance', Number(e.target.value))}
                            className="w-full mt-1 bg-slate-950 border border-slate-700 p-2 rounded-xl text-white text-xs font-mono font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {q.type === 'PUZZLE' && (
                    <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[0, 1, 2, 3].map((stepIdx) => (
                          <div key={stepIdx} className="p-2.5 bg-slate-950 border border-slate-700 rounded-xl flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                              {stepIdx + 1}º
                            </span>
                            <input
                              required
                              placeholder={`${stepIdx + 1}ª Etapa...`}
                              value={q.options[stepIdx]?.text || ''}
                              onChange={(e) => handleUpdateOptionText(qIdx, stepIdx, e.target.value)}
                              className="w-full bg-transparent text-xs text-white focus:outline-none font-medium"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={handleAddQuestion}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 rounded-2xl transition-colors flex items-center justify-center gap-2 border border-slate-700 cursor-pointer text-xs"
              >
                <Plus className="w-4 h-4 text-purple-400" />
                <span>Adicionar Mais uma Questão</span>
              </button>

              <button
                type="submit"
                disabled={loading}
                className={
                  'flex-1 font-black py-3.5 rounded-2xl text-white shadow-lg transition-all cursor-pointer disabled:opacity-50 text-xs ' +
                  (editingQuizId
                    ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                    : 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/20')
                }
              >
                {loading
                  ? 'Salvando...'
                  : editingQuizId
                  ? `Atualizar (${questions.length} itens)`
                  : `Salvar (${questions.length} itens)`}
              </button>
            </div>
          </form>

          {/* LISTAGEM DE QUIZZES GAMIFICADOS */}
          <div className="pt-6 border-t border-slate-800/80 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="text-purple-400 w-4 h-4" />
              <span>Quizzes Interativos Cadastrados</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quizzes.map((q) => (
                <div
                  key={q.id}
                  className={
                    'border p-4 rounded-2xl flex flex-col justify-between transition-all ' +
                    (editingQuizId === q.id
                      ? 'bg-amber-950/30 border-amber-500/80 ring-2 ring-amber-500/30'
                      : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700')
                  }
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full border bg-purple-500/10 text-purple-300 border-purple-500/30">
                        Quiz Gamificado
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenPublishModal(q)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-slate-800 ${
                            q.isPublic ? 'text-teal-400 bg-teal-500/10' : 'text-slate-400 hover:text-teal-400'
                          }`}
                          title={q.isPublic ? 'Remover do Repositório Global' : 'Publicar no Repositório Global'}
                        >
                          <Globe className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPrintPreview(q);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-400 rounded-lg transition-colors cursor-pointer hover:bg-slate-800"
                          title="Imprimir Avaliação / Salvar em PDF"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEditQuiz(q)}
                          className="text-slate-400 hover:text-amber-400 p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-slate-800"
                          title="Editar atividade"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuiz(q.id)}
                          className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-slate-800"
                          title="Excluir atividade"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-white text-sm">{q.title}</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        {q.subject?.name || 'Geral'} • <strong className="text-purple-400">{q.questions?.length || 0} itens</strong>
                      </p>
                      {q.isPublic && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-teal-500/10 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-md mt-2">
                          <Globe className="w-3 h-3" /> Público ({q.knowledgeArea || 'Geral'})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ⚡ MODAL DE PUBLICAÇÃO GLOBAL */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-teal-400" />
              <span>Publicar no Repositório Global</span>
            </h3>
            
            <p className="text-xs text-slate-400">
              Compartilhe o quiz <strong className="text-white">{quizToPublish?.title}</strong> com outros instrutores da rede.
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

      <AiImportModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onImportData={handleImportFromAi}
      />
      <ExamPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        exam={printExamData}
      />
      <PersonalQuestionBankModal
        isOpen={isQuestionBankOpen}
        onClose={() => setIsQuestionBankOpen(false)}
        onSelectQuestion={handleImportFromPersonalBank}
      />
    </div>
  );
};

export default QuizManager;