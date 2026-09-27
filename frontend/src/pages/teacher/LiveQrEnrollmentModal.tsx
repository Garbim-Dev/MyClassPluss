import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  QrCode,
  Users,
  CheckCircle2,
  X,
  RefreshCw,
  Copy,
  Check,
  Globe,
  Smartphone,
} from 'lucide-react';

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
  const [loading, setLoading] = useState<boolean>(true);
  const [networkInterfaces, setNetworkInterfaces] = useState<{ name: string; ip: string; isRecommended: boolean }[]>([]);
  const [selectedIp, setSelectedIp] = useState<string>(window.location.hostname);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const fetchLiveData = async () => {
    if (!classId) return;
    try {
      const studentsRes = await api.get(`/academic/classes/${classId}/students`);
      const sortedStudents = (studentsRes.data || []).sort((a: any, b: any) =>
        a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'accent' })
      );
      setStudents(sortedStudents);

      const targetHost = selectedIp || window.location.hostname;
      const qrRes = await api.get(`/academic/classes/${classId}/qrcode`, {
        params: { serverIp: targetHost },
      });

      setQrCodeImage(qrRes.data.qrCodeImage);
    } catch (err) {
      console.error('Erro ao carregar dados de matrícula ao vivo:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && classId) {
      fetchLiveData();
    }
  }, [selectedIp]);

  useEffect(() => {
    if (!isOpen) return;

    const fetchInterfaces = async () => {
      try {
        const res = await api.get('/academic/network/interfaces');
        const list = res.data?.interfaces || [];
        setNetworkInterfaces(list);

        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          const rec = list.find((i: any) => i.isRecommended) || list[0];
          if (rec) setSelectedIp(rec.ip);
        }
      } catch (err) {
        console.warn('Erro ao carregar interfaces de rede:', err);
      }
    };

    fetchInterfaces();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && classId) {
      fetchLiveData();
      const interval = setInterval(fetchLiveData, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen, classId]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(classCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (!isOpen) return null;

  const browserAccessUrl = `http://${selectedIp || window.location.hostname}:5173/student/join`;

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
          
          {/* LADO ESQUERDO: Lista de Alunos Matriculados (Ocupa 7 colunas) */}
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
                    Peça para os alunos escanearem o QR Code ao lado ou digitarem o código da turma pelo navegador.
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

          {/* LADO DIREITO: Código PIN em Destaque + QR Code + Seletor de Rede (Ocupa 5 colunas) */}
          <div className="lg:col-span-5 bg-[#0f172a] border border-slate-800 rounded-2xl flex flex-col items-center justify-start p-5 text-center shadow-inner space-y-4 overflow-y-auto">
            
            {/* 1. Código da Turma em Formato PIN de Alto Contraste */}
            <div className="w-full bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/60 border-2 border-blue-500/50 p-3.5 rounded-2xl shadow-lg relative">
              <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider block mb-1">
                Código / PIN de Entrada Manual
              </span>

              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-wider drop-shadow-[0_2px_10px_rgba(59,130,246,0.5)]">
                  {classCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
                  title="Copiar código da turma"
                >
                  {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <p className="text-[11px] text-slate-400 mt-1 flex items-center justify-center gap-1">
                <Globe className="w-3 h-3 text-indigo-400" />
                <span>Acesse pelo navegador: <strong className="text-slate-200">{browserAccessUrl}</strong></span>
              </p>
            </div>

            {/* 2. Card Branco com Seletor Wi-Fi e QR Code Nítido */}
            <div className="bg-white p-3.5 rounded-3xl shadow-2xl border-4 border-slate-900 flex flex-col items-center space-y-3 w-full max-w-[340px]">
              {/* Seletor de Adaptador de Rede Local */}
              {networkInterfaces.length > 0 && (
                <div className="w-full bg-[#0b1120] border border-slate-800 p-2 rounded-xl text-left space-y-1 shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Adaptador Wi-Fi / Rede:</span>
                    <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-mono">
                      {selectedIp}
                    </span>
                  </div>
                  <select
                    value={selectedIp}
                    onChange={(e) => setSelectedIp(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs font-bold rounded-lg p-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {networkInterfaces.map((net) => (
                      <option key={net.ip} value={net.ip}>
                        {net.name}: {net.ip} {net.isRecommended ? '★ (Recomendado)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {qrCodeImage ? (
                <div className="p-1 transition-transform hover:scale-105 duration-300">
                  <img
                    src={qrCodeImage}
                    alt="QR Code de Matrícula"
                    className="w-40 h-40 sm:w-44 sm:h-44 object-contain"
                  />
                </div>
              ) : (
                <div className="w-44 h-44 flex items-center justify-center text-slate-400 text-xs">
                  Gerando QR Code...
                </div>
              )}

              <div className="flex items-center gap-1.5 text-xs text-slate-600 font-bold">
                <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                <span>Aponte a câmera do celular para entrar</span>
              </div>
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

export default LiveQrEnrollmentModal;