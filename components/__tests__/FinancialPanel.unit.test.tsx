import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { FinancialPanel } from '../FinancialPanel';
vi.mock('../../services/cloud', () => ({
  getZebankDashboardData: async () => ({ recent_transactions: [], balance: 0, savings_balance: 0, my_code: '' }),
  getClient: () => ({ auth: { getUser: async () => ({ data: { user: { user_metadata: { name: 'Tester' } } } }) } }),
  getFinancialStatement: async () => ({ items: [], summary: { balance: 0, in: 0, out: 0 } }),
  getStoreLoans: async () => ([
    { id: 'L001', borrowerName: 'João da Silva', amount: 5000, startDate: '2024-05-01', dueDate: '2024-11-01', status: 'EM_DIA', outstandingBalance: 2000 },
    { id: 'L002', borrowerName: 'Maria Oliveira', amount: 10000, startDate: '2024-03-15', dueDate: '2024-09-15', status: 'VENCIDO', outstandingBalance: 3000 },
    { id: 'L003', borrowerName: 'Carlos Pereira', amount: 2000, startDate: '2024-06-20', dueDate: '2024-08-20', status: 'PAGO', outstandingBalance: 0 },
    { id: 'L004', borrowerName: 'Ana Costa', amount: 15000, startDate: '2024-01-10', dueDate: '2025-01-10', status: 'EM_DIA', outstandingBalance: 12000 },
    { id: 'L005', borrowerName: 'Pedro Martins', amount: 3000, startDate: '2023-12-05', dueDate: '2024-06-05', status: 'VENCIDO', outstandingBalance: 1000 },
  ]),
}));

describe('FinancialPanel - Empréstimos', () => {
  const setupPersonalView = async () => {
    render(<FinancialPanel userRole={'admin'} defaultOrigin={'personal'} />);
    await screen.findByText('Gestão de Empréstimos');
  };

  it('renderiza seção de empréstimos com dados', async () => {
    await setupPersonalView();
    expect(screen.getByText('Gestão de Empréstimos')).toBeInTheDocument();
    expect(screen.getByText('João da Silva')).toBeInTheDocument();
    expect(screen.getByText('Maria Oliveira')).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*5\.000,00/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*10\.000,00/)).toBeInTheDocument();
    expect(screen.getByText('Em Dia')).toBeInTheDocument();
    expect(screen.getAllByText('Vencido').length).toBeGreaterThanOrEqual(1);
  });

  it('filtra empréstimos por status', async () => {
    await setupPersonalView();
    fireEvent.click(screen.getByLabelText('Filtrar empréstimos por status: Vencido'));
    expect(screen.queryByText('João da Silva')).not.toBeInTheDocument();
    expect(screen.getByText('Maria Oliveira')).toBeInTheDocument();
    expect(screen.getByText('Pedro Martins')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Filtrar empréstimos por status: Pago'));
    expect(screen.queryByText('Maria Oliveira')).not.toBeInTheDocument();
    expect(screen.getByText('Carlos Pereira')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Filtrar empréstimos por status: Todos'));
    expect(screen.getByText('João da Silva')).toBeInTheDocument();
    expect(screen.getByText('Maria Oliveira')).toBeInTheDocument();
    expect(screen.getByText('Carlos Pereira')).toBeInTheDocument();
  });

  it('ordena por valor ascendente e descendente', async () => {
    await setupPersonalView();
    const amountHeader = screen.getByText('Valor');
    fireEvent.click(amountHeader);
    let rows = screen.getAllByRole('row');
    let firstRow = rows[1];
    expect(firstRow).toHaveTextContent('Carlos Pereira');

    fireEvent.click(amountHeader);
    rows = screen.getAllByRole('row');
    firstRow = rows[1];
    expect(firstRow).toHaveTextContent('Ana Costa');
  });

  it('exibe resumo estatístico correto', async () => {
    await setupPersonalView();
    expect(screen.getByText('Total Emprestado')).toBeInTheDocument();
    expect(screen.getByText('Total Amortizado')).toBeInTheDocument();
    expect(screen.getAllByText('Saldo Devedor').length).toBeGreaterThan(0);
    expect(screen.getByText('Vencidos')).toBeInTheDocument();

    const totalEmpLabel = screen.getByText('Total Emprestado');
    const totalEmpValue = totalEmpLabel.nextElementSibling as HTMLElement;
    expect(totalEmpValue).toHaveTextContent(/35\.000,00/);
    const totalPaidLabel = screen.getByText('Total Amortizado');
    const totalPaidValue = totalPaidLabel.nextElementSibling as HTMLElement;
    expect(totalPaidValue).toHaveTextContent(/17\.000,00/);
    const outstandingLabel = screen.getAllByText('Saldo Devedor')[0];
    const outstandingValue = outstandingLabel.nextElementSibling as HTMLElement;
    expect(outstandingValue).toHaveTextContent(/18\.000,00/);
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
