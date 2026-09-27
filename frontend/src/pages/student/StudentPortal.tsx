import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { getSocket } from '../../services/socket';
import {
  GraduationCap,
  ArrowLeft,
  Printer,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  Sparkles,
  User,
  ShieldAlert,
  Gamepad2,
  CalendarCheck2,
  AlertTriangle,
  ChevronRight,
  Clock,
  WifiOff,
} from 'lucide-react';

interface AcademicRecord {
  id: string;
  quizTitle: string;
  subjectName: string;
  courseName: string;
  classCode: string;
  date: string;
  totalCorrect: number;
  totalQuestions: number;
  speedScore: number;
  finalGrade: number;
  isApproved: boolean;
}

interface AttendanceItem {
  id: string;
  date: string;
  status: 'PRESENTE' | 'FALTA' | 'JUSTIFICADO';
}

const SESSION_KEY = '@MyClassPluss:student_session';

export const StudentPortal: React.FC = () => {
  const navigate = useNavigate();

  // ⚡ Carrega a sessão tanto do sessionStorage quanto do localStorage persistente
  const [studentUser] = useState(() => {
    const local = localStorage.getItem(SESSION_KEY);
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
    const saved = sessionStorage.getItem('@MyClassPluss:sessionUser');
    return saved ? JSON.parse(saved) : null;
  });

  const [currentClassId] = useState(() => {
    const local = localStorage.getItem(SESSION_KEY);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (parsed.classId) return parsed.classId;
      } catch (e) {}
    }
    return sessionStorage.getItem('@MyClassPluss:currentClassId') || '';
  });

  // Controle de abas para visualização mobile e desktop
  const [activeTab, setActiveTab] = useState<'notas' | 'arena' | 'frequencia'>('notas');
  const [arenaPin, setArenaPin] = useState('');

  const [records, setRecords] = useState<AcademicRecord[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReconnecting, setIsReconnecting] = useState(false);

  // ⚡ 1. Garante que a sessão fica gravada no localStorage para sobreviver a fechamentos de aba
  useEffect(() => {
    if (studentUser) {
      const payloadToPersist = {
        userId: studentUser.id || studentUser.userId,
        userName: studentUser.name || studentUser.userName,
        email: studentUser.email,
        classId: currentClassId || studentUser.classId,
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(payloadToPersist));
    }
  }, [studentUser, currentClassId]);

  // ⚡ 2. Escuta de reconexão do WebSocket (Keep-Alive em oscilações de Wi-Fi)
  useEffect(() => {
    const targetClassId = currentClassId || studentUser?.classId;
    if (!targetClassId || !studentUser) return;

    const socket = getSocket();

    const handleConnect = () => {
      setIsReconnecting(false);
      socket.emit('join_room', {
        classId: targetClassId,
        userId: String(studentUser.id || studentUser.userId),
        userName: studentUser.name || studentUser.userName || 'Aluno',
        role: 'ALUNO',
      });
    };

    const handleDisconnect = () => {
      setIsReconnecting(true);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [studentUser, currentClassId]);

  // 3. Busca notas e dados acadêmicos do aluno
  useEffect(() => {
    const fetchStudentData = async () => {
      if (!studentUser) {
        setLoading(false);
        return;
      }

      try {
        const studentId = studentUser.id || studentUser.userId;
        const gradesRes = await api.get(`/academic/student-grades/${studentId}`);
        if (gradesRes.data && Array.isArray(gradesRes.data)) {
          setRecords(gradesRes.data);
        } else {
          setRecords([]);
        }

        const targetClassId = currentClassId || studentUser.classId;
        if (targetClassId) {
          const attRes = await api.get(`/academic/classes/${targetClassId}/attendance-report`);
          if (attRes.data && attRes.data.report) {
            const myAttendance = attRes.data.report.find(
              (r: any) => r.studentId === studentId
            );
            if (myAttendance?.history) {
              setAttendanceHistory(myAttendance.history);
            }
          }
        }
      } catch (err) {
        console.warn('Erro ao carregar dados acadêmicos do aluno:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [studentUser, currentClassId]);

  // Cálculos consolidados de notas
  const totalActivities = records.length;
  const overallAverage =
    totalActivities > 0
      ? (records.reduce((acc, r) => acc + r.finalGrade, 0) / totalActivities).toFixed(1)
      : '0.0';

  const approvedActivities = records.filter((r) => r.isApproved).length;
  const approvalRate =
    totalActivities > 0 ? ((approvedActivities / totalActivities) * 100).toFixed(0) : '0';

  const isStudentApproved = Number(overallAverage) >= 7.0;

  // Cálculos consolidados de frequência
  const totalClassesRecorded = attendanceHistory.length;
  const presentDays = attendanceHistory.filter(
    (a) => a.status === 'PRESENTE' || a.status === 'JUSTIFICADO'
  ).length;
  const absentDays = attendanceHistory.filter((a) => a.status === 'FALTA').length;
  const attendancePercentage =
    totalClassesRecorded > 0
      ? Number(((presentDays / totalClassesRecorded) * 100).toFixed(1))
      : 100;
  const isAttendanceAtRisk = totalClassesRecorded > 0 && attendancePercentage < 75.0;

  const handlePrint = () => {
    window.print();
  };

  const handleBackToRoom = () => {
    const classIdToReturn = currentClassId || sessionStorage.getItem('@MyClassPluss:currentClassId');
    if (classIdToReturn) {
      navigate(`/student/join?classId=${classIdToReturn}`, { replace: true });
    } else {
      navigate('/student/join', { replace: true });
    }
  };

  const handleJoinArenaWithPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!arenaPin.trim()) return;
    navigate(`/arena?pin=${arenaPin.trim()}`);
  };

  if (!studentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-slate-950 font-sans text-white">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-sm text-center space-y-4 shadow-2xl">
          <ShieldAlert className="w-12 h-12 text-amber-400 mx-auto" />
          <h2 className="text-xl font-bold">Acesso não autenticado</h2>
          <p className="text-xs text-slate-400">
            Você precisa ingressar em uma sala via QR Code para visualizar seu histórico acadêmico.
          </p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-bold text-xs cursor-pointer"
          >
            Ir para a Tela Inicial
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b19] text-slate-100 font-sans p-4 sm:p-6 lg:p-8 select-none relative">
      {/* ⚡ AVISO DISCRETO DE RECONEXÃO EM OSCILAÇÕES DE WI-FI */}
      {isReconnecting && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500/90 text-slate-950 py-1 px-4 text-center text-xs font-black flex items-center justify-center gap-2 shadow-md">
          <WifiOff className="w-3.5 h-3.5 animate-pulse" />
          <span>Sinal oscilando. Reconectando à sala...</span>
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* TOPO / NAVEGAÇÃO */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-5 rounded-3xl shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBackToRoom}
              className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-2xl text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Voltar para o Lobby da sala de aula"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-white">Portal do Aluno</h1>
                <span className="text-[10px] font-black uppercase bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full">
                  MyClassPluss v2.0
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Acompanhamento de notas, frequência regular e arena interativa
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {activeTab === 'notas' && (
              <button
                type="button"
                onClick={handlePrint}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4 text-blue-400" />
                <span>Imprimir Boletim</span>
              </button>
            )}
          </div>
        </header>

        {/* NAVEGADOR DE ABAS RÁPIDAS (MOBILE FRIENDLY) */}
        <div className="grid grid-cols-3 gap-2 bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('notas')}
            className={`py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'notas'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Boletim</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('frequencia')}
            className={`py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'frequencia'
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <CalendarCheck2 className="w-4 h-4" />
            <span>Frequência</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('arena')}
            className={`py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'arena'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            <span>Arena Ao Vivo</span>
          </button>
        </div>

        {/* CARTÃO DE IDENTIFICAÇÃO DO ALUNO */}
        <div className="bg-gradient-to-r from-blue-950/40 via-slate-900/90 to-indigo-950/40 border border-blue-500/30 p-6 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center font-black text-xl text-white shadow-lg border border-blue-400/40 shrink-0">
              <User className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-black text-white">{studentUser.name || studentUser.userName}</h2>
              <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                <span>Matrícula/E-mail: <strong className="text-slate-200">{studentUser.email || studentUser.id || studentUser.userId}</strong></span>
                <span>•</span>
                <span>Critério: <strong className="text-slate-200">Média 7,0 | Freq 75%</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-start md:justify-end flex-wrap">
            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl text-center px-4 min-w-[100px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Média Geral</span>
              <span className={`text-2xl font-black ${isStudentApproved ? 'text-emerald-400' : 'text-amber-400'}`}>
                {overallAverage} <span className="text-xs font-normal text-slate-500">/ 10</span>
              </span>
            </div>

            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl text-center px-4 min-w-[100px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Frequência</span>
              <span className={`text-2xl font-black ${!isAttendanceAtRisk ? 'text-teal-400' : 'text-red-400'}`}>
                {attendancePercentage}%
              </span>
            </div>
          </div>
        </div>

        {/* ABA 1: BOLETIM / NOTAS ESCOLARES */}
        {activeTab === 'notas' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center gap-3.5">
                <div className="p-3 bg-purple-600/20 text-purple-400 rounded-xl">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Atividades Aplicadas</span>
                  <p className="text-lg font-black text-white">{totalActivities} avaliações</p>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center gap-3.5">
                <div className="p-3 bg-emerald-600/20 text-emerald-400 rounded-xl">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Aproveitamento</span>
                  <p className="text-lg font-black text-emerald-400">{approvalRate}% aprovado</p>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center gap-3.5">
                <div className="p-3 bg-amber-600/20 text-amber-400 rounded-xl">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Pontos Gamificados</span>
                  <p className="text-lg font-black text-amber-300">
                    {records.reduce((acc, r) => acc + (r.speedScore || 0), 0).toLocaleString('pt-BR')} pts
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-blue-400" />
                  <span>Histórico Detalhado por Atividade</span>
                </span>
                <span className="text-xs text-slate-500 font-medium">Escala Oficial: 0,0 a 10,0</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300 border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400">
                      <th className="p-3.5 font-bold">Data</th>
                      <th className="p-3.5 font-bold">Atividade / Avaliação</th>
                      <th className="p-3.5 font-bold">Disciplina / Turma</th>
                      <th className="p-3.5 text-center font-bold">Acertos</th>
                      <th className="p-3.5 text-right font-bold">Pts Velocidade</th>
                      <th className="p-3.5 text-right font-bold">Nota Oficial</th>
                      <th className="p-3.5 text-center font-bold">Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500 italic">
                          Carregando histórico acadêmico...
                        </td>
                      </tr>
                    ) : records.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500 italic">
                          Nenhuma avaliação registrada até o momento.
                        </td>
                      </tr>
                    ) : (
                      records.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3.5 text-slate-400 font-mono flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <span>{item.date}</span>
                          </td>
                          <td className="p-3.5 font-bold text-white">
                            {item.quizTitle}
                          </td>
                          <td className="p-3.5 text-slate-300">
                            {item.subjectName} <span className="text-slate-500 text-[11px]">({item.classCode})</span>
                          </td>
                          <td className="p-3.5 text-center font-bold text-white">
                            <span className="text-emerald-400">{item.totalCorrect}</span> / {item.totalQuestions}
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold text-amber-300">
                            {Number(item.speedScore || 0).toLocaleString('pt-BR')} pts
                          </td>
                          <td className="p-3.5 text-right font-mono font-black text-white text-sm">
                            {Number(item.finalGrade || 0).toFixed(1)}
                          </td>
                          <td className="p-3.5 text-center">
                            <span
                              className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                                item.isApproved
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : 'bg-red-500/20 text-red-300 border-red-500/30'
                              }`}
                            >
                              {item.isApproved ? 'Aprovado' : 'Abaixo 7,0'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ABA 2: FREQUÊNCIA E PRESENÇA */}
        {activeTab === 'frequencia' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl text-center">
                <span className="text-xs font-bold text-slate-400 uppercase block">Dias Letivos</span>
                <span className="text-2xl font-black text-white mt-1 block">{totalClassesRecorded}</span>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl text-center">
                <span className="text-xs font-bold text-emerald-400 uppercase block">Presenças</span>
                <span className="text-2xl font-black text-emerald-400 mt-1 block">{presentDays}</span>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl text-center">
                <span className="text-xs font-bold text-red-400 uppercase block">Faltas Registradas</span>
                <span className="text-2xl font-black text-red-400 mt-1 block">{absentDays}</span>
              </div>
            </div>

            {isAttendanceAtRisk && (
              <div className="p-4 bg-red-950/40 border border-red-500/40 rounded-2xl flex items-center gap-3 text-red-300 text-xs">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                <div>
                  <strong className="block font-black text-sm">Alerta de Risco por Frequência!</strong>
                  <span>Sua presença atual está abaixo de 75%. Justifique suas faltas com o instrutor da turma.</span>
                </div>
              </div>
            )}

            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl p-6">
              <h3 className="text-sm font-black text-white mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-400" />
                <span>Histórico de Chamadas Registradas</span>
              </h3>
              {attendanceHistory.length === 0 ? (
                <p className="text-xs text-slate-500 italic text-center py-6">
                  Nenhum registro detalhado de chamada individual encontrado.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {attendanceHistory.map((att) => (
                    <div
                      key={att.id}
                      className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs"
                    >
                      <span className="text-slate-300 font-mono">
                        {new Date(att.date).toLocaleDateString('pt-BR')}
                      </span>
                      <span
                        className={`font-black text-[10px] px-2.5 py-0.5 rounded-full border ${
                          att.status === 'PRESENTE'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : att.status === 'JUSTIFICADO'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                            : 'bg-red-500/10 text-red-400 border-red-500/30'
                        }`}
                      >
                        {att.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABA 3: ARENA AO VIVO */}
        {activeTab === 'arena' && (
          <div className="bg-gradient-to-br from-purple-950/40 via-slate-900/90 to-indigo-950/40 border border-purple-500/40 p-6 md:p-10 rounded-3xl shadow-2xl text-center space-y-4 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-3xl bg-purple-600/20 text-purple-400 flex items-center justify-center mx-auto border border-purple-500/40 shadow-lg">
              <Gamepad2 className="w-8 h-8 animate-pulse" />
            </div>
            
            <h2 className="text-xl font-black text-white">Arena Interativa ao Vivo</h2>
            <p className="text-xs text-slate-400">
              Digite o código PIN da rodada projetado pelo professor em sala para participar ao vivo.
            </p>

            <form onSubmit={handleJoinArenaWithPin} className="space-y-3 pt-2">
              <input
                type="text"
                maxLength={6}
                value={arenaPin}
                onChange={(e) => setArenaPin(e.target.value.toUpperCase())}
                placeholder="DIGITE O PIN (Ex: 894210)"
                className="w-full bg-slate-950 border border-slate-700 focus:border-purple-500 rounded-2xl py-4 text-center text-2xl tracking-widest font-black text-white uppercase focus:outline-none shadow-inner"
              />
              <button
                type="submit"
                disabled={!arenaPin.trim()}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-black py-4 rounded-2xl text-sm transition-all shadow-lg shadow-purple-600/30 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Conectar à Partida</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* RODAPÉ DO BOLETIM */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 pt-2 px-2 gap-2">
          <span>MyClassPluss • Documento Acadêmico Emitido Eletronicamente</span>
          <span>Acesso autenticado para: {studentUser.name || studentUser.userName}</span>
        </div>

      </div>
    </div>
  );
};

export default StudentPortal;