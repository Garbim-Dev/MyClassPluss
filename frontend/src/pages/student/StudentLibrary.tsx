import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  BookOpen,
  FileText,
  ExternalLink,
  Layers,
  Loader2,
  Download,
} from 'lucide-react';

interface StudentLibraryProps {
  studentClassId?: string;
}

const SESSION_KEY = '@MyClassPluss:student_session';

export const StudentLibrary: React.FC<StudentLibraryProps> = ({ studentClassId }) => {
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // ⚡ Recuperação resiliente do classId caso não venha pelas props
  const resolvedClassId = (() => {
    if (studentClassId && studentClassId.trim() !== '') return studentClassId;
    const local = localStorage.getItem(SESSION_KEY);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (parsed.classId) return parsed.classId;
      } catch (e) {}
    }
    return sessionStorage.getItem('@MyClassPluss:currentClassId') || '';
  })();

  useEffect(() => {
    if (resolvedClassId) {
      fetchClassLessons(resolvedClassId);
    }
  }, [resolvedClassId]);

  const fetchClassLessons = async (classId: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/academic/classes/${classId}/lessons`);
      setLessons(res.data || []);
    } catch (e) {
      console.error('Erro ao buscar materiais da turma:', e);
    } finally {
      setLoading(false);
    }
  };

  const getFormattedFileUrl = (rawUrl: string) => {
    if (!rawUrl) return '';
    let target = rawUrl.trim();

    // Se já for URL absoluta completa
    if (target.startsWith('http://') || target.startsWith('https://')) {
      return encodeURI(target);
    }

    // Garante que aponte para /uploads/ caso venha apenas o nome do arquivo
    if (!target.startsWith('/uploads/') && !target.startsWith('uploads/')) {
      target = `/uploads/${target.replace(/^\/+/, '')}`;
    } else if (target.startsWith('uploads/')) {
      target = `/${target}`;
    }

    const fullUrl = `http://${window.location.hostname}:3000${target}`;
    return encodeURI(fullUrl);
  };

  const handleOpenFile = (rawUrl: string, title?: string) => {
    const safeUrl = getFormattedFileUrl(rawUrl);
    if (!safeUrl) return;

    // Dispara via âncora programática para contornar bloqueios em webviews e navegadores mobile
    const link = document.createElement('a');
    link.href = safeUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    if (title) {
      link.download = `${title}.pdf`;
    }
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* CABEÇALHO */}
      <div className="bg-slate-900/90 border border-slate-800 p-5 sm:p-6 rounded-3xl shadow-xl backdrop-blur-md flex items-center gap-3.5">
        <div className="p-3 bg-purple-600/20 text-purple-400 rounded-2xl shrink-0">
          <BookOpen className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-black text-white">Biblioteca de Aulas & Slides</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Materiais didáticos e apostilas disponibilizados pelo instrutor para esta turma.
          </p>
        </div>
      </div>

      {/* LISTAGEM DE AULAS DA TURMA */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-2 text-xs text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
          <span>Carregando biblioteca...</span>
        </div>
      ) : lessons.length === 0 ? (
        <div className="p-12 sm:p-16 border border-dashed border-slate-800 rounded-3xl text-center space-y-2 bg-slate-900/30">
          <Layers className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">Nenhum slide publicado ainda</h3>
          <p className="text-xs text-slate-400">
            Assim que o instrutor postar os slides para esta turma, eles aparecerão aqui para estudo.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lessons.map((lesson, idx) => (
            <div
              key={lesson.id}
              className="bg-slate-900/80 border border-slate-800 p-5 rounded-3xl shadow-xl flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border bg-purple-500/10 text-purple-300 border-purple-500/30">
                    Aula {idx + 1}
                  </span>
                  {lesson.subject?.name && (
                    <span className="text-[10px] font-bold text-slate-400 truncate max-w-[150px]">
                      {lesson.subject.name}
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-white text-sm sm:text-base leading-snug">{lesson.title}</h3>
                {lesson.description && (
                  <p className="text-xs text-slate-400 line-clamp-2">{lesson.description}</p>
                )}
              </div>

              {lesson.fileUrl && (
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium truncate max-w-[140px]">
                    <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="truncate">
                      {lesson.fileUrl.split('/').pop() || 'Material PDF'}
                    </span>
                  </span>

                  <button
                    type="button"
                    onClick={() => handleOpenFile(lesson.fileUrl, lesson.title)}
                    className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md shadow-purple-600/30 transition-transform active:scale-95 cursor-pointer shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Visualizar / Baixar</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentLibrary;