import React from 'react';

export const ZeAssistantIndicator: React.FC<{ active: boolean; onClick?: () => void }> = ({ active, onClick }) => {
    if (!active) return null;

    return (
        <div
            onClick={onClick}
            className="flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium cursor-pointer hover:bg-purple-200 transition-colors"
            title="Clique para pausar o assistente"
        >
            <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
            </span>
            <span>🤖 Zé Assistente Ativo</span>
        </div>
    );
};
