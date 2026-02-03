
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StoreProduct } from '../types';
import { Button } from './Button';
import { Loading } from './Loading';
import { Toast } from './Toast';
import { useDialog } from '../utils/dialogService';
import * as cloud from '../services/cloud';
import {
    Plus,
    Trash2,
    Download,
    ChevronLeft,
    ChevronRight,
    Settings2,
    Layout,
    Palette,
    Type,
    Image as ImageIcon,
    FileText,
    MoveHorizontal,
    GripVertical,
    ArrowLeft
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Logo } from './Logo';

interface CatalogPage {
    id: string;
    products: StoreProduct[];
    layout: string;
}

interface CatalogSettings {
    backgroundColor: string;
    textColor: string;
    primaryColor: string;
    title: string;
    subtitle: string;
    storeLogo: string | null;
    showLogo: boolean;
    showDescription: boolean;
    showPrice: boolean;
    fontSizeTitle: number;
    fontSizePrice: number;
    fontSizeName: number;        // Novo: tamanho do nome do produto
    fontSizeDescription: number;   // Novo: tamanho da descrição
    borderRadius: string;
    templateId: string;
    useTextBrand: boolean;
    fontFamily: string;
    gridGap: string;
    customStoreLogo: string | null;
    backgroundImage: string | null;
    bgType: 'color' | 'image';
    logoX: number;
    logoY: number;
    logoScale: number;
}

const FONTS = [
    { id: 'inter', name: 'Inter', family: 'Inter, system-ui, sans-serif' },
    { id: 'roboto', name: 'Roboto', family: 'Roboto, sans-serif' },
    { id: 'opensans', name: 'Open Sans', family: '"Open Sans", sans-serif' },
    { id: 'lato', name: 'Lato', family: 'Lato, sans-serif' },
    { id: 'montserrat', name: 'Montserrat', family: 'Montserrat, sans-serif' },
    { id: 'poppins', name: 'Poppins', family: 'Poppins, sans-serif' },
    { id: 'raleway', name: 'Raleway', family: 'Raleway, sans-serif' },
    { id: 'playfair', name: 'Playfair Display', family: '"Playfair Display", serif' },
    { id: 'merriweather', name: 'Merriweather', family: 'Merriweather, serif' },
    { id: 'georgia', name: 'Georgia', family: 'Georgia, serif' },
    { id: 'arial', name: 'Arial', family: 'Arial, sans-serif' }
];

const TEMPLATES = [
    { id: 'classic', name: 'Clássico', bg: '#ffffff', text: '#1a1a1a', primary: '#eab308' },
    { id: 'dark', name: 'Dark Elegance', bg: '#1a1a1a', text: '#ffffff', primary: '#fbbf24' },
    { id: 'vibrant', name: 'Vibrante', bg: '#fdf2f8', text: '#831843', primary: '#db2777' },
    { id: 'nature', name: 'Natureza', bg: '#f0fdf4', text: '#14532d', primary: '#16a34a' },
    { id: 'clean', name: 'Clean Office', bg: '#f8fafc', text: '#0f172a', primary: '#2563eb' }
];

const LAYOUT_MODELS = [
    { id: 'minimalist', name: 'Minimalista', grid: 'grid-cols-2' },
    { id: 'grid', name: 'Grade 3x3', grid: 'grid-cols-3' },
    { id: 'featured', name: 'Destaque', grid: 'grid-cols-1' },
    { id: 'modern', name: 'Moderno', grid: 'grid-cols-2' },
    { id: 'compact', name: 'Compacto', grid: 'grid-cols-4' },
    { id: 'textonly', name: 'Apenas Texto', grid: 'grid-cols-1' }
];

// Limite de produtos por tipo de layout (baseado em página A4)
const MAX_PRODUCTS_PER_LAYOUT: Record<string, number> = {
    'minimalist': 4,  // 2x2
    'grid': 9,        // 3x3
    'featured': 6,    // 1 coluna, 6 produtos
    'modern': 4,      // 2x2
    'compact': 16,    // 4x4
    'textonly': 20    // Apenas texto, sem imagens
};

export const PrintCatalogGenerator: React.FC = () => {
    const [products, setProducts] = useState<StoreProduct[]>([]);
    const [pages, setPages] = useState<CatalogPage[]>([{ id: 'page-1', products: [], layout: 'minimalist' }]);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [zoom, setZoom] = useState(0.8);
    const [settings, setSettings] = useState<CatalogSettings>({
        backgroundColor: '#ffffff',
        textColor: '#1a1a1a',
        primaryColor: '#eab308',
        title: 'Nosso Catálogo',
        subtitle: 'Confira nossas ofertas exclusivas',
        storeLogo: null,
        showLogo: true,
        showDescription: true,
        showPrice: true,
        fontSizeTitle: 24,
        fontSizePrice: 24,
        fontSizeName: 20,          // Tamanho padrão do nome do produto
        fontSizeDescription: 14,    // Tamanho padrão da descrição
        borderRadius: '1rem',
        templateId: 'classic',
        useTextBrand: false,
        fontFamily: 'inter',
        gridGap: '2rem',
        customStoreLogo: null,
        backgroundImage: null,
        bgType: 'color',
        logoX: 0,
        logoY: 0,
        logoScale: 1
    });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const pageRef = useRef<HTMLDivElement>(null);
    const { confirm, alert } = useDialog();

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        setIsLoading(true);
        try {
            // Carrega produtos primeiro
            const prodData = await cloud.getStoreProducts();
            setProducts(prodData || []);

            // Carrega perfil em seguida (não bloqueia produtos se falhar)
            try {
                const profile = await cloud.getMyPartnerProfile();
                if (profile) {
                    const logoUrl = (profile as any).logo_url || null;
                    setSettings(prev => ({
                        ...prev,
                        title: profile.name || prev.title,
                        storeLogo: logoUrl
                    }));
                }
            } catch (profileError) {
                console.error("Erro ao carregar perfil:", profileError);
            }
        } catch (error) {
            console.error("Erro ao carregar produtos:", error);
            alert({ title: 'Erro', message: 'Não foi possível carregar seus produtos. Tente recarregar a página.' });
        } finally {
            setIsLoading(false);
        }
    };

    const addNewPage = () => {
        const newPage: CatalogPage = {
            id: `page-${Date.now()}`,
            products: [],
            layout: 'minimalist'
        };
        setPages([...pages, newPage]);
        setCurrentPageIndex(pages.length);
    };

    const removePage = async (index: number) => {
        if (pages.length === 1) return;
        const confirmed = await confirm({
            title: 'Remover folha?',
            message: 'Isso apagará todos os produtos selecionados nesta folha.'
        });
        if (confirmed) {
            const newPages = pages.filter((_, i) => i !== index);
            setPages(newPages);
            setCurrentPageIndex(Math.max(0, index - 1));
        }
    };

    const addProductToCurrentPage = (product: StoreProduct) => {
        const currentPage = pages[currentPageIndex];

        // Verifica se o produto já está na página atual
        if (currentPage.products.some(p => p.id === product.id)) {
            return;
        }

        // Obtém o limite de produtos para o layout atual
        const maxProducts = MAX_PRODUCTS_PER_LAYOUT[currentPage.layout] || 9;

        // Se a página atual está cheia, cria uma nova página
        if (currentPage.products.length >= maxProducts) {
            const newPage: CatalogPage = {
                id: `page-${Date.now()}`,
                products: [product],
                layout: currentPage.layout // Mantém o mesmo layout
            };
            setPages([...pages, newPage]);
            setCurrentPageIndex(pages.length); // Vai para a nova página
            return;
        }

        // Adiciona produto na página atual
        const newPages = [...pages];
        newPages[currentPageIndex] = {
            ...currentPage,
            products: [...currentPage.products, product]
        };
        setPages(newPages);
    };

    const removeProductFromPage = (pageIndex: number, productId: string) => {
        const newPages = [...pages];
        newPages[pageIndex] = {
            ...newPages[pageIndex],
            products: newPages[pageIndex].products.filter(p => p.id !== productId)
        };
        setPages(newPages);
    };

    const updatePageLayout = (pageIndex: number, layout: string) => {
        const newPages = [...pages];
        newPages[pageIndex] = { ...newPages[pageIndex], layout };
        setPages(newPages);
    };

    const applyTemplate = (template: typeof TEMPLATES[0]) => {
        setSettings({
            ...settings,
            templateId: template.id,
            backgroundColor: template.bg,
            textColor: template.text,
            primaryColor: template.primary,
            bgType: 'color'
        });
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'bg') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                if (type === 'logo') {
                    setSettings(prev => ({ ...prev, customStoreLogo: base64String, useTextBrand: false }));
                } else {
                    setSettings(prev => ({ ...prev, backgroundImage: base64String, bgType: 'image' }));
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleLogoMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragStart({
            x: e.clientX - settings.logoX,
            y: e.clientY - settings.logoY
        });
        e.preventDefault();
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                setSettings(prev => ({
                    ...prev,
                    logoX: e.clientX - dragStart.x,
                    logoY: e.clientY - dragStart.y
                }));
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragStart]);

    const exportToPDF = async () => {
        setIsExporting(true);
        const originalIndex = currentPageIndex;
        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = 210;
            const pageHeight = 297;

            for (let i = 0; i < pages.length; i++) {
                setCurrentPageIndex(i);
                // Aguarda a renderização da página
                await new Promise(resolve => setTimeout(resolve, 800));

                if (pageRef.current) {
                    const canvas = await html2canvas(pageRef.current, {
                        scale: 3, // Alta resolução para impressão
                        useCORS: true,
                        backgroundColor: settings.backgroundColor,
                        logging: false
                    });
                    const imgData = canvas.toDataURL('image/jpeg', 0.95);

                    if (i > 0) pdf.addPage();
                    pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
                }
            }

            pdf.save(`${settings.title.toLowerCase().replace(/\s+/g, '-')}-catalogo.pdf`);
            alert({ title: 'Sucesso', message: 'Seu catálogo foi gerado com sucesso!' });
        } catch (error) {
            console.error("Erro ao exportar PDF:", error);
            alert({ title: 'Erro', message: 'Não foi possível gerar o PDF. Verifique se as imagens dos produtos estão acessíveis.' });
        } finally {
            setCurrentPageIndex(originalIndex);
            setIsExporting(false);
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()))
    );



    // Removido early return para permitir interface de carregamento interna

    return (
        <>
            <style>{`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
            <div className="flex flex-col h-[calc(100vh-140px)] animate-in fade-in">
                {/* Header / Toolbar */}
                <div className="flex items-center justify-between mb-6 bg-white dark:bg-gray-900 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                                const event = new CustomEvent('navigateToTab', { detail: { tab: 'store_catalog' } });
                                window.dispatchEvent(event);
                            }}
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                        </Button>
                        <h1 className="text-xl font-black dark:text-white flex items-center gap-2">
                            <FileText className="w-5 h-5 text-brand-600" />
                            Gerador de Catálogo Impresso
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="secondary" onClick={addNewPage}>
                            <Plus className="w-4 h-4 mr-2" /> Nova Folha
                        </Button>
                        <Button onClick={exportToPDF} disabled={isExporting}>
                            {isExporting ? <Loading variant="inline" size="sm" /> : <Download className="w-4 h-4 mr-2" />}
                            Exportar PDF (A4)
                        </Button>
                    </div>
                </div>

                <div className="flex flex-1 gap-6 min-h-0 overflow-hidden">
                    {/* Left Panel: Settings & Product List */}
                    <div className="w-80 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
                        {/* Settings Section */}
                        <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm">
                            <h3 className="font-black text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Palette className="w-4 h-4" /> Estilo & Templates
                            </h3>

                            <div className="grid grid-cols-5 gap-2 mb-6">
                                {TEMPLATES.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => applyTemplate(t)}
                                        className={`aspect-square rounded-xl border-2 transition-all flex items-center justify-center p-1 ${settings.templateId === t.id ? 'border-brand-600 scale-105 shadow-md' : 'border-transparent hover:border-gray-200'}`}
                                        title={t.name}
                                        style={{ backgroundColor: t.bg }}
                                    >
                                        <div className="w-full h-full rounded shadow-sm" style={{ backgroundColor: t.primary }} />
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Título</label>
                                    <input
                                        type="text"
                                        value={settings.title}
                                        onChange={e => setSettings({ ...settings, title: e.target.value })}
                                        className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-xs p-3"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Subtítulo</label>
                                    <input
                                        type="text"
                                        value={settings.subtitle}
                                        onChange={e => setSettings({ ...settings, subtitle: e.target.value })}
                                        className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-xs p-3"
                                    />
                                </div>

                                {/* Fonte e Tamanhos */}
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Família da Fonte</label>
                                    <select
                                        value={settings.fontFamily}
                                        onChange={e => setSettings({ ...settings, fontFamily: e.target.value })}
                                        className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-xs p-3 font-bold cursor-pointer"
                                        style={{ fontFamily: FONTS.find(f => f.id === settings.fontFamily)?.family }}
                                    >
                                        {FONTS.map(font => (
                                            <option key={font.id} value={font.id} style={{ fontFamily: font.family }}>
                                                {font.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Tamanho Nome</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="range"
                                                min="12"
                                                max="32"
                                                value={settings.fontSizeName}
                                                onChange={e => setSettings({ ...settings, fontSizeName: parseInt(e.target.value) })}
                                                className="flex-1 accent-brand-500"
                                            />
                                            <span className="text-xs font-bold text-gray-600 w-8">{settings.fontSizeName}px</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Tamanho Descrição</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="range"
                                                min="10"
                                                max="20"
                                                value={settings.fontSizeDescription}
                                                onChange={e => setSettings({ ...settings, fontSizeDescription: parseInt(e.target.value) })}
                                                className="flex-1 accent-brand-500"
                                            />
                                            <span className="text-xs font-bold text-gray-600 w-8">{settings.fontSizeDescription}px</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <div className="flex-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Fundo</label>
                                        <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                            <input
                                                type="color"
                                                value={settings.backgroundColor}
                                                onChange={e => setSettings({ ...settings, backgroundColor: e.target.value })}
                                                className="w-8 h-8 rounded-lg border-none"
                                            />
                                            <span className="text-[10px] font-mono">{settings.backgroundColor}</span>
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Primária</label>
                                        <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                            <input
                                                type="color"
                                                value={settings.primaryColor}
                                                onChange={e => setSettings({ ...settings, primaryColor: e.target.value })}
                                                className="w-8 h-8 rounded-lg border-none"
                                            />
                                            <span className="text-[10px] font-mono">{settings.primaryColor}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-gray-500">Mostrar Logo</span>
                                        <input
                                            type="checkbox"
                                            checked={settings.showLogo}
                                            onChange={e => setSettings({ ...settings, showLogo: e.target.checked })}
                                            className="w-10 h-5 appearance-none bg-gray-200 checked:bg-brand-500 rounded-full cursor-pointer relative transition-all before:content-[''] before:absolute before:w-4 before:h-4 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 checked:before:left-5.5 before:transition-all before:shadow-sm"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-gray-500">Descrições</span>
                                        <input
                                            type="checkbox"
                                            checked={settings.showDescription}
                                            onChange={e => setSettings({ ...settings, showDescription: e.target.checked })}
                                            className="w-10 h-5 appearance-none bg-gray-200 checked:bg-brand-500 rounded-full cursor-pointer relative transition-all before:content-[''] before:absolute before:w-4 before:h-4 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 checked:before:left-5.5 before:transition-all before:shadow-sm"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-gray-500">Usar Nome como Logo</span>
                                        <input
                                            type="checkbox"
                                            checked={settings.useTextBrand}
                                            onChange={e => setSettings({ ...settings, useTextBrand: e.target.checked })}
                                            className="w-10 h-5 appearance-none bg-gray-200 checked:bg-brand-500 rounded-full cursor-pointer relative transition-all before:content-[''] before:absolute before:w-4 before:h-4 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 checked:before:left-5.5 before:transition-all before:shadow-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Upload Logotipo</label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={e => handleFileUpload(e, 'logo')}
                                            className="hidden"
                                            id="logo-upload"
                                        />
                                        <label
                                            htmlFor="logo-upload"
                                            className="flex items-center justify-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-all text-xs font-bold"
                                        >
                                            <ImageIcon className="w-4 h-4 text-brand-600" />
                                            {settings.customStoreLogo ? 'Trocar Logo' : 'Subir Imagem'}
                                        </label>
                                        {settings.customStoreLogo && (
                                            <button
                                                onClick={() => setSettings(prev => ({ ...prev, customStoreLogo: null }))}
                                                className="text-[10px] text-red-500 font-bold hover:underline ml-1"
                                            >
                                                Remover Logo
                                            </button>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Fundo do Catálogo</label>
                                        <div className="flex bg-gray-50 dark:bg-gray-800 p-1 rounded-xl mb-3">
                                            <button
                                                onClick={() => setSettings(prev => ({ ...prev, bgType: 'color' }))}
                                                className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${settings.bgType === 'color' ? 'bg-white shadow-sm text-brand-600' : 'text-gray-400'}`}
                                            >
                                                Cor
                                            </button>
                                            <button
                                                onClick={() => setSettings(prev => ({ ...prev, bgType: 'image' }))}
                                                className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${settings.bgType === 'image' ? 'bg-white shadow-sm text-brand-600' : 'text-gray-400'}`}
                                            >
                                                Imagem
                                            </button>
                                        </div>

                                        {settings.bgType === 'color' ? (
                                            <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                                <input
                                                    type="color"
                                                    value={settings.backgroundColor}
                                                    onChange={e => setSettings({ ...settings, backgroundColor: e.target.value })}
                                                    className="w-8 h-8 rounded-lg border-none"
                                                />
                                                <span className="text-[10px] font-mono">{settings.backgroundColor}</span>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={e => handleFileUpload(e, 'bg')}
                                                    className="hidden"
                                                    id="bg-upload"
                                                />
                                                <label
                                                    htmlFor="bg-upload"
                                                    className="flex items-center justify-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-all text-xs font-bold"
                                                >
                                                    <ImageIcon className="w-4 h-4 text-brand-600" />
                                                    {settings.backgroundImage ? 'Trocar Fundo' : 'Subir Fundo'}
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Fonte</label>
                                        <select
                                            value={settings.fontFamily}
                                            onChange={e => setSettings({ ...settings, fontFamily: e.target.value })}
                                            className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-xs p-3"
                                        >
                                            {FONTS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Espaçamento: {settings.gridGap}</label>
                                        <input
                                            type="range" min="0.5" max="4" step="0.5"
                                            value={parseFloat(settings.gridGap)}
                                            onChange={e => setSettings({ ...settings, gridGap: `${e.target.value}rem` })}
                                            className="w-full accent-brand-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Bordas das Fotos: {settings.borderRadius}</label>
                                        <input
                                            type="range"
                                            min="0" max="3" step="0.5"
                                            value={parseFloat(settings.borderRadius)}
                                            onChange={e => setSettings({ ...settings, borderRadius: `${e.target.value}rem` })}
                                            className="w-full accent-brand-500"
                                        />
                                    </div>
                                    {(settings.customStoreLogo || settings.storeLogo) && (
                                        <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-4">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Ajuste Fino Logo</label>
                                            <div>
                                                <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1">
                                                    <span>ESCALA</span>
                                                    <span>{Math.round(settings.logoScale * 100)}%</span>
                                                </div>
                                                <input
                                                    type="range" min="0.2" max="3" step="0.1"
                                                    value={settings.logoScale}
                                                    onChange={e => setSettings({ ...settings, logoScale: parseFloat(e.target.value) })}
                                                    className="w-full accent-brand-500"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <span className="text-[10px] font-bold text-gray-500 mb-1 block">POSIÇÃO X</span>
                                                    <input
                                                        type="range" min="-100" max="800" step="1"
                                                        value={settings.logoX}
                                                        onChange={e => setSettings({ ...settings, logoX: parseInt(e.target.value) })}
                                                        className="w-full accent-brand-500"
                                                    />
                                                </div>
                                                <div>
                                                    <span className="text-[10px] font-bold text-gray-500 mb-1 block">POSIÇÃO Y</span>
                                                    <input
                                                        type="range" min="-100" max="1100" step="1"
                                                        value={settings.logoY}
                                                        onChange={e => setSettings({ ...settings, logoY: parseInt(e.target.value) })}
                                                        className="w-full accent-brand-500"
                                                    />
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-gray-400 italic">Dica: Você também pode clicar e arrastar a logo diretamente na folha.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Products List */}
                        <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm flex-1 flex flex-col min-h-100">
                            <h3 className="font-black text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                                <ImageIcon className="w-4 h-4" /> Adicionar Produtos
                            </h3>
                            <div className="relative mb-4">
                                <input
                                    type="text"
                                    placeholder="Buscar produtos..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-xs p-3 pl-8"
                                />
                                <div className="absolute left-2.5 top-1/2 -translate-y-1/2">
                                    <Plus className="w-4 h-4 text-gray-400" />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-2 min-h-0 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center py-10 opacity-30">
                                        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest">Carregando produtos...</p>
                                    </div>
                                ) : filteredProducts.length === 0 ? (
                                    <div className="text-center py-10 opacity-30">
                                        <p className="text-[10px] font-bold uppercase tracking-widest">Nenhum produto encontrado</p>
                                    </div>
                                ) : (
                                    filteredProducts.map(product => (
                                        <button
                                            key={product.id}
                                            onClick={() => addProductToCurrentPage(product)}
                                            className="w-full bg-gray-50 dark:bg-gray-800 p-3 rounded-2xl flex items-center gap-3 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-all border border-transparent hover:border-brand-100 dark:hover:border-brand-900/30"
                                        >
                                            {product.image_url ? (
                                                <img src={product.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                                    <ImageIcon className="w-5 h-5 text-gray-400" />
                                                </div>
                                            )}
                                            <div className="text-left flex-1 min-w-0">
                                                <h4 className="text-xs font-bold dark:text-white truncate">{product.name}</h4>
                                                <p className="text-[10px] text-brand-600 font-black">{product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                            </div>
                                            <Plus className="w-4 h-4 text-gray-400" />
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: A4 Preview & Pagination */}
                    <div className="flex-1 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                                    <button
                                        disabled={currentPageIndex === 0}
                                        onClick={() => setCurrentPageIndex(currentPageIndex - 1)}
                                        className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg disabled:opacity-30"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <div className="flex items-center px-4">
                                        <span className="text-xs font-black">
                                            Folha {currentPageIndex + 1} de {pages.length}
                                        </span>
                                    </div>
                                    <button
                                        disabled={currentPageIndex === pages.length - 1}
                                        onClick={() => setCurrentPageIndex(currentPageIndex + 1)}
                                        className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg disabled:opacity-30"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                                <Button variant="secondary" size="sm" onClick={() => removePage(currentPageIndex)} className="text-red-500 hover:bg-red-50">
                                    <Trash2 className="w-4 h-4 mr-2" /> Excluir Folha
                                </Button>
                            </div>

                            {/* Layout Selector for current page */}
                            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl overflow-x-auto no-scrollbar max-w-xs">
                                {LAYOUT_MODELS.map(model => (
                                    <button
                                        key={model.id}
                                        onClick={() => updatePageLayout(currentPageIndex, model.id)}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight whitespace-nowrap transition-all ${pages[currentPageIndex].layout === model.id ? 'bg-white dark:bg-gray-700 text-brand-600 shadow-sm' : 'text-gray-500'}`}
                                    >
                                        {model.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* A4 Canvas Container */}
                        <div className="flex-1 flex flex-col bg-gray-200 dark:bg-gray-800 rounded-[2.5rem] overflow-hidden">
                            {/* Zoom Control */}
                            <div className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-md p-2 flex justify-center gap-4 border-b border-gray-100 dark:border-gray-800">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Zoom: {Math.round(zoom * 100)}%</span>
                                    <input
                                        type="range" min="0.3" max="1.5" step="0.1"
                                        value={zoom}
                                        onChange={e => setZoom(parseFloat(e.target.value))}
                                        className="accent-brand-500"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-auto p-12 custom-scrollbar flex items-start justify-center">
                                <div
                                    ref={pageRef}
                                    className="bg-white shadow-2xl origin-top transition-transform duration-300"
                                    style={{
                                        width: '210mm',
                                        height: '297mm',
                                        transform: `scale(${zoom})`,
                                        backgroundColor: settings.backgroundColor,
                                        backgroundImage: settings.bgType === 'image' && settings.backgroundImage ? `url(${settings.backgroundImage})` : 'none',
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        color: settings.textColor,
                                        fontFamily: FONTS.find(f => f.id === settings.fontFamily)?.family,
                                        padding: '20mm',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        flexShrink: 0
                                    }}
                                >
                                    {/* Logo Móvel (Estilo Canva) */}
                                    {settings.showLogo && !settings.useTextBrand && (settings.customStoreLogo || settings.storeLogo) && (
                                        <div
                                            style={{
                                                position: 'absolute',
                                                left: `${settings.logoX}px`,
                                                top: `${settings.logoY}px`,
                                                transform: `scale(${settings.logoScale})`,
                                                transformOrigin: 'top left',
                                                cursor: isDragging ? 'grabbing' : 'grab',
                                                zIndex: 50,
                                                border: isDragging ? '2px solid #eab308' : '2px solid transparent',
                                                padding: '4px',
                                                borderRadius: '8px',
                                                transition: isDragging ? 'none' : 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                            }}
                                            onMouseDown={handleLogoMouseDown}
                                            className="group"
                                        >
                                            <img
                                                src={settings.customStoreLogo || settings.storeLogo!}
                                                alt="Logo"
                                                className="h-20 w-auto object-contain pointer-events-none select-none"
                                            />
                                            <div className="absolute -top-3 -left-3 w-6 h-6 bg-brand-500 rounded-full items-center justify-center hidden group-hover:flex">
                                                <Layout className="w-3 h-3 text-white" />
                                            </div>
                                        </div>
                                    )}

                                    {/* Catalog Header */}
                                    <div className="mb-12 border-b-2 pb-8 flex justify-between items-end" style={{ borderColor: settings.primaryColor }}>
                                        <div>
                                            {settings.useTextBrand || (!settings.customStoreLogo && !settings.storeLogo) ? (
                                                <h1 className="text-5xl font-black mb-2" style={{ color: settings.primaryColor }}>{settings.title}</h1>
                                            ) : (
                                                <div className="h-20 flex items-end opacity-0 pointer-events-none">
                                                    {/* Espaçador invisível para manter layout se a logo for movida */}
                                                    <div className="h-full w-20" />
                                                </div>
                                            )}
                                            <p className="text-lg font-medium opacity-80" style={{ color: settings.textColor }}>{settings.subtitle}</p>
                                        </div>
                                        <div className="text-right">
                                            {/* Removido Folha X de Y conforme solicitado */}
                                        </div>
                                    </div>

                                    {/* Products Grid */}
                                    <div className={`grid flex-1 content-start ${pages[currentPageIndex].layout === 'minimalist' ? 'grid-cols-2' :
                                        pages[currentPageIndex].layout === 'grid' ? 'grid-cols-3' :
                                            pages[currentPageIndex].layout === 'featured' ? 'grid-cols-1' :
                                                pages[currentPageIndex].layout === 'modern' ? 'grid-cols-2' :
                                                    pages[currentPageIndex].layout === 'textonly' ? 'grid-cols-1' :
                                                        'grid-cols-4'
                                        }`} style={{ gap: pages[currentPageIndex].layout === 'textonly' ? '0.5rem' : settings.gridGap }}>
                                        {pages[currentPageIndex].products.map(product => (
                                            <div key={product.id} className={`relative group ${pages[currentPageIndex].layout === 'modern' ? 'bg-gray-50/50 p-4 rounded-[2rem] border border-gray-100 flex flex-col gap-4' : ''}`}>
                                                <button
                                                    onClick={() => removeProductFromPage(currentPageIndex, product.id!)}
                                                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 no-print"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>

                                                <div className={`
                                            ${pages[currentPageIndex].layout === 'featured' ? 'flex gap-8 items-center' : ''}
                                            ${pages[currentPageIndex].layout === 'compact' ? 'flex flex-col gap-2' : ''}
                                            ${pages[currentPageIndex].layout === 'textonly' ? 'flex gap-3 items-start border-b border-gray-200 pb-3' : ''}
                                        `}>
                                                    {/* Imagem do Produto - Oculta no layout TextOnly */}
                                                    {pages[currentPageIndex].layout !== 'textonly' && (
                                                        <div className={`
                                                bg-gray-50 overflow-hidden border border-gray-100 flex items-center justify-center flex-shrink-0 shadow-sm
                                                ${pages[currentPageIndex].layout === 'minimalist' ? 'aspect-square mb-4' : ''}
                                                ${pages[currentPageIndex].layout === 'grid' ? 'aspect-square mb-3' : ''}
                                                ${pages[currentPageIndex].layout === 'featured' ? 'w-48 h-48' : ''}
                                                ${pages[currentPageIndex].layout === 'modern' ? 'aspect-video mb-0 border-none' : ''}
                                                ${pages[currentPageIndex].layout === 'compact' ? 'w-full aspect-square' : ''}
                                            `} style={{ borderRadius: settings.borderRadius }}>
                                                            {product.image_url ? (
                                                                <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <ImageIcon className="w-12 h-12 text-gray-200" />
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className={`${pages[currentPageIndex].layout === 'featured' ? 'flex-1' : ''} ${pages[currentPageIndex].layout === 'textonly' ? 'flex-1' : ''}`}>
                                                        <h4
                                                            className={`
                                                            font-black mb-1 
                                                            ${pages[currentPageIndex].layout === 'featured' ? '' : ''}
                                                            ${pages[currentPageIndex].layout === 'compact' ? '' : ''}
                                                            ${pages[currentPageIndex].layout === 'textonly' ? 'truncate' : 'truncate'}
                                                        `}
                                                            style={{
                                                                color: settings.textColor,
                                                                fontSize: `${settings.fontSizeName}px`
                                                            }}
                                                        >
                                                            {product.name}
                                                        </h4>

                                                        {settings.showDescription && pages[currentPageIndex].layout !== 'compact' && (
                                                            <p
                                                                className={`
                                                                opacity-60 mb-3 
                                                                ${pages[currentPageIndex].layout === 'featured' ? 'h-auto' : ''}
                                                                ${pages[currentPageIndex].layout === 'textonly' ? 'line-clamp-1' : 'line-clamp-2'}
                                                            `}
                                                                style={{ fontSize: `${settings.fontSizeDescription}px` }}
                                                            >
                                                                {product.description}
                                                            </p>
                                                        )}

                                                        <p className={`
                                                    font-black
                                                    ${pages[currentPageIndex].layout === 'featured' ? 'text-4xl' : 'text-2xl'}
                                                    ${pages[currentPageIndex].layout === 'compact' ? 'text-base' : ''}
                                                `} style={{ color: settings.primaryColor }}>
                                                            {product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {pages[currentPageIndex].products.length === 0 && (
                                            <div className="col-span-full h-full flex flex-col items-center justify-center text-center py-20 opacity-20 border-4 border-dashed rounded-[3rem]" style={{ borderColor: settings.textColor }}>
                                                <Plus className="w-20 h-20 mb-4" />
                                                <h3 className="text-2xl font-black">Folha Vazia</h3>
                                                <p className="text-lg">Clique nos produtos à esquerda para adicionar</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Catalog Footer */}
                                    <div className="mt-auto pt-8 border-t flex justify-between items-end" style={{ borderColor: settings.textColor + '20' }}>
                                        <div className="flex flex-col gap-1">
                                            <p className="text-xs font-bold uppercase tracking-widest opacity-40">Gerado por</p>
                                            <Logo className="h-8 w-auto" />
                                        </div>
                                        {/* Removido data conforme solicitado */}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

const X = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6L6 18M6 6l12 12" />
    </svg>
);
