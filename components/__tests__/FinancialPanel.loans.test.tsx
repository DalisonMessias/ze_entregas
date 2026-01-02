import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FinancialPanel } from '../FinancialPanel';
import * as cloud from '../../services/cloud';
import { LoanItem, LoanStatus, UserRole, LoanConfig } from '../../types';

// Mock do módulo 'cloud'
jest.mock('../../services/cloud');

const mockedCloud = cloud as jest.Mocked<typeof cloud>;

const mockLoans: LoanItem[] = [
    { id: 'L001', borrowerName: 'Alice', amount: 5000, startDate: '2024-07-01', dueDate: '2024-12-01', status: 'EM_DIA', outstandingBalance: 4000 },
    { id: 'L002', borrowerName: 'Beto', amount: 10000, startDate: '2024-05-15', dueDate: '2024-11-15', status: 'VENCIDO', outstandingBalance: 3000 },
    { id: 'L003', borrowerName: 'Carlos', amount: 2000, startDate: '2024-06-20', dueDate: '2024-08-20', status: 'PAGO', outstandingBalance: 0 },
    { id: 'L004', borrowerName: 'Diana', amount: 15000, startDate: '2024-01-10', dueDate: '2025-01-10', status: 'EM_DIA', outstandingBalance: 12000 },
];

const mockLoanConfig: LoanConfig = {
    interest_rate_percent: 5,
    repayment_days: 30,
    credit_limit: 20000
};

const mockUser = {
    data: { user: { user_metadata: { name: 'Loja Teste' } } },
    error: null,
};

const setup = (userRole: UserRole, loans: LoanItem[] = mockLoans) => {
    mockedCloud.getStoreLoans.mockResolvedValue(loans);
    mockedCloud.getLoanConfig.mockResolvedValue(mockLoanConfig);
    mockedCloud.getFinancialStatement.mockResolvedValue({ items: [], summary: { balance: 1000, in: 500, out: 200 } });
    mockedCloud.getClient.mockReturnValue({
        auth: {
            getUser: jest.fn().mockResolvedValue(mockUser)
        },
        channel: jest.fn().mockReturnThis(),
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
    } as any);

    render(<FinancialPanel userRole={userRole} />);

    // Navega para a aba de empréstimos
    const loanTab = screen.getByRole('button', { name: /empréstimos/i });
    fireEvent.click(loanTab);
};

describe('FinancialPanel - Loans Section', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('1. should render loan summary statistics correctly', async () => {
        setup('store_partner');
        
        await waitFor(() => {
            // Total Emprestado: 5000 + 10000 + 2000 + 15000 = 32000
            expect(screen.getByText('Total Emprestado').nextElementSibling).toHaveTextContent('R$ 32.000,00');
            // Saldo Devedor: 4000 + 3000 + 0 + 12000 = 19000
            expect(screen.getByText('Saldo Devedor').nextElementSibling).toHaveTextContent('R$ 19.000,00');
            // Total Amortizado: 32000 - 19000 = 13000
            expect(screen.getByText('Total Amortizado').nextElementSibling).toHaveTextContent('R$ 13.000,00');
            // Vencidos: 1 (Beto)
            expect(screen.getByText('Vencidos').nextElementSibling).toHaveTextContent('1');
        });
    });

    it('2. should display the list of loans', async () => {
        setup('store_partner');

        await waitFor(() => {
            expect(screen.getByText('Alice')).toBeInTheDocument();
            expect(screen.getByText('Beto')).toBeInTheDocument();
            expect(screen.getByText('Carlos')).toBeInTheDocument();
            expect(screen.getByText('Diana')).toBeInTheDocument();
        });
    });

    it('3. should highlight overdue loans', async () => {
        setup('store_partner');

        await waitFor(() => {
            const betoRow = screen.getByText('Beto').closest('tr');
            const statusCell = betoRow?.querySelector('span');
            // A classe 'animate-pulse' é usada para destacar vencidos
            expect(statusCell).toHaveClass('animate-pulse');
            expect(statusCell).toHaveTextContent('VENCIDO');
        });
    });

    it('4. should filter loans by status', async () => {
        setup('store_partner');

        // Filtra por "Em Dia"
        const emDiaButton = screen.getByRole('button', { name: /filtrar empréstimos por status: em dia/i });
        fireEvent.click(emDiaButton);
        
        await waitFor(() => {
            expect(screen.getByText('Alice')).toBeInTheDocument();
            expect(screen.getByText('Diana')).toBeInTheDocument();
            expect(screen.queryByText('Beto')).not.toBeInTheDocument();
            expect(screen.queryByText('Carlos')).not.toBeInTheDocument();
        });

        // Filtra por "Vencido"
        const vencidoButton = screen.getByRole('button', { name: /filtrar empréstimos por status: vencido/i });
        fireEvent.click(vencidoButton);

        await waitFor(() => {
            expect(screen.getByText('Beto')).toBeInTheDocument();
            expect(screen.queryByText('Alice')).not.toBeInTheDocument();
        });
        
        // Filtra por "Pago"
        const pagoButton = screen.getByRole('button', { name: /filtrar empréstimos por status: pago/i });
        fireEvent.click(pagoButton);

        await waitFor(() => {
            expect(screen.getByText('Carlos')).toBeInTheDocument();
            expect(screen.queryByText('Beto')).not.toBeInTheDocument();
        });
    });

    it('5. should sort loans by amount', async () => {
        setup('store_partner');

        const amountHeader = screen.getByText('Valor').closest('th');
        expect(amountHeader).not.toBeNull();

        // Ordena ascendente por valor
        fireEvent.click(amountHeader!);
        
        await waitFor(() => {
            const rows = screen.getAllByRole('row');
            // rows[0] is the header row
            expect(rows[1]).toHaveTextContent('Carlos'); // 2.000
            expect(rows[2]).toHaveTextContent('Alice'); // 5.000
            expect(rows[3]).toHaveTextContent('Beto'); // 10.000
            expect(rows[4]).toHaveTextContent('Diana'); // 15.000
        });

        // Ordena descendente por valor
        fireEvent.click(amountHeader!);

        await waitFor(() => {
            const rows = screen.getAllByRole('row');
            expect(rows[1]).toHaveTextContent('Diana'); // 15.000
            expect(rows[2]).toHaveTextContent('Beto'); // 10.000
            expect(rows[3]).toHaveTextContent('Alice'); // 5.000
            expect(rows[4]).toHaveTextContent('Carlos'); // 2.000
        });
    });
    
    it('6. should sort loans by due date', async () => {
        setup('store_partner');

        const dueDateHeader = screen.getByText('Vencimento').closest('th');
        expect(dueDateHeader).not.toBeNull();

        // Default sort is already due date asc, so click once for desc
        fireEvent.click(dueDateHeader!); // asc
        fireEvent.click(dueDateHeader!); // desc

        await waitFor(() => {
            const rows = screen.getAllByRole('row');
            // rows[0] is the header row
            expect(rows[1]).toHaveTextContent('Diana'); // 2025-01-10
            expect(rows[2]).toHaveTextContent('Alice'); // 2024-12-01
            expect(rows[3]).toHaveTextContent('Beto');  // 2024-11-15
            expect(rows[4]).toHaveTextContent('Carlos');// 2024-08-20
        });
    });

    it('7. should show a message when no loans are found for a filter', async () => {
        setup('store_partner', []); // Inicia sem empréstimos

        await waitFor(() => {
            expect(screen.getByText(/Nenhum empréstimo encontrado/i)).toBeInTheDocument();
        });
    });
});
