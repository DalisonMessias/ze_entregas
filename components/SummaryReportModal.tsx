import React, { useState } from 'react';
import { X, FileText, Download, Calendar } from 'lucide-react';
import { Button } from './Button';
import jsPDF from 'jspdf';
import { useDialog } from '../utils/dialogService';

interface SummaryReportModalProps {
    onClose: () => void;
    data: any[]; // Adjust based on your financial entry type
}

export const SummaryReportModal: React.FC<SummaryReportModalProps> = ({ onClose, data }) => {
    const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
    const { alert } = useDialog();

    // Calcular dados reais baseados no período selecionado
    const summary = React.useMemo(() => {
        if (!data || data.length === 0) {
            return {
                sales: 0,
                refunds: 0,
                fees: 0,
                net: 0,
                pendingDeliveries: 0,
                completedDeliveries: 0
            };
        }

        const now = new Date();

        // Definir filtro de data baseado no período
        let periodStart: Date;

        switch (period) {
            case 'daily':
                // Hoje (desde 00:00:00)
                periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'weekly':
                // Últimos 7 dias
                periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
                break;
            case 'monthly':
                // Desde o dia 1 do mês atual
                periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            default:
                periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        }

        // Filtrar dados pelo período
        const filteredData = data.filter((entry: any) => {
            if (!entry.created_at && !entry.paidAt && !entry.date) return false;

            const entryDate = new Date(entry.created_at || entry.paidAt || entry.date);
            return entryDate >= periodStart && entryDate <= now;
        });

        // Calcular totais
        let totalSales = 0;
        let totalRefunds = 0;
        let totalFees = 0;
        let pendingCount = 0;
        let completedCount = 0;

        filteredData.forEach((entry: any) => {
            const amount = entry.amount || 0;

            // Identificar tipo de transação
            if (entry.status === 'paid' || entry.status === 'processing' || entry.method) {
                // É uma venda
                totalSales += amount;
                completedCount++;

                // Calcular taxa (assumindo taxa global de ~5%)
                // Em produção, isso deve vir dos dados reais ou configurações
                const feePercent = 0.05; // 5%
                totalFees += amount * feePercent;
            } else if (entry.type === 'REFUND' || entry.status === 'refunded') {
                // É um reembolso
                totalRefunds += Math.abs(amount);
            } else if (entry.status === 'unpaid' || entry.status === 'pending') {
                // Pendente
                pendingCount++;
            }
        });

        const netAmount = totalSales - totalRefunds - totalFees;

        return {
            sales: totalSales,
            refunds: totalRefunds,
            fees: totalFees,
            net: netAmount,
            pendingDeliveries: pendingCount,
            completedDeliveries: completedCount
        };
    }, [data, period]);

    const handleExportPDF = () => {
        try {
            const doc = new jsPDF();

            // Header
            doc.setFontSize(22);
            doc.setTextColor(34, 197, 94); // Green
            doc.text('Zé Entregas', 20, 20);

            doc.setFontSize(16);
            doc.setTextColor(0, 0, 0);
            doc.text('Relatório Financeiro', 20, 35);

            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 20, 42);
            doc.text(`Período: ${period === 'daily' ? 'Diário' : period === 'weekly' ? 'Semanal' : 'Mensal'}`, 20, 48);

            // Divider
            doc.setDrawColor(200, 200, 200);
            doc.line(20, 55, 190, 55);

            // Content
            let y = 70;
            const addItem = (label: string, value: string, isBold = false) => {
                doc.setFont('helvetica', isBold ? 'bold' : 'normal');
                doc.text(label, 20, y);
                doc.text(value, 180, y, { align: 'right' });
                y += 10;
            };

            addItem('Vendas Brutas', `R$ ${summary.sales.toFixed(2).replace('.', ',')}`);
            addItem('Reembolsos', `R$ ${summary.refunds.toFixed(2).replace('.', ',')}`);
            addItem('Taxas da Plataforma', `- R$ ${summary.fees.toFixed(2).replace('.', ',')}`);

            y += 5;
            doc.line(20, y, 190, y);
            y += 15;

            addItem('LUCRO LÍQUIDO', `R$ ${summary.net.toFixed(2).replace('.', ',')}`, true);

            y += 20;
            doc.setFontSize(14);
            doc.text('Estatísticas Operacionais', 20, y);
            y += 15;
            doc.setFontSize(10);

            addItem('Entregas Realizadas', summary.completedDeliveries.toString());
            addItem('Entregas Pendentes', summary.pendingDeliveries.toString());

            doc.save(`relatorio-${period}-${new Date().toISOString().split('T')[0]}.pdf`);

            alert({ title: 'Sucesso', message: 'Relatório PDF baixado com sucesso!' });
        } catch (error) {
            // console.error(error);
            alert({ title: 'Erro', message: 'Falha ao gerar PDF.' });
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-6 shadow-xl transform animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                        <FileText className="w-6 h-6 text-brand-500" />
                        Relatório Resumido
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Filters */}
                <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl mb-6">
                    {(['daily', 'weekly', 'monthly'] as const).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold capitalize transition-all ${period === p
                                ? 'bg-white dark:bg-gray-600 shadow-sm text-brand-600 dark:text-brand-400'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                                }`}
                        >
                            {p === 'daily' ? 'Hoje' : p === 'weekly' ? 'Semana' : 'Mês'}
                        </button>
                    ))}
                </div>

                {/* Report Preview Card */}
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 mb-6 space-y-3 border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Vendas</span>
                        <span className="font-bold dark:text-white">R$ {summary.sales.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-red-500">
                        <span className="text-sm">Reembolsos</span>
                        <span className="font-bold">- R$ {summary.refunds.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-orange-500">
                        <span className="text-sm">Taxas</span>
                        <span className="font-bold">- R$ {summary.fees.toFixed(2)}</span>
                    </div>
                    <div className="h-px bg-gray-200 dark:bg-gray-700 my-2" />
                    <div className="flex justify-between items-center text-lg">
                        <span className="font-bold text-gray-800 dark:text-white">Líquido</span>
                        <span className="font-black text-green-600">R$ {summary.net.toFixed(2)}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl text-center">
                        <div className="text-2xl font-black text-blue-600">{summary.completedDeliveries}</div>
                        <div className="text-xs font-bold text-blue-400 uppercase">Entregas Feitas</div>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-xl text-center">
                        <div className="text-2xl font-black text-yellow-600">{summary.pendingDeliveries}</div>
                        <div className="text-xs font-bold text-yellow-500 uppercase">Pendentes</div>
                    </div>
                </div>

                <Button onClick={handleExportPDF} fullWidth icon={<Download className="w-5 h-5" />}>
                    Exportar PDF
                </Button>
            </div>
        </div>
    );
};
