import React, { useState, useRef, useEffect } from 'react';
import { X, Save, Download, Type, Palette, Image as ImageIcon, Plus, Trash2, Layers, Square, Smartphone, ZoomIn, ZoomOut, MoveVertical, Move, ChevronLeft, RotateCw, Upload, Layout, Sparkles, Wand2 } from 'lucide-react';
// GoogleGenAI import removido - Gerenciado pelo cloud.generateAIContent
import { Button } from './Button';
import { MarketingTemplate, MarketingDesign, MarketingCanvasConfig, MarketingElement } from '../types';
import * as cloud from '../services/cloud';
import { useDialog } from '../utils/dialogService';
import * as uploader from '../services/upload';
import html2canvas from 'html2canvas';

interface MarketingEditorProps {
    template?: MarketingTemplate;
    design?: MarketingDesign;
    onClose: () => void;
}

export const MarketingEditor: React.FC<MarketingEditorProps> = ({ template, design, onClose }) => {
    // 50+ Google Fonts
    const GOOGLE_FONTS = [
        { name: 'Inter', family: 'Inter, sans-serif' },
        { name: 'Roboto', family: '"Roboto", sans-serif' },
        { name: 'Open Sans', family: '"Open Sans", sans-serif' },
        { name: 'Montserrat', family: '"Montserrat", sans-serif' },
        { name: 'Lato', family: '"Lato", sans-serif' },
        { name: 'Poppins', family: '"Poppins", sans-serif' },
        { name: 'Oswald', family: '"Oswald", sans-serif' },
        { name: 'Playfair Display', family: '"Playfair Display", serif' },
        { name: 'Merriweather', family: '"Merriweather", serif' },
        { name: 'Dancing Script', family: '"Dancing Script", cursive' },
        { name: 'Pacifico', family: '"Pacifico", cursive' },
        { name: 'Anton', family: '"Anton", sans-serif' },
        { name: 'Nunito', family: '"Nunito", sans-serif' },
        { name: 'Raleway', family: '"Raleway", sans-serif' },
        { name: 'Ubuntu', family: '"Ubuntu", sans-serif' },
        { name: 'Rubik', family: '"Rubik", sans-serif' },
        { name: 'Mukta', family: '"Mukta", sans-serif' },
        { name: 'Work Sans', family: '"Work Sans", sans-serif' },
        { name: 'Quicksand', family: '"Quicksand", sans-serif' },
        { name: 'Dosis', family: '"Dosis", sans-serif' },
        { name: 'PT Sans', family: '"PT Sans", sans-serif' },
        { name: 'Inconsolata', family: '"Inconsolata", monospace' },
        { name: 'Lobster', family: '"Lobster", cursive' },
        { name: 'Abril Fatface', family: '"Abril Fatface", display' },
        { name: 'Bebas Neue', family: '"Bebas Neue", sans-serif' },
        { name: 'Comfortaa', family: '"Comfortaa", cursive' },
        { name: 'Righteous', family: '"Righteous", display' },
        { name: 'Russo One', family: '"Russo One", sans-serif' },
        { name: 'Permanent Marker', family: '"Permanent Marker", cursive' },
        { name: 'Caveat', family: '"Caveat", cursive' },
        { name: 'Satisfy', family: '"Satisfy", cursive' },
        { name: 'Courgette', family: '"Courgette", cursive' },
        { name: 'Cookie', family: '"Cookie", cursive' },
        { name: 'Great Vibes', family: '"Great Vibes", cursive' },
        { name: 'Sacramento', family: '"Sacramento", cursive' },
        { name: 'Amatic SC', family: '"Amatic SC", cursive' },
        { name: 'Cinzel', family: '"Cinzel", serif' },
        { name: 'Lora', family: '"Lora", serif' },
        { name: 'Libre Baskerville', family: '"Libre Baskerville", serif' },
        { name: 'Bitter', family: '"Bitter", serif' },
        { name: 'Crimson Text', family: '"Crimson Text", serif' },
        { name: 'Josefin Sans', family: '"Josefin Sans", sans-serif' },
        { name: 'Old Standard TT', family: '"Old Standard TT", serif' },
        { name: 'DM Sans', family: '"DM Sans", sans-serif' },
        { name: 'Space Mono', family: '"Space Mono", monospace' },
        { name: 'Fira Code', family: '"Fira Code", monospace' },
        { name: 'Press Start 2P', family: '"Press Start 2P", display' },
        { name: 'Bangers', family: '"Bangers", display' },
        { name: 'Creepster', family: '"Creepster", display' },
        { name: 'Special Elite', family: '"Special Elite", display' }
    ];

    // Carregar fontes do Google dinamicamente
    useEffect(() => {
        const chunkSize = 10;
        for (let i = 0; i < GOOGLE_FONTS.length; i += chunkSize) {
            const chunk = GOOGLE_FONTS.slice(i, i + chunkSize);
            const fontFamilies = chunk.map(f => f.name.replace(' ', '+')).join('&family=');
            const linkId = `google-fonts-link-${i}`;

            if (!document.getElementById(linkId)) {
                const link = document.createElement('link');
                link.id = linkId;
                link.href = `https://fonts.googleapis.com/css2?family=${fontFamilies}&display=swap`;
                link.rel = 'stylesheet';
                document.head.appendChild(link);
            }
        }
    }, []);

    const [config, setConfig] = useState<MarketingCanvasConfig>(
        design?.config || template?.config || {
            backgroundColor: '#ffffff',
            backgroundImageUrl: '',
            textColor: '#000000',
            format: 'post',
            elements: []
        }
    );
    const [designName, setDesignName] = useState(design?.name || `Design ${new Date().toLocaleDateString()}`);
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [selectingBackground, setSelectingBackground] = useState(false);
    const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
    const [scale, setScale] = useState(0.5);

    // AI / NanoBanana State
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);
    const [apiKey, setApiKey] = useState<string | null>(null);
    const { alert: showMessage } = useDialog();

    useEffect(() => {
        cloud.getShopSettings().then(settings => {
            if (settings?.google_gemini_api_key) {
                setApiKey(settings.google_gemini_api_key);
            }
        });
    }, []);

    const handleGenerateDesign = async () => {
        if (!apiKey) {
            showMessage({ title: 'Configuração', message: 'Chave API do Zé Assistente não configurada nas Configurações da Loja.' });
            return;
        }
        if (!aiPrompt.trim()) return;
        setIsGeneratingAi(true);
        try {
            const instructionPrompt = `
                Você é um designer gráfico expert. Crie um design de marketing baseado neste pedido: "${aiPrompt}".
                Retorne APENAS um JSON válido (sem markdown) seguindo esta interface:
                interface MarketingCanvasConfig {
                    backgroundColor: string;
                    backgroundImageUrl?: string;
                    textColor: string;
                    elements: {
                        id: string; // use um placeholder
                        type: 'text' | 'image';
                        text?: string; 
                        x: number;
                        y: number;
                        width: number;
                        height: number;
                        fontSize?: number;
                        fontWeight?: string;
                        fontFamily?: string;
                        color?: string;
                        rotation?: number;
                        zIndex: number;
                        imageUrl?: string;
                        shape?: 'square' | 'circle';
                    }[];
                }
                Use placeholders "https://placehold.co/600x400" para imagens se necessário.
                O canvas tem 1080x1080. Apenas JSON puro.
            `;

            const response = await cloud.generateAIContent(instructionPrompt, apiKey);

            // FIXED: Access text directly from our helper
            const responseText = response.text;

            if (!responseText) throw new Error("Sem resposta do gerador");

            // Limpeza básica do JSON
            const jsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const generatedConfig = JSON.parse(jsonString);

            // Ajuste de IDs e fallback
            const elements = (generatedConfig.elements || []).map((el: any) => ({
                ...el,
                id: crypto.randomUUID(),
                fontFamily: el.fontFamily || GOOGLE_FONTS[0].family
            }));

            setConfig(prev => ({
                ...prev,
                backgroundColor: generatedConfig.backgroundColor || '#ffffff',
                backgroundImageUrl: generatedConfig.backgroundImageUrl,
                textColor: generatedConfig.textColor || '#000000',
                elements: elements
            }));

            setIsAiModalOpen(false);
            setAiPrompt('');
        } catch (error) {
            // console.error(error);
            alert('Erro ao gerar design. Tente novamente.');
        } finally {
            setIsGeneratingAi(false);
        }
    };

    const canvasRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const backgroundInputRef = useRef<HTMLInputElement>(null);

    const sb = cloud.getClient();

    const selectedElement = config.elements.find(el => el.id === selectedElementId);

    const canvasDimensions = config.format === 'post'
        ? { width: 1080, height: 1080 }
        : { width: 1080, height: 1920 };

    const handleUpdateElement = (id: string, updates: Partial<MarketingElement>) => {
        setConfig(prev => ({
            ...prev,
            elements: prev.elements.map(el => el.id === id ? { ...el, ...updates } : el)
        }));
    };

    const handleDeleteElement = (id: string) => {
        setConfig(prev => ({
            ...prev,
            elements: prev.elements.filter(el => el.id !== id)
        }));
        setSelectedElementId(null);
    };

    const handleAddTextElement = () => {
        const newElement: MarketingElement = {
            id: crypto.randomUUID(),
            type: 'text',
            text: 'Novo Texto',
            x: 100,
            y: 100,
            width: 400,
            height: 80,
            fontSize: 32,
            fontWeight: 'normal',
            fontFamily: GOOGLE_FONTS[0].family,
            color: config.textColor,
            zIndex: config.elements.length,
            rotation: 0
        };
        setConfig(prev => ({
            ...prev,
            elements: [...prev.elements, newElement]
        }));
        setSelectedElementId(newElement.id);
        setSelectingBackground(false);
    };

    const handleAddImageElement = () => {
        const newElement: MarketingElement = {
            id: crypto.randomUUID(),
            type: 'image',
            x: 200,
            y: 200,
            width: 300,
            height: 300,
            shape: 'square',
            zIndex: config.elements.length,
            rotation: 0
        };
        setConfig(prev => ({
            ...prev,
            elements: [...prev.elements, newElement]
        }));
        setSelectedElementId(newElement.id);
        setSelectingBackground(false);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            if (design?.id) {
                if (!sb) throw new Error("Cliente Supabase não inicializado");
                const { error } = await sb
                    .from('marketing_designs')
                    .update({
                        name: designName,
                        config: config,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', design.id);
                if (error) throw error;
            } else {
                if (!sb) throw new Error("Cliente Supabase não inicializado");
                const { data: { user } } = await sb.auth.getUser();
                if (!user) throw new Error("Usuário não logado");

                const { error } = await sb
                    .from('marketing_designs')
                    .insert({
                        user_id: user.id,
                        template_id: template?.id || null,
                        name: designName,
                        config: config
                    });
                if (error) throw error;
            }
            alert('Design salvo com sucesso!');
        } catch (error) {
            // console.error(error);
            alert('Erro ao salvar design');
        } finally {
            setIsSaving(false);
        }
    };

    const handleExport = async () => {
        if (!canvasRef.current) return;
        setIsExporting(true);
        try {
            const canvas = await html2canvas(canvasRef.current, {
                useCORS: true,
                scale: 2,
                backgroundColor: null
            });
            const link = document.createElement('a');
            link.download = `${designName.replace(/\s+/g, '_')}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (error) {
            // console.error(error);
            alert('Erro ao exportar imagem');
        } finally {
            setIsExporting(false);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, target: 'element' | 'background') => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const url = await uploader.uploadMarketingAsset(file);

            if (target === 'background') {
                setConfig(prev => ({ ...prev, backgroundImageUrl: url }));
            } else if (selectedElementId) {
                handleUpdateElement(selectedElementId, { imageUrl: url });
            }
        } catch (error: any) {
            alert(error.message || "Erro no upload");
        } finally {
            setIsUploading(false);
        }
    };

    const handleSelectBackground = () => {
        setSelectedElementId(null);
        setSelectingBackground(true);
    };

    const handleBringToFront = () => {
        if (!selectedElementId) return;
        const maxZ = Math.max(...config.elements.map(el => el.zIndex || 0));
        handleUpdateElement(selectedElementId, { zIndex: maxZ + 1 });
    };

    const handleSendToBack = () => {
        if (!selectedElementId) return;
        const minZ = Math.min(...config.elements.map(el => el.zIndex || 0));
        handleUpdateElement(selectedElementId, { zIndex: minZ - 1 });
    };

    return (
        <div className="fixed inset-0 z-50 bg-gray-50 dark:bg-gray-900 flex flex-col h-screen w-screen">
            {/* Header */}
            <div className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                    <button
                        onClick={() => setIsAiModalOpen(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white rounded-full text-xs font-black shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
                    >
                        <Sparkles className="w-3 h-3" /> NanoBanana
                    </button>
                    <input
                        type="text"
                        value={designName}
                        onChange={(e) => setDesignName(e.target.value)}
                        className="bg-transparent text-lg font-bold text-gray-900 dark:text-white border-none focus:ring-0"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <Button onClick={handleSave} disabled={isSaving} variant="secondary">
                        <Save className="w-4 h-4 mr-2" />
                        {isSaving ? 'Salvando...' : 'Salvar'}
                    </Button>
                    <Button onClick={handleExport} disabled={isExporting}>
                        <Download className="w-4 h-4 mr-2" />
                        {isExporting ? 'Exportando...' : 'Baixar Imagem'}
                    </Button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar: Tools */}
                <div className="w-20 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col items-center py-6 gap-6 z-10 flex-shrink-0">
                    <button onClick={handleAddTextElement} className="flex flex-col items-center gap-2 text-gray-500 hover:text-purple-600 transition-colors group">
                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700 group-hover:bg-purple-50 group-hover:text-purple-600 transition-colors">
                            <Type className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-bold">Texto</span>
                    </button>
                    <button onClick={handleAddImageElement} className="flex flex-col items-center gap-2 text-gray-500 hover:text-purple-600 transition-colors group">
                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700 group-hover:bg-purple-50 group-hover:text-purple-600 transition-colors">
                            <ImageIcon className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-bold">Imagem</span>
                    </button>
                </div>

                {/* Center: Canvas Area */}
                <div className="flex-1 bg-gray-100 dark:bg-gray-900 overflow-hidden relative flex items-center justify-center p-8">
                    {/* Zoom & Controls */}
                    <div className="absolute top-4 left-4 flex gap-2 z-20">
                        <div className="flex bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-1">
                            <button onClick={() => setScale(s => Math.max(0.2, s - 0.1))} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><ZoomOut className="w-4 h-4" /></button>
                            <span className="px-2 flex items-center text-xs font-bold text-gray-500">{Math.round(scale * 100)}%</span>
                            <button onClick={() => setScale(s => Math.min(2, s + 0.1))} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><ZoomIn className="w-4 h-4" /></button>
                        </div>
                        <div className="flex bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-1">
                            <button onClick={() => setConfig(prev => ({ ...prev, format: 'post' }))} className={`p-2 rounded ${config.format === 'post' ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-100'}`} title="Post (1:1)"><Square className="w-4 h-4" /></button>
                            <button onClick={() => setConfig(prev => ({ ...prev, format: 'story' }))} className={`p-2 rounded ${config.format === 'story' ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-100'}`} title="Story (9:16)"><Smartphone className="w-4 h-4" /></button>
                        </div>
                    </div>

                    <div
                        className="relative shadow-2xl transition-all duration-300 ease-in-out"
                        style={{
                            width: canvasDimensions.width * scale,
                            height: canvasDimensions.height * scale,
                            backgroundColor: '#202124'
                        }}
                    >
                        <div
                            ref={canvasRef}
                            style={{
                                width: canvasDimensions.width,
                                height: canvasDimensions.height,
                                backgroundColor: config.backgroundColor,
                                backgroundImage: config.backgroundImageUrl ? `url(${config.backgroundImageUrl})` : 'none',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                transform: `scale(${scale})`,
                                transformOrigin: 'top left',
                                overflow: 'hidden',
                                position: 'relative'
                            }}
                        >
                            {/* Render Elements WITHOUT Interaction Handlers */}
                            {config.elements
                                .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
                                .map((el) => (
                                    <div
                                        key={el.id}
                                        style={{
                                            position: 'absolute',
                                            left: el.x,
                                            top: el.y,
                                            width: el.width,
                                            height: el.height,
                                            zIndex: el.zIndex || 0,
                                            transform: `rotate(${el.rotation || 0}deg)`,
                                        }}
                                    >
                                        {el.type === 'text' ? (
                                            <div style={{
                                                fontSize: el.fontSize,
                                                fontWeight: el.fontWeight,
                                                fontFamily: el.fontFamily,
                                                color: el.color || config.textColor,
                                                width: '100%',
                                                height: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                textAlign: 'center',
                                                wordWrap: 'break-word',
                                                padding: '8px',
                                            }}>
                                                {el.text}
                                            </div>
                                        ) : (
                                            <div
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    backgroundColor: el.imageUrl ? 'transparent' : '#e5e7eb',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    borderRadius: el.shape === 'circle' ? '50%' : '8px',
                                                    overflow: 'hidden',
                                                    // Borda configurável (Externa via box-shadow)
                                                    boxShadow: `0 0 0 ${el.borderWidth || 0}px ${el.borderColor || 'transparent'}`,
                                                    // border: `${el.borderWidth || 0}px solid ${el.borderColor || 'transparent'}`, // Removido para ser externa
                                                }}
                                            >
                                                {el.imageUrl ? (
                                                    <img
                                                        src={el.imageUrl}
                                                        alt="Element"
                                                        className="w-full h-full object-cover"
                                                        style={{ borderRadius: el.shape === 'circle' ? '50%' : '0' }} // Garante que a imagem respeite o formato
                                                    />
                                                ) : (
                                                    <ImageIcon className="w-16 h-16 text-gray-300" />
                                                )}
                                            </div>
                                        )}
                                        {selectedElementId === el.id && (
                                            <div className="absolute inset-0 border-2 border-purple-500 pointer-events-none rounded-lg" />
                                        )}
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>

                {/* Right Sidebar: Layers & Properties */}
                <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-100 dark:border-gray-700 overflow-y-auto p-6 flex flex-col">

                    {/* EDITING MODE */}
                    {(selectedElement || selectingBackground) ? (
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 pb-4 border-b border-gray-100 dark:border-gray-700">
                                <button
                                    onClick={() => { setSelectedElementId(null); setSelectingBackground(false); }}
                                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    <ChevronLeft className="w-5 h-5 text-gray-500" />
                                </button>
                                <div>
                                    <h3 className="text-lg font-black text-gray-900 dark:text-white leading-tight">
                                        {selectingBackground ? 'Editar Fundo' : (selectedElement?.type === 'text' ? 'Editar Texto' : 'Editar Imagem')}
                                    </h3>
                                </div>
                            </div>

                            {/* BACKGROUND PROPERTIES */}
                            {selectingBackground && (
                                <div className="space-y-6">
                                    {/* Upload Imagem de Fundo */}
                                    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-purple-500 transition-colors group text-center cursor-pointer relative">
                                        <input
                                            type="file"
                                            ref={backgroundInputRef}
                                            onChange={(e) => handleFileUpload(e, 'background')}
                                            accept="image/*"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            disabled={isUploading}
                                        />
                                        <div className="flex flex-col items-center gap-2">
                                            {isUploading ? (
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                                            ) : (
                                                <>
                                                    <Upload className="w-6 h-6 text-gray-400 group-hover:text-purple-500" />
                                                    <span className="text-xs font-bold text-gray-500 group-hover:text-purple-600">
                                                        {config.backgroundImageUrl ? 'Trocar Imagem' : 'Carregar Imagem'}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {config.backgroundImageUrl && (
                                        <button
                                            onClick={() => setConfig(prev => ({ ...prev, backgroundImageUrl: '' }))}
                                            className="w-full py-2 text-xs font-bold text-red-500 bg-red-50 rounded-lg hover:bg-red-100"
                                        >
                                            Remover Imagem de Fundo
                                        </button>
                                    )}

                                    {/* Solid Color */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-2">Cor Sólida</label>
                                        <input
                                            type="color"
                                            value={config.backgroundColor}
                                            onChange={(e) => setConfig(prev => ({ ...prev, backgroundColor: e.target.value }))}
                                            className="w-full h-10 rounded-lg cursor-pointer"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* ELEMENT PROPERTIES */}
                            {selectedElement && (
                                <>
                                    {selectedElement.type === 'text' && (
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 mb-2">Conteúdo</label>
                                                <textarea
                                                    value={selectedElement.text}
                                                    onChange={(e) => handleUpdateElement(selectedElement.id, { text: e.target.value })}
                                                    className="w-full bg-gray-50 dark:bg-gray-900/50 border-2 border-transparent focus:border-purple-500 rounded-xl p-3 text-sm font-bold resize-none min-h-[100px]"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 mb-2">Fonte</label>
                                                <select
                                                    value={selectedElement.fontFamily || GOOGLE_FONTS[0].family}
                                                    onChange={(e) => handleUpdateElement(selectedElement.id, { fontFamily: e.target.value })}
                                                    className="w-full bg-gray-50 dark:bg-gray-900/50 border-2 border-transparent focus:border-purple-500 rounded-xl p-3 text-xs cursor-pointer font-bold text-gray-700 dark:text-gray-300"
                                                >
                                                    {GOOGLE_FONTS.map(font => (
                                                        <option key={font.name} value={font.family}>
                                                            {font.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 mb-2">Cor</label>
                                                <input
                                                    type="color"
                                                    value={selectedElement.color || config.textColor}
                                                    onChange={(e) => handleUpdateElement(selectedElement.id, { color: e.target.value })}
                                                    className="w-full h-10 rounded-lg cursor-pointer"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 mb-2">Tamanho: {selectedElement.fontSize}px</label>
                                                <input
                                                    type="range"
                                                    min="12"
                                                    max="200"
                                                    value={selectedElement.fontSize}
                                                    onChange={(e) => handleUpdateElement(selectedElement.id, { fontSize: parseInt(e.target.value) || 0 })}
                                                    className="w-full accent-purple-600"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {selectedElement.type === 'image' && (
                                        <div className="space-y-4">
                                            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-purple-500 transition-colors group text-center cursor-pointer relative">
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    onChange={(e) => handleFileUpload(e, 'element')}
                                                    accept="image/*"
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                    disabled={isUploading}
                                                />
                                                <div className="flex flex-col items-center gap-2">
                                                    {isUploading ? (
                                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                                                    ) : (
                                                        <>
                                                            <Upload className="w-6 h-6 text-gray-400 group-hover:text-purple-500" />
                                                            <span className="text-xs font-bold text-gray-500 group-hover:text-purple-600">Carregar Imagem</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 mb-2">Formato</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        onClick={() => handleUpdateElement(selectedElement.id, { shape: 'square' })}
                                                        className={`p-3 rounded-xl border-2 ${selectedElement.shape === 'square' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`}
                                                    >
                                                        Quadrado
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateElement(selectedElement.id, { shape: 'circle' })}
                                                        className={`p-3 rounded-xl border-2 ${selectedElement.shape === 'circle' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`}
                                                    >
                                                        Redondo
                                                    </button>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 mb-2">Borda</label>
                                                <div className="space-y-3">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-400">Cor da Borda</label>
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="color"
                                                                value={selectedElement.borderColor || '#000000'}
                                                                onChange={(e) => handleUpdateElement(selectedElement.id, { borderColor: e.target.value })}
                                                                className="w-8 h-8 rounded cursor-pointer border-none p-0"
                                                            />
                                                            <span className="text-xs font-mono text-gray-500">{selectedElement.borderColor || '#000000'}</span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-400">Espessura: {selectedElement.borderWidth || 0}px</label>
                                                        <input
                                                            type="range"
                                                            min="0"
                                                            max="20"
                                                            value={selectedElement.borderWidth || 0}
                                                            onChange={(e) => handleUpdateElement(selectedElement.id, { borderWidth: parseInt(e.target.value) || 0 })}
                                                            className="w-full accent-purple-600"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <hr className="border-gray-100 dark:border-gray-700" />

                                    {/* POSIÇÃO E ROTAÇÃO */}
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider">Geometria</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-500 mb-1">Posição X</label>
                                                <input
                                                    type="number"
                                                    value={Math.round(selectedElement.x)}
                                                    onChange={(e) => handleUpdateElement(selectedElement.id, { x: parseInt(e.target.value) || 0 })}
                                                    className="w-full bg-gray-50 rounded-lg p-2 text-xs font-mono"
                                                />
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max={canvasDimensions.width}
                                                    value={selectedElement.x}
                                                    onChange={(e) => handleUpdateElement(selectedElement.id, { x: parseInt(e.target.value) || 0 })}
                                                    className="w-full accent-purple-600 mt-1"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-500 mb-1">Posição Y</label>
                                                <input
                                                    type="number"
                                                    value={Math.round(selectedElement.y)}
                                                    onChange={(e) => handleUpdateElement(selectedElement.id, { y: parseInt(e.target.value) || 0 })}
                                                    className="w-full bg-gray-50 rounded-lg p-2 text-xs font-mono"
                                                />
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max={canvasDimensions.height}
                                                    value={selectedElement.y}
                                                    onChange={(e) => handleUpdateElement(selectedElement.id, { y: parseInt(e.target.value) || 0 })}
                                                    className="w-full accent-purple-600 mt-1"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-bold text-gray-500 flex items-center gap-2">
                                                    <RotateCw className="w-3 h-3" /> Rotação
                                                </label>
                                                <span className="text-[10px] font-mono">{selectedElement.rotation || 0}°</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="360"
                                                value={selectedElement.rotation || 0}
                                                onChange={(e) => handleUpdateElement(selectedElement.id, { rotation: parseInt(e.target.value) || 0 })}
                                                className="w-full accent-purple-600"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-500 mb-1">Largura</label>
                                                <input
                                                    type="range"
                                                    min="50"
                                                    max={canvasDimensions.width}
                                                    value={selectedElement.width}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value) || 0;
                                                        const updates: Partial<MarketingElement> = { width: val };
                                                        if (maintainAspectRatio && selectedElement.width && selectedElement.height) {
                                                            const ratio = selectedElement.width / selectedElement.height;
                                                            updates.height = Math.round(val / ratio);
                                                        }
                                                        handleUpdateElement(selectedElement.id, updates);
                                                    }}
                                                    className="w-full accent-purple-600"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-500 mb-1">Altura</label>
                                                <input
                                                    type="range"
                                                    min="50"
                                                    max={canvasDimensions.height}
                                                    value={selectedElement.height}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value) || 0;
                                                        const updates: Partial<MarketingElement> = { height: val };
                                                        if (maintainAspectRatio && selectedElement.width && selectedElement.height) {
                                                            const ratio = selectedElement.width / selectedElement.height;
                                                            updates.width = Math.round(val * ratio);
                                                        }
                                                        handleUpdateElement(selectedElement.id, updates);
                                                    }}
                                                    className="w-full accent-purple-600"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 pt-2">
                                            <input
                                                type="checkbox"
                                                id="aspectRatio"
                                                checked={maintainAspectRatio}
                                                onChange={(e) => setMaintainAspectRatio(e.target.checked)}
                                                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                            />
                                            <label htmlFor="aspectRatio" className="text-xs font-bold text-gray-500 cursor-pointer select-none">
                                                Manter Proporção
                                            </label>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-gray-100 dark:border-gray-700">
                                        <button
                                            onClick={() => handleDeleteElement(selectedElement.id)}
                                            className="w-full flex items-center justify-center gap-2 p-3 text-red-500 bg-red-50 hover:bg-red-100 rounded-xl font-bold transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" /> Excluir Elemento
                                        </button>
                                    </div>

                                    <div className="space-y-2 pt-4">
                                        <label className="block text-xs font-bold text-gray-500 mb-2">Ordem (Z-Index)</label>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleBringToFront}
                                                className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs font-bold hover:bg-gray-200"
                                            >
                                                Trazer Frente
                                            </button>
                                            <button
                                                onClick={handleSendToBack}
                                                className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs font-bold hover:bg-gray-200"
                                            >
                                                Enviar Trás
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        /* LAYERS LIST MODE */
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-black text-gray-900 dark:text-white">Camadas</h3>
                                <span className="text-xs font-bold text-gray-400">{config.elements.length} itens</span>
                            </div>

                            <div className="space-y-2">
                                {config.elements
                                    .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0)) // Show top layers first
                                    .map((el) => (
                                        <div
                                            key={el.id}
                                            onClick={() => { setSelectedElementId(el.id); setSelectingBackground(false); }}
                                            className="group flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl hover:border-purple-500 cursor-pointer transition-all shadow-sm hover:shadow-md"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 group-hover:text-purple-500 transition-colors">
                                                {el.type === 'text' ? <Type className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate">
                                                    {el.type === 'text' ? (el.text || 'Texto sem conteúdo') : 'Imagem'}
                                                </p>
                                                <p className="text-[10px] text-gray-400 font-medium">
                                                    {el.type === 'text' ? `${Math.round(el.fontSize || 0)}px` : `${Math.round(el.width)}x${Math.round(el.height)}`}
                                                </p>
                                            </div>
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="p-1.5 rounded-md bg-purple-50 text-purple-600">
                                                    <MoveVertical className="w-3 h-3" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                {/* Background Layer Item */}
                                <div
                                    onClick={handleSelectBackground}
                                    className={`group flex items-center gap-3 p-3 border-2 border-dashed ${selectingBackground ? 'border-purple-500 bg-purple-50' : 'border-gray-200 dark:border-gray-700'} rounded-xl cursor-pointer hover:border-purple-400 transition-all`}
                                >
                                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500">
                                        <Layout className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-gray-700 dark:text-gray-200">Fundo do Design</p>
                                        <p className="text-[10px] text-gray-400">
                                            {config.backgroundImageUrl ? 'Imagem' : 'Cor Sólida'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal NanoBanana */}
            {isAiModalOpen && (
                <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl p-6 transform transition-all scale-100">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-yellow-100 rounded-lg">
                                    <Wand2 className="w-6 h-6 text-yellow-600" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-gray-900 dark:text-white">NanoBanana AI</h3>
                                    <p className="text-xs text-gray-500">Criador de Designs Automático</p>
                                </div>
                            </div>
                            <button onClick={() => setIsAiModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                    O que você quer criar?
                                </label>
                                <textarea
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    placeholder="Ex: Post para dia das mães com fundo rosa e oferta de 50% de desconto..."
                                    className="w-full bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 text-sm focus:border-yellow-500 focus:ring-0 min-h-[120px] resize-none"
                                />
                            </div>

                            <Button
                                fullWidth
                                onClick={handleGenerateDesign}
                                disabled={isGeneratingAi || !aiPrompt.trim()}
                                className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white border-none h-12 text-sm"
                            >
                                {isGeneratingAi ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-b-white mr-2"></div>
                                        Criando mágica...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4 mr-2" />
                                        Gerar Design
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
