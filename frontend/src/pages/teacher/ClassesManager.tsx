import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { ClassStudentsModal } from './ClassStudentsModal';
import { ClassAttendanceModal } from './ClassAttendanceModal';
import { ClassReportModal } from './ClassReportModal';
import { useFormAutoSave } from '../../hooks/useFormAutoSave';
import { 
  GraduationCap, 
  Plus, 
  Edit3, 
  Trash2, 
  X, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  BookOpen,
  Clock,
  Calendar,
  DoorClosed,
  Users,
  UserCheck,
  FileSpreadsheet,
} from 'lucide-react';

export const ClassesManager: React.FC = () => {
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [selectedInstId, setSelectedInstId] = useState<string>('');
  
  const [courses, setCourses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [classesList, setClassesList] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal de Turma
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Estados para o Modal de Alunos da Turma
  const [isStudentsModalOpen, setIsStudentsModalOpen] = useState(false);
  const [selectedClassForStudents, setSelectedClassForStudents] = useState<any | null>(null);
  
  // ⚡ Estado para controlar o Modal de Chamada Diária
  const [attendanceClass, setAttendanceClass] = useState<any | null>(null);

  // ⚡ Estados para o Modal do Dossiê Oficial Consolidado
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedClassForReport, setSelectedClassForReport] = useState<any | null>(null);
  const [reportData, setReportData] = useState<any | null>(null);
  const [loadingReportId, setLoadingReportId] = useState<string | null>(null);
  
  // Campos do formulário de Turma / Módulo
  const [classCode, setClassCode] = useState('');
  const [courseId, setCourseId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [roomName, setRoomName] = useState('');
  const [shift, setShift] = useState('MATUTINO');
  const [startTime, setStartTime] = useState('07:30');
  const [endTime, setEndTime] = useState('11:30');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ⚡ Auto-Save configurado com os campos de criação de Turma
  const { clearDraft } = useFormAutoSave(
    '@MyClassPluss:draft_class_form',
    {
      classCode,
      courseId,
      subjectId,
      roomName,
      shift,
      startTime,
      endTime,
      startDate,
      endDate,
    },
    (saved) => {
      if (saved.classCode) setClassCode(saved.classCode);
      if (saved.courseId) setCourseId(saved.courseId);
      if (saved.subjectId) setSubjectId(saved.subjectId);
      if (saved.roomName) setRoomName(saved.roomName);
      if (saved.shift) setShift(saved.shift);
      if (saved.startTime) setStartTime(saved.startTime);
      if (saved.endTime) setEndTime(saved.endTime);
      if (saved.startDate) setStartDate(saved.startDate);
      if (saved.endDate) setEndDate(saved.endDate);
    },
    Boolean(editingId)
  );

  // Carrega dados iniciais
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [instRes, subjRes, roomRes] = await Promise.all([
          api.get('/academic/institutions'),
          api.get('/academic/subjects'),
          api.get('/academic/rooms').catch(() => ({ data: [] }))
        ]);

        setInstitutions(instRes.data);
        setSubjects(subjRes.data);
        setRooms(roomRes.data);

        if (instRes.data.length > 0) {
          setSelectedInstId(instRes.data[0].id);
        }
      } catch (err) {
        setError('Erro ao carregar dados iniciais.');
      }
    };
    fetchInitialData();
  }, []);

  // ⚡ Função reutilizável para recarregar as turmas e contadores atualizados
  const fetchClassesData = useCallback(async () => {
    if (!selectedInstId) return;
    try {
      setLoading(true);
      const coursesRes = await api.get(`/academic/institutions/${selectedInstId}/courses`);
      setCourses(coursesRes.data);
      if (coursesRes.data.length > 0 && !courseId) {
        setCourseId(coursesRes.data[0].id);
      }

      const classesRes = await api.get('/academic/classes');
      const courseIds = coursesRes.data.map((c: any) => c.id);
      const filtered = classesRes.data.filter((cls: any) => courseIds.includes(cls.courseId));
      setClassesList(filtered);
    } catch (err) {
      setError('Erro ao carregar turmas.');
    } finally {
      setLoading(false);
    }
  }, [selectedInstId, courseId]);

  // Carrega quando a instituição for selecionada
  useEffect(() => {
    fetchClassesData();
  }, [fetchClassesData]);

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setClassCode('');
    if (courses.length > 0) setCourseId(courses[0].id);
    if (subjects.length > 0) setSubjectId(subjects[0].id);
    setRoomName(rooms.length > 0 ? rooms[0].name : '');
    setShift('MATUTINO');
    setStartTime('07:30');
    setEndTime('11:30');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cls: any) => {
    setEditingId(cls.id);
    setClassCode(cls.code);
    setCourseId(cls.courseId);
    
    const module = cls.modules?.[0];
    if (module) {
      setSubjectId(module.subjectId || '');
      setRoomName(module.room || '');
      setShift(module.shift || 'MATUTINO');
      setStartTime(module.startTime || '07:30');
      setEndTime(module.endTime || '11:30');
      setStartDate(module.startDate ? module.startDate.split('T')[0] : '');
      setEndDate(module.endDate ? module.endDate.split('T')[0] : '');
    }
    
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    clearDraft();
    setEditingId(null);
  };

  const handleOpenStudentsModal = (cls: any) => {
    setSelectedClassForStudents(cls);
    setIsStudentsModalOpen(true);
  };

  // ⚡ Dossiê Oficial
  const handleOpenReportModal = async (cls: any) => {
    setLoadingReportId(cls.id);
    setSelectedClassForReport(cls);

    try {
      const subjectIdToUse = cls.modules?.[0]?.subjectId;
      const res = await api.get(`/academic/classes/${cls.id}/performance`, {
        params: subjectIdToUse ? { subjectId: subjectIdToUse } : undefined,
      });

      setReportData(res.data);
      setIsReportModalOpen(true);
    } catch (err: any) {
      console.error('Erro ao carregar dossiê da turma:', err);
      setReportData({
        classInfo: {
          code: cls.code,
          courseName: cls.course?.name || courses.find(c => c.id === cls.courseId)?.name || 'Treinamento Técnico',
          subjectName: cls.modules?.[0]?.subject?.name || 'Conhecimentos Gerais',
        },
        activityCounts: {
          totalActivities: 0,
          quizzesCount: 0,
          examsCount: 0,
          practicesCount: 0,
        },
        summary: {
          enrolledCount: cls.enrollments?.length || 0,
          classAverage: 0.0,
          approvedCount: 0,
          failedCount: cls.enrollments?.length || 0,
        },
        students: (cls.enrollments || []).map((e: any, idx: number) => ({
          rank: idx + 1,
          userId: e.user?.id || e.id,
          userName: e.user?.name || e.user?.email || `Aluno #${idx + 1}`,
          totalGrade: 0.0,
          isApproved: false,
          attendancePercentage: 100,
        })),
      });
      setIsReportModalOpen(true);
    } finally {
      setLoadingReportId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const payload = {
      classCode,
      courseId,
      subjectName: subjects.find(s => s.id === subjectId)?.name || 'Disciplina Geral',
      subjectWorkload: 40,
      room: roomName,
      shift,
      startTime,
      endTime,
      startDate,
      endDate,
    };

    try {
      if (editingId) {
        await api.put(`/academic/demands/${editingId}`, payload);
        setSuccessMsg('Turma atualizada com sucesso!');
      } else {
        await api.post('/academic/demands', payload);
        setSuccessMsg('Turma criada com sucesso!');
      }

      clearDraft();
      setIsModalOpen(false);

      await fetchClassesData();

      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar turma.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta turma e seus vínculos?')) return;

    try {
      await api.delete(`/academic/demands/${id}`);
      setSuccessMsg('Turma removida com sucesso!');
      
      await fetchClassesData();

      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError('Erro ao excluir turma.');
    }
  };

  const currentInstitution = institutions.find(i => i.id === selectedInstId);

  return (
    <div className="space-y-6">
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/60 border border-slate-800 p-6 rounded-3xl backdrop-blur-xl">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-indigo-400" />
            Gestão de Turmas
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Organize as turmas ativas vinculadas a cursos, disciplinas, horários e locais físicos.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedInstId}
            onChange={(e) => setSelectedInstId(e.target.value)}
            className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2 text-xs font-bold text-white focus:outline-none w-full md:w-64 cursor-pointer"
          >
            {institutions.map((inst) => (
              <option key={inst.id} value={inst.id}>{inst.name}</option>
            ))}
          </select>

          <button
            onClick={handleOpenCreateModal}
            disabled={!selectedInstId || courses.length === 0 || subjects.length === 0}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Nova Turma
          </button>
        </div>
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

      {/* LISTAGEM DE TURMAS */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      ) : classesList.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 border border-slate-800/80 rounded-3xl space-y-3">
          <GraduationCap className="w-12 h-12 text-slate-600 mx-auto" />
          <p className="text-sm font-bold text-slate-300">Nenhuma turma cadastrada para {currentInstitution?.name || 'esta unidade'}.</p>
          <p className="text-xs text-slate-500">Cadastre cursos e disciplinas, depois clique em "Nova Turma".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classesList.map((cls) => {
            const course = courses.find(c => c.id === cls.courseId);
            const module = cls.modules?.[0];
            const subject = module?.subject;
            const isReportLoading = loadingReportId === cls.id;
            
            return (
              <div 
                key={cls.id}
                className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 p-6 rounded-3xl shadow-xl flex flex-col justify-between space-y-4 transition-all"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="p-3 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-2xl">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleOpenEditModal(cls)}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                        title="Editar"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(cls.id)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-xl transition-colors cursor-pointer"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-white">{cls.code}</h3>
                    <p className="text-xs text-purple-400 flex items-center gap-1.5 mt-1 font-medium">
                      <BookOpen className="w-3.5 h-3.5 shrink-0" />
                      <span>{course?.name || 'Curso não vinculado'}</span>
                    </p>
                  </div>

                  {subject && (
                    <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-2xl space-y-1 text-xs">
                      <span className="text-slate-400 block font-semibold">Disciplina Atual:</span>
                      <span className="text-slate-200 font-bold">{subject.name}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-3 border-t border-slate-800 text-xs text-slate-300">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 flex items-center gap-1">
                      <DoorClosed className="w-3.5 h-3.5 text-amber-400" />
                      <span>Local:</span>
                    </span>
                    <span className="font-bold text-amber-400">{module?.room || 'Não informado'}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      <span>Horário:</span>
                    </span>
                    <span className="font-bold text-blue-400">{module?.startTime || '--:--'} às {module?.endTime || '--:--'} ({module?.shift || 'MATUTINO'})</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Período:</span>
                    </span>
                    <span className="font-bold text-emerald-400">
                      {module?.startDate ? new Date(module.startDate).toLocaleDateString('pt-BR') : '--'} até {module?.endDate ? new Date(module.endDate).toLocaleDateString('pt-BR') : '--'}
                    </span>
                  </div>

                  {/* BOTÕES DE AÇÕES NO CARD */}
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <button
                      onClick={() => handleOpenStudentsModal(cls)}
                      className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold py-2 rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      title="Gerenciar alunos matriculados"
                    >
                      <Users className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate">Alunos ({cls.enrollments?.length || 0})</span>
                    </button>

                    <button
                      onClick={() => setAttendanceClass(cls)}
                      className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold py-2 rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                      title="Realizar chamada diária"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Chamada</span>
                    </button>

                    <button
                      onClick={() => handleOpenReportModal(cls)}
                      disabled={isReportLoading}
                      className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-[11px] font-bold py-2 rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-sm disabled:opacity-50"
                      title="Abrir Dossiê Oficial e Prontuários da Turma"
                    >
                      {isReportLoading ? (
                        <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin shrink-0" />
                      ) : (
                        <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      )}
                      <span>Dossiê</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE CADASTRO / EDIÇÃO DE TURMA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl relative my-8">
            <button
              type="button"
              onClick={handleCloseModal}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-white">
                {editingId ? 'Editar Turma' : 'Nova Turma'}
              </h3>
              <p className="text-xs text-slate-400">
                Unidade: <strong className="text-white">{currentInstitution?.name}</strong>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Código / Nome da Turma *</label>
                  <input
                    type="text"
                    required
                    value={classCode}
                    onChange={(e) => setClassCode(e.target.value)}
                    placeholder="Ex: ELE-2026-A"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Curso Vinculado *</label>
                  <select
                    required
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none cursor-pointer"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Disciplina Principal *</label>
                  <select
                    required
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none cursor-pointer"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 flex items-center gap-1">
                    <DoorClosed className="w-3.5 h-3.5 text-amber-400" />
                    <span>Sala / Ambiente Físico *</span>
                  </label>
                  <select
                    required
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none cursor-pointer"
                  >
                    <option value="" disabled>Selecione um ambiente...</option>
                    {rooms.length === 0 ? (
                      <option value="Sala Principal">Sala Principal (Nenhum cadastrado)</option>
                    ) : (
                      rooms.map((r) => (
                        <option key={r.id} value={r.name}>{r.name} {r.capacity ? `(${r.capacity} lugares)` : ''}</option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Turno *</label>
                  <select
                    required
                    value={shift}
                    onChange={(e) => setShift(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none cursor-pointer"
                  >
                    <option value="MATUTINO">Matutino</option>
                    <option value="VESPERTINO">Vespertino</option>
                    <option value="NOTURNO">Noturno</option>
                    <option value="INTEGRAL">Integral</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span>Início *</span>
                  </label>
                  <div className="relative">
                    <input
                      type="time"
                      required
                      onClick={(e) => e.currentTarget.showPicker?.()}
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none [color-scheme:dark] cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span>Término *</span>
                  </label>
                  <div className="relative">
                    <input
                      type="time"
                      required
                      onClick={(e) => e.currentTarget.showPicker?.()}
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none [color-scheme:dark] cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Data de Início *</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      onClick={(e) => e.currentTarget.showPicker?.()}
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none [color-scheme:dark] cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Data de Término *</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      onClick={(e) => e.currentTarget.showPicker?.()}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none [color-scheme:dark] cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl text-xs transition-colors cursor-pointer border border-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Turma'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ⚡ MODAL DE GERENCIAMENTO DE ALUNOS COM ATUALIZAÇÃO IMEDIATA DO CONTADOR */}
      <ClassStudentsModal
        isOpen={isStudentsModalOpen}
        onClose={() => {
          setIsStudentsModalOpen(false);
          fetchClassesData(); // ⚡ RECARREGA A LISTA DE TURMAS AO FECHAR
        }}
        onStudentEnrolled={() => fetchClassesData()} // ⚡ SE MATRICULAR UM NOVO ALUNO, ATUALIZA
        onStudentRemoved={() => fetchClassesData()}  // ⚡ SE EXCLUIR UM ALUNO, ATUALIZA NA HORA
        classId={selectedClassForStudents?.id || null}
        classCode={selectedClassForStudents?.code || ''}
      />

      {/* MODAL DE CHAMADA (DIÁRIO DE FREQUÊNCIA) */}
      {attendanceClass && (
        <ClassAttendanceModal
          isOpen={Boolean(attendanceClass)}
          onClose={() => setAttendanceClass(null)}
          classId={attendanceClass.id}
          classCode={attendanceClass.code}
          courseName={courses.find(c => c.id === attendanceClass.courseId)?.name || 'Turma Técnica'}
        />
      )}

      {/* MODAL DO DOSSIÊ OFICIAL E PRONTUÁRIOS */}
      {selectedClassForReport && (
        <ClassReportModal
          isOpen={isReportModalOpen}
          onClose={() => {
            setIsReportModalOpen(false);
            setSelectedClassForReport(null);
          }}
          classNameStr={reportData?.classInfo?.code || selectedClassForReport?.code || 'Turma'}
          courseNameStr={reportData?.classInfo?.courseName || courses.find(c => c.id === selectedClassForReport.courseId)?.name || 'Curso'}
          subjectNameStr={reportData?.classInfo?.subjectName || selectedClassForReport?.modules?.[0]?.subject?.name || 'Conhecimentos Gerais'}
          totalQuizzes={reportData?.activityCounts?.quizzesCount ?? 0}
          totalExams={reportData?.activityCounts?.examsCount ?? 0}
          totalPractices={reportData?.activityCounts?.practicesCount ?? 0}
          students={reportData?.students || []}
        />
      )}
    </div>
  );
};

export default ClassesManager;