import React from 'react';
import { UserPlus, QrCode, X } from 'lucide-react';

interface EnrollmentChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectManual: () => void;
  onSelectQrCode: () => void;
  classCode: string;
}

export const EnrollmentChoiceModal: React.FC<EnrollmentChoiceModalProps> = ({
  isOpen,
  onClose,
  onSelectManual,
  onSelectQrCode,
  classCode,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in font-sans">
      <div className="bg-[#0b1120] border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col">
        
        {/* Cabeçalho */}
        <div className="p-6 bg-[#080d1a] border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-white">Central de Matrículas</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Turma: <span className="font-mono font-bold text-blue-400">{classCode}</span> • Escolha como deseja adicionar os alunos
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com os dois Cards */}
        <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
          
          {/* Card 1: Manual */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onSelectManual();
            }}
            className="group bg-[#0f172a] hover:bg-slate-800/80 border border-slate-800 hover:border-blue-500/50 p-6 rounded-2xl flex flex-col items-center text-center space-y-4 transition-all duration-300 cursor-pointer shadow-lg active:scale-95"
          >
            <div className="p-4 bg-blue-600/20 text-blue-400 rounded-2xl group-hover:scale-110 transition-transform">
              <UserPlus className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black text-white group-hover:text-blue-400 transition-colors">
                Matricular Aluno(s) Manualmente
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Insira o nome completo e o e-mail institucional diretamente pelo painel do professor.
              </p>
            </div>
            <span className="text-[11px] font-bold text-blue-400 mt-auto pt-2 flex items-center gap-1">
              Abrir formulário →
            </span>
          </button>

          {/* Card 2: Via QR Code */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onSelectQrCode();
            }}
            className="group bg-[#0f172a] hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/50 p-6 rounded-2xl flex flex-col items-center text-center space-y-4 transition-all duration-300 cursor-pointer shadow-lg active:scale-95"
          >
            <div className="p-4 bg-emerald-600/20 text-emerald-400 rounded-2xl group-hover:scale-110 transition-transform">
              <QrCode className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black text-white group-hover:text-emerald-400 transition-colors">
                Matricular Aluno(s) Via QR Code
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Projete o QR code na tela. Os alunos entram pelo celular e a lista atualiza em tempo real.
              </p>
            </div>
            <span className="text-[11px] font-bold text-emerald-400 mt-auto pt-2 flex items-center gap-1">
              Iniciar painel ao vivo →
            </span>
          </button>

        </div>

        {/* Rodapé */}
        <div className="p-4 bg-[#080d1a] border-t border-slate-800 text-center text-xs text-slate-500">
          MyClassPluss • Gestão Inteligente de Alunos
        </div>

      </div>
    </div>
  );
};