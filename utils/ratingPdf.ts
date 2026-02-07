
import jsPDF from 'jspdf';
import { RatingChangeRequest } from '../types';

export const generateRatingRequestPDF = (request: RatingChangeRequest) => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(18);
    doc.text('Protocolo de Solicitação de Alteração', 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 105, 28, { align: 'center' });

    doc.line(20, 35, 190, 35);

    // Protocol Info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Protocolo: ${request.protocol}`, 20, 45);

    doc.setFont('helvetica', 'normal');
    doc.text(`Status: ${request.status}`, 20, 52);
    doc.text(`Data da Solicitação: ${new Date(request.created_at).toLocaleString('pt-BR')}`, 20, 59);

    // Store Info
    doc.setFont('helvetica', 'bold');
    doc.text('Dados da Loja', 20, 70);
    doc.line(20, 72, 190, 72);

    doc.setFont('helvetica', 'normal');
    doc.text(`Loja: ${request.store?.store_name || request.store?.name || 'N/A'}`, 20, 80);

    // Request Details
    doc.setFont('helvetica', 'bold');
    doc.text('Detalhes da Solicitação', 20, 95);
    doc.line(20, 97, 190, 97);

    doc.setFont('helvetica', 'normal');
    let y = 105;

    const typesMap: Record<string, string> = {
        'EDIT_COMMENT': 'Edição de Comentário',
        'DELETE_RATING': 'Exclusão de Avaliação'
    };
    const types = request.request_types.map(t => typesMap[t] || t).join(', ');

    doc.text(`Tipo de Ação: ${types}`, 20, y);
    y += 7;

    // Multi-line Reason
    const reasonLines = doc.splitTextToSize(`Motivo: ${request.reason}`, 170);
    doc.text(reasonLines, 20, y);
    y += (reasonLines.length * 7);

    if (request.new_comment) {
        y += 5;
        const commentLines = doc.splitTextToSize(`Novo Comentário Sugerido: ${request.new_comment}`, 170);
        doc.text(commentLines, 20, y);
        y += (commentLines.length * 7);
    }

    y += 5;
    doc.text(`Custo da Solicitação: R$ ${request.fee_charged.toFixed(2)}`, 20, y);

    // Footer with Disclaimer
    y += 20;
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text('Este documento serve como comprovante de solicitação. A análise será realizada pela equipe administrativa.', 105, 280, { align: 'center' });

    // Save
    doc.save(`protocolo_${request.protocol}.pdf`);
};
