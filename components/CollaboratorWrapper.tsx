
import React, { useState, useEffect } from 'react';
import * as cloud from '../services/cloud';
import { Loader2 } from 'lucide-react';
import { CollaboratorModule } from './CollaboratorModule';

export const CollaboratorWrapper: React.FC<{ userId: string, onLogout: () => void }> = ({ userId, onLogout }) => {
    const [collab, setCollab] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            // Em um mundo ideal, teríamos um endpoint getMyCollaboratorProfile()
            // Ou o login retornaria e armazenaria no localStorage. 
            // Como fallback, tentamos recuperar do localStorage se o login salvou lá.
            try {
                const stored = localStorage.getItem('ze_collaborator_session');
                if (stored) {
                    setCollab(JSON.parse(stored));
                } else {
                    // Se não tem, não temos como saber qual loja é sem uma query.
                    // Futuramente: implementar cloud.getMyCollaboratorProfile()
                }
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [userId]);

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>;

    if (!collab) {
        return (
            <div className="p-10 text-center">
                <p>Sessão de colaborador não encontrada. Faça login novamente.</p>
                <button onClick={onLogout} className="mt-4 text-brand-600 underline">Sair</button>
            </div>
        );
    }

    return <CollaboratorModule collaborator={collab} onLogout={onLogout} />;
};
