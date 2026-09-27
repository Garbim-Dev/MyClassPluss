import React, { useState, useRef } from 'react';
import { api } from '../../services/api';
import {
  ShieldCheck,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  HardDrive,
  RefreshCw,
} from 'lucide-react';

export const BackupManager: React.FC = () => {
  const [loadingExport, setLoadingExport] = useState(false);
  const [loadingRestore, setLoadingRestore] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 1. Exporta e faz download do arquivo .json
  const handleExportBackup = async () => {
    setLoadingExport(true);
    setStatusMessage(null);
    try {
      const response = await api.get('/academic/backup/export', { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `MyClassPluss_Backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setStatusMessage({ type: 'success', text: 'Backup completo exportado com sucesso!' });
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Erro ao gerar o arquivo de backup.' });
    } finally {
      setLoadingExport(false);
    }
  };

  // 2. Faz upload do arquivo e envia para o backend restaurar
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmed = window.confirm(
      'Atenção: A restauração mesclará e atualizará os dados existentes com base no arquivo. Deseja continuar?'
    );
    if (!confirmed) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setLoadingRestore(true);
    setStatusMessage(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonContent = JSON.parse(event.target?.result as string);
        await api.post('/academic/backup/restore', jsonContent);
        setStatusMessage({ type: 'success', text: 'Base de dados restaurada com sucesso!' });
      } catch (err: any) {
        setStatusMessage({
          type: 'error',
          text: err.response?.data?.message || 'Arquivo corrompido ou formato incompatível.',
        });
      } finally {
        setLoadingRestore(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in font-sans">
      <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-600/20 text-blue-400 rounded-2xl">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Central de Backup & Segurança</h2>
            <p className="text-xs text-slate-400">
              Gere cópias de segurança integrais ou restaure turmas, notas e banco de questões em caso de migração.
            </p>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 text-xs font-bold ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-red-950/40 border-red-500/40 text-red-300'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CARD DE EXPORTAÇÃO */}
        <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Download className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-white">Exportar Backup Completo</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Gera um arquivo <code>.json</code> estruturado com todas as turmas, frequências registradas, avaliações,
              questões e gabaritos. Ideal para cópias periódicas de segurança.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportBackup}
            disabled={loadingExport}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 cursor-pointer transition-all active:scale-95"
          >
            {loadingExport ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Gerando Arquivo...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Baixar Backup Completo (.json)</span>
              </>
            )}
          </button>
        </div>

        {/* CARD DE RESTAURAÇÃO */}
        <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-white">Restaurar Base de Dados</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Carregue um arquivo de backup previamente exportado pelo MyClassPluss. Os registros serão mesclados e
              restaurados com integridade referencial.
            </p>
          </div>

          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loadingRestore}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-black py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 cursor-pointer transition-all active:scale-95"
            >
              {loadingRestore ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Restaurando Banco de Dados...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Selecionar Arquivo para Restaurar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};