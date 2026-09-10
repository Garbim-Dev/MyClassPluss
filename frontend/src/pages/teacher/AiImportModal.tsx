import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Copy, Check, X, AlertCircle, FileCode, ChevronDown, ChevronUp } from 'lucide-react';

interface AiImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportData: (imported: {
    title?: string;
    description?: string;
    type?: 'QUIZ_INTERATIVO' | 'AVALIACAO' | 'ATIVIDADE';
    questions: any[];
  }) => void;
}

const DEFAULT_PROMPT_TEMPLATE = `Atue como um especialista pedagógico em treinamento técnico e elabore um questionário em formato JSON estritamente compatível com o sistema OffClass.

Tema desejado: [DIGITE AQUI O SEU TEMA, EX: PROCEDIMENTOS DE OPERAÇÃO SEGURA E MANUTENÇÃO PREVENTIVA]
Quantidade de questões: 5

Gere estritamente um único objeto JSON (sem textos explicativos fora do bloco JSON) seguindo este modelo exato:

{
  "title": "Simulado Técnico de Operação e Segurança",
  "description": "Atividade gamificada em sala de aula",
  "type": "QUIZ_INTERATIVO",
  "questions": [
    {
      "title": "Qual a primeira ação obrigatória antes de dar a partida no equipamento?",
      "type": "MULTIPLE_CHOICE",
      "timeLimitSeconds": 30,
      "options": [
        { "text": "Realizar a inspeção visual 360 graus ao redor (Walkaround)", "isCorrect": true },
        { "text": "Acelerar o motor em rotação máxima imediatamente", "isCorrect": false },
        { "text": "Liberar o freio de estacionamento sem aviso sonoro", "isCorrect": false },
        { "text": "Desativar os alarmes e sensores da cabine", "isCorrect": false }
      ]
    },
    {
      "title": "O uso de cinto de segurança de três pontos é obrigatório durante 100% da operação.",
      "type": "TRUE_FALSE",
      "timeLimitSeconds": 20,
      "options": [
        { "text": "Falso", "isCorrect": false },
        { "text": "Verdadeiro", "isCorrect": true }
      ]
    },
    {
      "title": "Qual o termo técnico para a verificação visual completa ao redor da máquina?",
      "type": "FAST_ANSWER",
      "timeLimitSeconds": 30,
      "options": [
        { "text": "Walkaround", "isCorrect": true },
        { "text": "Inspeção visual", "isCorrect": true },
        { "text": "Inspeção 360", "isCorrect": true }
      ]
    },
    {
      "title": "Qual a pressão recomendada de trabalho no circuito hidráulico principal?",
      "type": "SLIDER",
      "timeLimitSeconds": 30,
      "sliderConfig": {
        "min": 0,
        "max": 250,
        "target": 180,
        "tolerance": 0,
        "unit": "bar"
      }
    },
    {
      "title": "Ordene a sequência cronológica correta para partida e início de manobra:",
      "type": "PUZZLE",
      "timeLimitSeconds": 45,
      "options": [
        { "text": "Inspeção visual externa e checagem dos níveis de fluidos", "correctOrder": 0 },
        { "text": "Ajustar assento, retrovisores e afivelar o cinto de segurança", "correctOrder": 1 },
        { "text": "Ligar o motor, verificar painel de instrumentos e ausência de falhas", "correctOrder": 2 },
        { "text": "Emitir um sinal sonoro de buzina e liberar freio de estacionamento", "correctOrder": 3 }
      ]
    }
  ]
}`;

export const AiImportModal: React.FC<AiImportModalProps> = ({
  isOpen,
  onClose,
  onImportData,
}) => {
  const [jsonText, setJsonText] = useState('');
  const [copied, setCopied] = useState(false);
  const [showPromptPreview, setShowPromptPreview] = useState(true);
  const [error, setError] = useState('');
  const [successState, setSuccessState] = useState(false); // 👈 Estado para controlar a tela de sucesso
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);

  // SINCRONIZAÇÃO COM A SETA DE VOLTAR DO NAVEGADOR
  useEffect(() => {
    if (isOpen) {
      window.history.pushState({ modalOpen: true }, '');

      const handlePopState = () => {
        onClose();
      };

      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [isOpen, onClose]);

  const handleSafeClose = () => {
    setSuccessState(false); // Reseta o estado ao fechar
    if (window.history.state?.modalOpen) {
      window.history.back();
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  const copyToClipboard = async (text: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
        return;
      } catch (err) {
        // segue para fallback
      }
    }

    if (promptTextareaRef.current) {
      promptTextareaRef.current.select();
      promptTextareaRef.current.setSelectionRange(0, 99999);
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
        return;
      } catch (e) {}
    }

    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, 99999);

    try {
      const successful = document.execCommand('copy');
      if (successful) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (err) {
      console.error('Falha ao copiar:', err);
    } finally {
      document.body.removeChild(textArea);
    }
  };

  const handleProcessImport = () => {
    setError('');
    if (!jsonText.trim()) {
      setError('Cole a resposta JSON gerada pelo Gemini antes de clicar em importar.');
      return;
    }

    try {
      let cleaned = jsonText.trim();
      if (cleaned.includes('```')) {
        const matches = cleaned.match(/```(?:json)?([\s\S]*?)```/i);
        if (matches && matches[1]) {
          cleaned = matches[1].trim();
        } else {
          cleaned = cleaned.replace(/^```json/i, '').replace(/^```/, '');
          cleaned = cleaned.replace(/```$/, '').trim();
        }
      }

      const parsed = JSON.parse(cleaned);

      if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
        setError('O JSON importado precisa conter a lista de perguntas ("questions": [...]).');
        return;
      }

      onImportData(parsed);
      setJsonText('');
      setSuccessState(true); // 👈 Exibe a tela de sucesso em vez de fechar direto
    } catch (e: any) {
      setError('JSON inválido. Certifique-se de que copiou todo o bloco que começa com { e termina com }.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-600/20 text-purple-400 rounded-2xl">
              <Sparkles className="w-6 h-6"/>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Criar Questionário com Inteligência Artificial</h2>
              <p className="text-xs text-slate-400">Gere questionários completos no Gemini e preencha em 1 clique</p>
            </div>
          </div>

          <button
            onClick={handleSafeClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5"/>
          </button>
        </div>

        {/* Conteúdo condicional (Formulário vs Tela de Sucesso) */}
        {successState ? (
          <div className="p-12 text-center space-y-6 my-auto animate-fade-in">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto text-3xl font-black shadow-lg shadow-emerald-500/10">
              ✓
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-white">Questões Transferidas com sucesso</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Todas as questões e configurações geradas pela Inteligência Artificial foram aplicadas ao seu formulário com sucesso.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSafeClose}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-10 py-3 rounded-xl text-xs shadow-lg shadow-emerald-600/30 cursor-pointer transition-transform active:scale-95"
            >
              OK
            </button>
          </div>
        ) : (
          <>
            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Passo 1: Copiar Prompt */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600/20 text-blue-300 flex items-center justify-center text-[10px]">1</span>
                    <span>Copie o Modelo de Prompt para o Gemini:</span>
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPromptPreview(!showPromptPreview)}
                      className="text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <span>{showPromptPreview ? 'Ocultar' : 'Ver Texto'}</span>
                      {showPromptPreview ? <ChevronUp className="w-3.5 h-3.5"/> : <ChevronDown className="w-3.5 h-3.5"/>}
                    </button>

                    <button
                      type="button"
                      onClick={() => copyToClipboard(DEFAULT_PROMPT_TEMPLATE)}
                      className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-600/30 active:scale-95"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-300"/>
                          <span className="text-emerald-200 font-black">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4"/>
                          <span>Copiar Prompt</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {showPromptPreview && (
                  <div className="relative">
                    <textarea
                      ref={promptTextareaRef}
                      readOnly
                      rows={6}
                      value={DEFAULT_PROMPT_TEMPLATE}
                      onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-slate-300 focus:outline-none focus:border-blue-500 select-all cursor-pointer leading-relaxed"
                    />
                    <span className="text-[10px] text-slate-500 block mt-1">
                      💡 <em>Dica: Você também pode clicar dentro da caixa acima e pressionar <strong>Ctrl + C</strong>.</em>
                    </span>
                  </div>
                )}
              </div>

              {/* Passo 2: Colar Resposta */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-purple-600/20 text-purple-300 flex items-center justify-center text-[10px]">2</span>
                    <span>Cole a Resposta em JSON gerada pela IA:</span>
                  </span>

                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <FileCode className="w-3.5 h-3.5"/> Suporta as 5 modalidades
                  </span>
                </div>

                <textarea
                  rows={7}
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  placeholder='Cole aqui o JSON gerado (ex: { "title": "...", "questions": [...] })'
                  className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-2xl p-4 font-mono text-xs text-slate-200 focus:outline-none leading-relaxed"
                />
              </div>

              {error && (
                <div className="p-3.5 bg-red-950/50 border border-red-800 rounded-xl text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400"/>
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500 italic">
                Você poderá revisar qualquer pergunta antes de salvar.
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSafeClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleProcessImport}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4"/>
                  <span>Preencher Formulário Automaticamente</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AiImportModal;