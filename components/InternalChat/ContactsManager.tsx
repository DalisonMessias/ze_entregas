import React, { useState, useEffect } from 'react';
import { UserPlus, Edit2, Trash2, X, Phone, Mail, Tag } from 'lucide-react';
import axios from 'axios';
import { BaseModal } from '../BaseModal';
import { useDialog } from '../../utils/dialogService';
import { getApiBaseUrl } from '../../utils/apiConfig';

interface Contact {
    id: string;
    name: string;
    phone_number: string;
    email?: string;
    notes?: string;
    tags?: string[];
}

interface ContactsManagerProps {
    storeId: string;
    onStartChat: (phoneNumber: string, contactName: string) => void;
    onClose?: () => void;
}

const ContactsManager: React.FC<ContactsManagerProps> = ({ storeId, onStartChat }) => {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingContact, setEditingContact] = useState<Contact | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        phoneNumber: '',
        email: '',
        notes: '',
        tags: [] as string[],
    });
    const { alert, confirm } = useDialog();
    const API_BASE_URL = getApiBaseUrl();

    useEffect(() => {
        fetchContacts();
    }, [storeId]);

    const fetchContacts = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/contacts?storeId=${storeId}`);
            setContacts(response.data);
        } catch (error) {
            console.error('Erro ao buscar contatos:', error);
        }
    };

    // Função para aplicar máscara de telefone (BR)
    const formatPhoneNumber = (value: string) => {
        // Remove tudo que não é número
        const numbers = value.replace(/\D/g, '');

        // Limita a 11 dígitos (DDD + 9 dígitos)
        const truncated = numbers.slice(0, 11);

        // Aplica a máscara
        if (truncated.length <= 2) return truncated.replace(/^(\d{0,2})/, '($1');
        if (truncated.length <= 7) return truncated.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
        return truncated.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, phoneNumber: formatPhoneNumber(e.target.value) });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Remove a máscara e adiciona 55 se não estiver presente
        let cleanPhone = formData.phoneNumber.replace(/\D/g, '');
        if (!cleanPhone.startsWith('55') && cleanPhone.length <= 11) {
            cleanPhone = '55' + cleanPhone;
        }

        try {
            if (editingContact) {
                await axios.put(`${API_BASE_URL}/contacts/${editingContact.id}`, {
                    name: formData.name,
                    phoneNumber: cleanPhone,
                    email: formData.email,
                    notes: formData.notes,
                    tags: formData.tags,
                });
            } else {
                await axios.post(`${API_BASE_URL}/contacts`, {
                    storeId,
                    name: formData.name,
                    phoneNumber: cleanPhone,
                    email: formData.email,
                    notes: formData.notes,
                    tags: formData.tags,
                });
            }

            fetchContacts();
            handleCloseModal();
        } catch (error: any) {
            await alert({ title: 'Erro', message: error.response?.data?.error || 'Erro ao salvar contato' });
        }
    };

    const handleDelete = async (id: string) => {
        const confirmed = await confirm({ title: 'Excluir Contato', message: 'Deseja realmente excluir este Chat?' });
        if (!confirmed) return;

        try {
            await axios.delete(`${API_BASE_URL}/contacts/${id}`);
            fetchContacts();
        } catch (error) {
            console.error('Erro ao deletar contato:', error);
        }
    };

    const handleEdit = (contact: Contact) => {
        setEditingContact(contact);
        setFormData({
            name: contact.name,
            phoneNumber: contact.phone_number,
            email: contact.email || '',
            notes: contact.notes || '',
            tags: contact.tags || [],
        });
        setShowAddModal(true);
    };

    const handleCloseModal = () => {
        setShowAddModal(false);
        setEditingContact(null);
        setFormData({ name: '', phoneNumber: '', email: '', notes: '', tags: [] });
    };

    return (
        <div className="h-full flex flex-col bg-white">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-800">Contatos Salvos</h2>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                    <UserPlus size={18} />
                    Novo Contato
                </button>
            </div>

            {/* Lista de contatos */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {contacts.map((contact) => (
                    <div
                        key={contact.id}
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                                <h3 className="font-semibold text-gray-900">{contact.name}</h3>
                                <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                                    <Phone size={14} />
                                    {contact.phone_number}
                                </p>
                                {contact.email && (
                                    <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                                        <Mail size={14} />
                                        {contact.email}
                                    </p>
                                )}
                                {contact.notes && (
                                    <p className="text-sm text-gray-500 mt-2">{contact.notes}</p>
                                )}
                                {contact.tags && contact.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {contact.tags.map((tag, idx) => (
                                            <span
                                                key={idx}
                                                className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center gap-1"
                                            >
                                                <Tag size={12} />
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => onStartChat(contact.phone_number + '@s.chat.net', contact.name)}
                                    className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                                    title="Iniciar conversa"
                                >
                                    <Phone size={18} />
                                </button>
                                <button
                                    onClick={() => handleEdit(contact)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title="Editar"
                                >
                                    <Edit2 size={18} />
                                </button>
                                <button
                                    onClick={() => handleDelete(contact.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Excluir"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {contacts.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                        <UserPlus size={48} className="mx-auto mb-2 opacity-50" />
                        <p>Nenhum contato salvo ainda</p>
                        <p className="text-sm">Clique em "Novo Contato" para adicionar</p>
                    </div>
                )}
            </div>

            {/* Modal de Adicionar/Editar usando BaseModal */}
            <BaseModal
                isOpen={showAddModal}
                onClose={handleCloseModal}
                title={editingContact ? 'Editar Contato' : 'Novo Contato'}
                icon={<UserPlus className="w-6 h-6 text-green-600" />}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nome *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                            placeholder="Nome do contato"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Telefone * (apenas números)
                        </label>
                        <input
                            type="tel"
                            required
                            value={formData.phoneNumber}
                            onChange={handlePhoneChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                            placeholder="5511999999999"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                            placeholder="email@exemplo.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Observações
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                            rows={3}
                            placeholder="Notas sobre o contato..."
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={handleCloseModal}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                        >
                            {editingContact ? 'Atualizar' : 'Salvar'}
                        </button>
                    </div>
                </form>
            </BaseModal>
        </div>
    );
};

export default ContactsManager;
