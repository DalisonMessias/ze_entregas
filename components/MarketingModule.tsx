import React, { useState, useEffect } from 'react';
import { Palette, Layout, Save, Download, Plus, Wand2, Image as ImageIcon, Sparkles, Trash2, Edit3, ChevronRight, Megaphone, Search } from 'lucide-react';
import { Button } from './Button';
import * as cloud from '../services/cloud';
import { MarketingTemplate, MarketingDesign } from '../types';
import { MarketingEditor } from './MarketingEditor';
import { ProfileValidationAlert } from './ProfileValidationAlert';
import { validateStoreProfile } from '../utils/profileValidation';

// Template padrão para designs em branco
const DEFAULT_BLANK_TEMPLATE: MarketingTemplate = {
    id: 'blank',
    name: 'Design em Branco',
    category: 'custom',
    format: 'square',
    is_active: true,
    config: {
        backgroundColor: '#ffffff',
        textColor: '#000000',
        format: 'post', // Formato padrão: Post (1080x1080)
        elements: [
            {
                type: 'text',
                id: 'title',
                text: 'SEU TÍTULO AQUI',
                x: 90,
                y: 100,
                width: 900,
                height: 120,
                fontSize: 64,
                fontWeight: 'black',
                color: '#000000',
                zIndex: 2
            },
            {
                type: 'text',
                id: 'subtitle',
                text: 'Subtítulo ou descrição do seu produto',
                x: 90,
                y: 240,
                width: 900,
                height: 60,
                fontSize: 32,
                color: '#666666',
                zIndex: 2
            },
            {
                type: 'image',
                id: 'product',
                shape: 'square',
                x: 290,
                y: 400,
                width: 500,
                height: 500,
                zIndex: 1
            },
            {
                type: 'text',
                id: 'contact',
                text: 'Seu contato: (00) 00000-0000',
                x: 90,
                y: 950,
                width: 900,
                height: 50,
                fontSize: 28,
                color: '#000000',
                zIndex: 2
            }
        ]
    }
};

export const MarketingModule: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'templates' | 'my_designs'>('templates');
    const [templates, setTemplates] = useState<MarketingTemplate[]>([]);
    const [myDesigns, setMyDesigns] = useState<MarketingDesign[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingDesign, setEditingDesign] = useState<{ template?: MarketingTemplate, design?: MarketingDesign } | null>(null);
    const [profileValid, setProfileValid] = useState<boolean | null>(null);
    const [missingFields, setMissingFields] = useState<string[]>([]);

    useEffect(() => {
        loadMarketingData();
    }, []);

    const loadMarketingData = async () => {
        setLoading(true);
        const sb = cloud.getClient();
        try {
            const [templatesData, designsData, profile] = await Promise.all([
                sb?.from('marketing_templates').select('*').eq('is_active', true) || Promise.resolve({ data: null, error: null }),
                sb?.from('marketing_designs').select('*').order('updated_at', { ascending: false }) || Promise.resolve({ data: null, error: null }),
                cloud.getMyPartnerProfile()
            ]);

            // console.log('Templates carregados:', templatesData.data);
            // console.log('Designs carregados:', designsData.data);

            if (templatesData.error) {
                // console.error('Erro ao carregar templates:', templatesData.error);
            }
            if (designsData.error) {
                // console.error('Erro ao carregar designs:', designsData.error);
            }

            setTemplates(templatesData.data || []);
            setMyDesigns(designsData.data || []);

            // Validar perfil
            if (profile && profile.city) {
                setProfileValid(true);
            } else {
                setProfileValid(false);
            }
        } catch (error) {
            // console.error('Error loading marketing data:', error);
            setTemplates([]);
            setMyDesigns([]);
            setProfileValid(false);
        } finally {
            setLoading(false);
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

    if (editingDesign) {
        return (
            <MarketingEditor
                template={editingDesign.template}
                design={editingDesign.design}
                onClose={() => {
                    setEditingDesign(null);
                    loadMarketingData();
                }}
            />
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Megaphone className="w-32 h-32 rotate-12" />
                </div>
                <div className="relative z-10">
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3 mb-2">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-2xl text-purple-600 dark:text-purple-400">
                            <Palette className="w-8 h-8" />
                        </div>
                        Estúdio de Marketing
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 max-w-2xl font-medium">
                        Crie artes profissionais para suas redes sociais em segundos. Escolha um template, personalize e exporte. Consistência visual e profissionalismo para sua marca.
                    </p>
                </div>

                <div className="flex items-center gap-2 mt-8 p-1 bg-gray-50 dark:bg-gray-900/50 rounded-2xl w-full overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setActiveTab('templates')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'templates' ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        <Layout className="w-4 h-4" /> Templates Prontos
                    </button>
                    <button
                        onClick={() => setActiveTab('my_designs')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'my_designs' ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        <Save className="w-4 h-4" /> Meus Designs
                    </button>
                </div>
            </div>

            {/* Grid Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center p-20 grayscale opacity-50">
                    <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="font-bold text-gray-400">Carregando estúdio...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {activeTab === 'templates' ? (
                        <>
                            {templates.length === 0 && (
                                <div className="col-span-full flex flex-col items-center justify-center p-20 text-center bg-white dark:bg-gray-800 rounded-[2rem] border border-gray-100 dark:border-gray-700">
                                    <div className="p-6 bg-purple-50 dark:bg-purple-900/10 rounded-full text-purple-300 mb-4">
                                        <Wand2 className="w-12 h-12" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Nenhum template disponível</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mb-6 font-medium">
                                        As tabelas do banco de dados ainda não foram criadas. Execute o script SQL para criar as tabelas e inserir os templates iniciais.
                                    </p>
                                    <button
                                        onClick={() => setEditingDesign({ template: DEFAULT_BLANK_TEMPLATE })}
                                        className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition-all flex items-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" /> Criar Design em Branco
                                    </button>
                                </div>
                            )}
                            {templates.map((template) => (
                                <div
                                    key={template.id}
                                    className="group bg-white dark:bg-gray-800 rounded-[2rem] border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1"
                                >
                                    <div className="aspect-square bg-gray-50 dark:bg-gray-900 flex items-center justify-center relative group-hover:bg-purple-50 dark:group-hover:bg-purple-900/10 transition-colors">
                                        {template.thumbnail_url ? (
                                            <img src={template.thumbnail_url} alt={template.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="flex flex-col items-center text-purple-200 dark:text-purple-800">
                                                <ImageIcon className="w-16 h-16 mb-2" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">{template.format}</span>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                            <Button
                                                onClick={() => setEditingDesign({ template })}
                                                variant="primary"
                                                className="bg-white text-purple-600 hover:bg-purple-50 border-none shadow-xl scale-90 group-hover:scale-100 transition-transform"
                                            >
                                                Usar Template
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className="font-black text-gray-900 dark:text-white truncate">{template.name}</h3>
                                            <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-full uppercase">{template.category}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Formato: {template.format === 'square' ? 'Quadrado (1:1)' : template.format}</p>
                                    </div>
                                </div>
                            ))}
                        </>
                    ) : (
                        <>
                            {/* Create Blank Card */}
                            <button
                                onClick={() => setEditingDesign({ template: DEFAULT_BLANK_TEMPLATE })}
                                className="aspect-square rounded-[2rem] border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center gap-3 text-gray-400 hover:border-purple-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-all group"
                            >
                                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-full group-hover:bg-white dark:group-hover:bg-gray-700 transition-colors shadow-sm">
                                    <Plus className="w-6 h-6" />
                                </div>
                                <span className="font-bold text-sm">Novo Design</span>
                            </button>

                            {myDesigns.map((design) => (
                                <div
                                    key={design.id}
                                    className="group bg-white dark:bg-gray-800 rounded-[2rem] border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-all relative"
                                >
                                    <div className="aspect-square bg-gray-50 dark:bg-gray-900 flex items-center justify-center overflow-hidden">
                                        {design.last_image_url ? (
                                            <img src={design.last_image_url} alt={design.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="p-12 opacity-10">
                                                <Megaphone className="w-full h-full" />
                                            </div>
                                        )}
                                        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                            <Button
                                                onClick={() => setEditingDesign({ design })}
                                                className="flex-1 bg-white/20 backdrop-blur-md text-white border-white/30 hover:bg-white/40 text-xs py-2"
                                            >
                                                <Edit3 className="w-3 h-3 mr-1.5" /> Editar
                                            </Button>
                                            <Button
                                                onClick={() => { }} // TODO: Export direct
                                                className="bg-purple-600 hover:bg-purple-500 text-white border-none text-xs p-2"
                                            >
                                                <Download className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="p-5">
                                        <h3 className="font-bold text-gray-900 dark:text-white truncate text-sm mb-1">{design.name}</h3>
                                        <p className="text-[10px] text-gray-400 font-medium">Editado há {new Date(design.updated_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            )}

            {/* Empty State */}
            {!loading && activeTab === 'my_designs' && myDesigns.length === 0 && (
                <div className="flex flex-col items-center justify-center p-20 text-center bg-white dark:bg-gray-800 rounded-[2rem] border border-gray-100 dark:border-gray-700">
                    <div className="p-6 bg-purple-50 dark:bg-purple-900/10 rounded-full text-purple-300 mb-4">
                        <Wand2 className="w-12 h-12" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Sem designs salvos</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mb-6 font-medium">
                        Você ainda não criou nenhum design. Comece explorando nossos templates prontos!
                    </p>
                    <Button onClick={() => setActiveTab('templates')} variant="primary">
                        Ver Templates
                    </Button>
                </div>
            )}
        </div>
    );
};
