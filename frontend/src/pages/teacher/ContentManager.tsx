import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  FolderOpen,
  Upload,
  BookOpen,
  FileText,
  Trash2,
  PlusCircle,
  Layers,
  Sparkles,
} from 'lucide-react';

interface ContentManagerProps {
  activeClassId: string | null;
  activeClassData: any | null;
}

export const ContentManager: React.FC<ContentManagerProps> = ({ activeClassId, activeClassData }) => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [lessons, setLessons] = useState<any[]>([]);
  
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDescription, setLessonDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Carrega as disciplinas da turma selecionada
  useEffect(() => {
    if (activeClassId && activeClassData) {
      // Extrai as disciplinas da turma ou busca da API
      const classSubjects = activeClassData.modules?.map((m: any) => m.subject).filter(Boolean) || [];
      if (classSubjects.length > 0) {
        setSubjects(classSubjects);
        setSelectedSubjectId(classSubjects[0].id);
      } else {
        fetchGeneralSubjects();
      }
    } else {
      fetchGeneralSubjects();
    }
  }, [activeClassId, activeClassData]);

  useEffect(() => {
    if (selectedSubjectId) {
      fetchLessons(selectedSubjectId);
    } else {
      setLessons([]);
    }
  }, [selectedSubjectId]);

  const fetchGeneralSubjects = async () => {
    try {
      const res = await api.get('/academic/subjects');
      setSubjects(res.data || []);
      if (res.data?.length > 0) {
        setSelectedSubjectId(res.data[0].id);
      }
    } catch (e) {
      console.error('Erro ao buscar disciplinas:', e);
    }
  };

  const fetchLessons = async (subjectId: string) => {
    try {
      const res = await api.get(`/academic/subjects/${subjectId}/lessons`);
      setLessons(res.data || []);
    } catch (e) {
      console.error('Erro ao buscar aulas:', e);
    }
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId || !lessonTitle.trim()) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('subjectId', selectedSubjectId);
      if (activeClassId) {
        formData.append('classId', activeClassId);
      }
      formData.append('title', lessonTitle.trim());
      formData.append('description', lessonDescription.trim());
      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      await api.post('/academic/lessons', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setLessonTitle('');
      setLessonDescription('');
      setSelectedFile(null);
      fetchLessons(selectedSubjectId);
      alert('Aula e slides cadastrados com sucesso para esta turma!');
    } catch (err: any) {
      alert('Erro ao salvar aula: ' + (err.response?.data?.message || 'Tente novamente.'));
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('Deseja realmente remover esta aula e seus materiais?')) return;
    try {
      await api.delete(`/academic/lessons/${lessonId}`);
      fetchLessons(selectedSubjectId);
    } catch (e) {
      alert('Erro ao excluir aula.');
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900/90 to-slate-950 border border-slate-800 p-6 rounded-3xl shadow-2xl space-y-6 font-sans">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-800 pb-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-xl">
            <FolderOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black text-white">Gerenciamento de Conteúdos & Slides</h2>
              {activeClassData && (
                <span className="text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Turma Focada: {activeClassData.code} ({activeClassData.course?.name})</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Selecione a disciplina abaixo para organizar os slides e apostilas desta turma.
            </p>
          </div>
        </div>

        <div className="w-full md:w-72">
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Filtrar por Disciplina</label>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
          >
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Formulário de Upload */}
        <div className="lg:col-span-5 bg-slate-950/80 border border-slate-800 p-5 rounded-2xl shadow-lg space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            <span>Adicionar Aula / Slides para esta Turma</span>
          </h3>

          <form onSubmit={handleCreateLesson} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Título da Aula</label>
              <input
                type="text"
                required
                placeholder="Ex: Aula 01 - Operação da Escavadeira"
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl p-2.5 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Descrição / Tópicos</label>
              <textarea
                rows={2}
                placeholder="Resumo dos tópicos da aula..."
                value={lessonDescription}
                onChange={(e) => setLessonDescription(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl p-2.5 text-xs text-white focus:outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Arquivo de Slides (PDF ou Imagem)</label>
              <div className="border border-dashed border-slate-800 hover:border-slate-700 bg-slate-900 p-3 rounded-xl text-center cursor-pointer relative">
                <input
                  type="file"
                  accept=".pdf,.ppt,.pptx,.png,.jpg,.jpeg"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="flex items-center justify-center gap-2">
                  <Upload className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="text-xs text-slate-300 font-medium truncate">
                    {selectedFile ? selectedFile.name : 'Selecionar arquivo...'}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={uploading}
              className="w-full bg-blue-600 hover:bg-blue-500 font-bold py-2.5 rounded-xl text-white shadow-lg transition-all cursor-pointer text-xs disabled:opacity-50"
            >
              {uploading ? 'Enviando...' : 'Publicar Material na Turma'}
            </button>
          </form>
        </div>

        {/* Listagem */}
        <div className="lg:col-span-7 bg-slate-950/80 border border-slate-800 p-5 rounded-2xl shadow-lg space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-400" />
            <span>Aulas Publicadas nesta Disciplina</span>
          </h3>

          {lessons.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs italic border border-dashed border-slate-800 rounded-xl">
              Nenhum slide cadastrado para esta disciplina.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {lessons.map((lesson, idx) => (
                <div
                  key={lesson.id}
                  className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between gap-3 shadow-sm"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-blue-600/20 text-blue-400 flex items-center justify-center font-black text-[10px]">
                        {idx + 1}
                      </span>
                      <h4 className="font-bold text-white text-xs">{lesson.title}</h4>
                    </div>
                    {lesson.fileUrl && (
                    <div className="pl-7 pt-0.5 flex items-center gap-1.5">
                        <FileText className="w-3 h-3 text-emerald-400" />
                        <a
                        href={lesson.fileUrl.startsWith('http') ? lesson.fileUrl : `http://${window.location.hostname}:3000${lesson.fileUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-blue-400 hover:underline font-medium"
                        >
                        Visualizar / Baixar Arquivo
                        </a>
                    </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteLesson(lesson.id)}
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    title="Excluir aula"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContentManager;