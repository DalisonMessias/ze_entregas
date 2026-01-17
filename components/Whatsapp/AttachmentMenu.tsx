import React, { useRef, useEffect } from 'react';
import {
    FileText,
    Image as ImageIcon,
    Camera,
    Mic as AudioIcon,
    User,
    BarChart2,
    Calendar,
    Sticker,
    Wallet
} from 'lucide-react';

interface AttachmentMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (type: 'document' | 'image' | 'camera' | 'audio' | 'contact' | 'poll' | 'event' | 'sticker' | 'pix') => void;
}

const AttachmentMenu: React.FC<AttachmentMenuProps> = ({ isOpen, onClose, onSelect }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const menuItems = [
        { type: 'document', label: 'Documento', icon: <FileText size={20} className="text-purple-500" /> },
        { type: 'image', label: 'Fotos e vídeos', icon: <ImageIcon size={20} className="text-blue-500" /> },
        { type: 'camera', label: 'Câmera', icon: <Camera size={20} className="text-pink-500" /> },
        { type: 'pix', label: 'Chave PIX', icon: <Wallet size={20} className="text-green-600" /> },
        { type: 'contact', label: 'Contato', icon: <User size={20} className="text-blue-400" /> },
        { type: 'poll', label: 'Enquete', icon: <BarChart2 size={20} className="text-yellow-500" /> },
        { type: 'sticker', label: 'Nova figurinha', icon: <Sticker size={20} className="text-teal-500" /> },
    ];

    return (
        <div
            ref={menuRef}
            className="absolute bottom-16 left-4 bg-[#233138] rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.3)] py-3 z-50 w-60 animate-in slide-in-from-bottom-5 fade-in duration-200"
        >
            <ul className="flex flex-col">
                {menuItems.map((item) => (
                    <li key={item.type}>
                        <button
                            onClick={() => {
                                onSelect(item.type as any);
                                onClose();
                            }}
                            className="w-full flex items-center gap-4 px-5 py-3 hover:bg-[#182229] transition-colors text-left"
                        >
                            <div className="flex-shrink-0">
                                {item.icon}
                            </div>
                            <span className="text-[#d1d7db] text-[15px] font-normal font-sans tracking-wide">
                                {item.label}
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default AttachmentMenu;
