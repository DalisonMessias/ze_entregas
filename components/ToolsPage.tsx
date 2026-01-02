import React, { useState } from 'react';
import RouteOptimizer from './RouteOptimizer';
import { RouteList } from './RouteList';
import { AddressBook } from './AddressBook';
import { UserRole } from '../types';
import { GitMerge, List, BookUser } from 'lucide-react';

interface ToolsPageProps {
    userRole: UserRole;
}

type ToolTab = 'optimizer' | 'list' | 'address_book';

export const ToolsPage: React.FC<ToolsPageProps> = ({ userRole }) => {
    const [activeTool, setActiveTool] = useState<ToolTab>('optimizer');

    const renderActiveTool = () => {
        switch (activeTool) {
            case 'optimizer':
                return <RouteOptimizer />;
            case 'list':
                return <RouteList userRole={userRole} />;
            case 'address_book':
                return <AddressBook onClose={() => {}} />;
            default:
                return null;
        }
    };

    const TabButton: React.FC<{tab: ToolTab, label: string, icon: React.ElementType}> = ({ tab, label, icon: Icon }) => (
        <button
            onClick={() => setActiveTool(tab)}
            className={`flex-1 flex justify-center items-center gap-2 px-3 py-3 text-sm font-bold rounded-lg transition-colors duration-200 ${
                activeTool === tab
                ? 'bg-brand-600 text-white shadow-md'
                : 'text-gray-500 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
        >
            <Icon className="w-5 h-5" />
            <span>{label}</span>
        </button>
    );

    return (
        <div className="space-y-5">
            <div className="flex space-x-2 p-1.5 bg-gray-100 dark:bg-gray-800 rounded-xl shadow-inner">
                <TabButton tab="optimizer" label="Otimizador" icon={GitMerge} />
                <TabButton tab="list" label="Minha Lista" icon={List} />
                <TabButton tab="address_book" label="Agenda" icon={BookUser} />
            </div>
            <div className="animate-in fade-in duration-300">
                {renderActiveTool()}
            </div>
        </div>
    );
};
