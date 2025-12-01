
import React, { useState, useEffect } from 'react';
import { Loader2, Users, Search, RefreshCw, Award } from 'lucide-react';
import * as cloud from '../services/cloud';

export const AdminReferrals: React.FC = () => {
    const [referrals, setReferrals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await cloud.adminGetReferrals();
            setReferrals(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const filtered = referrals.filter(r => 
        r.referrer?.name?.toLowerCase().includes(search.toLowerCase()) || 
        r.referred?.name?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div className="relative flex-1 w-full sm:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
                    <input 
                        type="text" 
                        placeholder="Buscar por nome..." 
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 p-3 bg-white dark:bg-gray-800 rounded-xl outline-none border border-gray-200 dark:border-gray-700 dark:text-white"
                    />
                </div>
                <button onClick={loadData} className="p-3 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 transition-colors">
                    <RefreshCw className="w-5 h-5 text-gray-500"/>
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500">
                            <tr>
                                <th className="px-4 py-3">Indicador (Quem ganhou)</th>
                                <th className="px-4 py-3">Indicado (Novo Usuário)</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Data</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && <tr><td colSpan={4} className="text-center p-8"><Loader2 className="w-6 h-6 animate-spin mx-auto"/></td></tr>}
                            {!loading && filtered.map(r => (
                                <tr key={r.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-4 py-3">
                                        <p className="font-bold dark:text-white">{r.referrer?.name || 'Unknown'}</p>
                                        <p className="text-xs text-gray-500">{r.referrer?.role}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <Award className="w-4 h-4 text-brand-500"/>
                                            <div>
                                                <p className="font-bold dark:text-white">{r.referred?.name || 'Unknown'}</p>
                                                <p className="text-xs text-gray-500">{r.referred?.role}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                            r.status === 'REWARDED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                        }`}>
                                            {r.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500">
                                        {new Date(r.created_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && !loading && (
                                <tr><td colSpan={4} className="text-center p-8 text-gray-400">Nenhuma indicação encontrada.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
