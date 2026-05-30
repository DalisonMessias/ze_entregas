
import React, { useState, useEffect } from 'react';
import * as cloud from '../services/cloud';
import { Loader2, AlertTriangle, LogOut } from 'lucide-react';
import { CollaboratorModule } from './CollaboratorModule';

export const CollaboratorWrapper: React.FC<{ userId: string, onLogout: () => void }> = ({ userId, onLogout }) => {
    const [collab, setCollab] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError(null);

            try {
                // 1. Verifica sessão local salva (login pelo nome/senha direto)
                const stored = localStorage.getItem('ze_collaborator_session');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    setCollab(parsed);
                    setLoading(false);
                    return;
                }

                // 2. Sem sessão local: tenta buscar colaborador pelo email do usuário Supabase Auth
                const sb = cloud.getClient();
                if (!sb) {
                    setError('Erro de conexão com o banco de dados.');
                    setLoading(false);
                    return;
                }

                // Busca o email do usuário autenticado
                const { data: { user }, error: userError } = await sb.auth.getUser();
                if (userError || !user?.email) {
                    setError('Não foi possível identificar o usuário logado.');
                    setLoading(false);
                    return;
                }

                // Busca o colaborador pelo email na tabela collaborators
                const { data: collaboratorData, error: collabError } = await sb
                    .from('collaborators')
                    .select('id, store_id, name, email, function, active, avatar_url')
                    .eq('email', user.email)
                    .eq('active', true)
                    .maybeSingle();

                if (collabError) {
                    console.error('[CollaboratorWrapper] Erro ao buscar colaborador:', collabError);
                    setError('Erro ao buscar dados do colaborador.');
                    setLoading(false);
                    return;
                }

                if (!collaboratorData) {
                    setError(
                        `Nenhum colaborador encontrado para o e-mail ${user.email}.\n` +
                        `Certifique-se de que esse usuário foi cadastrado como colaborador por um lojista.`
                    );
                    setLoading(false);
                    return;
                }

                // Monta o objeto de sessão no mesmo formato do login direto
                const sessionObj = {
                    id: collaboratorData.id,
                    store_id: collaboratorData.store_id,
                    name: collaboratorData.name,
                    email: collaboratorData.email,
                    function: collaboratorData.function || 'waiter',
                    role: 'collaborator',
                    avatar_url: collaboratorData.avatar_url || null,
                };

                // Salva no localStorage para cache
                localStorage.setItem('ze_collaborator_session', JSON.stringify(sessionObj));
                setCollab(sessionObj);

            } catch (e: any) {
                console.error('[CollaboratorWrapper] Erro inesperado:', e);
                setError('Ocorreu um erro inesperado ao carregar o perfil.');
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [userId]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-brand-500" />
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                    Carregando perfil de colaborador...
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-8 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 max-w-md w-full flex flex-col items-center gap-4 text-center">
                    <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center text-red-500">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <h2 className="text-lg font-black text-gray-900 dark:text-white">
                        Perfil não encontrado
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 whitespace-pre-line leading-relaxed">
                        {error}
                    </p>
                    <button
                        onClick={onLogout}
                        className="mt-2 flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 active:scale-95 transition-all text-white text-sm font-extrabold rounded-xl"
                    >
                        <LogOut className="w-4 h-4" />
                        Sair da Conta
                    </button>
                </div>
            </div>
        );
    }

    if (!collab) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-8 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 max-w-md w-full flex flex-col items-center gap-4 text-center">
                    <AlertTriangle className="w-10 h-10 text-amber-500" />
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Sessão de colaborador não encontrada. Faça login novamente.
                    </p>
                    <button
                        onClick={onLogout}
                        className="flex items-center gap-2 px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 active:scale-95 transition-all text-gray-700 dark:text-white text-sm font-extrabold rounded-xl"
                    >
                        <LogOut className="w-4 h-4" />
                        Sair
                    </button>
                </div>
            </div>
        );
    }

    return <CollaboratorModule collaborator={collab} onLogout={onLogout} />;
};
