import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { AiImportModal } from './AiImportModal';
import {
  Wrench,
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
  Shield,
  HelpCircle,
  Clock,
  CheckSquare,
  Users,
  Gauge,
  ListOrdered,
  AlertTriangle,
} from 'lucide-react';

type StepType = 'CHECKLIST' | 'SLIDER' | 'PUZZLE' | 'FAST_ANSWER';
type RubricType = 'CONFORME_NAO_CONFORME' | 'ESCALA_CONCEITUAL' | 'PONTUACAO';

interface PracticalStepDraft {
  id: string;
  title: string;
  imageUrl?: string;
  type: StepType;
  rubric: RubricType;
  isCritical: boolean; // Item eliminatório/crítico de segurança
  weight: number;
  technicalStandard: string; // Norma regulamentadora / Procedimento operacional padrão
  options: { text: string; color: string; isCorrect: boolean; correctOrder?: number }[];
  sliderConfig: {
    min: number;
    max: number;
    target: number;
    tolerance: number;
    unit: string;
  };
}

export const PratManager: React.FC = () => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [practices, setPractices] = useState<any[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');

  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [editingPratId, setEditingPratId] = useState<string | null>(null);

  // Cabeçalho da Atividade Prática
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [environment, setEnvironment] = useState<'OFICINA' | 'CAMPO' | 'SIMULADOR' | 'SALA_AULA'>('OFICINA');
  const [isTeamMode, setIsTeamMode] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState<number>(60);

  // ⚡ Normalizador Dinâmico de Imagens para suportar variações de IP e portas
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

  const createInitialStep = (id: string, stepNumber = 1): PracticalStepDraft => ({
    id,
    title: `ETAPA ${stepNumber}: INSPEÇÃO VISUAL E TESTE PRÉ-OPERACIONAL`,
    imageUrl: '',
    type: 'CHECKLIST',
    rubric: 'CONFORME_NAO_CONFORME',
    isCritical: stepNumber === 1,
    weight: 2.5,
    technicalStandard: 'CONFORME NORMA REGULAMENTADORA E PROCEDIMENTO OPERACIONAL PADRÃO (POP).',
    options: [
      { text: 'CONFORME (APROVADO)', color: 'emerald', isCorrect: true, correctOrder: 0 },
      { text: 'NÃO CONFORME (ITEM CRÍTICO)', color: 'red', isCorrect: false, correctOrder: 1 },
    ],
    sliderConfig: { min: 0, max: 250, target: 120, tolerance: 0, unit: 'bar' },
  });

  const [steps, setSteps] = useState<PracticalStepDraft[]>([createInitialStep('1', 1)]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      const [subRes, quizRes] = await Promise.all([
        api.get('/academic/subjects'),
        api.get('/quizzes'),
      ]);
      setSubjects(subRes.data || []);
      const allList = quizRes.data || [];
      // Filtra apenas práticas operacionais de campo/oficina
      setPractices(allList.filter((q: any) => q.type === 'ATIVIDADE'));

      if (subRes.data?.length > 0 && !selectedSubjectId) {
        setSelectedSubjectId(subRes.data[0].id);
      }
    } catch (e) {
      console.error('Erro ao carregar práticas:', e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddStep = () => {
    setSteps([...steps, createInitialStep(Date.now().toString(), steps.length + 1)]);
  };

  const handleRemoveStep = (index: number) => {
    if (steps.length === 1) {
      alert('A prática operacional deve conter no nível mínimo 1 etapa.');
      return;
    }
    setSteps(steps.filter((_, idx) => idx !== index));
  };

  const handleUpdateStep = (index: number, field: keyof PracticalStepDraft, value: any) => {
    const updated = [...steps];
    (updated[index] as any)[field] = value;

    // ⚡ Se o tipo mudou para PUZZLE, garante que o array de opções tenha exatamente 4 posições editáveis
    if (field === 'type' && value === 'PUZZLE') {
      const currentOpts = updated[index].options || [];
      while (currentOpts.length < 4) {
        currentOpts.push({
          text: `SUB-AÇÃO ${currentOpts.length + 1}`,
          color: 'purple',
          isCorrect: true,
          correctOrder: currentOpts.length,
        });
      }
      updated[index].options = currentOpts.slice(0, 4);
    }

    setSteps(updated);
  };

  const handleUpdateOptionText = (sIndex: number, optIndex: number, text: string) => {
    const updated = [...steps];
    while (updated[sIndex].options.length <= optIndex) {
      updated[sIndex].options.push({
        text: '',
        color: 'purple',
        isCorrect: true,
        correctOrder: updated[sIndex].options.length,
      });
    }
    updated[sIndex].options[optIndex].text = text;
    setSteps(updated);
  };

  const handleUpdateSliderConfig = (sIndex: number, field: string, value: any) => {
    const updated = [...steps];
    (updated[sIndex].sliderConfig as any)[field] = value;
    setSteps(updated);
  };

  // ⚡ Upload físico padronizado direto para a pasta do backend
  const handleImageUpload = async (sIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
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
        handleUpdateStep(sIndex, 'imageUrl', savedUrl);
      }
    } catch (err: any) {
      console.error('Erro ao enviar imagem prática para o servidor:', err);
      alert(err.response?.data?.message || 'Erro ao realizar upload da imagem.');
    }
  };

  const handleImportFromAi = (data: any) => {
    if (data.title) setTitle(data.title);
    if (data.description) setDescription(data.description);
    if (data.durationMinutes) setDurationMinutes(Number(data.durationMinutes));

    if (data.questions && data.questions.length > 0) {
      const mapped: PracticalStepDraft[] = data.questions.map((q: any, qIdx: number) => {
        let sliderParsed = { min: 0, max: 250, target: 100, tolerance: 0, unit: 'bar' };
        if (q.sliderConfig) {
          sliderParsed = {
            min: Number(q.sliderConfig.min || 0),
            max: Number(q.sliderConfig.max || 250),
            target: Number(q.sliderConfig.target || 100),
            tolerance: Number(q.sliderConfig.tolerance || 0),
            unit: q.sliderConfig.unit || 'bar',
          };
        }

        let stepOptions = q.options || [];
        if (q.type === 'PUZZLE') {
          while (stepOptions.length < 4) {
            stepOptions.push({
              text: `SUB-AÇÃO ${stepOptions.length + 1}`,
              color: 'purple',
              isCorrect: true,
              correctOrder: stepOptions.length,
            });
          }
          stepOptions = stepOptions.slice(0, 4);
        } else {
          stepOptions = [
            { text: 'CONFORME', color: 'emerald', isCorrect: true, correctOrder: 0 },
            { text: 'NÃO CONFORME', color: 'red', isCorrect: false, correctOrder: 1 },
          ];
        }

        return {
          id: (Date.now() + qIdx).toString(),
          title: q.title || `ETAPA ${qIdx + 1}`,
          imageUrl: q.imageUrl || '',
          type: q.type === 'SLIDER' ? 'SLIDER' : q.type === 'PUZZLE' ? 'PUZZLE' : 'CHECKLIST',
          rubric: 'CONFORME_NAO_CONFORME',
          isCritical: qIdx === 0,
          weight: q.weight !== undefined ? Number(q.weight) : 2.5,
          technicalStandard: q.justification || 'CRITÉRIO TÉCNICO DE SEGURANÇA E OPERAÇÃO.',
          options: stepOptions,
          sliderConfig: sliderParsed,
        };
      });

      setSteps(mapped);
    }
  };

  const handleEditPractice = (p: any) => {
    setEditingPratId(p.id);
    setTitle(p.title);
    setDescription(p.description || '');
    setDurationMinutes(Number(p.durationMinutes) || 60);
    setSelectedSubjectId(p.subjectId || '');

    if (p.questions && p.questions.length > 0) {
      const loaded: PracticalStepDraft[] = p.questions.map((q: any, idx: number) => {
        let sliderParsed = { min: 0, max: 250, target: 100, tolerance: 0, unit: 'bar' };
        if (q.sliderConfig) {
          try {
            sliderParsed = typeof q.sliderConfig === 'string' ? JSON.parse(q.sliderConfig) : q.sliderConfig;
          } catch (e) {}
        }

        let stepOpts = q.options || [];
        if (q.type === 'PUZZLE') {
          while (stepOpts.length < 4) {
            stepOpts.push({
              text: `SUB-AÇÃO ${stepOpts.length + 1}`,
              color: 'purple',
              isCorrect: true,
              correctOrder: stepOpts.length,
            });
          }
          stepOpts = stepOpts.slice(0, 4);
        } else {
          stepOpts = [
            { text: 'CONFORME', color: 'emerald', isCorrect: true, correctOrder: 0 },
            { text: 'NÃO CONFORME', color: 'red', isCorrect: false, correctOrder: 1 },
          ];
        }

        return {
          id: q.id || (Date.now() + idx).toString(),
          title: q.title,
          imageUrl: q.imageUrl || '',
          type: q.type === 'SLIDER' ? 'SLIDER' : q.type === 'PUZZLE' ? 'PUZZLE' : 'CHECKLIST',
          rubric: 'CONFORME_NAO_CONFORME',
          isCritical: idx === 0,
          weight: q.weight !== undefined ? Number(q.weight) : 2.5,
          technicalStandard: q.justification || '',
          options: stepOpts,
          sliderConfig: sliderParsed,
        };
      });

      setSteps(loaded);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingPratId(null);
    setTitle('');
    setDescription('');
    setDurationMinutes(60);
    setSteps([createInitialStep('1', 1)]);
    setError('');
  };

  const handleSavePractice = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedSubjectId) {
      setError('Selecione uma disciplina vinculada antes de salvar.');
      return;
    }

    if (!title.trim()) {
      setError('Informe o título do procedimento prático.');
      return;
    }

    for (let i = 0; i < steps.length; i++) {
      if (!steps[i].title.trim()) {
        setError(`Preencha a descrição da Etapa ${i + 1}.`);
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        type: 'ATIVIDADE',
        durationMinutes: Number(durationMinutes) || 60,
        subjectId: selectedSubjectId,
        questions: steps.map((s, idx) => {
          let formattedOptions = s.options;

          if (s.type === 'CHECKLIST') {
            formattedOptions = [
              { text: 'CONFORME (APROVADO)', color: 'emerald', isCorrect: true, correctOrder: 0 },
              { text: 'NÃO CONFORME (INADEQUADO)', color: 'red', isCorrect: false, correctOrder: 1 },
            ];
          } else if (s.type === 'PUZZLE') {
            formattedOptions = s.options.map((opt, oIdx) => ({
              text: opt.text || `PASSO ${oIdx + 1}`,
              color: 'purple',
              isCorrect: true,
              correctOrder: oIdx,
            }));
          }

          return {
            title: s.title.trim(),
            imageUrl: s.imageUrl || undefined,
            type: s.type === 'CHECKLIST' ? 'TRUE_FALSE' : s.type,
            timeLimitSeconds: (Number(durationMinutes) || 60) * 60,
            weight: Number(s.weight) || 1.0,
            justification: s.technicalStandard?.trim() || undefined,
            points: 1000,
            order: idx + 1,
            sliderConfig:
              s.type === 'SLIDER'
                ? {
                    min: Number(s.sliderConfig.min || 0),
                    max: Number(s.sliderConfig.max || 100),
                    target: Number(s.sliderConfig.target || 50),
                    tolerance: Number(s.sliderConfig.tolerance || 0),
                    unit: s.sliderConfig.unit || '',
                    step: 1,
                  }
                : undefined,
            options: formattedOptions,
          };
        }),
      };

      if (editingPratId) {
        await api.put(`/quizzes/${editingPratId}`, payload);
        alert('Roteiro prático atualizado com sucesso!');
      } else {
        await api.post('/quizzes', payload);
        alert('Roteiro prático cadastrado com sucesso!');
      }

      handleCancelEdit();
      await fetchData();
    } catch (err: any) {
      console.error('Erro ao salvar prática operacional:', err);
      const serverMsg =
        err.response?.data?.message ||
        (Array.isArray(err.response?.data?.message)
          ? err.response?.data?.message.join(', ')
          : null);
      setError(serverMsg || 'Erro de comunicação ao salvar o roteiro prático.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePractice = async (id: string) => {
    if (!confirm('Deseja realmente excluir este roteiro prático?')) return;
    try {
      await api.delete('/quizzes/' + id);
      fetchData();
    } catch (e) {
      alert('Erro ao excluir roteiro.');
    }
  };

  const totalWeight = steps.reduce((acc, s) => acc + (Number(s.weight) || 0), 0);

  return (
    <div className="space-y-8 font-sans">
      <div className="bg-slate-900/60 border border-slate-800/90 p-6 md:p-8 rounded-3xl shadow-xl backdrop-blur-md space-y-6">
        {/* CABEÇALHO */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div
              className={
                'p-3 rounded-2xl ' +
                (editingPratId ? 'bg-amber-600/20 text-amber-400' : 'bg-amber-500/20 text-amber-400')
              }
            >
              {editingPratId ? <Edit3 className="w-6 h-6" /> : <Wrench className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {editingPratId ? 'Editando Roteiro Operacional Prático' : 'Gestor de Práticas em Sala, Oficina & Campo'}
              </h2>
              <p className="text-xs text-slate-400">
                Checklists de bancada, inspeção pré-operacional (Walkaround) e rubricas técnicas de conformidade.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAiModalOpen(true)}
              className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-amber-600/30 transition-transform active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-white animate-spin" />
              <span>Gerar Checklist com IA</span>
            </button>

            {editingPratId && (
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

        <form onSubmit={handleSavePractice} className="space-y-6">
          {/* DADOS GERAIS DO PROCEDIMENTO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-400">Título do Procedimento Operacional</label>
              <input
                required
                placeholder="Ex: Inspeção 360° e Teste Pré-Operacional de Caminhão Fora de Estrada"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-800 focus:border-amber-500 p-2.5 rounded-xl text-white text-sm font-semibold focus:outline-none uppercase"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400">Disciplina Vinculada</label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-800 focus:border-amber-500 p-2.5 rounded-xl text-white text-sm focus:outline-none font-medium"
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
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Tempo Estimado (Minutos)</span>
              </label>
              <input
                type="number"
                required
                min={5}
                max={300}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full mt-1 bg-slate-950 border border-slate-800 focus:border-amber-500 p-2.5 rounded-xl text-white text-sm font-mono font-bold focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2 md:col-span-4">
              <label className="text-xs font-bold text-slate-400">Instruções Técnicas e EPIs Obrigatórios</label>
              <textarea
                rows={2}
                placeholder="Ex: Utilização obrigatória de capacete, óculos, luvas de vaqueta e botina com biqueira. Realizar inspeção com motor desligado e chave travada..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-800 focus:border-amber-500 p-2.5 rounded-xl text-white text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* PAINEL DE DISTRIBUIÇÃO E CRITÉRIOS DE RUBRICA */}
          <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-amber-400 shrink-0" />
              <div>
                <span className="text-xs font-black text-white block uppercase tracking-wider">Matriz de Habilidades e Conformidade</span>
                <span className="text-[11px] text-slate-400">
                  Pontuação ponderada e itens críticos eliminatórios para segurança e operacionalidade.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300">
                <input
                  type="checkbox"
                  checked={isTeamMode}
                  onChange={(e) => setIsTeamMode(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  <span>Avaliação por Dupla / Equipe</span>
                </span>
              </label>

              <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-bold text-slate-400">
                Total: <span className="text-amber-400 font-mono font-black text-sm">{totalWeight.toFixed(1)}</span> pts
              </div>
            </div>
          </div>

          {/* LISTA DE PASSOS DO PROCEDIMENTO (ETAPAS) */}
          <div className="space-y-6 pt-2">
            {steps.map((s, sIdx) => (
              <div
                key={s.id}
                className="p-5 bg-slate-950/80 border border-slate-800 rounded-3xl space-y-4 shadow-lg hover:border-slate-700 transition-colors"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800/80 pb-3 gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 font-black text-xs flex items-center justify-center">
                      {sIdx + 1}
                    </span>
                    <span className="text-xs font-black uppercase text-white tracking-wider">
                      Passo Operacional #{sIdx + 1}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
                    {/* FORMATO DA ETAPA */}
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs font-bold text-slate-400">Formato:</label>
                      <select
                        value={s.type}
                        onChange={(e) => handleUpdateStep(sIdx, 'type', e.target.value as StepType)}
                        className="bg-slate-900 border border-amber-500/40 text-amber-300 text-xs px-2.5 py-1.5 rounded-xl font-bold focus:outline-none"
                      >
                        <option value="CHECKLIST">✓/✗ Checklist Conforme / Não Conforme</option>
                        <option value="SLIDER">⎚ Medição Técnica (Pressão/Torque/Nível)</option>
                        <option value="PUZZLE">🧩 Sequenciamento Cronológico de Ações</option>
                      </select>
                    </div>

                    {/* ITEM CRÍTICO */}
                    <label className="flex items-center gap-1.5 bg-red-950/40 border border-red-900/60 px-2.5 py-1 rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={s.isCritical}
                        onChange={(e) => handleUpdateStep(sIdx, 'isCritical', e.target.checked)}
                        className="w-3.5 h-3.5 accent-red-500 rounded cursor-pointer"
                      />
                      <span className="text-[10px] font-black text-red-300 flex items-center gap-1 uppercase">
                        <AlertTriangle className="w-3 h-3 text-red-400" />
                        <span>Item Crítico</span>
                      </span>
                    </label>

                    {/* PESO */}
                    <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-xl">
                      <span className="text-[10px] text-slate-400 font-bold">Peso:</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="10"
                        value={s.weight}
                        onChange={(e) => handleUpdateStep(sIdx, 'weight', Number(e.target.value))}
                        className="w-10 bg-transparent text-amber-400 font-black text-xs focus:outline-none font-mono"
                      />
                      <span className="text-[10px] text-slate-400 font-bold">pts</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveStep(sIdx)}
                      className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg transition-colors cursor-pointer"
                      title="Remover etapa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <input
                  required
                  placeholder={`Descreva a ação operacional da etapa ${sIdx + 1}...`}
                  value={s.title}
                  onChange={(e) => handleUpdateStep(sIdx, 'title', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 p-3 rounded-xl text-white text-sm font-black focus:outline-none uppercase tracking-wide"
                />

                {/* IMAGEM DO EQUIPAMENTO COM NORMALIZADOR DINÂMICO E PROTEÇÃO ONERROR */}
                <div className="p-3 bg-slate-900/60 border border-slate-800 border-dashed rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-amber-400" />
                    <span className="text-xs text-slate-300 font-medium">Foto do componente ou esquema de segurança (opcional)</span>
                  </div>

                  {s.imageUrl ? (
                    <div className="relative">
                      <img
                        src={formatImageUrl(s.imageUrl)}
                        alt="Esquema da Etapa Prática"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                        className="h-14 w-24 object-contain rounded-lg border border-slate-700 bg-slate-950 p-1 shadow-md"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateStep(sIdx, 'imageUrl', '')}
                        className="absolute -top-1.5 -right-1.5 bg-red-600 hover:bg-red-500 text-white p-0.5 rounded-full cursor-pointer shadow-md transition-colors"
                        title="Remover imagem"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors">
                      <span>Anexar Imagem</span>
                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload(sIdx, e)} className="hidden" />
                    </label>
                  )}
                </div>

                {/* SLIDER DE MEDIÇÃO TÉCNICA (PRESSÃO/TORQUE/NÍVEL) */}
                {s.type === 'SLIDER' && (
                  <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-3">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Gauge className="w-4 h-4" />
                      <span>Parâmetros de Leitura do Instrumento / Tolerância de Campo:</span>
                    </span>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Escala Mínima</label>
                        <input
                          type="number"
                          value={s.sliderConfig.min}
                          onChange={(e) => handleUpdateSliderConfig(sIdx, 'min', Number(e.target.value))}
                          className="w-full mt-1 bg-slate-950 border border-slate-700 p-2 rounded-xl text-white text-xs font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Escala Máxima</label>
                        <input
                          type="number"
                          value={s.sliderConfig.max}
                          onChange={(e) => handleUpdateSliderConfig(sIdx, 'max', Number(e.target.value))}
                          className="w-full mt-1 bg-slate-950 border border-slate-700 p-2 rounded-xl text-white text-xs font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Unidade de Medida</label>
                        <input
                          type="text"
                          placeholder="bar, psi, Nm, °C, mm"
                          value={s.sliderConfig.unit}
                          onChange={(e) => handleUpdateSliderConfig(sIdx, 'unit', e.target.value)}
                          className="w-full mt-1 bg-slate-950 border border-slate-700 p-2 rounded-xl text-white text-xs uppercase"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-amber-400 uppercase">Valor Nominal Alvo *</label>
                        <input
                          type="number"
                          value={s.sliderConfig.target}
                          onChange={(e) => handleUpdateSliderConfig(sIdx, 'target', Number(e.target.value))}
                          className="w-full mt-1 bg-slate-950 border border-amber-500/70 p-2 rounded-xl text-white text-xs font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Tolerância Aceitável (±)</label>
                        <input
                          type="number"
                          value={s.sliderConfig.tolerance}
                          onChange={(e) => handleUpdateSliderConfig(sIdx, 'tolerance', Number(e.target.value))}
                          className="w-full mt-1 bg-slate-950 border border-slate-700 p-2 rounded-xl text-white text-xs font-mono font-bold"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* PUZZLE / ORDENAÇÃO DE SUB-ETAPAS */}
                {s.type === 'PUZZLE' && (
                  <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-3">
                    <span className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                      <ListOrdered className="w-4 h-4" />
                      <span>Cadastre a sequência cronológica correta das sub-ações:</span>
                    </span>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[0, 1, 2, 3].map((stepIdx) => (
                        <div key={stepIdx} className="p-2.5 bg-slate-950 border border-slate-700 rounded-xl flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-amber-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                            {stepIdx + 1}º
                          </span>
                          <input
                            required
                            placeholder={`Sub-ação ${stepIdx + 1}...`}
                            value={s.options[stepIdx]?.text || ''}
                            onChange={(e) => handleUpdateOptionText(sIdx, stepIdx, e.target.value)}
                            className="w-full bg-transparent text-xs text-white focus:outline-none font-bold uppercase"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* NORMA REGULAMENTADORA / PROCEDIMENTO TÉCNICO */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                  <label className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5 uppercase">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Critério de Aceitação Técnica / Item de Norma Aplicável</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Especifique a referência técnica (ex: NR-12, NR-22, manual do fabricante ou POP-04)..."
                    value={s.technicalStandard}
                    onChange={(e) => handleUpdateStep(sIdx, 'technicalStandard', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 p-2.5 rounded-xl text-white text-xs focus:outline-none uppercase"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* BOTÕES DE AÇÃO */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={handleAddStep}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 rounded-2xl transition-colors flex items-center justify-center gap-2 border border-slate-700 cursor-pointer text-xs uppercase"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Adicionar Mais uma Etapa Operacional</span>
            </button>

            <button
              type="submit"
              disabled={loading}
              className={
                'flex-1 font-black py-3.5 rounded-2xl text-white shadow-lg transition-all cursor-pointer disabled:opacity-50 text-xs uppercase tracking-wider ' +
                (editingPratId
                  ? 'bg-orange-600 hover:bg-orange-500 shadow-orange-600/30'
                  : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20')
              }
            >
              {loading
                ? 'Salvando...'
                : editingPratId
                ? `Atualizar Roteiro (${steps.length} etapas)`
                : `Salvar Roteiro Prático (${steps.length} etapas)`}
            </button>
          </div>
        </form>
      </div>

      {/* LISTAGEM DE PROCEDIMENTOS PRÁTICOS CADASTRADOS */}
      <div className="bg-slate-900/60 border border-slate-800/90 p-6 rounded-3xl space-y-4 shadow-xl backdrop-blur-md">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Layers className="text-amber-400 w-5 h-5" />
          <span>Banco de Procedimentos Práticos Cadastrados</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {practices.map((prat) => (
            <div
              key={prat.id}
              className={
                'border p-4 rounded-2xl flex flex-col justify-between transition-all ' +
                (editingPratId === prat.id
                  ? 'bg-amber-950/30 border-amber-500/80 ring-2 ring-amber-500/30'
                  : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700')
              }
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-300 border-amber-500/30 flex items-center gap-1">
                    <Wrench className="w-3 h-3" />
                    <span>{prat.durationMinutes || 60} min</span>
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleEditPractice(prat)}
                      className="text-slate-400 hover:text-amber-400 p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-slate-800"
                      title="Editar roteiro"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePractice(prat.id)}
                      className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-slate-800"
                      title="Excluir roteiro"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-white text-sm uppercase">{prat.title}</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {prat.subject?.name || 'Geral'} • <strong className="text-amber-400">{prat.questions?.length || 0} etapas</strong>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AiImportModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onImportData={handleImportFromAi}
      />
    </div>
  );
};

export default PratManager;