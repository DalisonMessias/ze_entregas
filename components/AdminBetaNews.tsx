import React, { useState, useEffect } from 'react';
import { Sparkles, Save, Loader2, RefreshCw, Plus, History, ChevronRight } from 'lucide-react';
import * as cloud from '../services/cloud';
import { useDialog } from '../utils/dialogService';

export const AdminBetaNews: React.FC = () => {
    const dialog = useDialog();
    
    // Estados do Formulário
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [currentVersion, setCurrentVersion] = useState<number | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isNewMode, setIsNewMode] = useState(false);

    // Estados de Controle Visual e Dados
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [announcementsList, setAnnouncementsList] = useState<any[]>([]);

    // Carrega todo o histórico e popula a novidade ativa inicial
    const loadData = async (shouldSelectLatest = true) => {
        setLoading(true);
        try {
            const list = await cloud.adminGetAllAnnouncements();
            setAnnouncementsList(list);

            if (list.length > 0) {
                if (shouldSelectLatest) {
                    // Seleciona o anúncio mais recente para edição inicial por padrão
                    const latest = list[0];
                    setTitle(latest.title);
                    setContent(latest.content);
                    setCurrentVersion(latest.version);
                    setSelectedId(latest.id);
                    setIsNewMode(false);
                } else if (selectedId) {
                    // Mantém o item selecionado ativo se ele ainda existir
                    const current = list.find(item => item.id === selectedId);
                    if (current) {
                        setTitle(current.title);
                        setContent(current.content);
                        setCurrentVersion(current.version);
                        setIsNewMode(false);
                    }
                }
            } else {
                // Caso não existam anúncios no banco, inicia automaticamente no modo de criação
                handleInitNewAnnouncement(false);
            }
        } catch (e: any) {
            console.error('Erro ao buscar dados do histórico de novidades:', e);
            dialog.toast({ message: 'Erro ao carregar o histórico de novidades.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadData(true);
    }, []);

    // Ativa o modo de criação de nova novidade
    const handleInitNewAnnouncement = (showToast = true) => {
        setIsNewMode(true);
        setSelectedId(null);
        setTitle('');
        setContent('');
        setCurrentVersion(null);
        if (showToast) {
            dialog.toast({ 
                message: 'Modo de criação ativo! Escreva a nova novidade e clique em salvar.', 
                type: 'info' 
            });
        }
    };

    // Carrega um item específico do histórico para o formulário de edição
    const handleSelectAnnouncement = (item: any) => {
        setSelectedId(item.id);
        setTitle(item.title);
        setContent(item.content);
        setCurrentVersion(item.version);
        setIsNewMode(false);
        dialog.toast({ 
            message: `Novidade v${item.version} carregada para edição.`, 
            type: 'info' 
        });
    };

    // Salvar registro (Novo ou Edição)
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) {
            dialog.toast({ message: 'Por favor, preencha todos os campos antes de salvar.', type: 'warning' });
            return;
        }

        setSaving(true);
        try {
            const res = await cloud.adminSaveAnnouncement(title, content, selectedId, isNewMode);
            if (res.success) {
                dialog.toast({ 
                    message: isNewMode 
                        ? 'Nova novidade criada com sucesso! Todos os lojistas receberão o modal no próximo acesso.' 
                        : 'Novidade atualizada com sucesso! Leituras redefinidas para quem já havia visualizado esta versão.', 
                    type: 'success' 
                });
                
                // Recarrega os dados. Se for novo, recarrega selecionando o mais recente
                await loadData(isNewMode);
            } else {
                dialog.toast({ message: res.error || 'Erro ao salvar novidades.', type: 'error' });
            }
        } catch (e: any) {
            dialog.toast({ message: e.message || 'Erro ao realizar operação.', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    // Formatar data para exibição amigável em PT-BR
    const formatDate = (dateStr: string) => {
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateStr;
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-red-500 mb-4" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Carregando painel de novidades...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in p-6">
            {/* Header Premium */}
            <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white p-6 md:p-8 rounded-[32px] shadow-xl relative overflow-hidden">
                <div className="absolute -right-10 -top-10 opacity-10">
                    <Sparkles className="w-48 h-48" />
                </div>
                <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.2em] text-white/80">Painel do Administrador</p>
                          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Novidades da Versão Beta</h1>
                        </div>
                    </div>
                    <p className="text-xs md:text-sm text-white/90 max-w-xl leading-relaxed">
                        Crie e gerencie atualizações do sistema para os lojistas. Ao criar uma nova, todos os lojistas a verão por padrão. Ao editar uma novidade, o status de confirmação é resetado no banco de dados apenas para essa novidade.
                    </p>
                </div>
            </div>

            {/* Layout de Grid: Formulário + Histórico */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                
                {/* Formulário Principal (Esquerda - 2 colunas) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-[32px] p-6 md:p-8 border border-gray-150 dark:border-gray-700/60 shadow-sm space-y-6">
                        <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-gray-700/50">
                            <div>
                                <h2 className="text-lg font-black text-gray-900 dark:text-white">
                                    {isNewMode ? 'Criar Nova Novidade' : 'Editar Informativo de Novidades'}
                                </h2>
                                <p className="text-xs text-gray-400">
                                    {isNewMode 
                                        ? 'Cadastre um informativo totalmente inédito para aparecer de forma global a todos os usuários.' 
                                        : 'Ajuste os dados da novidade e melhorias selecionada no painel lateral.'}
                                </p>
                            </div>
                            <button 
                                onClick={() => void loadData(false)}
                                className="p-2.5 hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-400 rounded-xl transition-colors cursor-pointer active:scale-95 flex items-center justify-center"
                                title="Atualizar dados"
                            >
                                <RefreshCw className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-6">
                            {/* Campo de Título */}
                            <div className="space-y-2">
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">
                                    Título do Informativo
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Ex: Atualização do Gestor e Novos Filtros!"
                                    className="w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 outline-none focus:border-red-500 transition-colors text-sm font-extrabold dark:text-white"
                                    required
                                />
                            </div>

                            {/* Campo de Conteúdo */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">
                                        Novidades e Ajustes (Conteúdo)
                                    </label>
                                    {!isNewMode && currentVersion !== null && (
                                        <span className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                                            Versão Atual: v{currentVersion}
                                        </span>
                                    )}
                                    {isNewMode && (
                                        <span className="bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                            Modo Criação (Nova)
                                        </span>
                                    )}
                                </div>
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Use este espaço para listar as novidades. Dica: use quebras de linha para separar os itens."
                                    rows={12}
                                    className="w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 outline-none focus:border-red-500 transition-colors text-sm leading-relaxed dark:text-white resize-none"
                                    required
                                />
                            </div>

                            {/* Botão de Ação */}
                            <div className="pt-4 border-t border-gray-100 dark:border-gray-700/50 flex justify-end gap-3">
                                {!isNewMode && (
                                    <button
                                        type="button"
                                        onClick={() => handleInitNewAnnouncement(true)}
                                        className="py-3.5 px-6 rounded-2xl text-xs font-black uppercase tracking-widest bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-200 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span>Criar Nova</span>
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className={`py-3.5 px-10 rounded-2xl text-xs font-black uppercase tracking-widest text-white shadow-md transition-all flex items-center justify-center gap-2 ${
                                        saving 
                                            ? 'bg-gray-400 dark:bg-gray-700 cursor-not-allowed' 
                                            : 'bg-gradient-to-r from-red-500 to-orange-500 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] cursor-pointer'
                                    }`}
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Salvando Informativo...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            <span>{isNewMode ? 'Publicar Nova Atualização' : 'Salvar Edição Atual'}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Painel do Histórico (Direita - 1 coluna) */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-[32px] p-6 border border-gray-150 dark:border-gray-700/60 shadow-sm flex flex-col gap-6">
                        <div className="flex items-center gap-2 pb-4 border-b border-gray-100 dark:border-gray-700/50">
                            <History className="w-5 h-5 text-orange-500" />
                            <div>
                                <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-wider">
                                    Histórico de Novidades
                                </h3>
                                <p className="text-[10px] text-gray-400">Linha do tempo das versões criadas</p>
                            </div>
                        </div>

                        {/* Botão de Criação Rápida */}
                        <button
                            type="button"
                            onClick={() => handleInitNewAnnouncement(true)}
                            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-black text-xs uppercase tracking-wider shadow shadow-green-500/10 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Criar Nova Novidade</span>
                        </button>

                        {/* Lista do Histórico */}
                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 no-scrollbar">
                            {announcementsList.length === 0 ? (
                                <div className="text-center py-8 text-gray-400 text-xs">
                                    Nenhuma novidade beta registrada ainda.
                                </div>
                            ) : (
                                announcementsList.map((item) => {
                                    const isSelected = selectedId === item.id && !isNewMode;
                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => handleSelectAnnouncement(item)}
                                            className={`p-4 rounded-2xl border text-left cursor-pointer transition-all flex justify-between items-center group relative overflow-hidden active:scale-[0.98] ${
                                                isSelected
                                                    ? 'bg-red-50/40 dark:bg-red-950/10 border-red-500 dark:border-red-500'
                                                    : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-900/40 dark:hover:bg-gray-900/80 border-gray-100 dark:border-gray-700/40'
                                            }`}
                                        >
                                            {/* Indicador Lateral para item selecionado */}
                                            {isSelected && (
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
                                            )}

                                            <div className="space-y-1.5 flex-1 min-w-0 pr-2">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                                                        isSelected 
                                                            ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' 
                                                            : 'bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                                                    }`}>
                                                        v{item.version}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400">
                                                        {formatDate(item.created_at)}
                                                    </span>
                                                </div>
                                                <h4 className="text-xs font-black text-gray-800 dark:text-gray-200 truncate group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors">
                                                    {item.title}
                                                </h4>
                                                <p className="text-[10px] text-gray-400 line-clamp-2">
                                                    {item.content}
                                                </p>
                                            </div>
                                            <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${
                                                isSelected ? 'text-red-500' : 'text-gray-400 group-hover:translate-x-0.5'
                                            }`} />
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
