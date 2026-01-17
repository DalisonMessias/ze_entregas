import React, { useState, useEffect, useRef } from 'react';
import * as cloud from '../services/cloud';
import { Plus, Trash, Download, Loader2, QrCode, Search, Upload, Image as ImageIcon, FileText } from 'lucide-react';
import { Button } from './Button';
import { useDialog } from '../utils/dialogService';
import QRious from 'qrious';
import { jsPDF } from "jspdf";

interface StoreTable {
    id: string;
    identifier: string;
    qr_code_url: string | null;
}

export const TablesManager: React.FC<{ storeId: string }> = ({ storeId }) => {
    const [tables, setTables] = useState<StoreTable[]>([]);
    const [loading, setLoading] = useState(true);
    const [newTableIdentifier, setNewTableIdentifier] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [creating, setCreating] = useState(false);
    const [generatingPdf, setGeneratingPdf] = useState(false);

    // Customização do QR Code
    const [storeProfile, setStoreProfile] = useState<{ avatar_url: string | null; store_logo_url: string | null; name: string } | null>(null);
    const [customHeaderImage, setCustomHeaderImage] = useState<string | null>(() => {
        // Persistência local da imagem customizada
        return localStorage.getItem(`qr_custom_logo_${storeId}`);
    });

    const { confirm, alert } = useDialog();

    // Referência oculta para geração do QR Code
    const qrCanvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        loadTables();
        loadStoreProfile();
    }, [storeId]);

    const loadStoreProfile = async () => {
        const profile = await cloud.getStoreProfile(storeId);
        setStoreProfile(profile);
    };

    const loadTables = async () => {
        setLoading(true);
        try {
            const data = await cloud.getStoreTables(storeId);
            setTables(data);
        } catch (error) {
            // console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleHeaderImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                setCustomHeaderImage(base64);
                localStorage.setItem(`qr_custom_logo_${storeId}`, base64);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveCustomImage = () => {
        setCustomHeaderImage(null);
        localStorage.removeItem(`qr_custom_logo_${storeId}`);
    };

    const handleCreateTable = async () => {
        if (!newTableIdentifier.trim()) return;

        setCreating(true);
        try {
            let qrUrl = null;

            // 1. Gerar QR Code no Canvas
            if (qrCanvasRef.current) {
                const qr = new QRious({
                    element: qrCanvasRef.current,
                    value: JSON.stringify({
                        action: 'open_table',
                        store_id: storeId,
                        table_identifier: newTableIdentifier
                    }),
                    size: 500,
                    level: 'H'
                });

                // 2. Converter Canvas para Blob
                const blob = await new Promise<Blob | null>(resolve => qrCanvasRef.current?.toBlob(resolve, 'image/png'));

                if (blob) {
                    // 3. Upload para Storage
                    const fileName = `qr_${Date.now()}_${newTableIdentifier.replace(/\s+/g, '_')}.png`;
                    qrUrl = await cloud.uploadQRCode(blob, fileName);
                }
            }

            // 4. Salvar no Banco
            await cloud.createTable(newTableIdentifier, qrUrl);

            setNewTableIdentifier('');
            await loadTables();
            await alert({ title: 'Sucesso', message: 'Mesa criada com QR Code!' });

        } catch (error) {
            // console.error(error);
            await alert({ title: 'Erro', message: 'Falha ao criar mesa.' });
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteTable = async (table: StoreTable) => {
        const result = await confirm({
            title: 'Excluir Mesa',
            message: `Tem certeza que deseja excluir a mesa "${table.identifier}"?`,
            confirmButtonText: 'Excluir'
        });

        if (!result) return;

        try {
            await cloud.deleteTable(table.id);
            await loadTables();
        } catch {
            await alert({ title: 'Erro', message: 'Falha ao excluir mesa.' });
        }
    };

    // Função centralizada para gerar o Canvas da etiqueta (10x10cm em proporção)
    const generateLabelCanvas = async (table: StoreTable): Promise<HTMLCanvasElement | null> => {
        const canvas = document.createElement('canvas');
        // Usamos 1200x1200px para garantir alta qualidade na impressão de 10x10cm (aprox 300 DPI)
        canvas.width = 1200;
        canvas.height = 1200;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        // Fundo Branco
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 1. HEADER (Preto) - 20% da altura (240px)
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, 240);

        const topImageUrl = customHeaderImage || storeProfile?.store_logo_url || storeProfile?.avatar_url;

        // Imagens
        const topImg = new Image();
        const qrImg = new Image();
        const platformLogoImg = new Image();

        const zeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 77689.21 19721.29">
            <g><path fill="#e50039" d="M5845.8 0l8030.34 0c3215.16,0 5845.8,2630.64 5845.8,5845.8l0 8029.7c0,3215.16 -2630.64,5845.8 -5845.8,5845.8l-8030.34 0c-3215.16,0 -5845.8,-2630.64 -5845.8,-5845.8l0 -8029.7c0,-3215.16 2630.64,-5845.8 5845.8,-5845.8z"/><path fill="#e50039" d="M41662.42 10117.97c235.31,0 364.29,-128.37 364.29,-363.65l0 -1059.56c0,-235.31 -128.37,-363.67 -364.29,-363.67l-2022.86 0 0 -974 2161.9 0c246.01,0 363.67,-117.67 363.67,-363.67l0 -1134.42c0,-246.01 -117.67,-363.67 -363.67,-363.67l-3917.35 0c-246.01,0 -364.29,117.67 -364.29,363.67l0 6849.97c0,246.01 117.67,363.67 364.29,363.67l3970.83 0c246.01,0 363.67,-117.67 363.67,-363.67l0 -1134.42c0,-246.01 -117.67,-363.67 -363.67,-363.67l-2215.38 0 0 -1091.64 2022.86 0 0 -1.26zm6293.16 -1038.13c0,-1262.79 -470.64,-1990.75 -1616.38,-1990.75 -685.19,0 -1177.23,320.89 -1412.53,641.79l-74.88 -267.41c-42.78,-171.15 -128.37,-267.41 -374.99,-267.41l-1187.9 0c-224.63,0 -331.59,106.96 -331.59,331.59l0 5212.19c0,224.63 106.96,331.59 331.59,331.59l1348.35 0c224.63,0 331.59,-106.96 331.59,-331.59l0 -3028.89c0,-546.14 139.04,-845.63 546.14,-845.63 331.59,0 417.16,224.63 417.16,695.89l0 3178.66c0,224.63 106.96,331.59 331.59,331.59l1348.35 0c235.31,0 342.27,-106.96 342.27,-331.59l0 -3660.62 1.24 0.59zm3671.32 96.26c224.63,0 331.59,-106.96 331.59,-332.21l0 -974c0,-224.63 -106.96,-332.21 -331.59,-332.21l-653.11 0 0 -1220.01c0,-213.93 -106.96,-320.89 -342.27,-320.89l-1262.76 0c-235.31,0 -342.27,106.96 -342.27,320.89l0 1220.01 -288.79 0c-224.63,0 -320.89,96.26 -320.89,320.89l0 995.38c0,224.63 96.26,320.89 320.89,320.89l278.11 0 0 2129.77c0,1391.77 502.72,1841.01 1787.5,1841.01 352.97,0 663.81,-32.08 867.03,-85.56 192.53,-53.48 288.79,-139.04 288.79,-342.27l0 -952.6c0,-224.63 -106.96,-320.89 -310.19,-320.89 -74.88,0 -203.23,10.7 -256.71,10.7 -320.89,0 -407.1,-106.96 -407.1,-481.34l0 -1798.2 642.4 0 -0.64 0.64zm1305.57 -1980.05c-224.63,0 -331.59,106.96 -331.59,331.59l0 5212.19c0,224.63 106.96,331.59 331.59,331.59l1348.35 0c224.63,0 331.59,-106.96 331.59,-331.59l0 -2568.98c0,-599.6 288.79,-941.87 845.63,-941.87 171.15,0 267.41,32.08 407.1,32.08 171.15,0 288.79,-64.18 288.79,-288.79l0 -1508.8c0,-235.31 -85.56,-331.59 -342.27,-331.59 -610.32,0 -1038.16,459.94 -1230.71,845.63l-74.88 -471.26c-32.08,-213.93 -106.96,-310.19 -363.67,-310.19l-1209.31 0 -0.62 -0.02zm6743.03 4473.5c-727.97,0 -1048.86,-203.23 -1134.42,-802.85l2675.94 0c256.71,0 374.38,-96.26 374.38,-363.67l0 -620.98c0,-1808.93 -770.75,-2793.6 -2450.69,-2793.6 -1691.26,0 -2590.38,931.19 -2590.38,3018.21 0,2183.28 963.3,3071.72 2932.65,3071.72 674.48,0 1241.39,-128.37 1637.78,-299.49 192.53,-96.26 288.79,-192.53 256.71,-427.86l-106.96 -760.07c-32.08,-224.63 -192.53,-310.19 -417.16,-235.31 -299.49,106.96 -727.97,213.93 -1177.23,213.93l-0.62 -0.02zm-514.06 -3125.15c417.16,0 599.62,320.89 599.62,1016.78l0 117.67 -1273.49 0c53.48,-856.33 224.63,-1134.42 674.48,-1134.42l-0.62 -0.02zm6143.41 1145.12c0,749.34 -160.45,1113.02 -556.84,1113.02 -407.1,0 -524.74,-363.67 -524.74,-1113.02 0,-738.67 128.37,-1091.64 524.74,-1091.64 395.75,0 556.84,352.97 556.84,1091.64zm1958.67 -2161.9c0,-224.63 -106.96,-331.59 -342.27,-331.59l-1102.34 0c-235.31,0 -331.59,96.26 -374.99,267.41l-64.18 235.31c-224.63,-310.19 -653.11,-599.62 -1284.17,-599.62 -1166.52,0 -1894.49,695.89 -1894.49,2590.38 0,1873.06 653.11,2579.65 1883.79,2579.65 621,0 1048.86,-192.53 1273.49,-513.42l0 224.63c0,599.62 -300.13,856.33 -1027.46,856.33 -514.04,0 -995.38,-128.37 -1262.79,-203.23 -246.01,-74.88 -385.08,10.7 -417.16,235.31l-106.96 802.85c-32.08,246.01 64.18,332.21 256.71,427.86 352.97,160.45 1123.74,256.71 1776.83,256.71 1819.63,0 2686.64,-717.29 2686.64,-2311.65l0 -4516.92 -0.64 0zm5533.7 1466.02c0,-1305.57 -727.97,-1894.49 -2365.75,-1894.49 -695.86,0 -1444.59,139.04 -1894.47,310.19 -192.53,64.18 -278.11,181.83 -246.01,396.4l128.37 888.41c32.08,224.63 192.53,299.49 417.16,235.31 300.13,-96.26 760.07,-235.31 1273.47,-235.31 514.04,0 738.67,128.37 738.67,481.96l0 256.71c-1840.99,32.08 -2943.33,267.41 -2943.33,1926.55 0,1230.71 695.89,1776.83 1595,1776.83 781.42,0 1219.98,-278.11 1455.29,-566.9l64.18 235.31c42.78,171.15 139.04,267.41 374.99,267.41l1059.56 0c235.31,0 342.27,-106.96 342.27,-331.59l0 -3746.18 0.59 -0.59zm-1947.97 2022.83c0,459.94 -106.96,770.75 -566.9,770.75 -320.89,0 -459.94,-224.63 -459.94,-578.22 0,-578.22 246.01,-695.89 1027.46,-717.29l0 524.74 -0.62 0.02zm6839.3 395.75c0,-1102.34 -566.9,-1487.39 -1401.83,-1851.69 -545.5,-235.31 -899.11,-363.67 -899.11,-609.68 0,-224.63 235.31,-288.79 610.32,-288.79 352.97,0 717.29,74.88 920.52,128.37 224.63,53.48 363.67,-32.08 385.08,-235.31l96.26 -867.03c32.08,224.63 -42.78,-320.89 -246.01,-395.75 -310.19,-106.96 -920.52,-203.23 -1520.12,-203.23 -1466.02,0 -2226.09,513.42 -2226.09,1766.15 0,1326.95 738.67,1615.74 1498.74,1926.55 514.04,213.93 802.85,320.89 802.85,546.14 0,213.93 -320.89,267.41 -717.29,267.41 -427.86,0 -813.55,-74.88 -1027.46,-149.75 -246.01,-74.88 -385.08,21.4 -406.45,224.63l-96.26 877.71c-32.08,224.63 42.78,320.89 246.01,395.75 352.97,117.67 952.6,235.31 1627.08,235.31 1209.31,0 2354.43,-288.79 2354.43,-1766.15l-0.67 -0.64z"/></g>
            <g><path fill="#231f20" d="M23595.86 12707.73c0,246.01 117.67,363.67 364.29,363.67l4366.58 0c235.31,0 352.97,-117.67 352.97,-363.67l0 -1198.6c0,-246.01 -117.67,-363.67 -352.97,-363.67l-2279.57 0 2365.13 -3596.43c106.96,-160.45 181.83,-342.27 181.83,-567.52l0 -1123.74c0,-246.01 -117.67,-363.67 -363.67,-363.67l-4152.66 0c-246.01,0 -363.67,117.67 -363.67,363.67l0 1198.6c0,246.01 117.67,363.67 363.67,363.67l2076.34 0 -2375.83 3596.43c-106.96,160.45 -181.83,342.27 -181.83,566.9l0 1123.74 -0.62 0.62zm8851.43 -1038.18c-727.97,0 -1048.86,-203.23 -1134.42,-802.85l2675.94 0c256.71,0 374.38,-96.26 374.38,-363.67l0 -620.98c0,-1808.93 -770.75,-2793.6 -2450.69,-2793.6 -1691.26,0 -2590.35,931.19 -2590.35,3018.21 0,2183.28 963.27,3071.72 2932.63,3071.72 674.48,0 1241.39,-128.37 1637.78,-299.49 192.53,-96.26 288.79,-192.53 256.71,-427.86l-106.96 -760.07c-32.08,-224.63 -192.53,-310.19 -417.16,-235.31 -299.49,106.96 -727.97,213.93 -1177.23,213.93l-0.62 -0.02zm-514.04 -3125.15c417.16,0 599.62,320.89 599.62,1016.78l0 117.67 -1273.49 0c53.48,-856.33 224.63,-1134.42 674.48,-1134.42l-0.62 -0.02zm-877.74 -2097.72c-53.48,160.45 10.7,267.41 203.23,267.41l813.55 0c203.23,0 310.19,-42.78 439.18,-181.83l781.45 -813.55c117.67,-128.37 85.56,-352.97 -128.37,-352.97l-1455.96 0c-203.23,0 -288.79,85.56 -342.27,235.31l-310.19 845.63 -0.62 0z"/></g>
            <path fill="#ffffff" d="M10240.99 10130.51l0 3809.72 816.14 -465.19c170.05,-96.98 388.6,-37.29 485.43,132.93 96.98,170.22 37.12,388.26 -133.1,485.24l-898.76 512.35c-182.42,103.99 -387.93,161.85 -592.25,166.03 -7.21,1.17 -20.24,1.83 -33.13,1.83 -13.03,0 -26.09,-0.67 -33.1,-1.83 -204.15,-4.02 -410.5,-62.04 -592.75,-166.2l-3145.39 -1797.35c-389.43,-222.56 -628.54,-638.08 -628.54,-1086.19l0 -3594.67c0,-447.95 239.28,-863.8 628.54,-1086.36l3145.39 -1797.35c190.46,-108.84 406.31,-167.2 625.85,-167.2 219.4,0 435.42,58.52 625.88,167.2l3145.39 1797.35c389.26,222.56 628.54,638.41 628.54,1086.36l0 898.59c0,195.95 -159.69,355.83 -355.66,355.83 -196.14,0 -355.99,-159.69 -355.99,-355.83l0 -808.13 -1463.09 839.4c-15.05,11.03 -35.93,23.23 -52.84,30.25l-1816.56 1043.22zm2340.45 1986.78l1545.35 -1545.68c138.78,-138.78 364.7,-138.95 503.48,0.17 138.28,138.45 138.45,364.7 0,503.15l-1797.35 1797.16c-138.78,138.78 -364.51,138.78 -503.31,0l-898.73 -898.76c-138.62,-138.78 -138.45,-364.67 0.17,-503.29 138.78,-138.62 364.67,-138.62 503.29,0l647.11 647.26zm-3051.91 -1986.78l-3332.33 -1912.87 0 3504.21c0,192.62 102.33,372.71 269.86,468.36l3062.47 1749.53 0 -3809.22zm1661.06 -1365.59l-3327.31 -1903.86 -1303.07 744.42 3325.12 1908.85 1305.26 -749.42zm715.15 -410.33l1304.74 -749.11 -3052.41 -1744.01c-82.95,-47.49 -177.09,-73.55 -272.74,-73.55 -95.64,0 -189.77,26.06 -272.71,73.55l-1032.69 589.92 3325.81 1903.19z"/></svg>`;
        platformLogoImg.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(zeSvg);

        qrImg.crossOrigin = "anonymous";
        qrImg.src = table.qr_code_url || '';

        if (topImageUrl) {
            topImg.crossOrigin = "anonymous";
            topImg.src = topImageUrl;
        }

        // Aguarda carregamento
        await Promise.all([
            new Promise(resolve => {
                if (!topImageUrl) return resolve(null);
                topImg.onload = resolve;
                topImg.onerror = () => resolve(null);
            }),
            new Promise(resolve => {
                qrImg.onload = resolve;
                qrImg.onerror = () => resolve(null);
            }),
            new Promise(resolve => {
                platformLogoImg.onload = resolve;
                platformLogoImg.onerror = () => resolve(null);
            })
        ]);

        // 2. DESENHAR IMAGEM TOPO
        if (topImageUrl && topImg.complete && topImg.naturalWidth > 0) {
            const maxWidth = 800;
            const maxHeight = 160;
            let dW = topImg.width;
            let dH = topImg.height;
            const ratio = Math.min(maxWidth / dW, maxHeight / dH);
            dW *= ratio;
            dH *= ratio;
            ctx.drawImage(topImg, (canvas.width - dW) / 2, (240 - dH) / 2, dW, dH);
        } else {
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 60px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText((storeProfile?.name || 'SUA LOJA').toUpperCase(), canvas.width / 2, 140);
        }

        // 3. MEIO - IDENTIFICADOR + QR CODE 
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 100px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(table.identifier.toUpperCase(), canvas.width / 2, 400);

        const qrS = 500;
        if (qrImg.complete && qrImg.naturalWidth > 0) {
            ctx.drawImage(qrImg, (canvas.width - qrS) / 2, 450, qrS, qrS);
        }

        ctx.fillStyle = '#666666';
        ctx.font = '30px sans-serif';
        ctx.fillText("Escaneie para acessar o cardápio", canvas.width / 2, 1000);

        // 4. RODAPÉ - LOGO PLATAFORMA (20% altura = 240px)
        ctx.strokeStyle = '#EEEEEE';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(200, 1050);
        ctx.lineTo(1000, 1050);
        ctx.stroke();

        if (platformLogoImg.complete && platformLogoImg.naturalWidth > 0) {
            const h = 60;
            const w = h * (platformLogoImg.width / platformLogoImg.height);
            ctx.drawImage(platformLogoImg, (canvas.width - w) / 2, 1100, w, h);
        }

        return canvas;
    };

    const handleDownloadQR = async (table: StoreTable) => {
        if (!table.qr_code_url) return;
        const canvas = await generateLabelCanvas(table);
        if (!canvas) return;

        const link = document.createElement('a');
        link.download = `QR_${table.identifier.replace(/\s+/g, '_')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    const handleDownloadAllPDF = async () => {
        if (tables.length === 0) return;
        setGeneratingPdf(true);
        try {
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'cm',
                format: 'a4'
            });

            // Grid: 2 Colunas x 3 Linhas
            // A4: 21cm x 29.7cm
            // Tamanho etiqueta: 9.4cm x 9.4cm (quase 10x10, mas cabe real na folha com margem)
            const size = 9.4;
            const marginX = (21 - (2 * size)) / 3; // Margem entre colunas e bordas
            const marginY = (29.7 - (3 * size)) / 4; // Margem entre linhas e bordas

            for (let i = 0; i < tables.length; i++) {
                if (i > 0 && i % 6 === 0) {
                    doc.addPage();
                }

                const table = tables[i];
                const canvas = await generateLabelCanvas(table);
                if (canvas) {
                    const imgData = canvas.toDataURL('image/png');

                    const col = i % 2;
                    const row = Math.floor((i % 6) / 2);

                    const x = marginX + (col * (size + marginX));
                    const y = marginY + (row * (size + marginY));

                    doc.addImage(imgData, 'PNG', x, y, size, size);
                }
            }

            doc.save(`QR_CODES_A4_${new Date().getTime()}.pdf`);
        } catch (err) {
            // console.error(err);
            alert({ title: 'Erro', message: 'Falha ao gerar PDF.' });
        } finally {
            setGeneratingPdf(false);
        }
    };

    const filteredTables = tables.filter(t =>
        t.identifier.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-900 pb-20">
            {/* Canvas Oculto para geração inicial do Storage */}
            <canvas ref={qrCanvasRef} style={{ display: 'none' }} />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-3xl font-black dark:text-white flex items-center gap-3">
                        <QrCode className="w-10 h-10 text-brand-600" />
                        Gestão de Mesas
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">Configure suas mesas e gere etiquetas de 10x10cm para impressão.</p>
                </div>

                <Button
                    variant="outline"
                    onClick={handleDownloadAllPDF}
                    disabled={generatingPdf || tables.length === 0}
                    className="rounded-2xl border-2 font-bold px-6"
                >
                    {generatingPdf ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <FileText className="w-5 h-5 mr-2" />}
                    Baixar Todos em PDF (A4)
                </Button>
            </div>

            {/* Configuração de Imagem Personalizada */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-[40px] shadow-sm border border-gray-100 dark:border-gray-700 mb-8">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                    <div className="w-32 h-32 bg-gray-100 dark:bg-gray-700 rounded-3xl flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-200 dark:border-gray-600 flex-shrink-0 animate-in fade-in zoom-in duration-500">
                        {customHeaderImage ? (
                            <img src={customHeaderImage} alt="Custom Header" className="w-full h-full object-contain" />
                        ) : storeProfile?.store_logo_url ? (
                            <img src={storeProfile.store_logo_url} alt="Logo Loja" className="w-full h-full object-cover" />
                        ) : storeProfile?.avatar_url ? (
                            <img src={storeProfile.avatar_url} alt="Avatar Loja" className="w-full h-full object-cover" />
                        ) : (
                            <ImageIcon className="w-12 h-12 text-gray-300" />
                        )}
                    </div>
                    <div className="text-center md:text-left flex-1">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Personalizar Cabeçalho do QR Code</h3>
                        <p className="text-sm text-gray-500 mb-6 max-w-xl">
                            Esta imagem aparecerá no topo de todas as suas etiquetas. A configuração é salva automaticamente no seu computador.
                            <br />
                            <span className="text-brand-600 font-bold block mt-2">Dica: Use logos em PNG com fundo transparente.</span>
                        </p>
                        <div className="flex flex-wrap justify-center md:justify-start gap-4">
                            <label className="cursor-pointer bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-2xl text-sm font-black flex items-center transition-all shadow-lg hover:shadow-brand-500/25">
                                <Upload className="w-4 h-4 mr-2" />
                                Escolher Logo
                                <input type="file" accept="image/*" onChange={handleHeaderImageUpload} className="hidden" />
                            </label>
                            {customHeaderImage && (
                                <button
                                    onClick={handleRemoveCustomImage}
                                    className="px-6 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl text-sm font-bold hover:bg-red-100 transition-colors"
                                >
                                    Remover Customização
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Ações: Criar + Busca */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-8 rounded-[40px] shadow-sm border border-gray-100 dark:border-gray-700">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-4 block">Nova Mesa</label>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <input
                            type="text"
                            placeholder="Identificador (Ex: Mesa 10)"
                            value={newTableIdentifier}
                            onChange={e => setNewTableIdentifier(e.target.value)}
                            className="flex-1 bg-gray-50 dark:bg-gray-900 border-2 border-transparent rounded-[24px] p-5 font-bold outline-none focus:border-brand-500 dark:text-white transition-all"
                            onKeyDown={e => e.key === 'Enter' && handleCreateTable()}
                        />
                        <Button
                            onClick={handleCreateTable}
                            disabled={creating || !newTableIdentifier.trim()}
                            className="rounded-[24px] px-10 h-[64px] font-black text-lg"
                        >
                            {creating ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Plus className="w-6 h-6 mr-2" /> Criar</>}
                        </Button>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-8 rounded-[40px] shadow-sm border border-gray-100 dark:border-gray-700">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-4 block">Buscar</label>
                    <div className="relative">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Nome da mesa..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-gray-900 border-2 border-transparent rounded-[24px] p-5 pl-16 font-bold outline-none focus:border-brand-500 dark:text-white transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Listagem (Grid sem cortes) */}
            <div className="pb-40">
                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-brand-600" /></div>
                ) : filteredTables.length === 0 ? (
                    <div className="text-center py-24 bg-white dark:bg-gray-800 rounded-[60px] border-4 border-dashed border-gray-100 dark:border-gray-700">
                        <QrCode className="w-20 h-20 text-gray-200 mx-auto mb-6" />
                        <h3 className="text-2xl font-black text-gray-300">Nenhuma mesa encontrada</h3>
                        <p className="text-gray-400 mt-2">Crie sua primeira mesa no painel superior.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
                        {filteredTables.map(table => (
                            <div key={table.id} className="bg-white dark:bg-gray-800 p-6 rounded-[32px] shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center hover:shadow-xl transition-all duration-300">
                                <span className="bg-gray-100 dark:bg-gray-700 px-6 py-2 rounded-full text-sm font-black text-gray-500 dark:text-gray-300 mb-6 uppercase tracking-widest">
                                    {table.identifier}
                                </span>

                                <div className="w-full aspect-square bg-white dark:bg-white rounded-[24px] p-4 mb-6 flex items-center justify-center border-2 border-gray-50 shadow-inner overflow-visible">
                                    {table.qr_code_url ? (
                                        <img
                                            src={table.qr_code_url}
                                            alt={`QR ${table.identifier}`}
                                            className="w-full h-full object-contain mix-blend-multiply"
                                        />
                                    ) : (
                                        <Loader2 className="w-8 h-8 animate-spin text-gray-200" />
                                    )}
                                </div>

                                <div className="flex gap-4 w-full">
                                    <Button
                                        variant="secondary"
                                        fullWidth
                                        onClick={() => handleDownloadQR(table)}
                                        className="rounded-[16px] font-black h-[50px] text-sm"
                                        disabled={!table.qr_code_url}
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Imagem
                                    </Button>
                                    <button
                                        onClick={() => handleDeleteTable(table)}
                                        title="Excluir"
                                        className="p-3 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-[16px] hover:bg-red-500 hover:text-white transition-all"
                                    >
                                        <Trash className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
