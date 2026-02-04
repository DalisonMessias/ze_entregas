import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within, cleanup } from '@testing-library/react';
import React from 'react';
import * as cloud from '../../services/cloud';
import { FinancialPanel } from '../FinancialPanel';
import { LoanItem, UserRole } from '../../types';

// Mock do Zebank para controlar os dados de empréstimo nos testes
const mockZebankData = {
    recent_transactions: [],
    balance: 1000,
    savings_balance: 500,
    my_code: 'TEST123',
};

// Mock dos dados de empréstimos que serão usados nos testes
const mockLoanData: LoanItem[] = [
    { id: 'L001', borrowerName: 'João da Silva', amount: 5000, startDate: '2024-05-01', dueDate: '2024-11-01', status: 'EM_DIA', outstandingBalance: 2500 },
    { id: 'L002', borrowerName: 'Maria Oliveira', amount: 10000, startDate: '2024-03-15', dueDate: '2024-09-15', status: 'VENCIDO', outstandingBalance: 3000 },
    { id: 'L003', borrowerName: 'Carlos Pereira', amount: 2000, startDate: '2024-06-20', dueDate: '2024-08-20', status: 'PAGO', outstandingBalance: 0 },
];

afterEach(() => {
    cleanup();
});

describe('FinancialPanel filtros e exibição', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Mock das funções de serviço para retornar dados controlados
    vi.spyOn(cloud, 'getFinancialStatement').mockResolvedValue({ items: [], summary: { balance: 0, in: 0, out: 0 } });
    vi.spyOn(cloud, 'getZebankDashboardData').mockResolvedValue(mockZebankData);
    // @ts-ignore
    vi.spyOn(cloud, 'getClient').mockReturnValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { user_metadata: { name: 'Test User' } } } }) } });
  });

  it('filtra por tipo de operação e mostra data/hora e tipo', async () => {
    const items = [
      { id: '1', date: new Date().toISOString(), type: 'DEBIT', description: 'Entrega #AAAA', amount: -20, status: 'COMPLETED' },
      { id: '2', date: new Date().toISOString(), type: 'EARNING', description: 'Venda via Maquininha', amount: 50, status: 'COMPLETED' },
    ];
    vi.spyOn(cloud, 'getFinancialStatement').mockResolvedValue({ items, summary: { balance: 30, in: 50, out: 20 } });
    render(<FinancialPanel userRole={'store_partner'} />);

    await waitFor(() => screen.getByText('Extrato Detalhado'));

    const opTypeGroup = screen.getByTestId('op-type-filter-group');
    const saidasFilter = within(opTypeGroup).getByText('Saídas');
    fireEvent.click(saidasFilter);

    await waitFor(() => {
      expect(screen.getByText('Entrega #AAAA')).toBeTruthy();
      expect(screen.queryByText('Venda via Maquininha')).toBeNull();
    });

    const entradasFilter = within(opTypeGroup).getByText('Entradas');
    fireEvent.click(entradasFilter);
    await waitFor(() => {
      expect(screen.getByText('Venda via Maquininha')).toBeTruthy();
    });

    const typeLabels = screen.getAllByText(/Entrada|Saída|Saque|Estorno/);
    expect(typeLabels.length).toBeGreaterThan(0);
    const dateFragments = screen.getAllByText(/\d{2}\/\d{2}\/\d{4}/);
    expect(dateFragments.length).toBeGreaterThan(0);
  });
});

describe('FinancialPanel Seção de Empréstimos', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.spyOn(cloud, 'getZebankDashboardData').mockResolvedValue(mockZebankData);
        vi.spyOn(cloud, 'getFinancialStatement').mockResolvedValue({ items: [], summary: { balance: 0, in: 0, out: 0 } });
        // @ts-ignore
        vi.spyOn(cloud, 'getClient').mockReturnValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { user_metadata: { name: 'Admin User' } } } }) } });
    });

    const switchToPersonalView = async () => {
        const originFilterGroup = screen.getByTestId('origin-filter-group');
        const personalButton = within(originFilterGroup).getByText('Pessoal');
        fireEvent.click(personalButton);
        await screen.findByText('Gestão de Empréstimos');
    };

    it('deve renderizar a seção de empréstimos para admin na visão pessoal', async () => {
        render(<FinancialPanel userRole="admin" />);
        await switchToPersonalView();
        expect(screen.getByText('Gestão de Empréstimos')).not.toBeNull();
    });
    
    it('não deve renderizar a seção de empréstimos para store_partner', async () => {
        render(<FinancialPanel userRole="store_partner" />);
        const originFilterGroup = screen.getByTestId('origin-filter-group');
        const personalButton = within(originFilterGroup).getByText('Pessoal');
        fireEvent.click(personalButton);

        // Aguarda um pouco para garantir que a UI tenha tido tempo de NÃO renderizar o elemento
        await new Promise(r => setTimeout(r, 100));

        expect(screen.queryByText('Gestão de Empréstimos')).toBeNull();
    });

    it('deve calcular e exibir o resumo dos empréstimos corretamente', async () => {
        render(<FinancialPanel userRole="admin" />);
        await switchToPersonalView();
        
        // Total Emprestado: 5000 + 10000 + 2000 = 17000
        expect(screen.getByText('R$\xa017.000,00')).not.toBeNull();
        // Total Amortizado: (5000-2500) + (10000-3000) + (2000-0) = 2500 + 7000 + 2000 = 11500
        expect(screen.getByText('R$\xa011.500,00')).not.toBeNull();
        // Saldo Devedor: 2500 + 3000 + 0 = 5500
        expect(screen.getByText('R$\xa05.500,00')).not.toBeNull();
        // Vencidos: 1
        expect(screen.getByText('1')).not.toBeNull();
    });

    it('deve filtrar os empréstimos por status', async () => {
        render(<FinancialPanel userRole="admin" />);
        await switchToPersonalView();

        // Filtra por "Pago"
        fireEvent.click(screen.getByText('Pago'));
        await waitFor(() => {
            expect(screen.getByText('Carlos Pereira')).not.toBeNull();
            expect(screen.queryByText('João da Silva')).toBeNull();
            expect(screen.queryByText('Maria Oliveira')).toBeNull();
        });

        // Filtra por "Vencido"
        fireEvent.click(screen.getByText('Vencido'));
        await waitFor(() => {
            expect(screen.getByText('Maria Oliveira')).not.toBeNull();
            expect(screen.queryByText('João da Silva')).toBeNull();
            expect(screen.queryByText('Carlos Pereira')).toBeNull();
        });
    });

    it('deve ordenar os empréstimos por valor', async () => {
        render(<FinancialPanel userRole="admin" />);
        await switchToPersonalView();

        const valueHeader = screen.getByText('Valor').parentElement!;
        
        // Ordena ascendente por valor
        fireEvent.click(valueHeader);
        await waitFor(() => {
            const rows = screen.getAllByRole('row');
            // rows[0] é o header, rows[1] é o primeiro item de dados
            expect(rows[1].innerHTML).toContain('Carlos Pereira'); // 2000
            expect(rows[2].innerHTML).toContain('João da Silva'); // 5000
            expect(rows[3].innerHTML).toContain('Maria Oliveira'); // 10000
        });

        // Ordena descendente por valor
        fireEvent.click(valueHeader);
        await waitFor(() => {
            const rows = screen.getAllByRole('row');
            expect(rows[1].innerHTML).toContain('Maria Oliveira'); // 10000
            expect(rows[2].innerHTML).toContain('João da Silva'); // 5000
            expect(rows[3].innerHTML).toContain('Carlos Pereira'); // 2000
        });
    });

    it('deve ordenar os empréstimos por data de vencimento', async () => {
        render(<FinancialPanel userRole="admin" />);
        await switchToPersonalView();

        const dueDateHeader = screen.getByText('Vencimento').parentElement!;
        
        // Ordena ascendente por data (default)
        fireEvent.click(dueDateHeader); 
        await waitFor(() => {
            let rows = screen.getAllByRole('row');
            expect(rows[1].innerHTML).toContain('Carlos Pereira'); // 20/08/2024
            expect(rows[2].innerHTML).toContain('Maria Oliveira'); // 15/09/2024
            expect(rows[3].innerHTML).toContain('João da Silva');  // 01/11/2024
        });
        
        // Ordena descendente por data
        fireEvent.click(dueDateHeader);
        await waitFor(() => {
            let rows = screen.getAllByRole('row');
            expect(rows[1].innerHTML).toContain('João da Silva');  // 01/11/2024
            expect(rows[2].innerHTML).toContain('Maria Oliveira'); // 15/09/2024
            expect(rows[3].innerHTML).toContain('Carlos Pereira'); // 20/08/2024
        });
    });
});
