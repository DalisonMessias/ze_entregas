import React, { useState, useEffect, useCallback } from 'react';
import { ShoppingBag, Plus, Trash2, Edit2, FileSpreadsheet, AlertTriangle, ExternalLink } from 'lucide-react';
import { Loading } from './Loading';
import * as cloud from '../services/cloud';
import { Product, StoreProduct, Category } from '../types';
import { Button } from './Button';
import { ProductModal } from './ProductModal';
import { ProductImportExport } from './ProductImportExport';
import { useDialog } from '../utils/dialogService';

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

interface StoreProductManagerProps {
    targetStoreId: string;
    storeName: string;
}

export const StoreProductManager: React.FC<StoreProductManagerProps> = ({ targetStoreId, storeName }) => {
    const [view, setView] = useState<'list' | 'import'>('list');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [products, setProducts] = useState<StoreProduct[]>([]);
    const [showProductModal, setShowProductModal] = useState(false);
    const [currentProduct, setCurrentProduct] = useState<Partial<StoreProduct> | null>(null);

    const { confirm, alert } = useDialog();

    const loadData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            // Fetch products for the SPECIFIC store
            const p = await cloud.getStoreProducts(targetStoreId);
            setProducts(p);
        } catch (e) {
            console.error("Error loading store products:", e);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [targetStoreId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleAddEditProduct = async (productData: Partial<StoreProduct>) => {
        console.log("StoreProductManager: handleAddEditProduct started", productData);
        setSubmitting(true);
        try {
            // Adapt frontend model to DB model if necessary
            // Note: Cloud service handles store_id injection if targetStoreId is passed

            if (productData.id) {
                await cloud.updateStoreProduct(productData, targetStoreId);
            } else {
                await cloud.createStoreProduct(productData, targetStoreId);
            }

            setShowProductModal(false);
            setCurrentProduct(null);
            loadData(true);
            await alert({ title: 'Sucesso', message: 'Produto salvo com sucesso!' });
        } catch (e: any) {
            console.error("StoreProductManager: Error saving product:", e);
            await alert({ title: 'Erro', message: "Erro ao salvar: " + (e.message || 'Erro desconhecido') });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteProduct = async (id: string) => {
        const ok = await confirm({ title: 'Excluir produto', message: 'Tem certeza que deseja excluir este produto?' });
        if (!ok) return;

        setSubmitting(true);
        try {
            await cloud.deleteStoreProduct(id);
            loadData(true);
            await alert({ title: 'Sucesso', message: "Produto excluído!" });
        } catch (e: any) {
            await alert({ title: 'Erro', message: "Erro ao excluir: " + e.message });
        } finally {
            setSubmitting(false);
        }
    };

    if (view === 'import') {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                    <Button variant="ghost" onClick={() => setView('list')} className="text-gray-500">
                        &larr; Voltar para Lista
                    </Button>
                </div>
                <ProductImportExport targetStoreId={targetStoreId} />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5 text-brand-600" />
                        Produtos de {storeName}
                    </h3>
                    <p className="text-sm text-gray-500">Gerencie o catálogo desta loja.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setView('import')}>
                        <FileSpreadsheet className="w-5 h-5 mr-2" /> Importar/Exportar
                    </Button>
                    <Button onClick={() => { setCurrentProduct({ is_active: true, price: 0 }); setShowProductModal(true); }}>
                        <Plus className="w-5 h-5 mr-2" /> Novo Produto
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <Loading variant="container" size="md" message="Carregando produtos..." />
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500 sticky top-0">
                                <tr>
                                    <th className="px-4 py-3">Produto</th>
                                    <th className="px-4 py-3">Preço</th>
                                    <th className="px-4 py-3">Estoque</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="text-center py-12 text-gray-400">
                                            <div className="flex flex-col items-center gap-2">
                                                <ShoppingBag className="w-10 h-10 opacity-20" />
                                                <p>Nenhum produto cadastrado para esta loja.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                {products.map(p => (
                                    <tr key={p.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-4 py-3 font-bold dark:text-white flex items-center gap-3">
                                            {p.image_url ? (
                                                <img src={p.image_url} alt="" className="w-8 h-8 rounded-lg object-cover bg-gray-100" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-300">
                                                    <ShoppingBag className="w-4 h-4" />
                                                </div>
                                            )}
                                            {p.name}
                                        </td>
                                        <td className="px-4 py-3">{formatCurrency(p.price)}</td>
                                        <td className="px-4 py-3">
                                            {p.stock_quantity === null || p.stock_quantity === undefined ? (
                                                <span className="text-gray-400 text-xs">Ilimitado</span>
                                            ) : (
                                                p.stock_quantity
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {p.is_active ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => { setCurrentProduct(p); setShowProductModal(true); }}
                                                    className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteProduct(p.id)}
                                                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                                    title="Excluir"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <ProductModal
                isOpen={showProductModal}
                onClose={() => setShowProductModal(false)}
                product={currentProduct || {}}
                onSave={handleAddEditProduct}
                isSaving={submitting}
            />
        </div>
    );
};
