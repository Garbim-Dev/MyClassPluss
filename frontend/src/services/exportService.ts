import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export interface StudentReportItem {
  rank?: number;
  userName?: string;
  name?: string;
  teamName?: string | null;
  totalGrade?: number;
  averageGrade?: number;
  score?: number;
  totalCorrect?: number;
  totalQuestions?: number;
  isApproved?: boolean;
}

export interface ExportOptions {
  quizTitle: string;
  courseName: string;
  classCode: string;
  subjectName: string;
  totalQuestions?: number;
  students: StudentReportItem[];
  instructorName?: string;
}

export const ExportService = {
  // 📊 1. Exportar para Planilha Excel (.xlsx)
  exportToExcel(data: ExportOptions) {
    const formattedData = data.students.map((s, index) => {
      const finalGrade =
        s.totalGrade !== undefined
          ? Number(s.totalGrade)
          : s.averageGrade !== undefined
          ? Number(s.averageGrade)
          : s.score
          ? (s.score / 1000) * 10
          : 0;

      const isApproved = s.isApproved !== undefined ? s.isApproved : finalGrade >= 7.0;

      return {
        Rank: s.rank || index + 1,
        Aluno: s.userName || s.name || 'Estudante',
        Equipe: s.teamName || 'Individual',
        'Nota Final (0-10)': Number(finalGrade.toFixed(1)),
        Acertos: s.totalCorrect ?? 0,
        'Total Questões': s.totalQuestions || data.totalQuestions || 0,
        Status: isApproved ? 'APROVADO' : 'REPROVADO',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dossiê da Turma');

    // Larguras otimizadas para leitura das colunas
    worksheet['!cols'] = [
      { wch: 8 },  // Rank
      { wch: 32 }, // Aluno
      { wch: 18 }, // Equipe
      { wch: 18 }, // Nota Final
      { wch: 12 }, // Acertos
      { wch: 16 }, // Total Questões
      { wch: 16 }, // Status
    ];

    const fileName = `Dossie_${data.classCode}_${data.quizTitle.replace(/\s+/g, '_')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  },

  // 📄 2. Exportar Ata / Boletim Oficial em PDF Pronto para Assinatura
  exportToPDF(data: ExportOptions) {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const totalAlunos = data.students.length;
    
    // Cálculo de médias e aprovação consolidadas
    let somaNotas = 0;
    let aprovados = 0;

    data.students.forEach((s) => {
      const grade =
        s.totalGrade !== undefined
          ? Number(s.totalGrade)
          : s.averageGrade !== undefined
          ? Number(s.averageGrade)
          : s.score
          ? (s.score / 1000) * 10
          : 0;

      somaNotas += grade;
      const approved = s.isApproved !== undefined ? s.isApproved : grade >= 7.0;
      if (approved) aprovados++;
    });

    const taxaAprovacao = totalAlunos > 0 ? ((aprovados / totalAlunos) * 100).toFixed(1) : '0.0';
    const mediaGeral = totalAlunos > 0 ? (somaNotas / totalAlunos).toFixed(1) : '0.0';

    // 1. CABEÇALHO INSTITUCIONAL
    doc.setFillColor(15, 23, 42); // Slate 900
    doc.rect(0, 0, 210, 26, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text('ATA DE RENDIMENTO PEDAGÓGICO E AVALIAÇÃO OFICIAL', 105, 11, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text('MyClassPluss • Sistema de Gestão Acadêmica e Avaliação Técnica', 105, 18, { align: 'center' });

    // 2. METADADOS DA TURMA
    doc.setTextColor(30, 41, 59); // Slate 800
    doc.setFontSize(9);

    doc.setFont('helvetica', 'bold');
    doc.text('Curso:', 14, 34);
    doc.setFont('helvetica', 'normal');
    doc.text(data.courseName || 'Geral', 28, 34);

    doc.setFont('helvetica', 'bold');
    doc.text('Turma / Código:', 130, 34);
    doc.setFont('helvetica', 'normal');
    doc.text(data.classCode, 158, 34);

    doc.setFont('helvetica', 'bold');
    doc.text('Disciplina:', 14, 40);
    doc.setFont('helvetica', 'normal');
    doc.text(data.subjectName || 'Geral', 32, 40);

    doc.setFont('helvetica', 'bold');
    doc.text('Atividade:', 130, 40);
    doc.setFont('helvetica', 'normal');
    doc.text(data.quizTitle, 147, 40);

    // 3. QUADRO RESUMO ESTATÍSTICO DA TURMA
    doc.setFillColor(248, 250, 252); // Slate 50
    doc.setDrawColor(203, 213, 225); // Slate 300
    doc.roundedRect(14, 45, 182, 13, 2, 2, 'FD');

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);

    doc.text(`Total de Avaliados: ${totalAlunos}`, 20, 53.5);
    doc.text(`Média da Turma: ${mediaGeral} / 10,0`, 75, 53.5);
    doc.text(`Aprovados: ${aprovados} (${taxaAprovacao}%)`, 135, 53.5);

    // 4. TABELA DE RENDIMENTO INDIVIDUAL
    const tableColumn = ['#', 'Nome do Aluno', 'Equipe', 'Acertos', 'Nota (0-10)', 'Situação'];
    const tableRows = data.students.map((s, index) => {
      const grade =
        s.totalGrade !== undefined
          ? Number(s.totalGrade)
          : s.averageGrade !== undefined
          ? Number(s.averageGrade)
          : s.score
          ? (s.score / 1000) * 10
          : 0;

      const isApproved = s.isApproved !== undefined ? s.isApproved : grade >= 7.0;

      return [
        s.rank || index + 1,
        s.userName || s.name || 'Estudante',
        s.teamName || '—',
        s.totalCorrect !== undefined ? `${s.totalCorrect}` : '—',
        grade.toFixed(1),
        isApproved ? 'APROVADO' : 'ABAIXO DA MÉDIA',
      ];
    });

    (doc as any).autoTable({
      startY: 62,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
        halign: 'center',
      },
      styles: {
        fontSize: 8,
        cellPadding: 2.2,
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'left', cellWidth: 72 },
        2: { halign: 'center', cellWidth: 30 },
        3: { halign: 'center', cellWidth: 18 },
        4: { halign: 'center', cellWidth: 22, fontStyle: 'bold' },
        5: { halign: 'center', cellWidth: 30 },
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didParseCell: (hookData: any) => {
        if (hookData.section === 'body' && hookData.column.index === 5) {
          if (hookData.cell.raw === 'APROVADO') {
            hookData.cell.styles.textColor = [16, 185, 129]; // Emerald 500
            hookData.cell.styles.fontStyle = 'bold';
          } else {
            hookData.cell.styles.textColor = [239, 68, 68]; // Red 500
            hookData.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });

    // 5. CAMPOS OFICIAIS DE ASSINATURA NO RODAPÉ
    const finalTableY = (doc as any).lastAutoTable?.finalY || 180;
    
    // Se a tabela terminou muito perto do fim da folha, cria uma nova página para as assinaturas
    if (finalTableY > 230) {
      doc.addPage();
    }

    const currentFinalY = (doc as any).lastAutoTable?.finalY > 230 ? 40 : (doc as any).lastAutoTable?.finalY || 180;
    const signY = Math.min(Math.max(currentFinalY + 28, 220), 255);

    // Assinatura do Instrutor
    doc.setDrawColor(148, 163, 184);
    doc.line(22, signY, 88, signY);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(data.instructorName || 'Instrutor Técnico Responsável', 55, signY + 5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Assinatura e Registro', 55, signY + 9, { align: 'center' });

    // Assinatura da Coordenação
    doc.line(122, signY, 188, signY);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Coordenação Pedagógica', 155, signY + 5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Visto e Homologação Escolar', 155, signY + 9, { align: 'center' });

    // 6. NUMERAÇÃO DE PÁGINAS E PROTOCOLO
    const totalPages = (doc as any).internal.getNumberOfPages();
    const dataEmissao = new Date().toLocaleDateString('pt-BR');
    const horaEmissao = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Documento oficial gerado eletronicamente em ${dataEmissao} às ${horaEmissao} • Página ${i} de ${totalPages}`,
        105,
        289,
        { align: 'center' }
      );
    }

    const fileName = `Ata_Oficial_${data.classCode}_${data.quizTitle.replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);
  },
};