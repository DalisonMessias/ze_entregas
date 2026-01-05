import React from 'react';
import { Instagram, Facebook, Twitter, Linkedin } from 'lucide-react';
import { Logo } from './Logo';

interface FooterProps {
    shopSettings: any;
    setShowTerms: (show: boolean) => void;
    setShowPrivacy: (show: boolean) => void;
    setShowCookiePrefs: (show: boolean) => void;
    setCompanyModal: (modal: 'about' | 'careers' | 'press' | 'contact' | null) => void;
    onLoginClick: () => void;
}

export const Footer: React.FC<FooterProps> = ({
    shopSettings,
    setShowTerms,
    setShowPrivacy,
    setShowCookiePrefs,
    setCompanyModal,
    onLoginClick
}) => {
    const socialLinks = shopSettings?.social_links || {};

    return (
        <footer className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 pt-16 pb-8 px-4">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                    <div className="col-span-1 md:col-span-1">
                        <div className="flex items-center gap-2 mb-6">
                            <Logo className="h-8 w-auto text-brand-600" />
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            Conectando a cidade, uma entrega de cada vez. Tecnologia e eficiência para o seu negócio.
                        </p>
                        <div className="flex gap-4">
                            {socialLinks.instagram && <a href={socialLinks.instagram} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-brand-600 transition-colors"><Instagram className="w-5 h-5" /></a>}
                            {socialLinks.facebook && <a href={socialLinks.facebook} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-brand-600 transition-colors"><Facebook className="w-5 h-5" /></a>}
                            {socialLinks.twitter && <a href={socialLinks.twitter} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-brand-600 transition-colors"><Twitter className="w-5 h-5" /></a>}
                            {socialLinks.linkedin && <a href={socialLinks.linkedin} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-brand-600 transition-colors"><Linkedin className="w-5 h-5" /></a>}
                        </div>
                    </div>

                    <div>
                        <h4 className="font-bold text-gray-900 dark:text-white mb-6">Empresa</h4>
                        <ul className="space-y-3 text-sm text-gray-500 dark:text-gray-400">
                            <li><button onClick={() => setCompanyModal('about')} className="hover:text-brand-600 transition-colors">Sobre Nós</button></li>
                            <li><button onClick={() => setCompanyModal('careers')} className="hover:text-brand-600 transition-colors">Carreiras</button></li>
                            <li><button onClick={() => setCompanyModal('press')} className="hover:text-brand-600 transition-colors">Imprensa</button></li>
                            <li><button onClick={() => setCompanyModal('contact')} className="hover:text-brand-600 transition-colors">Contato</button></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold text-gray-900 dark:text-white mb-6">Legal</h4>
                        <ul className="space-y-3 text-sm text-gray-500 dark:text-gray-400">
                            <li><button onClick={() => setShowTerms(true)} className="hover:text-brand-600 transition-colors">Termos de Uso</button></li>
                            <li><button onClick={() => setShowPrivacy(true)} className="hover:text-brand-600 transition-colors">Política de Privacidade</button></li>
                            <li><button onClick={() => setShowCookiePrefs(true)} className="hover:text-brand-600 transition-colors">Cookies</button></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold text-gray-900 dark:text-white mb-6">Siga-nos</h4>
                        <div className="space-y-3">
                            {socialLinks.instagram && (
                                <a href={socialLinks.instagram} target="_blank" rel="noreferrer" className="w-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 p-3 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                                    <Instagram className="w-5 h-5 text-pink-500" />
                                    <div className="text-left">
                                        <div className="text-sm font-bold leading-none">Instagram</div>
                                    </div>
                                </a>
                            )}
                            {socialLinks.facebook && (
                                <a href={socialLinks.facebook} target="_blank" rel="noreferrer" className="w-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 p-3 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                                    <Facebook className="w-5 h-5 text-blue-600" />
                                    <div className="text-left">
                                        <div className="text-sm font-bold leading-none">Facebook</div>
                                    </div>
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                <div className="pt-8 border-t border-gray-100 dark:border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-400 text-center md:text-left">
                    <p>© {new Date().getFullYear()} Zé Entregas. Todos os direitos reservados.</p>
                    <p>Feito com 🧡 para o corre.</p>
                </div>
            </div>
        </footer>
    );
};
