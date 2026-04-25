import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { MerchantPOSMobile } from '../MerchantPOSMobile';
import { MerchantPOSDesktop } from '../MerchantPOSDesktop';

type Step =
  | 'loading'
  | 'activation_intro'
  | 'activating_animation_1'
  | 'create_pin'
  | 'confirm_pin'
  | 'pin_lock'
  | 'home'
  | 'amount'
  | 'split_config'
  | 'payment_list'
  | 'processing'
  | 'success'
  | 'error'
  | 'history'
  | 'settings'
  | 'inactive'
  | 'sales_simulator'
  | 'choose_sale_type'
  | 'select_associated_store'
  | 'select_order_for_store'
  | 'activating_animation_2';

type HookConfig = {
  step: Step;
  amount?: string;
  simulatorAmount?: string;
  showHistory?: boolean;
  isWhatsAppModalOpen?: boolean;
  pinEntry?: string;
  newPin?: string;
  confirmPin?: string;
  lockoutUntil?: Date | null;
  lockoutCountdown?: number;
  partialAmounts?: Array<{ id: string; amount: number; status: 'unpaid' | 'processing' | 'paid' | 'error'; method?: string }>;
  totalToSplit?: number;
};

const dialogMock = {
  alert: vi.fn(async () => {}),
  confirm: vi.fn(async () => true),
  prompt: vi.fn(async () => null),
};

let hookConfig: HookConfig = { step: 'amount' };

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const parseCurrency = (value: string) => {
  const digits = value.replace(/\D/g, '');
  return Number(digits || '0') / 100;
};

const createSimulatorCalculations = (simulatorAmount: string, feePayer: 'seller' | 'buyer') => {
  const rawGross = parseCurrency(simulatorAmount);
  const rawFees = rawGross > 0 ? 1 : 0;
  const rawNet = feePayer === 'seller' ? Math.max(0, rawGross - rawFees) : rawGross;

  return {
    gross: formatCurrency(rawGross),
    fees: formatCurrency(rawFees),
    net: formatCurrency(rawNet),
    final: formatCurrency(rawGross),
    rawGross,
    rawFees,
    rawNet,
  };
};

vi.mock('../../services/cloud', () => ({
  syncOfflineData: vi.fn(),
  getMySalesSimulations: vi.fn(async () => []),
  clearMySalesSimulations: vi.fn(async () => {}),
  saveSalesSimulation: vi.fn(async () => {}),
  logClientError: vi.fn(async () => {}),
}));

vi.mock('../../utils/dialogService', () => ({
  useDialog: () => dialogMock,
}));

vi.mock('@list-labs/react-joyride', () => ({
  default: () => null,
}));

vi.mock('../../hooks/useDynamicFont', () => ({
  useDynamicFont: () => 60,
}));

vi.mock('../SummaryReportModal', () => ({
  SummaryReportModal: () => null,
}));

vi.mock('../QrCodeLogsModal', () => ({
  QrCodeLogsModal: () => null,
}));

vi.mock('../../hooks/useMerchantPOS', async () => {
  const React = await import('react');

  return {
    useMerchantPOS: () => {
      const [step, setStep] = React.useState<Step>(hookConfig.step);
      const [amount, setAmount] = React.useState(hookConfig.amount ?? '0,00');
      const [totalToSplit, setTotalToSplit] = React.useState(hookConfig.totalToSplit ?? 0);
      const [partialAmounts, setPartialAmounts] = React.useState(
        hookConfig.partialAmounts ?? []
      );
      const [pinEntry, setPinEntry] = React.useState(hookConfig.pinEntry ?? '');
      const [newPin, setNewPin] = React.useState(hookConfig.newPin ?? '');
      const [confirmPin, setConfirmPin] = React.useState(hookConfig.confirmPin ?? '');
      const [simulatorAmount, setSimulatorAmount] = React.useState(
        hookConfig.simulatorAmount ?? '0,00'
      );
      const [showHistory, setShowHistory] = React.useState(hookConfig.showHistory ?? false);
      const [isWhatsAppModalOpen, setWhatsAppModalOpen] = React.useState(
        hookConfig.isWhatsAppModalOpen ?? false
      );
      const [feePayer, setFeePayer] = React.useState<'seller' | 'buyer'>('seller');
      const [simulationHistory, setSimulationHistory] = React.useState<any[]>([]);

      const handleContinueFromAmount = () => {
        const total = parseCurrency(amount);
        if (total <= 0) return;
        setTotalToSplit(total);
        setPartialAmounts([{ id: 'payment-1', amount: total, status: 'unpaid' }]);
        setStep('payment_list');
      };

      return {
        step,
        setStep,
        terminal: {
          id: 'terminal-1',
          terminal_id: 'TERM-1234',
          user_id: 'user-1',
          status: 'ACTIVE',
          pin_code: '1234',
          label: 'Terminal Teste',
        },
        setTerminal: vi.fn(),
        amount,
        setAmount,
        errorMsg: '',
        setErrorMsg: vi.fn(),
        userRole: 'delivery_partner',
        partnerProfile: null,
        processing: false,
        setProcessing: vi.fn(),
        totalToSplit,
        setTotalToSplit,
        partialAmounts,
        setPartialAmounts,
        activePayment: null,
        setActivePayment: vi.fn(),
        pixCodeData: null,
        pixTxId: null,
        pinEntry,
        setPinEntry,
        newPin,
        setNewPin,
        confirmPin,
        setConfirmPin,
        pinAttempts: 0,
        lockoutUntil: hookConfig.lockoutUntil ?? null,
        lockoutCountdown: hookConfig.lockoutCountdown ?? 0,
        simulatorAmount,
        setSimulatorAmount,
        feePayer,
        setFeePayer,
        feeSettings: { global_tax_percent: 10, global_tax_fixed: 1 },
        simulationHistory,
        setSimulationHistory,
        showHistory,
        setShowHistory,
        simulatorCalculations: createSimulatorCalculations(simulatorAmount, feePayer),
        saleTypeSelection: null,
        setSaleTypeSelection: vi.fn(),
        associatedStores: [],
        setAssociatedStores: vi.fn(),
        selectedStore: null,
        setSelectedStore: vi.fn(),
        storeOpenOrders: [],
        setStoreOpenOrders: vi.fn(),
        selectedOrder: null,
        setSelectedOrder: vi.fn(),
        activatingMessageIndex: 0,
        activatingMessages: ['Sincronizando...'],
        formatCurrency,
        parseCurrency,
        handleActivateStart: vi.fn(),
        confirmPayment: vi.fn(),
        loadData: vi.fn(),
        handlePinSubmit: vi.fn(),
        handleCreatePin: vi.fn(),
        handleCreatePinConfirm: vi.fn(),
        resetPaymentState: vi.fn(),
        initiatePayment: vi.fn(),
        dialog: dialogMock,
        isDemoMode: false,
        toggleDemoMode: vi.fn(),
        history: [],
        setHistory: vi.fn(),
        loadingHistory: false,
        setLoadingHistory: vi.fn(),
        historyPage: 1,
        setHistoryPage: vi.fn(),
        historyHasMore: false,
        setHistoryHasMore: vi.fn(),
        couponCode: '',
        setCouponCode: vi.fn(),
        couponDiscount: 0,
        setCouponDiscount: vi.fn(),
        errorType: null,
        setErrorType: vi.fn(),
        isWhatsAppModalOpen,
        setWhatsAppModalOpen,
        isDeactivateModalOpen: false,
        setDeactivateModalOpen: vi.fn(),
        showSummaryModal: false,
        setShowSummaryModal: vi.fn(),
        showLogsModal: false,
        setShowLogsModal: vi.fn(),
        runTutorial: false,
        setRunTutorial: vi.fn(),
        tutorialSteps: [],
        getMockData: vi.fn(() => []),
        setIsPolling: vi.fn(),
        setPixCodeData: vi.fn(),
        setPixTxId: vi.fn(),
        isPolling: false,
        handleGoBack: vi.fn(),
        handleContinueFromAmount,
        resetFlow: vi.fn(() => setStep('home')),
        handleCopyToClipboard: vi.fn(),
      };
    },
  };
});

describe('Merchant POS native keyboard', () => {
  beforeEach(() => {
    hookConfig = { step: 'amount' };
    dialogMock.alert.mockClear();
    dialogMock.confirm.mockClear();
    dialogMock.prompt.mockClear();
    vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  test('mobile renders native amount input and formats currency while typing', () => {
    render(<MerchantPOSMobile onClose={vi.fn()} />);

    const amountInput = screen.getByLabelText('Valor a cobrar') as HTMLInputElement;
    expect(amountInput.value).toBe('0,00');

    fireEvent.change(amountInput, { target: { value: '1234' } });

    expect(amountInput.value).toBe('12,34');
    expect(screen.getByRole('button', { name: /Cobrar R\$ 12,34/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '1' })).toBeNull();
  });

  test('desktop renders native inputs for amount, split and simulator without keypad text', () => {
    hookConfig = { step: 'amount' };
    const desktop = render(<MerchantPOSDesktop onClose={vi.fn()} />);

    expect((screen.getByLabelText('Valor a cobrar') as HTMLInputElement).value).toBe('0,00');
    expect(screen.queryByText('Use o teclado numérico ou clique acima')).toBeNull();

    desktop.unmount();

    hookConfig = { step: 'split_config', totalToSplit: 50, amount: '0,00' };
    const split = render(<MerchantPOSDesktop onClose={vi.fn()} />);
    expect(screen.getByLabelText('Valor da parcela')).toBeTruthy();
    split.unmount();

    hookConfig = { step: 'sales_simulator', simulatorAmount: '0,00', showHistory: false };
    const simulator = render(<MerchantPOSDesktop onClose={vi.fn()} />);
    expect(screen.getByLabelText('Valor da venda')).toBeTruthy();
    simulator.unmount();
  });

  test('desktop ignores global keyboard input when no native field is focused', () => {
    render(<MerchantPOSDesktop onClose={vi.fn()} />);

    const amountInput = screen.getByLabelText('Valor a cobrar') as HTMLInputElement;
    amountInput.blur();
    fireEvent.keyDown(window, { key: '9' });

    expect(amountInput.value).toBe('0,00');
  });

  test('split config enables and disables add button based on native input value', () => {
    hookConfig = { step: 'split_config', totalToSplit: 100, amount: '0,00' };
    render(<MerchantPOSMobile onClose={vi.fn()} />);

    const addButton = screen.getByRole('button', { name: 'Adicionar' }) as HTMLButtonElement;
    const splitInput = screen.getByLabelText('Valor da parcela') as HTMLInputElement;

    expect(addButton.disabled).toBe(true);

    fireEvent.change(splitInput, { target: { value: '500' } });

    expect(splitInput.value).toBe('5,00');
    expect(addButton.disabled).toBe(false);
  });

  test('mobile WhatsApp modal sanitizes phone input and sends raw digits', async () => {
    hookConfig = { step: 'success', isWhatsAppModalOpen: true };
    render(<MerchantPOSMobile onClose={vi.fn()} />);

    const phoneInput = screen.getByLabelText('NÃºmero com DDD') as HTMLInputElement;
    fireEvent.change(phoneInput, { target: { value: '11999999999abc' } });

    expect(phoneInput.value).toBe('(11) 99999-9999');

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('https://wa.me/5511999999999?text='),
      '_blank'
    );
  });

  test('pin screen keeps only digits, caps at 6 and shows lockout message', () => {
    hookConfig = {
      step: 'create_pin',
      newPin: '',
    };

    const { unmount } = render(<MerchantPOSMobile onClose={vi.fn()} />);

    const createPinInput = screen.getByLabelText('Criar PIN') as HTMLInputElement;
    const confirmButton = screen.getByRole('button', { name: 'Confirmar' }) as HTMLButtonElement;

    fireEvent.change(createPinInput, { target: { value: '12a34567' } });

    expect(createPinInput.value).toBe('123456');
    expect(confirmButton.disabled).toBe(false);

    fireEvent.change(createPinInput, { target: { value: '123' } });
    expect(confirmButton.disabled).toBe(true);

    unmount();

    hookConfig = {
      step: 'pin_lock',
      pinEntry: '',
      lockoutUntil: new Date(Date.now() + 60000),
      lockoutCountdown: 42,
    };

    render(<MerchantPOSMobile onClose={vi.fn()} />);
    expect(screen.getByText(/42s/)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Confirmar' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
