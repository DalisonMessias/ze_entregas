import React, { useState, useEffect } from 'react';
import { BaseModal } from '../../BaseModal';
import { User, Loader2, Phone, Search } from 'lucide-react';
import axios from 'axios';
import { getApiBaseUrl } from '../../../utils/apiConfig';

interface ContactPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (contact: { name: string; phone: string }) => void;
    storeId?: string;
}

export const ContactPickerModal: React.FC<ContactPickerModalProps> = ({ isOpen, onClose, onSelect, storeId }) => {
    const [contacts, setContacts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (isOpen && storeId) {
            loadContacts();
        }
    }, [isOpen, storeId]);

    const loadContacts = async () => {
        setLoading(true);
        try {
            const API_BASE_URL = getApiBaseUrl();
            const { data } = await axios.get(`${API_BASE_URL}/contacts?storeId=${storeId}`);
            setContacts(data || []);
        } catch (error) {
            console.error("Erro ao buscar contatos", error);
        } finally {
            setLoading(false);
        }
    };

    const filtered = contacts.filter(c =>
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Enviar Contato"
            icon={<User className="w-6 h-6 text-blue-500" />}
        >
            <div className="space-y-4">
                <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        className="w-full pl-10 p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Buscar contato..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-2">
                    {loading ? (
                        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-500" /></div>
                    ) : filtered.length === 0 ? (
                        <p className="text-center text-gray-400 py-4">Nenhum contato encontrado.</p>
                    ) : (
                        filtered.map(contact => (
                            <button
                                key={contact.id}
                                onClick={() => {
                                    onSelect({ name: contact.name || 'Sem Nome', phone: contact.phone || '' });
                                    onClose();
                                }}
                                className="w-full flex items-center justify-between p-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors text-left group border border-transparent hover:border-blue-100"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                                        {contact.name?.[0]?.toUpperCase() || <User size={20} />}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-800 dark:text-gray-200">{contact.name || contact.email}</h4>
                                        <p className="text-xs text-gray-500 group-hover:text-blue-500">{contact.role || 'Colaborador'}</p>
                                    </div>
                                </div>
                                <Phone className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                            </button>
                        ))
                    )}
                </div>
            </div>
        </BaseModal>
    );
};
