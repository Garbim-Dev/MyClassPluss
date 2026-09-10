import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { QrCode, Users, CheckCircle2, X, RefreshCw, Sparkles, KeyRound } from 'lucide-react';

interface LiveQrEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: string;
  classCode: string;
  courseName: string;
}

interface StudentItem {
  enrollmentId: string;
  studentId: string;
  name: string;
  email: string;
  joinedAt: string;
}

export const LiveQrEnrollmentModal: React.FC<LiveQrEnrollmentModalProps> = ({
  isOpen,
  onClose,
  classId,
  classCode,
  courseName,
}) => {
    
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [qrCodeImage, setQrCodeImage] = useState<string>('');
  const [joinUrl, setJoinUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchLiveData = async () => {
    if (!classId) return;
    try {
      // 1. Busca alunos matriculados na turma
      const studentsRes = await api.get(`/academic/classes/${classId}/students`);
      
      // Ordenação alfabética automática dos alunos confirmados
      const sortedStudents = (studentsRes.data || []).sort((a: any, b: any) => 
        a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'accent' })
      );
      setStudents(sortedStudents);

      // 2. Busca o QR Code gerado pelo backend
      const qrRes = await api.get(`/academic/classes/${classId}/qrcode`);
      setQrCodeImage(qrRes.data.qrCodeImage);
      setJoinUrl(qrRes.data.joinUrl);
    } catch (err) {
      console.error('Erro ao atualizar dados de matrícula ao vivo:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && classId) {
      fetchLiveData();
      const interval = setInterval(fetchLiveData, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen, classId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in font-sans">
      <div className="bg-[#0b1120] border border-slate-800 rounded-3xl w-full max-w-5xl h-[90vh] shadow-2xl overflow-hidden text-slate-100 flex flex-col">
        
        {/* Cabeçalho */}
        <div className="p-6 bg-[#080d1a] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-xl">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">Painel de Matrícula Ao Vivo via QR Code</h2>
                <span className="flex items-center gap-1 text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Ao Vivo
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Turma: <span className="font-mono text-blue-400 font-bold">{classCode}</span> • {courseName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo Dividido em Duas Colunas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden p-6 gap-6">
          
          {/* LADO ESQUERDO: Lista de Alunos que foram se matriculando (Ocupa 7 colunas) */}
          <div className="lg:col-span-7 bg-[#0f172a] border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-inner">
            <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Alunos Confirmados ({students.length})</span>
              </span>
              <button
                onClick={fetchLiveData}
                className="text-slate-400 hover:text-white text-xs flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Atualizar</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {loading && students.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs italic">
                  Carregando lista de alunos...
                </div>
              ) : students.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                  <div className="w-12 h-12 bg-slate-800/50 text-slate-500 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-300">Nenhum aluno matriculado ainda</p>
                  <p className="text-xs text-slate-500 max-w-xs">
                    Peça para os alunos escanearem o QR code ao lado com a câmera do celular ou digitarem o código da turma.
                  </p>
                </div>
              ) : (
                students.map((student, idx) => (
                  <div
                    key={student.enrollmentId || student.studentId}
                    className="bg-[#0b1120] border border-slate-800/80 p-3.5 rounded-xl flex items-center justify-between animate-fade-in shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-white">{student.name}</h4>
                        <p className="text-[11px] text-slate-400 font-mono">{student.email}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Conectado
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* LADO DIREITO: QR Code Grande + Código da Turma em Destaque (Ocupa 5 colunas) */}
          <div className="lg:col-span-5 bg-[#0f172a] border border-slate-800 rounded-2xl flex flex-col items-center justify-center p-6 text-center shadow-inner space-y-4 overflow-y-auto">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full">
                Escaneie com a Câmera
              </span>
              <h3 className="text-sm font-bold text-slate-200 mt-2">Aponte o celular para entrar</h3>
            </div>

            <div className="bg-white p-3.5 rounded-3xl shadow-2xl border-4 border-slate-900">
              {qrCodeImage ? (
                <img
                  src={qrCodeImage}
                  alt="QR Code de Matrícula"
                  className="w-48 h-48 sm:w-52 sm:h-52 object-contain rounded-xl"
                />
              ) : (
                <div className="w-52 h-52 flex items-center justify-center text-slate-400 text-xs">
                  Gerando QR Code...
                </div>
              )}
            </div>

            {/* ⚡ CÓDIGO DA TURMA EM DESTAQUE (Solução para câmeras que não leem) */}
            <div className="w-full bg-[#0b1120] border border-blue-500/30 p-3 rounded-2xl space-y-1 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-center gap-1">
                <KeyRound className="w-3 h-3 text-blue-400" /> Código de Acesso Manual:
              </span>
              <span className="text-lg sm:text-xl font-black font-mono text-blue-400 tracking-wider block">
                {classCode}
              </span>
            </div>
          </div>

        </div>

        {/* Rodapé */}
        <div className="p-4 bg-[#080d1a] border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>Os alunos aparecem automaticamente na lista assim que acessam o link pelo celular.</span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors cursor-pointer"
          >
            Concluir Matrículas
          </button>
        </div>

      </div>
    </div>
  );
};