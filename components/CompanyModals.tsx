
import React from 'react';
import { Mail, MapPin, Briefcase, Newspaper, Info } from 'lucide-react';
import { CompanyInfo } from '../types';
import { BaseModal } from './BaseModal'; // Import BaseModal

interface CompanyModalProps {
    type: 'about' | 'careers' | 'press' | 'contact' | null;
    onClose: () => void;
    data?: CompanyInfo;
}

export const CompanyModal: React.FC<CompanyModalProps> = ({ type, onClose, data }) => {
    if (!type) return null;

    // Use data from DB or fallbacks
    const aboutText = data?.about_text || "O Zé Entregas nasceu com a missão de revolucionar a logística urbana, conectando entregadores e lojistas de forma eficiente, justa e tecnológica.";
    const careersText = data?.careers_text || "Estamos sempre em busca de talentos que queiram fazer a diferença!";
    const careersEmail = data?.careers_email || "vagas@zeentregas.com";
    const pressText = data?.press_text || "Olá, jornalista! Aqui você encontra nossos releases e materiais de mídia.";
    const pressEmail = data?.press_email || "imprensa@zeentregas.com";
    
    const contactSupportEmail = data?.contact_support_email || "suporte@zeentregas.com";
    const contactCommercialEmail = data?.contact_commercial_email || "comercial@zeentregas.com";
    const contactAddress = data?.contact_address || "Av. Paulista, 1000 - São Paulo, SP";

    const content = {
        about: {
            title: 'Sobre Nós',
            icon: <Info className="w-6 h-6 text-brand-500" />,
            body: (
                <div className="space-y-4 text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                    <p>{aboutText}</p>
                </div>
            )
        },
        careers: {
            title: 'Carreiras',
            icon: <Briefcase className="w-6 h-6 text-blue-500" />,
            body: (
                <div className="space-y-4 text-gray-600 dark:text-gray-300">
                    <p className="whitespace-pre-wrap">{careersText}</p>
                    <p className="text-sm pt-4 border-t border-gray-100 dark:border-gray-700">
                        Envie seu currículo para: <br/>
                        <a href={`mailto:${careersEmail}`} className="text-brand-600 font-bold hover:underline">{careersEmail}</a>
                    </p>
                </div>
            )
        },
        press: {
            title: 'Imprensa',
            icon: <Newspaper className="w-6 h-6 text-purple-500" />,
            body: (
                <div className="space-y-4 text-gray-600 dark:text-gray-300">
                    <p className="whitespace-pre-wrap">{pressText}</p>
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <p className="font-bold text-gray-900 dark:text-white">Assessoria de Imprensa</p>
                        <a href={`mailto:${pressEmail}`} className="text-brand-600 hover:underline block">{pressEmail}</a>
                    </div>
                </div>
            )
        },
        contact: {
            title: 'Contato',
            icon: <Mail className="w-6 h-6 text-green-500" />,
            body: (
                <div className="space-y-4 text-gray-600 dark:text-gray-300">
                    <p>Ficou com alguma dúvida ou quer falar com a gente? Escolha o canal ideal:</p>
                    
                    <div className="grid gap-3">
                        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <Mail className="w-5 h-5 text-gray-400"/>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase">Suporte Geral</p>
                                <a href={`mailto:${contactSupportEmail}`} className="text-sm font-bold text-gray-900 dark:text-white hover:underline">{contactSupportEmail}</a>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <Briefcase className="w-5 h-5 text-gray-400"/>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase">Comercial</p>
                                <a href={`mailto:${contactCommercialEmail}`} className="text-sm font-bold text-gray-900 dark:text-white hover:underline">{contactCommercialEmail}</a>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <MapPin className="w-5 h-5 text-gray-400"/>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase">Sede</p>
                                <p className="text-sm text-gray-900 dark:text-white">{contactAddress}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )
        }
    };

    const current = content[type];

    return (
        <BaseModal isOpen={!!type} onClose={onClose} title={current.title} icon={current.icon}>
            {current.body}
        </BaseModal>
    );
};
