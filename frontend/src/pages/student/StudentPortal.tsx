import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import {
  GraduationCap,
  ArrowLeft,
  Printer,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Clock,
  Sparkles,
  User,
  ShieldAlert,
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

export const StudentPortal: React.FC = () => {
  const navigate = useNavigate();

  const [studentUser, setStudentUser] = useState(() => {
    const saved = sessionStorage.getItem('@OffClass:sessionUser');
    return saved ? JSON.parse(saved) : null;
  });

  const [currentClassId] = useState(() => {
    return sessionStorage.getItem('@OffClass:currentClassId') || '';
  });

  const [records, setRecords] = useState<AcademicRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudentHistory = async () => {
      if (!studentUser) {
        setLoading(false);
        return;
      }

      try {
        // Busca o histórico real do aluno autenticado no banco de dados
        const res = await api.get(`/academic/student-grades/${studentUser.id}`);
        if (res.data && Array.isArray(res.data)) {
          setRecords(res.data);
        } else {
          setRecords([]);
        }
      } catch (err) {
        console.warn('Erro ao carregar notas do banco:', err);
        setRecords([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentHistory();
  }, [studentUser]);

  // Cálculos consolidados
  const totalActivities = records.length;
  const overallAverage =
    totalActivities > 0
      ? (records.reduce((acc, r) => acc + r.finalGrade, 0) / totalActivities).toFixed(1)
      : '0.0';

  const approvedActivities = records.filter((r) => r.isApproved).length;
  const approvalRate =
    totalActivities > 0 ? ((approvedActivities / totalActivities) * 100).toFixed(0) : '0';

  const isStudentApproved = Number(overallAverage) >= 7.0;

  const handlePrint = () => {
    window.print();
  };

  const handleBackToRoom = () => {
    const classIdToReturn = currentClassId || sessionStorage.getItem('@OffClass:currentClassId');
    if (classIdToReturn) {
      navigate(`/student/join?classId=${classIdToReturn}`, { replace: true });
    } else {
      navigate('/student/join', { replace: true });
    }
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
    <div className="min-h-screen bg-[#070b19] text-slate-100 font-sans p-4 sm:p-6 lg:p-8 select-none">
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
                <h1 className="text-xl font-black text-white">Boletim Escolar Oficial</h1>
                <span className="text-[10px] font-black uppercase bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full">
                  Portal do Aluno
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Acompanhamento de notas formativas e rendimento pedagógico
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handlePrint}
              className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-blue-400" />
              <span>Imprimir Boletim</span>
            </button>
          </div>
        </header>

        {/* CARTÃO DE IDENTIFICAÇÃO DO ALUNO */}
        <div className="bg-gradient-to-r from-blue-950/40 via-slate-900/90 to-indigo-950/40 border border-blue-500/30 p-6 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center font-black text-xl text-white shadow-lg border border-blue-400/40">
              <User className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-black text-white">{studentUser.name}</h2>
              <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                <span>Matrícula/E-mail: <strong className="text-slate-200">{studentUser.email || studentUser.id}</strong></span>
                <span>•</span>
                <span>Critério: <strong className="text-slate-200">Média 7,0 pts</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-start md:justify-end">
            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl text-center px-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Média Geral</span>
              <span className={`text-2xl font-black ${isStudentApproved ? 'text-emerald-400' : 'text-amber-400'}`}>
                {overallAverage} <span className="text-xs font-normal text-slate-500">/ 10</span>
              </span>
            </div>
            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl text-center px-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Status</span>
              <span className={`text-xs font-black px-2.5 py-1 rounded-full mt-1 inline-block border ${
                isStudentApproved
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}>
                {isStudentApproved ? 'Aprovado' : 'Abaixo de 7,0'}
              </span>
            </div>
          </div>
        </div>

        {/* MÉTRICAS DE DESEMPENHO */}
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
                {records.reduce((acc, r) => acc + r.speedScore, 0).toLocaleString('pt-BR')} pts
              </p>
            </div>
          </div>
        </div>

        {/* TABELA DO HISTÓRICO DE AVALIAÇÕES */}
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

        {/* RODAPÉ DO BOLETIM */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 pt-2 px-2 gap-2">
          <span>OffClass • Documento Acadêmico Emitido Eletronicamente</span>
          <span>Acesso autenticado para: {studentUser.name}</span>
        </div>

      </div>
    </div>
  );
};

export default StudentPortal;