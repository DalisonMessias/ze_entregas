import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { AdminStoreOrders } from '../AdminStoreOrders';

const {
    confirmMock,
    alertMock,
    toastMock,
    adminGetOrdersByStoreSummary,
    adminGetOrdersByStore,
    adminEditOrder,
    adminUpdateOrderStatus,
    adminDeleteOrder
} = vi.hoisted(() => ({
    confirmMock: vi.fn(),
    alertMock: vi.fn(),
    toastMock: vi.fn(),
    adminGetOrdersByStoreSummary: vi.fn(),
    adminGetOrdersByStore: vi.fn(),
    adminEditOrder: vi.fn(),
    adminUpdateOrderStatus: vi.fn(),
    adminDeleteOrder: vi.fn()
}));

vi.mock('../../utils/dialogService', () => ({
    useDialog: () => ({
        confirm: confirmMock,
        alert: alertMock,
        toast: toastMock
    })
}));

vi.mock('../../services/cloud', () => ({
    adminGetOrdersByStoreSummary,
    adminGetOrdersByStore,
    adminEditOrder,
    adminUpdateOrderStatus,
    adminDeleteOrder
}));

describe('AdminStoreOrders', () => {
    afterEach(() => {
        cleanup();
    });

    beforeEach(() => {
        vi.clearAllMocks();
        window.history.pushState({}, '', '/admin/pedidos-loja');
        confirmMock.mockResolvedValue(true);
        adminGetOrdersByStoreSummary.mockResolvedValue([
            { store_id: 'store-1', store_name: 'Loja Centro', orders_count: 2 },
            { store_id: 'store-2', store_name: 'Loja Norte', orders_count: 1 }
        ]);
        adminGetOrdersByStore.mockResolvedValue([
            {
                id: 'order-12345678',
                created_at: '2026-02-11T12:00:00.000Z',
                status: 'PENDING',
                payment_status: 'pending',
                total_price: 55.9,
                customer_name: 'Cliente 1',
                payment_method: 'PIX',
                store_id: 'store-1'
            }
        ]);
        adminEditOrder.mockResolvedValue(undefined);
        adminUpdateOrderStatus.mockResolvedValue(undefined);
        adminDeleteOrder.mockResolvedValue(undefined);
    });

    it('renders cards with store names and order counts', async () => {
        render(<AdminStoreOrders />);

        expect(await screen.findByText('Pedidos por Loja')).toBeInTheDocument();
        expect(screen.getByText('Loja Centro')).toBeInTheDocument();
        expect(screen.getByText('Loja Norte')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('opens store detail and shows orders list', async () => {
        render(<AdminStoreOrders />);

        fireEvent.click((await screen.findAllByRole('button', { name: /Loja Centro/i }))[0]);

        expect(await screen.findByText('Pedidos da loja')).toBeInTheDocument();
        expect(screen.getByText('#order-12')).toBeInTheDocument();
        expect(screen.getByText('Cliente 1')).toBeInTheDocument();
        expect(screen.getAllByText('Pendente').length).toBeGreaterThan(0);
        expect(screen.getByText('Pix')).toBeInTheDocument();
        expect(screen.getByText('Nao pago')).toBeInTheDocument();
    });

    it('updates order status with quick action', async () => {
        render(<AdminStoreOrders />);
        fireEvent.click((await screen.findAllByRole('button', { name: /Loja Centro/i }))[0]);
        await screen.findByText('#order-12');

        fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }));

        await waitFor(() => {
            expect(adminUpdateOrderStatus).toHaveBeenCalledWith('order-12345678', 'PENDING');
        });
    });

    it('edits order status and total price', async () => {
        render(<AdminStoreOrders />);
        fireEvent.click((await screen.findAllByRole('button', { name: /Loja Centro/i }))[0]);
        await screen.findByText('#order-12');

        fireEvent.click(screen.getByRole('button', { name: /Editar/i }));

        expect(screen.getByText('Forma de pagamento')).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText('Valor total'), { target: { value: 'R$ 89,50' } });
        fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

        await waitFor(() => {
            expect(adminEditOrder).toHaveBeenCalledWith('order-12345678', { status: 'PENDING', payment_method: 'PIX', payment_status: 'pending', total_price: 89.5 });
        });
    });

    it('deletes order after confirmation', async () => {
        render(<AdminStoreOrders />);
        fireEvent.click((await screen.findAllByRole('button', { name: /Loja Centro/i }))[0]);
        await screen.findByText('#order-12');

        fireEvent.click(screen.getByRole('button', { name: /^Deletar$/i }));

        await waitFor(() => {
            expect(confirmMock).toHaveBeenCalled();
            expect(adminDeleteOrder).toHaveBeenCalledWith('order-12345678');
        });
    });

    it('filters orders by id search field', async () => {
        adminGetOrdersByStore.mockResolvedValue([
            {
                id: 'order-12345678',
                created_at: '2026-02-11T12:00:00.000Z',
                status: 'PENDING',
                payment_status: 'pending',
                total_price: 55.9,
                customer_name: 'Cliente 1',
                payment_method: 'PIX',
                store_id: 'store-1'
            },
            {
                id: 'order-99999999',
                created_at: '2026-02-11T13:00:00.000Z',
                status: 'READY',
                payment_status: 'paid',
                total_price: 34.1,
                customer_name: 'Cliente 2',
                payment_method: 'PIX',
                store_id: 'store-1'
            }
        ]);

        render(<AdminStoreOrders />);
        fireEvent.click((await screen.findAllByRole('button', { name: /Loja Centro/i }))[0]);

        await screen.findByText('#order-12');
        await screen.findByText('#order-99');

        fireEvent.change(screen.getByPlaceholderText('Digite parte do ID do pedido'), { target: { value: '9999' } });

        expect(screen.queryByText('#order-12')).not.toBeInTheDocument();
        expect(screen.getByText('#order-99')).toBeInTheDocument();
    });

    it('paginates orders showing 10 per page', async () => {
        const manyOrders = Array.from({ length: 12 }).map((_, index) => ({
            id: `order-${String(index + 1).padStart(8, '0')}`,
            created_at: `2026-02-11T${String(index).padStart(2, '0')}:00:00.000Z`,
            status: 'PENDING',
            payment_status: 'pending',
            total_price: 10 + index,
            customer_name: `Cliente ${index + 1}`,
            payment_method: 'PIX',
            store_id: 'store-1'
        }));
        adminGetOrdersByStore.mockResolvedValue(manyOrders);

        render(<AdminStoreOrders />);
        fireEvent.click((await screen.findAllByRole('button', { name: /Loja Centro/i }))[0]);

        await screen.findByText('Pedidos da loja');
        expect(screen.getByText('Mostrando 1 a 10 de 12 pedidos')).toBeInTheDocument();
        expect(screen.getByText('Pagina 1 de 2')).toBeInTheDocument();
        expect(screen.getAllByTestId(/^order-card-/).length).toBe(10);

        fireEvent.click(screen.getByRole('button', { name: 'Proxima' }));

        expect(await screen.findByText('Mostrando 11 a 12 de 12 pedidos')).toBeInTheDocument();
        expect(screen.getByText('Pagina 2 de 2')).toBeInTheDocument();
        expect(screen.getAllByTestId(/^order-card-/).length).toBe(2);
    });
});

