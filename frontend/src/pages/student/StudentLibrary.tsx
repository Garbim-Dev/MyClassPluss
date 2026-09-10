import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  BookOpen,
  FileText,
  ExternalLink,
  Layers,
} from 'lucide-react';

interface StudentLibraryProps {
  studentClassId: string;
}

export const StudentLibrary: React.FC<StudentLibraryProps> = ({ studentClassId }) => {
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (studentClassId) {
      fetchClassLessons(studentClassId);
    }
  }, [studentClassId]);

  const fetchClassLessons = async (classId: string) => {
    setLoading(true);
    try {
      // ⚡ Busca direto os slides cadastrados para esta turma no painel do instrutor
      const res = await api.get(`/academic/classes/${classId}/lessons`);
      setLessons(res.data || []);
    } catch (e) {
      console.error('Erro ao buscar materiais da turma:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* CABEÇALHO */}
      <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-xl backdrop-blur-md flex items-center gap-3.5">
        <div className="p-3 bg-purple-600/20 text-purple-400 rounded-2xl">
          <BookOpen className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white">Biblioteca de Aulas & Slides</h2>
          <p className="text-xs text-slate-400">
            Materiais didáticos e apostilas disponibilizados pelo instrutor para esta turma.
          </p>
        </div>
      </div>

      {/* LISTAGEM DE AULAS DA TURMA */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">Carregando biblioteca...</div>
      ) : lessons.length === 0 ? (
        <div className="p-16 border border-dashed border-slate-800 rounded-3xl text-center space-y-2 bg-slate-900/30">
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
                  <span className="text-[11px] text-slate-400">Material Oficial LAN</span>
                </div>

                <h3 className="font-bold text-white text-base leading-snug">{lesson.title}</h3>
                {lesson.description && (
                  <p className="text-xs text-slate-400 line-clamp-2">{lesson.description}</p>
                )}
              </div>

              {lesson.fileUrl && (
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span>Material Oficial LAN</span>
                  </span>

                  <a
                    href={lesson.fileUrl.startsWith('http') ? lesson.fileUrl : `http://${window.location.hostname}:3000${lesson.fileUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md shadow-purple-600/30 transition-transform active:scale-95"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Abrir Arquivo</span>
                  </a>
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