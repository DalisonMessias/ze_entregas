import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Button } from './Button';
import { useDialog } from '../utils/dialogService';
import { Loader2, Upload, FileSpreadsheet, Check, AlertTriangle, Download, ArrowRight, Settings } from 'lucide-react';
import * as cloud from '../services/cloud';
import { StoreProduct } from '../types';
import { CustomInput } from './CustomInput';
import { ProfileValidationAlert } from './ProfileValidationAlert';
import { validateStoreProfile } from '../utils/profileValidation';

type ImportMode = 'create_new' | 'update_existing' | 'skip_duplicates';

interface ColumnMapping {
    fileHeader: string;
    internalField: string;
}

const INTERNAL_FIELDS = [
    { label: 'Nome do Produto', value: 'name', required: true },
    { label: 'Preço', value: 'price', required: true },
    { label: 'Descrição', value: 'description', required: false },
    { label: 'Código Interno', value: 'internal_code', required: false },
    { label: 'Categoria', value: 'category', required: false },
    { label: 'Estoque', value: 'stock_quantity', required: false },
    { label: 'URL Imagem', value: 'image_url', required: false },
    { label: 'Observações', value: 'observations', required: false },
];

export const ProductImportExport: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [headers, setHeaders] = useState<string[]>([]);
    const [dataPreview, setDataPreview] = useState<any[]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [importMode, setImportMode] = useState<ImportMode>('create_new');
    const [originPrefix, setOriginPrefix] = useState('');
    const [processing, setProcessing] = useState(false);
    const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Upload, 2: Map, 3: Result
    const [results, setResults] = useState({ success: 0, failed: 0, skipped: 0, total: 0 });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const { alert, confirm } = useDialog();
    const [profileValid, setProfileValid] = useState<boolean | null>(null);
    const [missingFields, setMissingFields] = useState<string[]>([]);

    useEffect(() => {
        // Validar perfil ao carregar
        const checkProfile = async () => {
            try {
                const profile = await cloud.getMyPartnerProfile();
                const validation = validateStoreProfile(profile);
                setProfileValid(validation.isValid);
                setMissingFields(validation.missingFields);
            } catch (e) {
                setProfileValid(false);
                setMissingFields(['Erro ao carregar perfil']);
            }
        };
        checkProfile();
    }, []);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (!selected) return;

        setFile(selected);
        setProcessing(true);

        try {
            const data = await selected.arrayBuffer();
            const workbook = XLSX.read(data);
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

            if (jsonData.length === 0) throw new Error("Arquivo vazio");

            const headers = jsonData[0] as string[];
            const rows = jsonData.slice(1);

            setHeaders(headers);
            setDataPreview(rows); // Store raw rows for preview

            // Auto-map strategy
            const newMapping: Record<string, string> = {};
            headers.forEach(header => {
                const lower = header.toLowerCase();
                const match = INTERNAL_FIELDS.find(f => lower.includes(f.value) || lower.includes(f.label.toLowerCase()));
                if (match) {
                    newMapping[match.value] = header;
                }
            });
            setMapping(newMapping);
            setStep(2);

        } catch (error) {
            // console.error(error);
            await alert({ title: 'Erro', message: 'Falha ao ler arquivo. Verifique se é um CSV ou Excel válido.' });
            setFile(null);
        } finally {
            setProcessing(false);
        }
    };

    const toggleMapping = (internalField: string, header: string) => {
        setMapping(prev => ({
            ...prev,
            [internalField]: header
        }));
    };

    const handleImport = async () => {
        const requiredMissing = INTERNAL_FIELDS.filter(f => f.required && !mapping[f.value]);
        if (requiredMissing.length > 0) {
            await alert({
                title: 'Campos Obrigatórios',
                message: `Mapeie os campos obrigatórios: ${requiredMissing.map(f => f.label).join(', ')}`
            });
            return;
        }

        if (importMode !== 'create_new' && !mapping['internal_code'] && !mapping['name']) {
            await alert({ title: 'Erro', message: 'Para atualizar ou ignorar duplicatas, é necessário mapear o "Código Interno" ou "Nome".' });
            return;
        }

        const confirmed = await confirm({
            title: 'Confirmar Importação',
            message: `Deseja importar ${dataPreview.length} produtos?`
        });
        if (!confirmed) return;

        setProcessing(true);
        let success = 0;
        let failed = 0;
        let skipped = 0;

        try {
            // Get existing products for comparison if needed
            let existingProducts: StoreProduct[] = [];
            if (importMode !== 'create_new') {
                existingProducts = await cloud.getStoreProducts();
            }

            // Process batch (simulate batch mainly due to cloud interface limit)
            for (const row of dataPreview) {
                try {
                    const productData: any = {
                        is_active: true,
                        store_id: '' // Will be filled by cloud function based on auth
                    };

                    // Map fields
                    Object.entries(mapping).forEach(([field, header]) => {
                        const colIndex = headers.indexOf(header);
                        if (colIndex !== -1) {
                            let value = row[colIndex];
                            if (field === 'price' || field === 'stock_quantity') {
                                // Clean number strings
                                if (typeof value === 'string') {
                                    value = value.replace('R$', '').replace('.', '').replace(',', '.').trim();
                                }
                                value = Number(value) || 0;
                            }
                            productData[field] = value;
                        }
                    });

                    // Handle Origin Prefix
                    if (originPrefix && productData.internal_code) {
                        productData.internal_code = `${originPrefix}-${productData.internal_code}`;
                    }
                    if (originPrefix) {
                        productData.origin_prefix = originPrefix;
                    }

                    // Duplication Logic
                    let exists = false;
                    let existingId = '';

                    if (importMode !== 'create_new') {
                        const found = existingProducts.find(p =>
                            (productData.internal_code && (p as any).internal_code === productData.internal_code) ||
                            p.name.toLowerCase() === productData.name?.toLowerCase()
                        );
                        if (found) {
                            exists = true;
                            existingId = found.id;
                        }
                    }

                    if (exists) {
                        if (importMode === 'skip_duplicates') {
                            skipped++;
                            continue;
                        } else if (importMode === 'update_existing') {
                            await cloud.updateStoreProduct({ ...productData, id: existingId });
                            success++;
                        }
                    } else {
                        await cloud.createStoreProduct(productData);
                        success++;
                    }

                } catch (err) {
                    // console.error("Row import error", err);
                    failed++;
                }
            }

            setResults({ success, failed, skipped, total: dataPreview.length });
            setStep(3);

        } catch (error) {
            // console.error(error);
            await alert({ title: 'Erro Crítico', message: 'Erro durante o processo de importação.' });
        } finally {
            setProcessing(false);
        }
    };

    const handleExport = async () => {
        setProcessing(true);
        try {
            const products = await cloud.getStoreProducts();
            const exportData = products.map(p => ({
                Nome: p.name,
                Preço: p.price,
                Descrição: p.description,
                Categoria: p.category,
                'Código Interno': (p as any).internal_code || '',
                'Estoque': (p as any).stock_quantity || 0,
                'Ativo': p.is_active ? 'Sim' : 'Não'
            }));

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(exportData);
            XLSX.utils.book_append_sheet(wb, ws, "Produtos");
            XLSX.writeFile(wb, "produtos_exportacao.xlsx");

        } catch (error) {
            // console.error(error);
            await alert({ title: 'Erro', message: 'Falha ao exportar produtos.' });
        } finally {
            setProcessing(false);
        }
    };

    // Validação de perfil
    if (profileValid === false) {
        return (
            <ProfileValidationAlert
                onNavigateToSettings={() => window.location.href = '/loja/configuracoes'}
                missingFields={missingFields}
            />
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto animate-in fade-in">
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                        <FileSpreadsheet className="w-8 h-8 text-brand-600" />
                        Importação de Produtos
                    </h1>
                    <p className="text-gray-500">Importe seu catálogo de produtos via Excel ou CSV.</p>
                </div>
                <Button onClick={handleExport} variant="outline" className="gap-2">
                    <Download className="w-4 h-4" /> Exportar Produtos
                </Button>
            </div>

            {step === 1 && (
                <div className="bg-white dark:bg-gray-800 p-10 rounded-3xl shadow-sm border-2 border-dashed border-gray-200 dark:border-gray-700 text-center">
                    <div className="mb-6">
                        <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Upload className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold dark:text-white mb-2">Selecione seu arquivo</h3>
                        <p className="text-gray-500 text-sm">Suporta CSV, XLSX ou TXT</p>
                    </div>

                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".csv,.xlsx,.xls,.txt"
                        onChange={handleFileSelect}
                    />
                    <Button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={processing}
                        className="px-8 py-3 text-lg"
                    >
                        {processing ? <Loader2 className="animate-spin w-6 h-6" /> : "Escolher Arquivo"}
                    </Button>
                </div>
            )}

            {step === 2 && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                        <h3 className="font-bold text-lg dark:text-white mb-4">Configurar Importação</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-500 mb-2">Modo de Importação</label>
                                <select
                                    value={importMode}
                                    onChange={e => setImportMode(e.target.value as ImportMode)}
                                    className="w-full p-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white"
                                >
                                    <option value="create_new">Importar tudo como novo</option>
                                    <option value="update_existing">Atualizar produtos existentes</option>
                                    <option value="skip_duplicates">Ignorar duplicatas</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-500 mb-2">Prefixo de Origem (Opcional)</label>
                                <input
                                    type="text"
                                    value={originPrefix}
                                    onChange={e => setOriginPrefix(e.target.value)}
                                    placeholder="Ex: IFOOD, SITE"
                                    className="w-full p-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white"
                                />
                                <p className="text-[10px] text-gray-400 mt-1">Adicionado ao código interno para evitar conflitos.</p>
                            </div>
                        </div>

                        <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-2">Mapeamento de Colunas</h4>
                        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl space-y-3">
                            {INTERNAL_FIELDS.map(field => (
                                <div key={field.value} className="flex items-center gap-4">
                                    <div className="w-1/3 text-sm font-bold dark:text-gray-300 text-right">
                                        {field.label} {field.required && <span className="text-red-500">*</span>}
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-gray-400" />
                                    <div className="flex-1">
                                        <select
                                            value={mapping[field.value] || ''}
                                            onChange={e => toggleMapping(field.value, e.target.value)}
                                            className={`w-full p-2 rounded-lg border text-sm dark:bg-gray-800 dark:text-white ${mapping[field.value] ? 'border-green-500 bg-green-50 dark:border-green-800 dark:bg-green-900/20' : 'border-gray-200'}`}
                                        >
                                            <option value="">-- Selecione a coluna do arquivo --</option>
                                            {headers.map(h => (
                                                <option key={h} value={h}>{h} (Ex: {dataPreview[0][headers.indexOf(h)]})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="p-6 bg-gray-50 dark:bg-gray-900/50 flex justify-between">
                        <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
                        <Button onClick={handleImport} disabled={processing}>
                            {processing ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Check className="w-5 h-5 mr-2" />}
                            Iniciar Importação
                        </Button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="bg-white dark:bg-gray-800 p-10 rounded-3xl shadow-sm text-center">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Check className="w-10 h-10" />
                    </div>
                    <h2 className="text-3xl font-black mb-2 dark:text-white">Importação Concluída!</h2>
                    <p className="text-gray-500 mb-8">O processamento do arquivo foi finalizado.</p>

                    <div className="grid grid-cols-3 gap-4 mb-8 max-w-lg mx-auto">
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                            <div className="text-2xl font-bold text-green-700 dark:text-green-400">{results.success}</div>
                            <div className="text-xs text-green-600 dark:text-green-500">Descartados/Novos</div>
                        </div>
                        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
                            <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{results.skipped}</div>
                            <div className="text-xs text-yellow-600 dark:text-yellow-500">Ignorados</div>
                        </div>
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                            <div className="text-2xl font-bold text-red-700 dark:text-red-400">{results.failed}</div>
                            <div className="text-xs text-red-600 dark:text-red-500">Falhas</div>
                        </div>
                    </div>

                    <Button onClick={() => { setStep(1); setFile(null); setResults({ success: 0, failed: 0, skipped: 0, total: 0 }); }} className="px-8">
                        Nova Importação
                    </Button>
                </div>
            )}
        </div>
    );
};
