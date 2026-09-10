import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface StudentReportItem {
  rank?: number;
  userName?: string;
  name?: string;
  totalGrade?: number;
  averageGrade?: number;
  totalCorrect?: number;
  totalQuestions?: number;
  isApproved?: boolean;
}

interface ExportOptions {
  quizTitle: string;
  courseName: string;
  classCode: string;
  subjectName: string;
  students: StudentReportItem[];
}

export const ExportService = {
  // 📊 Exportar para Excel (.xlsx)
  exportToExcel(data: ExportOptions) {
    const formattedData = data.students.map((s, index) => ({
      'Rank': s.rank || index + 1,
      'Aluno': s.userName || s.name || 'Estudante',
      'Nota Final': s.totalGrade !== undefined ? s.totalGrade : s.averageGrade || 0,
      'Acertos': s.totalCorrect || 0,
      'Total Questões': s.totalQuestions || 0,
      'Status': (s.totalGrade !== undefined ? s.totalGrade >= 7.0 : s.isApproved) ? 'APROVADO' : 'REPROVADO',
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório da Turma');

    // Estilização básica de larguras de colunas
    worksheet['!cols'] = [
      { wch: 8 },  // Rank
      { wch: 30 }, // Aluno
      { wch: 12 }, // Nota
      { wch: 10 }, // Acertos
      { wch: 15 }, // Total Questões
      { wch: 15 }, // Status
    ];

    const fileName = `Relatorio_${data.classCode}_${data.quizTitle.replace(/\s+/g, '_')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  },

  // 📄 Exportar para PDF profissional
  exportToPDF(data: ExportOptions) {
    const doc = new jsPDF();

    // Cabeçalho Institucional
    doc.setFillColor(15, 23, 42); // Cor de fundo do cabeçalho (Slate 900)
    doc.rect(0, 0, 210, 30, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('MyClassPluss • Dossiê Pedagógico Oficial', 14, 18);

    // Informações da Atividade e Turma
    doc.setTextColor(51, 65, 85); // Slate 700
    doc.setFontSize(11);
    doc.text(`Atividade: ${data.quizTitle}`, 14, 40);
    doc.text(`Turma: ${data.classCode} | Curso: ${data.courseName}`, 14, 48);
    doc.text(`Disciplina: ${data.subjectName || 'Geral'}`, 14, 56);
    doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 14, 64);

    // Tabela de Alunos
    const tableColumn = ['#', 'Nome do Aluno', 'Nota Final', 'Acertos', 'Status'];
    const tableRows = data.students.map((s, index) => [
      s.rank || index + 1,
      s.userName || s.name || 'Estudante',
      (s.totalGrade !== undefined ? s.totalGrade : s.averageGrade || 0).toFixed(1),
      `${s.totalCorrect || 0} / ${s.totalQuestions || 0}`,
      (s.totalGrade !== undefined ? s.totalGrade >= 7.0 : s.isApproved) ? 'Aprovado' : 'Abaixo da Média',
    ]);

    (doc as any).autoTable({
      startY: 72,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 4 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    // Rodapé
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Gerado automaticamente pela Plataforma Integrada MyClassPluss - Página ${i} de ${pageCount}`,
        14,
        290
      );
    }

    const fileName = `Dossie_${data.classCode}_${data.quizTitle.replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);
  },
};