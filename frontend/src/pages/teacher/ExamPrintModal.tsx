import React, { useState, useEffect } from 'react';
import { Printer, X, FileText, Eye, EyeOff } from 'lucide-react';

interface QuestionOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

interface Question {
  id: string;
  title: string;
  type: string;
  weight?: number;
  imageUrl?: string;
  options?: QuestionOption[];
  justification?: string;
}

interface ExamPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: {
    title: string;
    description?: string;
    durationMinutes?: number;
    courseName?: string;
    className?: string;
    subjectName?: string;
    teacherName?: string;
    questions?: Question[];
  } | null;
}

export const ExamPrintModal: React.FC<ExamPrintModalProps> = ({ isOpen, onClose, exam }) => {
  const [includeAnswerKey, setIncludeAnswerKey] = useState(false);
  const [teacherName, setTeacherName] = useState('Sidnei Garbim');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u.name) setTeacherName(u.name);
      }
    } catch (e) {}
  }, []);

  if (!isOpen || !exam) return null;

  const questions = exam.questions || [];
  const totalWeight = questions.reduce((acc, q) => acc + (Number(q.weight) || 1.0), 0);

  const formatImageUrl = (url?: string | null): string => {
    if (!url) return '';
    let target = url.trim();

    if (target.startsWith('http://') || target.startsWith('https://')) {
      try {
        const parsed = new URL(target);
        return encodeURI(`${window.location.protocol}//${window.location.hostname}:3000${parsed.pathname}${parsed.search}`);
      } catch (e) {
        return encodeURI(target);
      }
    }

    const slash = target.startsWith('/') ? '' : '/';
    return encodeURI(`${window.location.protocol}//${window.location.hostname}:3000${slash}${target}`);
  };

  const handlePrint = () => {
    const printContent = document.getElementById('printable-exam-document');
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) {
      alert('Por favor, permita pop-ups no seu navegador para imprimir a avaliação.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8">
          <title>${exam.title || 'Avaliação Oficial - SENAI'}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm 15mm 15mm 15mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              font-family: Arial, Helvetica, sans-serif;
              background-color: #ffffff;
              color: #000000;
              margin: 0;
              padding: 0;
            }

            /* CABEÇALHO SENAI */
            .senai-top-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 12px;
            }
            .senai-logo-img {
              height: 38px;
              width: auto;
              object-fit: contain;
              display: block;
            }
            .senai-unit-info {
              text-align: right;
              font-size: 11px;
              font-style: italic;
              color: #4b6b94;
              line-height: 1.3;
              font-weight: 600;
            }

            .senai-box {
              border: 1.5px solid #000000;
              padding: 8px 12px;
              font-size: 11px;
              line-height: 1.6;
              margin-bottom: 16px;
            }
            .senai-line {
              display: flex;
              align-items: flex-end;
              margin-bottom: 5px;
            }
            .senai-line:last-child {
              margin-bottom: 0;
            }
            .line-fill {
              flex: 1;
              border-bottom: 1px solid #000000;
              min-height: 14px;
              padding-left: 6px;
              font-weight: 600;
            }

            .instructions-box {
              border: 1px solid #cccccc;
              background-color: #fcfcfc;
              padding: 6px 10px;
              margin-bottom: 16px;
              font-size: 10px;
              line-height: 1.4;
            }
            .exam-title-section {
              text-align: center;
              margin-bottom: 18px;
            }
            .exam-title {
              display: inline-block;
              font-size: 14px;
              font-weight: 900;
              text-transform: uppercase;
              border-bottom: 2px solid #000000;
              padding-bottom: 3px;
            }
            .question-item {
              border-bottom: 1px solid #e0e0e0;
              padding-bottom: 12px;
              margin-bottom: 12px;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .question-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              font-size: 11px;
              font-weight: bold;
              margin-bottom: 6px;
              line-height: 1.3;
            }
            .weight-badge {
              font-size: 9.5px;
              border: 1px solid #cccccc;
              padding: 1px 5px;
              border-radius: 3px;
              background: #fafafa;
              white-space: nowrap;
            }
            .question-image {
              text-align: center;
              margin: 8px 0;
            }
            .question-image img {
              max-height: 170px;
              max-width: 100%;
              object-fit: contain;
              border: 1px solid #cccccc;
              padding: 3px;
            }
            .options-list {
              padding-left: 8px;
              margin-top: 6px;
            }
            .option-row {
              display: flex;
              align-items: flex-start;
              gap: 6px;
              font-size: 10.5px;
              margin-bottom: 5px;
              line-height: 1.3;
            }
            .correct-badge {
              font-size: 8.5px;
              font-weight: 900;
              color: #065f46;
              background-color: #d1fae5;
              border: 1px solid #6ee7b7;
              padding: 1px 4px;
              border-radius: 3px;
            }
            .justification-box {
              margin-top: 6px;
              padding: 5px 8px;
              background: #fffbeb;
              border: 1px solid #fde68a;
              color: #78350f;
              font-size: 9.5px;
              font-style: italic;
              border-radius: 3px;
            }
            .answer-sheet {
              margin-top: 20px;
              padding-top: 12px;
              border-top: 2px dashed #666666;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .sheet-grid {
              display: grid;
              grid-template-columns: repeat(10, 1fr);
              gap: 5px;
              text-align: center;
              font-size: 9px;
              margin-top: 6px;
            }
            .sheet-cell {
              border: 1px solid #cccccc;
              padding: 3px;
              border-radius: 3px;
              background: #fafafa;
            }
            .sheet-choices {
              display: flex;
              flex-direction: column;
              gap: 1.5px;
              font-size: 7.5px;
              margin-top: 2px;
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* BARRA DE AÇÕES SUPERIOR */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Visualização de Prova Impressa</h2>
              <p className="text-xs text-slate-400">
                Padrão Institucional SENAI • Centro de Educação Profissional Parauapebas/PA
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setIncludeAnswerKey(!includeAnswerKey)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-2 cursor-pointer ${
                includeAnswerKey
                  ? 'bg-purple-600/20 text-purple-300 border-purple-500/50'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
              }`}
            >
              {includeAnswerKey ? <Eye className="w-4 h-4 text-purple-400" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
              <span>{includeAnswerKey ? 'Gabarito do Instrutor (Ativo)' : 'Incluir Gabarito'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Salvar em PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ÁREA DE PRÉ-VISUALIZAÇÃO / FOLHA IMPRESSA */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-800/40">
          
          <div
            id="printable-exam-document"
            className="max-w-[210mm] mx-auto bg-white text-black p-8 sm:p-12 shadow-2xl rounded-sm font-sans"
          >
            
            {/* 1. TOPO SENAI OFICIAL */}
            <div className="senai-top-row flex items-center justify-between mb-3">
              <div>
                <img
                  src="/senai.png"
                  alt="SENAI"
                  className="senai-logo-img h-9 w-auto object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div className="senai-unit-info text-right text-[11px] italic font-semibold text-[#4b6b94] leading-tight">
                <p>Centro de Educação Profissional</p>
                <p>Parauapebas/PA</p>
              </div>
            </div>

            {/* 2. QUADRO DE DADOS OFICIAIS (TODOS COM UMA ÚNICA LINHA LIMPA) */}
            <div className="senai-box border-[1.5px] border-black p-2.5 sm:p-3 text-[11px] leading-relaxed mb-4">
              
              {/* Linha 1: Curso */}
              <div className="senai-line flex items-end mb-1.5">
                <strong className="shrink-0 mr-1.5">Curso:</strong>
                <span className="line-fill flex-1 border-b border-black font-semibold min-h-[16px] pl-1.5">
                  {exam.courseName || ''}
                </span>
              </div>

              {/* Linha 2: Unidade Curricular e Código no S.G.E */}
              <div className="senai-line flex items-end justify-between gap-3 mb-1.5">
                <div className="flex items-end flex-1">
                  <strong className="shrink-0 mr-1.5">Unidade Curricular:</strong>
                  <span className="line-fill flex-1 border-b border-black font-semibold min-h-[16px] pl-1.5">
                    {exam.subjectName || ''}
                  </span>
                </div>
                <div className="flex items-end w-44 shrink-0">
                  <strong className="shrink-0 mr-1.5">Código no S.G.E:</strong>
                  <span className="line-fill flex-1 border-b border-black font-semibold min-h-[16px] pl-1.5 text-center">
                    {exam.className || ''}
                  </span>
                </div>
              </div>

              {/* Linha 3: Professor */}
              <div className="senai-line flex items-end mb-1.5">
                <strong className="shrink-0 mr-1.5">Professor (a):</strong>
                <span className="line-fill flex-1 border-b border-black font-semibold min-h-[16px] pl-1.5">
                  {exam.teacherName || teacherName}
                </span>
              </div>

              {/* Linha 4: Data e Nota em Branco */}
              <div className="senai-line flex items-end justify-between gap-3 mb-1.5">
                <div className="flex items-end">
                  <strong className="mr-1">Data:</strong>
                  <span>____ / ____ / 202__</span>
                </div>
                <div className="flex items-end w-44">
                  <strong className="shrink-0 mr-1.5">Nota:</strong>
                  <span className="line-fill flex-1 border-b border-black min-h-[16px]">&nbsp;</span>
                </div>
              </div>

              {/* Linha 5: Aluno */}
              <div className="senai-line flex items-end">
                <strong className="shrink-0 mr-1.5">Aluno (a):</strong>
                <span className="line-fill flex-1 border-b border-black min-h-[16px]">&nbsp;</span>
              </div>
            </div>

            {/* 3. INSTRUÇÕES GERAIS */}
            <div className="instructions-box border border-gray-300 bg-gray-50/80 p-2.5 mb-4 text-[10px] leading-relaxed">
              <strong className="block font-bold mb-0.5 uppercase">Instruções para realização da avaliação:</strong>
              <ul className="list-disc pl-4 space-y-0.5 text-gray-700">
                <li>Preencha todos os dados de identificação com letra legível[cite: 5].</li>
                <li>Utilize caneta esferográfica de tinta azul ou preta para as marcações definitivas.</li>
                <li>Questões rasuradas serão desconsideradas na correção.</li>
                <li>Duração prevista da avaliação: <strong>{exam.durationMinutes || 60} minutos</strong>.</li>
              </ul>
            </div>

            {/* TÍTULO DA AVALIAÇÃO */}
            <div className="exam-title-section text-center mb-5">
              <h2 className="exam-title text-sm sm:text-base font-black uppercase tracking-wide border-b-2 border-black pb-1 inline-block">
                {exam.title}
              </h2>
              {exam.description && (
                <p className="text-[11px] italic text-gray-600 mt-1">{exam.description}</p>
              )}
            </div>

            {/* 4. LISTAGEM DE QUESTÕES */}
            <div className="space-y-4 text-xs">
              {questions.map((q, qIndex) => {
                const weightVal = Number(q.weight) || 1.0;
                return (
                  <div
                    key={q.id || qIndex}
                    className="question-item border-b border-gray-200 pb-3.5"
                    style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
                  >
                    {/* ENUNCIADO COM PESO */}
                    <div className="question-header flex items-start justify-between gap-3 mb-1.5 font-bold text-gray-900 leading-snug">
                      <div>
                        <span className="font-black mr-1">{String(qIndex + 1).padStart(2, '0')}.</span>
                        <span>{q.title}</span>
                      </div>
                      <span className="weight-badge text-[10px] font-bold text-gray-600 shrink-0 border border-gray-300 px-1 py-0.5 rounded bg-gray-50">
                        ({weightVal.toFixed(1)} pt)
                      </span>
                    </div>

                    {/* IMAGEM ILUSTRATIVA NORMALIZADA */}
                    {q.imageUrl && (
                      <div className="question-image my-2 max-w-sm mx-auto text-center">
                        <img
                          src={formatImageUrl(q.imageUrl)}
                          alt=""
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                          className="max-h-40 object-contain mx-auto border border-gray-300 p-1"
                        />
                      </div>
                    )}

                    {/* OPÇÕES DE RESPOSTA */}
                    {q.options && q.options.length > 0 ? (
                      <div className="options-list space-y-1.5 mt-2 pl-3">
                        {q.options.map((opt, optIndex) => {
                          const letter = String.fromCharCode(65 + optIndex);
                          const isCorrectOption = Boolean(opt.isCorrect);

                          return (
                            <div
                              key={opt.id || optIndex}
                              className={`option-row flex items-start gap-1.5 text-[11px] leading-tight ${
                                includeAnswerKey && isCorrectOption
                                  ? 'font-black text-emerald-900 bg-emerald-50 p-1 rounded border border-emerald-300'
                                  : 'text-gray-800'
                              }`}
                            >
                              <span className="font-bold shrink-0">
                                (&nbsp;&nbsp;&nbsp;) &nbsp; {letter} )
                              </span>
                              <span className="flex-1">{opt.text}</span>
                              {includeAnswerKey && isCorrectOption && (
                                <span className="correct-badge text-[9px] font-black uppercase text-emerald-700 bg-emerald-100 px-1 rounded shrink-0">
                                  [ CORRETA ]
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* QUESTÃO DISCURSIVA / ESPAÇO PARA RESPOSTA */
                      <div className="mt-2 space-y-2 pl-3">
                        <div className="border-b border-gray-400 h-5"></div>
                        <div className="border-b border-gray-400 h-5"></div>
                        <div className="border-b border-gray-400 h-5"></div>
                      </div>
                    )}

                    {/* JUSTIFICATIVA PEDAGÓGICA (GABARITO) */}
                    {includeAnswerKey && q.justification && (
                      <div className="justification-box mt-2 p-1.5 bg-amber-50 border border-amber-200 text-amber-900 text-[10px] rounded italic">
                        <strong>Comentário / Gabarito Comentado:</strong> {q.justification}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 5. CARTÃO DE RESPOSTAS / GABARITO DESTACÁVEL */}
            <div
              className="answer-sheet mt-6 pt-4 border-t-2 border-dashed border-gray-400"
              style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
            >
              <div className="text-center mb-2">
                <span className="text-xs font-black uppercase tracking-wider block">
                  ✂ CARTÃO RESPOSTA (PREENCHIMENTO OBRIGATÓRIO)
                </span>
                <span className="text-[9.5px] text-gray-500">
                  Pinte completamente o círculo ou marque um X correspondente à alternativa correta.
                </span>
              </div>

              <div className="sheet-grid grid grid-cols-5 sm:grid-cols-10 gap-1.5 text-center text-[10px]">
                {questions.map((_, idx) => (
                  <div key={idx} className="sheet-cell border border-gray-300 p-1 rounded bg-gray-50">
                    <span className="font-black block text-[9px] text-gray-600 mb-0.5">
                      Q{idx + 1}
                    </span>
                    <div className="sheet-choices flex flex-col gap-0.5 text-[8px] font-bold text-gray-700">
                      <span>( A )</span>
                      <span>( B )</span>
                      <span>( C )</span>
                      <span>( D )</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default ExamPrintModal;