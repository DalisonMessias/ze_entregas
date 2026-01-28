import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Copy, Check, Info, Smartphone, ExternalLink, MessageCircle, X } from 'lucide-react';
import { BaseModal } from './BaseModal';
import { Button } from './Button';

// Nota: O usuário solicitou o uso da biblioteca QRious. 
// Como ela é uma biblioteca externa que gera em um canvas, usaremos um ref.
declare const QRious: any;

interface PixPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    pixData: {
        key: string;
        name?: string;
        city?: string;
    };
    amount: number;
    orderId: string;
    storePhone?: string;
}

export const PixPaymentModal: React.FC<PixPaymentModalProps> = ({
    isOpen,
    onClose,
    pixData,
    amount,
    orderId,
    storePhone
}) => {
    const [copied, setCopied] = useState(false);
    const [qrError, setQrError] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Função de geração de payload PIX seguindo padrões do Banco Central
    const gerarPayloadPix = (valor: number) => {
        const keyPix = pixData.key;
        const citypix = pixData.city || 'Brazil';
        const name = pixData.name || 'LOJA';

        const ID_PAYLOAD_FORMAT_INDICATOR = "00";
        const ID_MERCHANT_ACCOUNT_INFORMATION = "26";
        const ID_MERCHANT_ACCOUNT_INFORMATION_GUI = "00";
        const ID_MERCHANT_ACCOUNT_INFORMATION_KEY = "01";
        const ID_MERCHANT_CATEGORY_CODE = "52";
        const ID_TRANSACTION_CURRENCY = "53";
        const ID_TRANSACTION_AMOUNT = "54";
        const ID_COUNTRY_CODE = "58";
        const ID_MERCHANT_NAME = "59";
        const ID_MERCHANT_CITY = "60";
        const ID_ADDITIONAL_DATA_FIELD_TEMPLATE = "62";
        const ID_ADDITIONAL_DATA_FIELD_TEMPLATE_TXID = "05";
        const ID_CRC16 = "63";

        function removerCaracteresEspeciais(str: string) {
            return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9\s]/g, "");
        }

        function _getValue(id: string, value: string) {
            const size = String(value.length).padStart(2, "0");
            return id + size + value;
        }

        function _getMechantAccountInfo() {
            const gui = _getValue(ID_MERCHANT_ACCOUNT_INFORMATION_GUI, "br.gov.bcb.pix");
            const key = _getValue(ID_MERCHANT_ACCOUNT_INFORMATION_KEY, keyPix);
            return _getValue(ID_MERCHANT_ACCOUNT_INFORMATION, gui + key);
        }

        function _getAdditionalDataFieldTemplate() {
            const randomDigits = Math.floor(10000 + Math.random() * 90000);
            const txid = _getValue(ID_ADDITIONAL_DATA_FIELD_TEMPLATE_TXID, "TX" + String(randomDigits).padStart(5, '0'));
            return _getValue(ID_ADDITIONAL_DATA_FIELD_TEMPLATE, txid);
        }

        function calcularCRC16(payload: string) {
            let crc = 0xFFFF;
            let poly = 0x1021;
            let str = payload + "6304";
            for (let i = 0; i < str.length; i++) {
                crc ^= str.charCodeAt(i) << 8;
                for (let j = 0; j < 8; j++) {
                    crc = (crc & 0x8000) ? ((crc << 1) ^ poly) : (crc << 1);
                }
            }
            return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
        }

        const cleanedName = removerCaracteresEspeciais(name).substring(0, 25);
        const cleanedCity = removerCaracteresEspeciais(citypix).substring(0, 15);

        let payload =
            _getValue(ID_PAYLOAD_FORMAT_INDICATOR, "01") +
            _getMechantAccountInfo() +
            _getValue(ID_MERCHANT_CATEGORY_CODE, "0000") +
            _getValue(ID_TRANSACTION_CURRENCY, "986") +
            _getValue(ID_TRANSACTION_AMOUNT, valor.toFixed(2)) +
            _getValue(ID_COUNTRY_CODE, "BR") +
            _getValue(ID_MERCHANT_NAME, cleanedName) +
            _getValue(ID_MERCHANT_CITY, cleanedCity) +
            _getAdditionalDataFieldTemplate();

        const crc16 = calcularCRC16(payload);
        return payload + ID_CRC16 + "04" + crc16;
    };

    const pixPayload = gerarPayloadPix(amount);

    useEffect(() => {
        if (isOpen && canvasRef.current) {
            try {
                // Carregar script QRious se necessário ou assumir que está disponível
                const generateQR = () => {
                    new QRious({
                        element: canvasRef.current,
                        value: pixPayload,
                        size: 250,
                        level: 'M'
                    });
                };

                if (typeof QRious === 'undefined') {
                    const script = document.createElement('script');
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js';
                    script.async = true;
                    script.onload = generateQR;
                    document.body.appendChild(script);
                } else {
                    generateQR();
                }
            } catch (err) {
                console.error('Erro ao gerar QR Code:', err);
                setQrError(true);
            }
        }
    }, [isOpen, pixPayload]);

    const handleCopy = () => {
        navigator.clipboard.writeText(pixPayload);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSendComprovante = () => {
        if (!storePhone) return;
        const msg = `Olá! Acabei de fazer o pagamento via PIX do pedido #${orderId.slice(0, 8).toUpperCase()}.\n\nValor: R$ ${amount.toFixed(2).replace('.', ',')}\n\nSeguem os dados do comprovante em anexo.`;
        const url = `https://wa.me/55${storePhone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Pagamento via PIX"
            icon={<QrCode className="w-6 h-6 text-brand-600" />}
        >
            <div className="space-y-6 flex flex-col items-center">
                <div className="text-center space-y-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Escaneie o QR Code abaixo com o app do seu banco</p>
                    <div className="text-3xl font-black text-gray-900 dark:text-white">R$ {amount.toFixed(2).replace('.', ',')}</div>
                </div>

                <div className="p-4 bg-white rounded-3xl border-4 border-brand-50 shadow-inner flex justify-center items-center min-h-[280px]">
                    {qrError ? (
                        <div className="text-center text-red-500">
                            <Info className="w-10 h-10 mx-auto mb-2" />
                            <p className="text-xs">Erro ao gerar QR Code. Use o Copia e Cola abaixo.</p>
                        </div>
                    ) : (
                        <canvas ref={canvasRef} id="qrcode" />
                    )}
                </div>

                <div className="w-full space-y-3">
                    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-widest">
                            <span>PIX Copia e Cola</span>
                            {copied && <span className="text-green-600 flex items-center gap-1 animate-in slide-in-from-right-2"><Check className="w-3 h-3" /> Copiado</span>}
                        </div>
                        <div className="flex flex-col gap-2">
                            <textarea
                                readOnly
                                value={pixPayload}
                                className="w-full text-[10px] font-mono text-gray-600 dark:text-gray-300 break-all leading-relaxed bg-gray-100 dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700 resize-none h-20 focus:outline-none"
                            />
                            <Button
                                onClick={handleCopy}
                                fullWidth
                                className="bg-brand-600 text-white rounded-xl py-3 hover:bg-brand-700 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                            >
                                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                {copied ? 'Copiado!' : 'Copiar Código PIX'}
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Button
                            fullWidth
                            variant="outline"
                            onClick={handleSendComprovante}
                            className="rounded-2xl border-green-200 text-green-700 hover:bg-green-50 dark:border-green-900/30 dark:text-green-400 dark:hover:bg-green-900/20"
                        >
                            <MessageCircle className="w-4 h-4 mr-2" /> Enviar Comprovante
                        </Button>
                        <Button
                            fullWidth
                            onClick={onClose}
                            className="rounded-2xl"
                        >
                            Concluir Pedido
                        </Button>
                    </div>
                </div>

                <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/30 text-xs text-blue-700 dark:text-blue-300">
                    <Info className="w-4 h-4 flex-shrink-0" />
                    <p>Após realizar o pagamento, recomendamos enviar o comprovante via WhatsApp para agilizar o preparo do seu pedido.</p>
                </div>
            </div>
        </BaseModal>
    );
};
